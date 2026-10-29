// Lo que hace que una animación se vea "de canal de animación": resortes,
// escalonados, trazos, formas que se transforman, subtítulos palabra por
// palabra, sonidos y estilos que cambian el arte sin tocar la escena.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
    compilar, curva, resorte, figuras, leerCamino, mezclarFormas, palabrasDe,
    aparecer, dibujar, transformar, mover, decir, sonar,
} from '../../src/nucleo/index.js';
import { caja, forma, texto } from '../../src/piezas/index.js';
import { resolverEstilo, registrarEstilo, cssDelEstilo, subtitulosDelEstilo, estilosDisponibles } from '../../src/estilos/index.js';
import { sintetizar, mezclarPista, aWav, RECETAS } from '../../src/sonido/sintetizar.js';

const cerca = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const escena = (piezas, linea, extra = {}) => ({ ancho: 1600, alto: 900, piezas, linea, ...extra });

describe('las curvas nuevas', () => {
    for (const nombre of ['resorte', 'gelatina', 'rebote', 'elastico', 'anticipar', 'envion']) {
        test(`${nombre}: arranca en 0, termina en 1 y no salta en las puntas`, () => {
            const f = curva(nombre);
            assert.equal(f(0), 0);
            assert.equal(f(1), 1);
            cerca(f(1e-6), 0, 1e-3);
            cerca(f(1 - 1e-6), 1, 1e-3);
        });
    }
    test('el resorte se pasa lo que dice su rebote', () => {
        const f = resorte({ rebote: 0.3, oscilaciones: 1.5 });
        let max = 0;
        for (let i = 0; i <= 2000; i++) max = Math.max(max, f(i / 2000));
        cerca(max, 1.3, 0.03);
        const sin = resorte({ rebote: 0 });
        for (let i = 0; i <= 200; i++) assert.ok(sin(i / 200) <= 1 + 1e-9);
    });
    test('anticipar se echa para atrás antes de salir', () => {
        assert.ok(curva('anticipar')(0.2) < 0);
    });
    test('una curva se puede describir con datos, como viene en un .json', () => {
        const f = curva({ tipo: 'resorte', rebote: 0.5 });
        assert.ok(Math.max(...Array.from({ length: 500 }, (_, i) => f(i / 500))) > 1.4);
        assert.throws(() => curva({ tipo: 'inventada' }), /No conozco la curva/);
    });
});

describe('el escalonado', () => {
    const piezas = Object.fromEntries(['a', 'b', 'c', 'd', 'e'].map((id) => [id, caja({ opacidad: 0 })]));
    const inicios = (escalonar) => {
        const c = compilar(escena(piezas, [{ pieza: ['a', 'b', 'c', 'd', 'e'], a: { opacidad: 1 }, dur: 1, escalonar, curva: 'lineal' }]));
        // Cuándo empieza cada una: la primera vez que deja de estar en 0.
        return ['a', 'b', 'c', 'd', 'e'].map((id) => {
            for (let t = 0; t <= 3; t += 0.01) if (c.estado(t + 0.001).piezas[id].opacidad > 0) return Math.round(t * 100) / 100;
            return null;
        });
    };
    test('con un número, en orden', () => assert.deepEqual(inicios(0.1), [0, 0.1, 0.2, 0.3, 0.4]));
    test('desde el final', () => assert.deepEqual(inicios({ cada: 0.1, orden: 'fin' }), [0.4, 0.3, 0.2, 0.1, 0]));
    test('desde el centro hacia afuera', () => assert.deepEqual(inicios({ cada: 0.1, orden: 'centro' }), [0.2, 0.1, 0, 0.1, 0.2]));
    test('desde los bordes hacia adentro', () => assert.deepEqual(inicios({ cada: 0.1, orden: 'bordes' }), [0, 0.1, 0.2, 0.1, 0]));
    test('al azar, pero siempre el mismo azar', () => {
        const a = inicios({ cada: 0.1, orden: 'azar', semilla: 4 });
        assert.deepEqual(a, inicios({ cada: 0.1, orden: 'azar', semilla: 4 }));
        assert.deepEqual([...a].sort(), [0, 0.1, 0.2, 0.3, 0.4]);
    });
    test('un orden que no existe avisa', () => {
        assert.throws(() => inicios({ orden: 'espiral' }), /'inicio', 'fin', 'centro', 'bordes' o 'azar'/);
    });
});

