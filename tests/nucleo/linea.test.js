// La regla del motor: el estado en el instante t depende SOLO de t. Estos
// tests la verifican desde varios lados, sin abrir un navegador.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compilar } from '../../src/nucleo/index.js';
import { caja, texto, tabla } from '../../src/piezas/index.js';

// Una escena chiquita: una caja que aparece y después se mueve.
function escenaSimple(extra = {}) {
    return {
        ancho: 1000,
        alto: 500,
        piezas: { a: caja({ x: 100, y: 250, opacidad: 0 }) },
        linea: [
            { capitulo: 'Aparece' },
            { pieza: 'a', a: { opacidad: 1 }, dur: 1, curva: 'lineal' },
            { capitulo: 'Se mueve' },
            { pieza: 'a', a: { x: 900 }, dur: 2, curva: 'lineal' },
        ],
        ...extra,
    };
}

describe('el estado en un instante', () => {
    test('antes, durante y después de una animación', () => {
        const e = compilar(escenaSimple());
        assert.equal(e.estado(0).piezas.a.opacidad, 0);
        assert.equal(e.estado(0.5).piezas.a.opacidad, 0.5);
        assert.equal(e.estado(1).piezas.a.opacidad, 1);
        // La segunda animación arranca cuando termina la primera.
        assert.equal(e.estado(1).piezas.a.x, 100);
        assert.equal(e.estado(2).piezas.a.x, 500);
        assert.equal(e.estado(3).piezas.a.x, 900);
    });

    test('lo que no se anima queda como se definió', () => {
        const e = compilar(escenaSimple());
        assert.equal(e.estado(2.2).piezas.a.y, 250);
        assert.equal(e.estado(2.2).piezas.a.ancho, 280);
    });

    test('la duración es el final de la última animación, más la pausa final', () => {
        assert.equal(compilar(escenaSimple()).duracion, 3);
        assert.equal(compilar(escenaSimple({ pausaFinal: 2 })).duracion, 5);
        assert.equal(compilar(escenaSimple({ duracion: 10 })).duracion, 10);
    });

    test('fuera de la escena se ve el principio o el final, no se rompe', () => {
        const e = compilar(escenaSimple());
        assert.deepEqual(e.estado(-5), e.estado(0));
        assert.deepEqual(e.estado(99), e.estado(3));
    });
});

describe('determinismo', () => {
    test('el mismo instante da exactamente el mismo estado', () => {
        const e = compilar(escenaSimple());
        assert.deepEqual(e.estado(1.7), e.estado(1.7));
    });

    test('no importa por dónde se llegó: de corrido, salteando o para atrás', () => {
        const e = compilar(escenaSimple());
        const directo = e.estado(2.25);
        for (let t = 0; t <= 3; t += 0.1) e.estado(t);
        e.estado(0.3);
        assert.deepEqual(e.estado(2.25), directo);
    });

    test('compilar dos veces la misma escena da lo mismo', () => {
        const a = compilar(escenaSimple());
        const b = compilar(escenaSimple());
        for (const t of [0, 0.4, 1.1, 2.9]) assert.deepEqual(a.estado(t), b.estado(t));
    });
});

