// Lo que se agregó para la escena de la Expo: la cámara, el contador, el
// cilindro, y esperar a que se termine de leer un subtítulo.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compilar } from '../../src/nucleo/index.js';
import {
    caja, camara, contador, cilindro, formatearNumero, posicionAbsoluta, aCoordenadasDe,
} from '../../src/piezas/index.js';

describe('esperar a que se termine de leer', () => {
    test("espera: 'subtitulo' frena lo que sigue hasta que termina el último subtítulo", () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { a: caja({ opacidad: 0 }) },
            linea: [
                { subtitulo: 'Algo para leer', en: 0, dur: 4 },
                { espera: 'subtitulo' },
                { pieza: 'a', a: { opacidad: 1 }, dur: 1, curva: 'lineal' },
            ],
        });
        assert.equal(e.estado(3.9).piezas.a.opacidad, 0);
        assert.equal(e.estado(4.5).piezas.a.opacidad, 0.5);
    });

    test('si el subtítulo ya terminó, no espera nada', () => {
        const e = compilar({
            ancho: 100,
            alto: 100,
            piezas: { a: caja({ x: 0 }) },
            linea: [
                { subtitulo: 'Corto', en: 0, dur: 1 },
                { pieza: 'a', a: { x: 10 }, dur: 3 },
                { espera: 'subtitulo' },
                { pieza: 'a', a: { x: 20 }, dur: 1 },
            ],
        });
        assert.equal(e.duracion, 4);
    });

    test('"lectura" cambia el ritmo: con 10 caracteres por segundo, 40 caracteres son 4 s', () => {
        const e = compilar({ ancho: 1, alto: 1, lectura: 10, piezas: {}, linea: [{ subtitulo: 'x'.repeat(40), en: 0 }] });
        assert.equal(e.subtitulos[0].hasta, 4);
    });
});

describe('cámara', () => {
    const tipos = { cam: camara.tipo, a: caja.tipo };
    const estadoCon = (cam) => ({
        piezas: {
            cam: camara({ x: 320, y: 640, ...cam }).props,
            a: caja({ dentro: 'cam', x: 300, y: 360, ancho: 100, alto: 50 }).props,
        },
    });

    test('lo que la cámara mira queda en el centro de su ventana', () => {
        const p = posicionAbsoluta('a', estadoCon({ mirarX: 300, mirarY: 360, zoom: 1.5 }), tipos);
        assert.deepEqual({ x: p.x, y: p.y }, { x: 320, y: 640 });
    });

    test('el zoom agranda lo de adentro', () => {
        const p = posicionAbsoluta('a', estadoCon({ mirarX: 300, mirarY: 360, zoom: 2 }), tipos);
        assert.deepEqual({ ancho: p.ancho, alto: p.alto }, { ancho: 200, alto: 100 });
    });

    test('ir y volver: un punto pasado a coordenadas de la cámara vuelve al mismo lugar', () => {
        const estado = estadoCon({ mirarX: 800, mirarY: 500, zoom: 1.25 });
        const local = aCoordenadasDe({ x: 100, y: 200 }, 'cam', estado, tipos);
        assert.ok(Math.abs(320 + 1.25 * (local.x - 800) - 100) < 1e-9);
        assert.ok(Math.abs(640 + 1.25 * (local.y - 500) - 200) < 1e-9);
        assert.equal(local.escala, 1.25);
    });

    test('moverla es animar mirarX, mirarY y zoom, como cualquier pieza', () => {
        const e = compilar({
            ancho: 640,
            alto: 1140,
            piezas: { cam: camara({ x: 320, y: 640, mirarX: 0, zoom: 1 }) },
            linea: [{ pieza: 'cam', a: { mirarX: 100, zoom: 2 }, dur: 1, curva: 'lineal' }],
        });
        assert.deepEqual(
            [e.estado(0.5).piezas.cam.mirarX, e.estado(0.5).piezas.cam.zoom],
            [50, 1.5],
        );
    });

    test('con movimiento reducido, la cámara corta en vez de viajar', () => {
        const e = compilar(
            {
                ancho: 1,
                alto: 1,
                piezas: { cam: camara({ mirarX: 0 }) },
                linea: [{ pieza: 'cam', a: { mirarX: 100 }, dur: 1 }],
            },
            { movimiento: 'reducido' },
        );
        assert.equal(e.estado(0.1).piezas.cam.mirarX, 100);
    });
});

describe('contador', () => {
    test('escribe los números en castellano', () => {
        assert.equal(formatearNumero(83), '83');
        assert.equal(formatearNumero(1234567), '1.234.567');
        assert.equal(formatearNumero(3.14159, 2), '3,14');
        assert.equal(formatearNumero(-1500.5, 1), '-1.500,5');
        // Un -0,0 no se muestra con signo.
        assert.equal(formatearNumero(-0.01, 1), '0,0');
    });

    test('animado de 0 a 83, en la mitad muestra 41 o 42, nunca 41,5', () => {
        const e = compilar({
            ancho: 1,
            alto: 1,
            piezas: { n: contador({ valor: 0 }) },
            linea: [{ pieza: 'n', a: { valor: 83 }, dur: 1, curva: 'lineal' }],
        });
        assert.equal(formatearNumero(e.estado(0.5).piezas.n.valor), '42');
    });
});

describe('cilindro', () => {
    test('se llena con "nivel" y se le puede enganchar una flecha', () => {
        const c = cilindro({ ancho: 200, alto: 140, nivel: 0.5 });
        assert.equal(c.props.nivel, 0.5);
        assert.deepEqual(c.tipo.tamano(c.props), { ancho: 200, alto: 140 });
    });
});