describe('los sonidos en la línea', () => {
    test('un sonido suelto no corre el tiempo; uno pegado suena al arrancar (o por pieza)', () => {
        const c = compilar(escena({ a: caja({ opacidad: 0 }), b: caja({ opacidad: 0 }) }, [
            { pieza: 'a', a: { opacidad: 1 }, dur: 1 },
            { sonido: 'ding', en: '<0.5', volumen: 0.5 },
            { pieza: ['a', 'b'], a: { x: 100 }, dur: 1, escalonar: 0.3, sonido: { nombre: 'pop', cadaPieza: true } },
            { pieza: 'b', a: { y: 50 }, dur: 1, sonido: { nombre: 'golpe', al: 'fin' } },
        ]));
        assert.deepEqual(c.sonidos.map((s) => [s.nombre, Math.round(s.t * 100) / 100]), [
            ['ding', 0.5], ['pop', 1], ['pop', 1.3], ['golpe', 3.3],
        ]);
        assert.equal(c.sonidos[0].volumen, 0.5);
        cerca(c.duracion, 3.3);
    });
    test('el estilo hace sonar solo lo que aparece y lo que se mueve lejos, sin encimar', () => {
        const c = compilar(escena({ a: caja({ opacidad: 0 }), b: caja({ opacidad: 0 }) }, [
            { pieza: ['a', 'b'], a: { opacidad: 1 }, dur: 0.5 },
            { pieza: 'a', a: { x: 40 }, dur: 0.5 },
            { pieza: 'a', a: { x: 700 }, dur: 0.5 },
        ]), { estilo: { sonidos: { aparecer: 'pop', mover: 'whoosh', distancia: 100 } } });
        // Las dos aparecen juntas: un pop, no dos. El movimiento corto no suena.
        assert.deepEqual(c.sonidos.map((s) => s.nombre), ['pop', 'whoosh']);
    });
    test('sin nombre, avisa', () => {
        assert.throws(() => compilar(escena({}, [{ sonido: {} }])), /tiene que tener un nombre/);
    });
});