describe('cuándo empieza cada cosa', () => {
    const conPosiciones = (en) => ({
        ancho: 100,
        alto: 100,
        piezas: { a: caja(), b: caja() },
        linea: [
            { pieza: 'a', a: { x: 10 }, dur: 2 },
            { pieza: 'b', a: { x: 10 }, dur: 1, en },
        ],
    });
    // El instante en que empieza a moverse b.
    const inicioDeB = (en) => {
        const e = compilar(conPosiciones(en));
        for (let t = 0; t <= 5; t += 0.05) if (e.estado(t).piezas.b.x > 0) return Math.round((t - 0.05) * 10) / 10;
        return null;
    };

    test('sin "en": después de todo lo anterior', () => assert.equal(inicioDeB(undefined), 2));
    test('un número: a esa altura', () => assert.equal(inicioDeB(0.5), 0.5));
    test("'+1': un segundo después de todo lo anterior", () => assert.equal(inicioDeB('+1'), 3));
    test("'<': junto con lo anterior", () => assert.equal(inicioDeB('<'), 0));
    test("'<0.5': medio segundo después de que empezó lo anterior", () => assert.equal(inicioDeB('<0.5'), 0.5));
    test("'>-1': un segundo antes de que termine lo anterior", () => assert.equal(inicioDeB('>-1'), 1));

    test('un subtítulo en el medio no atrasa lo que sigue', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { a: caja({ opacidad: 0 }) },
            linea: [
                { subtitulo: 'Un texto largo que dura bastante', dur: 5 },
                { pieza: 'a', a: { opacidad: 1 }, dur: 1, curva: 'lineal' },
            ],
        });
        assert.equal(e.estado(0.5).piezas.a.opacidad, 0.5);
        // Pero la escena dura hasta que termina el subtítulo.
        assert.equal(e.duracion, 5);
    });

    test('escalonar: varias piezas, una atrás de la otra', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { a: caja({ opacidad: 0 }), b: caja({ opacidad: 0 }), c: caja({ opacidad: 0 }) },
            linea: [{ pieza: ['a', 'b', 'c'], a: { opacidad: 1 }, dur: 1, escalonar: 0.5, curva: 'lineal' }],
        });
        const { a, b, c } = e.estado(1).piezas;
        assert.deepEqual([a.opacidad, b.opacidad, c.opacidad], [1, 0.5, 0]);
        assert.equal(e.duracion, 2);
    });
});

describe('animaciones que se pisan', () => {
    test('manda la que empezó después, y parte de donde estaba la otra', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { a: caja({ x: 0 }) },
            linea: [
                { pieza: 'a', a: { x: 100 }, dur: 2, curva: 'lineal' },
                { pieza: 'a', a: { x: 0 }, dur: 1, curva: 'lineal', en: 1 },
            ],
        });
        // En t=1 la primera iba por la mitad (x=50): la segunda arranca ahí.
        assert.equal(e.estado(1).piezas.a.x, 50);
        assert.equal(e.estado(1.5).piezas.a.x, 25);
        assert.equal(e.estado(2).piezas.a.x, 0);
    });

    test('"desde" fija de dónde parte', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { a: caja({ x: 0 }) },
            linea: [{ pieza: 'a', desde: { x: 200 }, a: { x: 300 }, dur: 1, curva: 'lineal' }],
        });
        assert.equal(e.estado(0.5).piezas.a.x, 250);
    });
});

describe('colores, textos y lo que no es un número', () => {
    test('un color en el medio es una mezcla de los dos', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { a: caja({ relleno: 'superficie' }) },
            linea: [{ pieza: 'a', a: { relleno: 'acento' }, dur: 1, curva: 'lineal' }],
        });
        assert.equal(e.estado(0).piezas.a.relleno, 'superficie');
        assert.equal(e.estado(0.25).piezas.a.relleno, 'color-mix(in srgb, var(--ma-superficie) 75%, var(--ma-acento))');
        assert.equal(e.estado(1).piezas.a.relleno, 'acento');
    });

    test('un texto cambia de golpe cuando termina su animación', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { t: texto({ texto: 'antes' }) },
            linea: [{ pieza: 't', a: { texto: 'después' }, dur: 1, en: 2 }],
        });
        assert.equal(e.estado(2.9).piezas.t.texto, 'antes');
        assert.equal(e.estado(3).piezas.t.texto, 'después');
    });

    test('de "todas las filas" (Infinity) a un número salta, no da NaN', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { t: tabla({ columnas: ['A'], filas: [['1'], ['2']] }) },
            linea: [{ pieza: 't', a: { filasVisibles: 1 }, dur: 1 }],
        });
        assert.equal(e.estado(0.5).piezas.t.filasVisibles, Infinity);
        assert.equal(e.estado(1).piezas.t.filasVisibles, 1);
    });
});

