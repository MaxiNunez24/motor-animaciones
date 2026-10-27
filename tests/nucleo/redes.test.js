// La capa de redes. Las subredes se comparan con el módulo ipaddress de
// Python; los protocolos de ventana, con lo que dice la teoría (qué se
// reenvía, cuándo vence cada timer).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { compilar } from '../../src/nucleo/index.js';
import {
    analizarIp, dividirEnSubredes, aBits, simularArq, simularCongestion,
    desdeIntercambio, desdeVentana, desdeCongestion, desdeSubred, secuencia,
} from '../../src/redes/index.js';

let hayPython = true;
try {
    execFileSync('python', ['--version']);
} catch {
    hayPython = false;
}

function enPython(direccion) {
    const programa = [
        'import ipaddress, json, sys',
        'i = ipaddress.ip_interface(sys.argv[1]); n = i.network',
        'hosts = list(n.hosts())',
        'print(json.dumps([str(n.netmask), str(n.network_address), str(n.broadcast_address), str(hosts[0]), str(hosts[-1]), len(hosts), i.ip.is_private]))',
    ].join('\n');
    return JSON.parse(execFileSync('python', ['-c', programa, direccion], { encoding: 'utf-8' }));
}

describe('direcciones IP', () => {
    for (const direccion of ['172.16.58.223/26', '163.10.5.49/27', '128.10.1.0/23', '10.1.0.0/24', '8.40.11.179/12', '192.168.10.77/26', '200.56.168.9/21']) {
        test(`${direccion}: lo mismo que el módulo ipaddress de Python`, { skip: !hayPython && 'no hay Python' }, () => {
            const ip = analizarIp(direccion);
            const [mascara, red, broadcast, primero, ultimo, hosts] = enPython(direccion);
            assert.deepEqual(
                [ip.mascara, ip.red, ip.broadcast, ip.primero, ip.ultimo, ip.hosts],
                [mascara, red, broadcast, primero, ultimo, hosts],
            );
        });
    }

    test('la clase, si es privada, y los bits', () => {
        const ip = analizarIp('172.16.58.223/26');
        assert.equal(ip.clase, 'B');
        assert.equal(ip.privada, true);
        assert.equal(analizarIp('8.8.8.8/8').privada, false);
        assert.equal(analizarIp('200.1.1.1').prefijo, 24);
        assert.equal(aBits(0xc0a80001), '11000000.10101000.00000000.00000001');
        assert.equal(ip.bits.mascara, '11111111.11111111.11111111.11000000');
        assert.throws(() => analizarIp('300.1.1.1/24'), /no es una dirección IPv4/);
        assert.throws(() => analizarIp('10.0.0.1/33'), /prefijo/);
    });

    test('partir un bloque en al menos 9 subredes', () => {
        const d = dividirEnSubredes('195.200.45.0/24', 9);
        assert.equal(d.prefijo, 28);
        assert.equal(d.mascara, '255.255.255.240');
        assert.equal(d.subredes.length, 16);
        assert.equal(d.hostsPorSubred, 14);
        assert.deepEqual(d.subredes.slice(0, 3).map((s) => s.red), ['195.200.45.0', '195.200.45.16', '195.200.45.32']);
    });
});

describe('protocolos de ventana', () => {
    const resumen = (s) => s.mensajes.map((m) => `${m.tipo === 'ack' ? 'A' : 'D'}${m.numero}${m.perdido ? '✗' : ''}`).join(' ');

    test('stop-and-wait: se pierde un paquete, vence el timer y se reenvía', () => {
        const s = simularArq({ protocolo: 'stop-and-wait', paquetes: 3, perdidos: [1] });
        assert.equal(resumen(s), 'D0 A0 D1✗ D1 A1 D2 A2');
        const reenvio = s.mensajes.find((m) => m.retransmision);
        // Salió en t = 2 (después del ACK 0) y el timeout es de 2,8.
        assert.equal(reenvio.sale, 4.8);
    });

    test('stop-and-wait: si se pierde el ACK, el receptor recibe un duplicado y repite el ACK', () => {
        const s = simularArq({ protocolo: 'stop-and-wait', paquetes: 3, acksPerdidos: [1] });
        assert.equal(resumen(s), 'D0 A0 D1 A1✗ D1 A1 D2 A2');
        assert.ok(s.hechos.some((h) => h.tipo === 'descarte' && h.numero === 1));
    });

    test('Go-Back-N reenvía desde el perdido en adelante, aunque los otros hayan llegado', () => {
        const s = simularArq({ protocolo: 'go-back-n', paquetes: 6, ventana: 4, perdidos: [2] });
        const reenviados = s.mensajes.filter((m) => m.retransmision).map((m) => m.numero);
        assert.deepEqual(reenviados, [2, 3, 4, 5]);
        // Los que llegaron fuera de orden se descartaron y repitieron el ACK 1.
        assert.equal(s.mensajes.filter((m) => m.tipo === 'ack' && m.duplicado && m.numero === 1).length, 3);
    });

    test('Selective Repeat reenvía solo el perdido', () => {
        const s = simularArq({ protocolo: 'selective-repeat', paquetes: 6, ventana: 4, perdidos: [2] });
        assert.deepEqual(s.mensajes.filter((m) => m.retransmision).map((m) => m.numero), [2]);
        assert.ok(s.fin < simularArq({ protocolo: 'go-back-n', paquetes: 6, ventana: 4, perdidos: [2] }).fin);
    });

    test('sin pérdidas, la ventana nunca tiene más de N paquetes sin confirmar', () => {
        for (const protocolo of ['go-back-n', 'selective-repeat']) {
            const s = simularArq({ protocolo, paquetes: 10, ventana: 3 });
            assert.equal(s.retransmisiones, 0);
            for (const h of s.hechos.filter((x) => x.base !== undefined)) assert.ok(h.siguiente - h.base <= 3);
        }
    });

    test('siempre termina: todos los paquetes llegan, con cualquier pérdida', () => {
        for (const protocolo of ['stop-and-wait', 'go-back-n', 'selective-repeat']) {
            const s = simularArq({ protocolo, paquetes: 8, ventana: 4, perdidos: [0, 3, 7], acksPerdidos: [1, 5] });
            const entregados = new Set(s.mensajes.filter((m) => m.tipo === 'datos' && !m.perdido).map((m) => m.numero));
            assert.equal(entregados.size, 8);
        }
    });
});