describe('los estilos', () => {
    test('trae cinco, y uno puede extender a otro', () => {
        for (const n of ['sobrio', 'pizarra', 'neon', 'papel', 'reel']) assert.ok(estilosDisponibles().includes(n));
        registrarEstilo('prueba-hijo', { extiende: 'neon', colores: { acento: '#0f0' }, efectos: { grano: 0.1 } });
        const e = resolverEstilo('prueba-hijo');
        assert.equal(e.colores.acento, '#0f0');
        assert.equal(e.colores.fondo, '#07060f');
        assert.equal(e.efectos.brillo, 0.8);
        assert.equal(e.efectos.grano, 0.1);
        assert.match(cssDelEstilo(e), /--ma-acento: var\(--motor-acento, #0f0\)/);
    });
    test('avisa si no existe o si se extiende en ronda', () => {
        assert.throws(() => resolverEstilo('no-existe'), /No conozco el estilo "no-existe"/);
        registrarEstilo('ronda-a', { extiende: 'ronda-b' });
        registrarEstilo('ronda-b', { extiende: 'ronda-a' });
        assert.throws(() => resolverEstilo('ronda-a'), /dando una vuelta/);
    });
    test('cambia los predeterminados de las piezas, pero no lo que la escena puso a mano', () => {
        const def = escena({ libre: caja({}), elegida: caja({ radio: 4 }) }, []);
        const fin = compilar(def, { estilo: { piezas: { caja: { radio: 0 } } } }).estado(0).piezas;
        assert.equal(fin.libre.radio, 0);
        assert.equal(fin.elegida.radio, 4);
    });
    test('elige la curva por propiedad: resorte para moverse, suave para aparecer', () => {
        const def = escena({ a: caja({ opacidad: 0 }) }, [{ pieza: 'a', a: { x: 100, opacidad: 1 }, dur: 1 }]);
        const c = compilar(def, { estilo: { movimiento: { curvas: { x: 'resorte' } } } });
        const max = Math.max(...Array.from({ length: 100 }, (_, i) => c.estado(i / 100).piezas.a.x));
        assert.ok(max > 105, 'x se pasa');
        assert.ok(Math.max(...Array.from({ length: 100 }, (_, i) => c.estado(i / 100).piezas.a.opacidad)) <= 1);
    });
    test('la misma escena con dos estilos: mismas piezas, mismos subtítulos', () => {
        const def = escena({ a: caja({ opacidad: 0 }), b: caja({ opacidad: 0 }) }, [
            { subtitulo: 'Hola' }, { pieza: ['a', 'b'], a: { opacidad: 1 } },
        ]);
        const sobrio = compilar(def);
        const reel = compilar(def, { estilo: resolverEstilo('reel') });
        assert.deepEqual(Object.keys(reel.estado(0).piezas), Object.keys(sobrio.estado(0).piezas));
        assert.deepEqual(reel.subtitulos, sobrio.subtitulos);
        assert.ok(reel.sonidos.length > 0 && sobrio.sonidos.length === 0);
        assert.equal(subtitulosDelEstilo(resolverEstilo('reel')).modo, 'reel');
    });
});

describe('las formas que se transforman', () => {
    test('lee rectas y curvas, absolutas y relativas', () => {
        const b = leerCamino('M0 0 L10 0 l0 10 H0 Z M 20 20 c 5 0 5 5 5 5');
        assert.equal(b.length, 2);
        assert.equal(b[0].cerrado, true);
        assert.deepEqual(b[0].puntos.slice(0, 3), [[0, 0], [10, 0], [10, 10]]);
        assert.deepEqual(b[1].puntos.at(-1), [25, 25]);
        assert.throws(() => leerCamino('M0 0 A 5 5 0 0 1 10 10'), /arcos/);
    });
    test('en las puntas devuelve los caminos tal cual; en el medio, un polígono parejo', () => {
        const a = figuras.circulo(50);
        const b = figuras.estrella(5, 80);
        assert.equal(mezclarFormas(a, b, 0), a);
        assert.equal(mezclarFormas(a, b, 1), b);
        const medio = mezclarFormas(a, b, 0.5);
        assert.equal(medio, mezclarFormas(a, b, 0.5), 'siempre igual');
        assert.equal(leerCamino(medio)[0].puntos.length, 96);
    });
    test('una forma se anima en la línea, y avisa si se la quiere llevar a otra cosa', () => {
        const c = compilar(escena({ f: forma({}) }, [transformar('f', figuras.corazon(), { relleno: 'error' })]));
        assert.equal(c.estado(c.duracion).piezas.f.d, figuras.corazon());
        assert.throws(() => compilar(escena({ f: forma({}) }, [{ pieza: 'f', a: { d: 3 } }])), /es una forma/);
        assert.throws(() => forma({ d: 'M0 0 A 1 1 0 0 0 2 2' }), /arcos/);
    });
    test('todas las figuras se leen y se transforman entre sí', () => {
        const todas = [figuras.circulo(), figuras.elipse(), figuras.rectangulo(100, 60, 12), figuras.poligono(6), figuras.estrella(), figuras.corazon(), figuras.flecha(), figuras.tilde(), figuras.cruz(), figuras.linea()];
        for (const a of todas) for (const b of todas) assert.doesNotThrow(() => mezclarFormas(a, b, 0.37));
    });
});

describe('los atajos', () => {
    test('arman pasos comunes de la línea', () => {
        const c = compilar(escena({ a: caja({ opacidad: 0 }), b: texto({ texto: 'x', opacidad: 0 }) }, [
            aparecer(['a', 'b'], { crecer: true, escalonar: 0.2 }),
            dibujar('a'),
            mover('a', { x: 300 }, { curva: 'resorte' }),
            decir('Listo.'),
            sonar('ding'),
        ]));
        const fin = c.estado(c.duracion).piezas;
        assert.equal(fin.a.x, 300);
        assert.equal(fin.a.trazo, 1);
        assert.equal(fin.b.escala, 1);
        assert.equal(c.estado(0).piezas.a.escala, 0.6);
        assert.equal(c.sonidos[0].nombre, 'ding');
        assert.equal(c.subtitulos[0].texto, 'Listo.');
    });
});

describe('los subtítulos palabra por palabra', () => {
    test('cada palabra empieza después de la anterior, y nunca después del subtítulo', () => {
        const p = palabrasDe('Hola, ¿cómo estás hoy?', 2, 6);
        assert.deepEqual(p.map((x) => x.texto), ['Hola,', '¿cómo', 'estás', 'hoy?']);
        assert.equal(p[0].desde, 2);
        for (let k = 1; k < p.length; k++) assert.ok(p[k].desde > p[k - 1].desde);
        assert.ok(p.at(-1).hasta <= 6);
    });
    test('en grupos de a pocas, cortando también en las comas', () => {
        const p = palabrasDe('uno dos tres cuatro, cinco seis', 0, 10, { porGrupo: 3 });
        assert.deepEqual(p.map((x) => x.grupo), [0, 0, 0, 1, 2, 2]);
    });
    test('el estado dice cuál subtítulo se ve', () => {
        const c = compilar(escena({}, [{ subtitulo: 'uno', dur: 2 }, { subtitulo: 'dos', en: 2, dur: 2 }]));
        assert.equal(c.estado(0.5).subtituloIndice, 0);
        assert.equal(c.estado(2.5).subtituloIndice, 1);
    });
});

describe('los sonidos fabricados', () => {
    test('cada receta da muestras entre −1 y 1, y siempre las mismas', () => {
        for (const nombre of Object.keys(RECETAS)) {
            const a = sintetizar(nombre);
            assert.ok(a.length > 100);
            assert.ok(a.every((v) => Number.isFinite(v) && Math.abs(v) <= 1), nombre);
            assert.deepEqual(a, sintetizar(nombre));
        }
    });
    test('el tono cambia el sonido; un paquete arma sonidos nuevos con recetas', () => {
        assert.notDeepEqual(sintetizar('pop', { tono: 7 }), sintetizar('pop'));
        const b = sintetizar('burbuja', { paquete: { burbuja: { receta: 'pop', dur: 0.05 } } });
        assert.equal(b.length, Math.round(0.05 * 48000));
        assert.throws(() => sintetizar('nada'), /No conozco el sonido "nada"/);
        assert.equal(sintetizar('archivo', { paquete: { archivo: { archivo: 'x.wav' } } }), null);
    });
    test('la pista mezcla todo donde va, y el WAV tiene su encabezado', () => {
        const pista = mezclarPista([{ nombre: 'pop', t: 0.5 }], 1);
        assert.equal(pista.length, 48000);
        assert.equal(pista[100], 0);
        assert.ok(pista.slice(24000, 25000).some((v) => v !== 0));
        const wav = aWav(pista);
        assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
        assert.equal(wav.length, 44 + 48000 * 2);
    });
});

describe('qué tapa a qué', async () => {
    const { revisarSuperposiciones, lugarLibre, zonaDeSubtitulo, cajasEn } = await import('../../src/piezas/superposiciones.js');
    const { contador, celular } = await import('../../src/piezas/index.js');
    const conCartel = (y) => escena({
        cartel: texto({ x: 800, y, texto: 'Un cartel abajo que no hay que tapar', tamano: 44 }),
        titulo: texto({ x: 800, y: 60, texto: 'Título', tamano: 50 }),
    }, [{ subtitulo: 'Un subtítulo cualquiera.', dur: 3 }]);

    test('un subtítulo que cae sobre un cartel se avisa, y arriba hay lugar', () => {
        const c = compilar(conCartel(830));
        const r = revisarSuperposiciones(c);
        assert.equal(r.subtitulos.length, 1);
        assert.deepEqual(r.subtitulos[0].tapa, ['cartel']);
        assert.equal(r.subtitulos[0].libre, true);
        const lugar = lugarLibre(c, zonaDeSubtitulo(c, 'abajo'), 0, 3);
        assert.ok(lugar.subir > 0 && lugar.libre);
    });
    test('si no tapa nada, no se mueve', () => {
        const c = compilar(conCartel(450));
        assert.equal(revisarSuperposiciones(c).subtitulos.length, 0);
        assert.equal(lugarLibre(c, zonaDeSubtitulo(c, 'abajo'), 0, 3).subir, 0);
    });
    test('lo apagado, lo muy tenue, lo tapado por un velo y lo recortado por su contenedor no cuenta', () => {
        const c = compilar(escena({
            apagado: texto({ x: 800, y: 830, texto: 'no se ve', opacidad: 0 }),
            tenue: texto({ x: 800, y: 830, texto: 'casi no se ve', opacidad: 0.12 }),
            cel: celular({ x: 300, y: 450, alto: 600 }),
            afuera: caja({ dentro: 'cel', x: 180, y: 2000, texto: 'fuera de la pantalla' }),
            num: contador({ x: 800, y: 300, valor: 12, prefijo: 'Hay ', sufijo: ' alumnos' }),
            debajo: texto({ x: 1300, y: 600, texto: 'debajo del velo' }),
            velo: caja({ x: 1300, y: 600, ancho: 500, alto: 300, relleno: 'fondo', borde: 'ninguno', opacidad: 0.8 }),
        }, []));
        const ids = cajasEn(c, 0).map((x) => x.id);
        assert.deepEqual(ids.filter((id) => ['apagado', 'tenue', 'afuera', 'debajo'].includes(id)), []);
        assert.ok(ids.includes('num'), 'un contador tiene tamaño');
    });
    test('dos textos que se pisan, con el tramo en que se pisan', () => {
        const c = compilar(escena({
            a: texto({ x: 800, y: 400, texto: 'Primer texto largo' }),
            b: texto({ x: 820, y: 410, texto: 'Segundo texto largo', opacidad: 0 }),
        }, [{ pieza: 'b', a: { opacidad: 1 }, dur: 0.1, en: 2 }, { espera: 2 }]));
        const [par] = revisarSuperposiciones(c).textos;
        assert.equal(`${par.a}|${par.b}`, 'a|b');
        assert.ok(par.desde >= 2 && par.hasta >= 3.9);
    });
});

// ---------------- Los pedidos del curso (desdeTraza y HTTP) ----------------

describe('desdeTraza: error, alto y línea grande', async () => {
    const { desdeTraza } = await import('../../src/pedagogico/index.js');
    const { desdePedidoHttp, textoDelPedido, textoDeLaRespuesta } = await import('../../src/redes/index.js');
    const traza = [
        { linea: 1, variables: {} },
        { linea: 2, variables: { x: { tipo: 'NoneType', repr: 'None' } } },
        { linea: 2, variables: { x: { tipo: 'NoneType', repr: 'None' } }, excepcion: { tipo: 'TypeError', mensaje: "unsupported operand type(s) for +: 'NoneType' and 'int'" } },
    ];
    const codigo = 'x = None\ny = x + 2\nprint(y)';
    const armar = (op, nombre = 'ancha') => compilar(desdeTraza({ codigo, traza, ...op }), { disposicion: { nombre } });

    test('el cartel del error crece con el mensaje y queda adentro del cuadro', () => {
        for (const nombre of ['ancha', 'media', 'angosta']) {
            const c = armar({}, nombre);
            const e = c.estado(c.duracion).piezas.error;
            assert.ok(e.alto > 96, `${nombre}: ${e.alto}`);
            assert.ok(e.y + e.alto / 2 <= c.alto, `${nombre}: el error termina en ${e.y + e.alto / 2} y la escena mide ${c.alto}`);
        }
    });
    test("alto: 'auto' achica la escena a lo que muestra, sin dejar nada afuera", () => {
        for (const nombre of ['ancha', 'angosta']) {
            const c = armar({ alto: 'auto' }, nombre);
            assert.ok(c.alto < (nombre === 'ancha' ? 900 : 1140), `${nombre}: ${c.alto}`);
            const fin = c.estado(c.duracion);
            for (const [id, p] of Object.entries(fin.piezas)) {
                const tam = c.tipos[id].tamano?.(p);
                if (tam && p.opacidad > 0) assert.ok(p.y + tam.alto / 2 <= c.alto + 1, `${nombre}: "${id}" se sale por abajo`);
            }
        }
        assert.equal(armar({ alto: 700 }).alto, 700);
    });
    test('la línea grande: un espejo del código abajo, que sigue a la marca y se apaga al terminar', () => {
        const larga = [
            { linea: 1, variables: {} },
            { linea: 2, variables: { a: { tipo: 'int', repr: '1' } } },
            { linea: 3, variables: { a: { tipo: 'int', repr: '1' }, b: { tipo: 'int', repr: '2' } } },
            { linea: 0, variables: { a: { tipo: 'int', repr: '1' }, b: { tipo: 'int', repr: '2' } }, salida: '3\n' },
        ];
        const c = compilar(desdeTraza({ codigo: 'a = 1\nb = 2\nprint(a + b)', traza: larga, lineaGrande: true, lupa: true, alto: 'auto' }), { disposicion: { nombre: 'ancha' } });
        const inicio = c.estado(0.5).piezas;
        assert.equal(c.tipos.lineaGrande.nombre, 'espejo');
        assert.equal(inicio.lineaGrande.fuente, 'codigo');
        assert.equal(inicio.codigo.dentro, null, 'sin la lupa de cámara');
        const ys = new Set();
        for (let t = 0; t < c.duracion; t += 0.5) ys.add(Math.round(c.estado(t).piezas.lineaGrande.mirarY));
        assert.ok(ys.size >= 3, 'se mueve con la marca');
        const fin = c.estado(c.duracion).piezas.lineaGrande;
        assert.ok(fin.opacidad < 1 && fin.opacidad > 0);
        assert.ok(fin.y + fin.alto / 2 <= c.alto);
    });

    test('HTTP: lo que viaja, escrito como en el cable', () => {
        assert.equal(textoDelPedido({ metodo: 'post', url: '/api/x', cuerpo: { a: 1 } }), 'POST /api/x\nContent-Type: application/json\n\n{\n  "a": 1\n}');
        assert.equal(textoDeLaRespuesta({ codigo: 404 }), '404 Not Found');
    });
    test('HTTP: la escena se arma ancha y angosta, con un capítulo por pedido', () => {
        const escena = desdePedidoHttp({
            pedidos: [
                { url: '/api/alumnos', respuesta: { codigo: 200, cuerpo: [1, 2] }, resultado: 'dos' },
                { metodo: 'POST', url: '/api/alumnos', cuerpo: { nombre: 'Ana' }, ruta: "@app.post('/api/alumnos')", respuesta: { codigo: 201 } },
            ],
        });
        for (const nombre of ['ancha', 'angosta']) {
            const c = compilar(escena, { disposicion: { nombre } });
            assert.deepEqual(c.capitulos.map((x) => x.nombre), ['GET /api/alumnos', 'POST /api/alumnos']);
            for (let t = 0; t <= c.duracion; t += 0.5) c.estado(t);
        }
        assert.throws(() => desdePedidoHttp({ pedidos: [{ url: '/x' }] }), /necesita su respuesta/);
    });
});
