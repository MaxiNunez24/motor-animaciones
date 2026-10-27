// Las cuentas de la capa de redes, sin nada de dibujo: subredes, los
// protocolos de ventana (stop-and-wait, Go-Back-N, Selective Repeat) y el
// control de congestión de TCP.
//
// Los protocolos se SIMULAN: con los mismos datos, la simulación da siempre los
// mismos mensajes en los mismos instantes. La animación solo dibuja lo que la
// simulación dice, y los tests comparan la simulación con los ejercicios de
// la práctica.

// ======================= Direcciones IP =======================

/**
 * Todo lo que se calcula de una dirección con su prefijo: la máscara, la
 * dirección de red, la de broadcast, el rango de hosts, la clase.
 * @param {string} texto '192.168.10.77/26' (o la dirección sola, con `prefijo` aparte)
 * @param {number} [prefijo]
 */
export function analizarIp(texto, prefijo) {
    const [direccion, barra] = String(texto).trim().split('/');
    const p = prefijo ?? (barra === undefined ? null : Number(barra));
    const octetos = direccion.split('.').map(Number);
    if (octetos.length !== 4 || octetos.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) {
        throw new Error(`"${direccion}" no es una dirección IPv4: son cuatro números de 0 a 255 separados por puntos.`);
    }
    const clase = claseDe(octetos[0]);
    const prefijoFinal = p ?? clase.prefijo;
    if (!(Number.isInteger(prefijoFinal) && prefijoFinal >= 0 && prefijoFinal <= 32)) {
        throw new Error(`El prefijo tiene que ser un entero de 0 a 32, no "${p}".`);
    }
    const ip = aNumero(octetos);
    // Con >>> 0 los números quedan sin signo: JavaScript hace las cuentas de bits en 32 bits con signo.
    const mascara = prefijoFinal === 0 ? 0 : (0xffffffff << (32 - prefijoFinal)) >>> 0;
    const red = (ip & mascara) >>> 0;
    const broadcast = (red | (~mascara >>> 0)) >>> 0;
    const bitsHost = 32 - prefijoFinal;
    // /31 y /32 son casos especiales (enlaces punto a punto, una sola máquina).
    const hosts = bitsHost >= 2 ? 2 ** bitsHost - 2 : bitsHost === 1 ? 2 : 1;
    const primero = bitsHost >= 2 ? red + 1 : red;
    const ultimo = bitsHost >= 2 ? broadcast - 1 : broadcast;
    return {
        direccion: aTexto(ip),
        prefijo: prefijoFinal,
        mascara: aTexto(mascara),
        red: aTexto(red),
        broadcast: aTexto(broadcast),
        primero: aTexto(primero),
        ultimo: aTexto(ultimo),
        hosts,
        bitsHost,
        clase: clase.letra,
        prefijoDeClase: clase.prefijo,
        privada: esPrivada(/** @type {[number, number]} */ ([octetos[0], octetos[1]])),
        bits: { direccion: aBits(ip), mascara: aBits(mascara), red: aBits(red), broadcast: aBits(broadcast) },
        esRed: ip === red,
        esBroadcast: ip === broadcast,
    };
}

/**
 * Las subredes que salen de partir un bloque en partes iguales.
 * @param {string} bloque '195.200.45.0/24'
 * @param {number} cuantas cuántas subredes hacen falta como mínimo
 */
export function dividirEnSubredes(bloque, cuantas) {
    const b = analizarIp(bloque);
    const bitsSubred = Math.ceil(Math.log2(Math.max(cuantas, 1)));
    const prefijo = b.prefijo + bitsSubred;
    if (prefijo > 30) throw new Error(`No entran ${cuantas} subredes en un /${b.prefijo}: quedarían sin lugar para hosts.`);
    const salto = 2 ** (32 - prefijo);
    const base = aNumero(b.red.split('.').map(Number));
    const subredes = [];
    for (let i = 0; i < 2 ** bitsSubred; i++) subredes.push(analizarIp(`${aTexto(base + i * salto)}/${prefijo}`));
    return { prefijo, mascara: analizarIp(`0.0.0.0/${prefijo}`).mascara, bitsSubred, subredes, hostsPorSubred: subredes[0].hosts };
}

function claseDe(primero) {
    if (primero < 128) return { letra: 'A', prefijo: 8 };
    if (primero < 192) return { letra: 'B', prefijo: 16 };
    if (primero < 224) return { letra: 'C', prefijo: 24 };
    if (primero < 240) return { letra: 'D', prefijo: 32 };
    return { letra: 'E', prefijo: 32 };
}