describe('control de congestión', () => {
    test('slow start, congestion avoidance, y las dos clases de pérdida', () => {
        const reno = simularCongestion({ rondas: 20, umbral: 8, eventos: { 9: '3dup', 15: 'timeout' } });
        assert.deepEqual(reno.map((r) => r.cwnd), [1, 2, 4, 8, 9, 10, 11, 12, 13, 6, 7, 8, 9, 10, 11, 1, 2, 4, 5, 6]);
        assert.equal(reno[9].umbral, 6);
        assert.equal(reno[15].umbral, 5);
        const tahoe = simularCongestion({ rondas: 12, umbral: 8, eventos: { 9: '3dup' }, variante: 'tahoe' });
        assert.equal(tahoe[9].cwnd, 1);
    });
});

describe('las escenas', () => {
    test('el diagrama de secuencia valida sus mensajes', () => {
        assert.throws(() => secuencia({ extremos: ['A'] }), /al menos dos/);
        assert.throws(() => secuencia({ extremos: ['A', 'B'], mensajes: [{ de: 0, a: 2, sale: 0, llega: 1 }] }), /extremos van de 0 a 1/);
        assert.throws(() => secuencia({ extremos: ['A', 'B'], mensajes: [{ de: 0, a: 1, sale: 1, llega: 1 }] }), /llegar después/);
    });

    const escenas = {
        saludo: desdeIntercambio({
            extremos: ['Cliente', 'Servidor'],
            mensajes: [
                { de: 'Cliente', a: 'Servidor', texto: 'SYN', explicacion: 'Pide abrir.', estados: [{ extremo: 0, texto: 'SYN-SENT', al: 'salir' }] },
                { de: 1, a: 0, texto: 'SYN, ACK', explicacion: 'Acepta.' },
                { de: 0, a: 1, texto: 'ACK', explicacion: 'Listo.' },
            ],
        }),
        gbn: desdeVentana({ protocolo: 'go-back-n', paquetes: 6, ventana: 4, perdidos: [2] }),
        sr: desdeVentana({ protocolo: 'selective-repeat', paquetes: 6, ventana: 4, perdidos: [2] }),
        sw: desdeVentana({ protocolo: 'stop-and-wait', paquetes: 3, acksPerdidos: [1] }),
        congestion: desdeCongestion({ rondas: 16, umbral: 8, eventos: { 9: '3dup' } }),
        subred: desdeSubred({ direccion: '192.168.10.77/26' }),
    };
    for (const [nombre, escena] of Object.entries(escenas)) {
        test(`${nombre}: se arma ancha y angosta, y se recorre sin errores`, () => {
            for (const disposicion of ['ancha', 'angosta']) {
                const c = compilar(escena, { disposicion: { nombre: disposicion } });
                for (let t = 0; t <= c.duracion; t += 0.25) c.estado(t);
            }
        });
    }

    test('un extremo que no existe se avisa con su nombre', () => {
        assert.throws(() => desdeIntercambio({ extremos: ['A', 'B'], mensajes: [{ de: 'A', a: 'C', texto: 'x' }] }), /"C" no es ninguno/);
    });

    test('Go-Back-N: al final la ventana confirmó todo y el diagrama terminó', () => {
        const c = compilar(escenas.gbn);
        const fin = c.estado(c.duracion).piezas;
        assert.equal(fin.ventana.base, 6);
        assert.ok(fin.diagrama.tiempo >= Math.max(...fin.diagrama.mensajes.map((m) => m.llega)));
    });

    test('la subred dice la red, el broadcast y los hosts', () => {
        const c = compilar(escenas.subred);
        const textos = c.subtitulos.map((s) => s.texto).join(' ');
        assert.match(textos, /192\.168\.10\.64/);
        assert.match(textos, /192\.168\.10\.127/);
        assert.match(textos, /Quedan 62 hosts/);
    });
});