describe('capítulos y subtítulos', () => {
    test('en qué capítulo se está', () => {
        const e = compilar(escenaSimple());
        assert.deepEqual(e.capitulos, [{ nombre: 'Aparece', t: 0 }, { nombre: 'Se mueve', t: 1 }]);
        assert.equal(e.estado(0.5).capitulo, 0);
        assert.equal(e.estado(1).capitulo, 1);
    });

    test('qué subtítulo se ve', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: {},
            linea: [
                { subtitulo: 'Uno', en: 0, dur: 2 },
                { subtitulo: 'Dos', en: 1, dur: 2 },
            ],
        });
        assert.equal(e.estado(0.5).subtitulo, 'Uno');
        // Se pisan: se ve el que empezó último.
        assert.equal(e.estado(1.5).subtitulo, 'Dos');
        assert.equal(e.estado(3.5).subtitulo, '');
    });

    test('un subtítulo sin duración dura lo que se tarda en leerlo', () => {
        const largo = 'a'.repeat(60);
        const e = compilar({ ancho: 100, alto: 100, piezas: {}, linea: [{ subtitulo: largo, en: 0 }] });
        assert.equal(e.subtitulos[0].hasta, 4);
    });
});

describe('movimiento reducido', () => {
    test('lo que se desplaza salta, lo que se desvanece se sigue desvaneciendo', () => {
        const e = compilar(escenaSimple(), { movimiento: 'reducido' });
        assert.equal(e.estado(0.5).piezas.a.opacidad, 0.5);
        // En la mitad del movimiento ya está en su lugar final.
        assert.equal(e.estado(1.1).piezas.a.x, 900);
        // Pero no antes de que le toque.
        assert.equal(e.estado(0.9).piezas.a.x, 100);
    });
});

describe('disposiciones', () => {
    test('una escena puede ser distinta en angosto', () => {
        const definicion = (d) => ({
            ancho: d.nombre === 'angosta' ? 900 : 1600,
            alto: d.nombre === 'angosta' ? 1600 : 900,
            piezas: {},
            linea: [],
        });
        assert.equal(compilar(definicion).ancho, 1600);
        assert.equal(compilar(definicion, { disposicion: { nombre: 'angosta' } }).ancho, 900);
    });
});

describe('errores que explican qué pasó', () => {
    test('una propiedad mal escrita', () => {
        assert.throws(
            () => compilar({ ancho: 1, alto: 1, piezas: { a: caja() }, linea: [{ pieza: 'a', a: { opacida: 1 } }] }),
            /"a" \(una caja\) no tiene la propiedad "opacida"/,
        );
    });

    test('una pieza que no existe', () => {
        assert.throws(
            () => compilar({ ancho: 1, alto: 1, piezas: {}, linea: [{ pieza: 'nada', a: { x: 1 } }] }),
            /no hay ninguna pieza que se llame así/,
        );
    });

    test('un "en" que no se entiende', () => {
        assert.throws(
            () => compilar({ ancho: 1, alto: 1, piezas: { a: caja() }, linea: [{ pieza: 'a', a: { x: 1 }, en: 'después' }] }),
            /no se entiende/,
        );
    });

    test('una escena sin tamaño', () => {
        assert.throws(() => compilar({ piezas: {}, linea: [] }), /le falta el ancho/);
    });

    test('una pieza dentro de sí misma', () => {
        assert.throws(
            () => compilar({ ancho: 1, alto: 1, piezas: { a: caja({ dentro: 'b' }), b: caja({ dentro: 'a' }) }, linea: [] }),
            /dentro de sí misma/,
        );
    });

    test('una propiedad que la pieza no tiene, al crearla', () => {
        assert.throws(() => caja({ colr: 'acento' }), /Una caja no tiene "colr"/);
    });
});