function esPrivada([a, b]) {
    return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function aNumero(o) {
    return ((o[0] << 24) | (o[1] << 16) | (o[2] << 8) | o[3]) >>> 0;
}

function aTexto(n) {
    return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

/** Los 32 bits, en cuatro grupos de ocho separados por puntos. */
export function aBits(n) {
    const b = (n >>> 0).toString(2).padStart(32, '0');
    return `${b.slice(0, 8)}.${b.slice(8, 16)}.${b.slice(16, 24)}.${b.slice(24)}`;
}

// ======================= Protocolos de ventana =======================

/**
 * Simula un protocolo de ventana entre un emisor y un receptor, con pérdidas.
 *
 * El tiempo va en "viajes": un mensaje tarda 1 en llegar, y el emisor
 * necesita `envio` para sacar cada paquete. El timeout es de `timeout` (tiene
 * que ser más que el ida y vuelta, 2, para no retransmitir de gusto).
 *
 * `perdidos` son los números de paquete cuya PRIMERA transmisión se pierde;
 * `acksPerdidos`, los números de ACK que se pierden la primera vez que se mandan.
 *
 * @param {{
 *     protocolo: 'stop-and-wait' | 'go-back-n' | 'selective-repeat',
 *     paquetes: number, ventana?: number, perdidos?: number[], acksPerdidos?: number[],
 *     envio?: number, timeout?: number,
 * }} opciones
 */
export function simularArq(opciones) {
    const { protocolo, paquetes } = opciones;
    if (!['stop-and-wait', 'go-back-n', 'selective-repeat'].includes(protocolo)) {
        throw new Error("El protocolo es 'stop-and-wait', 'go-back-n' o 'selective-repeat'.");
    }
    const N = protocolo === 'stop-and-wait' ? 1 : (opciones.ventana ?? 4);
    const envio = opciones.envio ?? 0.3;
    const timeout = opciones.timeout ?? 2.8;
    const pierde = new Set(opciones.perdidos ?? []);
    const pierdeAck = new Set(opciones.acksPerdidos ?? []);
    const individual = protocolo === 'selective-repeat';

    /** @type {{ tipo: 'datos' | 'ack', numero: number, sale: number, llega: number, perdido: boolean, retransmision: boolean, duplicado?: boolean }[]} */
    const mensajes = [];
    /** @type {{ t: number, tipo: string, numero?: number, base?: number, siguiente?: number, texto: string }[]} */
    const hechos = [];
    const veces = new Map();
    const vecesAck = new Map();

    // Una cola de eventos ordenada por tiempo (y, a igual tiempo, por orden de llegada a la cola).
    let orden = 0;
    const cola = [];
    const agendar = (t, tipo, datos) => {
        cola.push({ t: redondear(t), tipo, datos, orden: orden++ });
        cola.sort((a, b) => a.t - b.t || a.orden - b.orden);
    };

    // Emisor
    let base = 0;
    let siguiente = 0;
    let libre = 0; // cuándo puede sacar el próximo paquete
    const confirmados = new Set();
    const timers = new Map(); // número → id del timer vigente (o 'base' en GBN)
    let idTimer = 0;
    // Receptor
    let esperado = 0;
    const recibidos = new Set();

    const mandar = (t, numero, retransmision) => {
        const n = (veces.get(numero) ?? 0) + 1;
        veces.set(numero, n);
        const perdido = n === 1 && pierde.has(numero);
        mensajes.push({ tipo: 'datos', numero, sale: redondear(t), llega: redondear(t + 1), perdido, retransmision });
        if (!perdido) agendar(t + 1, 'llegaDatos', { numero });
        return t;
    };
    const arrancarTimer = (t, cual) => {
        idTimer += 1;
        timers.set(cual, idTimer);
        agendar(t + timeout, 'timeout', { cual, id: idTimer });
    };
    const mandarAck = (t, numero, duplicado) => {
        const n = (vecesAck.get(numero) ?? 0) + 1;
        vecesAck.set(numero, n);
        const perdido = n === 1 && pierdeAck.has(numero);
        mensajes.push({ tipo: 'ack', numero, sale: redondear(t), llega: redondear(t + 1), perdido, retransmision: false, duplicado });
        if (!perdido) agendar(t + 1, 'llegaAck', { numero });
    };

    // Saca todo lo que la ventana permite, desde el instante t.
    const llenarVentana = (t) => {
        let ahora = Math.max(t, libre);
        while (siguiente < paquetes && siguiente < base + N) {
            mandar(ahora, siguiente, false);
            if (individual) arrancarTimer(ahora, siguiente);
            else if (base === siguiente) arrancarTimer(ahora, 'base');
            hechos.push({ t: redondear(ahora), tipo: 'envio', numero: siguiente, base, siguiente: siguiente + 1, texto: `Sale el paquete ${siguiente}.` });
            siguiente += 1;
            ahora += envio;
        }
        libre = ahora;
    };

    llenarVentana(0);
    let vueltas = 0;
    while (cola.length && vueltas++ < 5000) {
        const { t, tipo, datos } = cola.shift();
        if (tipo === 'llegaDatos') {
            const k = datos.numero;
            if (individual) {
                // Selective Repeat: guarda todo lo que caiga en su ventana y confirma cada uno.
                if (k >= esperado - N && k < esperado + N) {
                    recibidos.add(k);
                    mandarAck(t, k, k < esperado);
                    while (recibidos.has(esperado)) esperado += 1;
                }
            } else if (k === esperado) {
                esperado += 1;
                mandarAck(t, k, false);
                hechos.push({ t, tipo: 'entrega', numero: k, texto: `Llega el ${k}, en orden: se entrega.` });
            } else {
                // Go-Back-N: lo que llega fuera de orden se descarta, y se repite el último ACK.
                hechos.push({ t, tipo: 'descarte', numero: k, texto: `Llega el ${k}, pero esperaba el ${esperado}: se descarta.` });
                if (esperado > 0) mandarAck(t, esperado - 1, true);
            }
        } else if (tipo === 'llegaAck') {
            const k = datos.numero;
            if (individual) {
                confirmados.add(k);
                timers.delete(k);
                while (confirmados.has(base)) base += 1;
            } else if (k >= base) {
                // Los ACK son acumulativos: el k confirma todo hasta k.
                for (let i = base; i <= k; i++) confirmados.add(i);
                base = k + 1;
                if (base === siguiente) timers.delete('base');
                else arrancarTimer(t, 'base');
            }
            hechos.push({ t, tipo: 'ack', numero: k, base, siguiente, texto: `Llega el ACK ${k}.` });
            llenarVentana(t);
        } else if (tipo === 'timeout') {
            if (timers.get(datos.cual) !== datos.id) continue; // ese timer ya se había apagado
            if (individual) {
                const k = datos.cual;
                if (confirmados.has(k)) continue;
                hechos.push({ t, tipo: 'timeout', numero: k, base, siguiente, texto: `Vence el timer del ${k}: se reenvía solo ese.` });
                const ahora = Math.max(t, libre);
                mandar(ahora, k, true);
                libre = ahora + envio;
                arrancarTimer(ahora, k);
            } else {
                if (base >= siguiente) continue;
                hechos.push({ t, tipo: 'timeout', numero: base, base, siguiente, texto: `Vence el timer: se reenvía desde el ${base}.` });
                let ahora = Math.max(t, libre);
                arrancarTimer(ahora, 'base');
                for (let i = base; i < siguiente; i++) {
                    mandar(ahora, i, true);
                    ahora += envio;
                }
                libre = ahora;
            }
        }
        if (base >= paquetes) break;
    }
    mensajes.sort((a, b) => a.sale - b.sale || (a.tipo === 'datos' ? -1 : 1));
    const fin = Math.max(...mensajes.map((m) => m.llega));
    return { protocolo, ventana: N, mensajes, hechos, fin, retransmisiones: mensajes.filter((m) => m.retransmision).length };
}

function redondear(t) {
    return Math.round(t * 1000) / 1000;
}

// ======================= Control de congestión =======================

/**
 * La ventana de congestión de TCP, ronda por ronda (una ronda es un RTT):
 * slow start duplica la ventana hasta el umbral, y congestion avoidance la
 * agranda de a un segmento. Ante una pérdida, el umbral pasa a la mitad.
 *
 * `eventos` dice en qué ronda se detecta una pérdida y cómo: 'timeout' o
 * '3dup' (tres ACK duplicados). Con un timeout la ventana vuelve a 1; con
 * tres duplicados, Tahoe también vuelve a 1 y Reno sigue desde el umbral
 * nuevo (fast recovery, en la versión simplificada).
 *
 * @param {{ rondas: number, umbral?: number, inicial?: number, eventos?: Record<number, 'timeout' | '3dup'>, variante?: 'tahoe' | 'reno' }} opciones
 */
export function simularCongestion(opciones) {
    const { rondas, eventos = {}, variante = 'reno' } = opciones;
    let cwnd = opciones.inicial ?? 1;
    let umbral = opciones.umbral ?? 16;
    const lista = [];
    for (let ronda = 1; ronda <= rondas; ronda++) {
        const fase = cwnd < umbral ? 'slow start' : 'congestion avoidance';
        const evento = eventos[ronda] ?? null;
        lista.push({ ronda, cwnd, umbral, fase, evento });
        if (evento) {
            umbral = Math.max(Math.floor(cwnd / 2), 2);
            cwnd = evento === '3dup' && variante === 'reno' ? umbral : 1;
        } else if (cwnd < umbral) {
            // No se pasa del umbral: al llegar, cambia de fase.
            cwnd = Math.min(cwnd * 2, umbral);
        } else {
            cwnd += 1;
        }
    }
    return lista;
}
