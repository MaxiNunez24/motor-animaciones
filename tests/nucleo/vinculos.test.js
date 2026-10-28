// Los vínculos (pegar y filas), el espejo, la cámara con forma y las flechas
// enganchadas a un costado: todo con números, sin abrir un navegador.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compilar } from '../../src/nucleo/index.js';
import { caja, texto, fila, flecha, camara, espejo, caminoFlecha, posicionAbsoluta } from '../../src/piezas/index.js';
import { codigo, lineaDeCodigo } from '../../src/pedagogico/index.js';
import { puntoDelLado } from '../../src/piezas/flecha.js';

const cerca = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} no es ${b}`);
const escena = (piezas, linea = []) => compilar({ ancho: 1600, alto: 900, piezas, linea });

describe('pegar', () => {
    test('a cada costado, con separación, y alineada', () => {
        const base = caja({ x: 500, y: 400, ancho: 200, alto: 100 });
        const chica = (pegar) => caja({ ancho: 60, alto: 40, pegar: { a: 'base', ...pegar } });
        const e = escena({
            base,
            der: chica({ lado: 'derecha', separacion: 10 }),
            izq: chica({ lado: 'izquierda' }),
            arr: chica({ lado: 'arriba', separacion: 5, alinear: 'inicio' }),
            aba: chica({ lado: 'abajo', alinear: 'fin', dx: 3 }),
            cen: chica({ lado: 'centro' }),
        }).estado(0).piezas;
        assert.deepEqual([e.der.x, e.der.y], [500 + 100 + 10 + 30, 400]);
        assert.deepEqual([e.izq.x, e.izq.y], [500 - 100 - 30, 400]);
        assert.deepEqual([e.arr.x, e.arr.y], [400 + 30, 400 - 50 - 5 - 20]);
        assert.deepEqual([e.aba.x, e.aba.y], [600 - 30 + 3, 450 + 20]);
        assert.deepEqual([e.cen.x, e.cen.y], [500, 400]);
    });

    test('sigue a la otra cuando se mueve o crece, y en cadena', () => {
        const c = escena({
            a: caja({ x: 300, y: 300, ancho: 100, alto: 100 }),
            b: caja({ ancho: 100, alto: 100, pegar: { a: 'a', lado: 'derecha' } }),
            c: caja({ ancho: 100, alto: 100, pegar: { a: 'b', lado: 'derecha' } }),
        }, [{ pieza: 'a', a: { x: 500, ancho: 300 }, dur: 1 }]);
        assert.equal(c.estado(0).piezas.c.x, 500);
        // a terminó en x = 500 con 300 de ancho: su borde derecho está en 650.
        assert.equal(c.estado(1).piezas.b.x, 700);
        assert.equal(c.estado(1).piezas.c.x, 800);
    });

    test('pegado mezcla la posición propia con la pegada', () => {
        const c = escena({
            a: caja({ x: 0, y: 0, ancho: 100, alto: 100 }),
            b: caja({ x: 1000, y: 500, ancho: 100, alto: 100, pegar: { a: 'a', lado: 'derecha' } }),
        }, [{ pieza: 'b', a: { pegado: 0 }, dur: 1 }]);
        assert.deepEqual([c.estado(0).piezas.b.x, c.estado(0).piezas.b.y], [100, 0]);
        assert.deepEqual([c.estado(0.5).piezas.b.x, c.estado(0.5).piezas.b.y], [550, 250]);
        assert.deepEqual([c.estado(1).piezas.b.x, c.estado(1).piezas.b.y], [1000, 500]);
    });

    test('un texto alineado a la izquierda se pega por lo que se ve, no por su x', () => {
        const e = escena({
            a: caja({ x: 100, y: 100, ancho: 100, alto: 50 }),
            t: texto({ texto: 'hola', tamano: 20, alineacion: 'inicio', pegar: { a: 'a', lado: 'derecha', separacion: 10 } }),
        }).estado(0).piezas;
        // Con 'inicio', x es el borde izquierdo de lo escrito.
        assert.equal(e.t.x, 160);
    });

    test('dentro de una cámara, la posición se pasa a las coordenadas de adentro', () => {
        const e = escena({
            cam: camara({ x: 800, y: 450, zoom: 2, mirarX: 0, mirarY: 0 }),
            a: caja({ x: 100, y: 0, ancho: 100, alto: 100 }),
            b: caja({ ancho: 50, alto: 50, dentro: 'cam', pegar: { a: 'a', lado: 'derecha' } }),
        }).estado(0).piezas;
        const tipos = { cam: camara.tipo, a: caja.tipo, b: caja.tipo };
        const b = posicionAbsoluta('b', { piezas: e }, tipos);
        cerca(b.x - b.ancho / 2, 150);
        cerca(b.y, 0);
    });

    test('los errores se dicen al compilar', () => {
        assert.throws(() => escena({ b: caja({ pegar: { lado: 'derecha' } }) }), /le falta "a"/);
        assert.throws(() => escena({ b: caja({ pegar: { a: 'nadie' } }) }), /no hay ninguna pieza/);
        assert.throws(() => escena({ a: caja({}), b: caja({ pegar: { a: 'a', lado: 'costado' } }) }), /los lados son/);
        const vuelta = escena({ a: caja({ pegar: { a: 'b' } }), b: caja({ pegar: { a: 'a' } }) });
        assert.throws(() => vuelta.estado(0), /dando una vuelta/);
    });
});

describe('fila', () => {
    const tres = (extra = {}) => ({
        f: fila({ x: 800, y: 400, piezas: ['a', 'b', 'c'], separacion: 20, ...extra }),
        a: caja({ ancho: 100, alto: 50 }),
        b: caja({ ancho: 200, alto: 100 }),
        c: caja({ ancho: 100, alto: 50 }),
    });

    test('acomoda una al lado de la otra, centradas, y mide lo que suman', () => {
        const e = escena(tres()).estado(0).piezas;
        // 100 + 20 + 200 + 20 + 100 = 440, centrado en 800: arranca en 580.
        assert.deepEqual([e.a.x, e.b.x, e.c.x], [630, 800, 970]);
        assert.deepEqual([e.a.y, e.b.y, e.c.y], [400, 400, 400]);
        assert.deepEqual([e.f.ancho, e.f.alto], [440, 100]);
    });

    test('alineadas arriba, y en columna', () => {
        const e = escena(tres({ alinear: 'inicio' })).estado(0).piezas;
        assert.deepEqual([e.a.y, e.b.y], [375, 400]);
        const v = escena(tres({ direccion: 'vertical' })).estado(0).piezas;
        // 50 + 20 + 100 + 20 + 50 = 240, centrado en 400.
        assert.deepEqual([v.a.y, v.b.y, v.c.y], [305, 400, 495]);
        assert.deepEqual([v.f.ancho, v.f.alto], [200, 240]);
    });

    test('si una crece, corre a las demás; una que entra con escala 0 no ocupa ni abre su hueco', () => {
        const c = escena({ ...tres(), d: caja({ ancho: 100, alto: 50, escala: 0 }), f: fila({ x: 800, y: 400, piezas: ['a', 'b', 'c', 'd'], separacion: 20 }) }, [
            { pieza: 'b', a: { ancho: 400 }, dur: 1 },
            { pieza: 'd', a: { escala: 1 }, dur: 1 },
        ]);
        const antes = c.estado(0).piezas;
        assert.equal(antes.f.ancho, 440);
        const despues = c.estado(2).piezas;
        assert.equal(despues.f.ancho, 100 + 20 + 400 + 20 + 100 + 20 + 100);
        assert.ok(despues.c.x - despues.b.x === 250 + 20, 'c tendría que quedar a 20 del borde de b');
        // A mitad de camino, el hueco de d es la mitad.
        const medio = c.estado(1.5).piezas;
        assert.equal(medio.f.ancho, 100 + 20 + 400 + 20 + 100 + 10 + 50);
    });

    test('una pieza pegada a la fila la sigue; y la fila no acepta piezas pegadas ni repetidas', () => {
        const e = escena({ ...tres({ margen: 10 }), pie: caja({ ancho: 100, alto: 40, pegar: { a: 'f', lado: 'abajo', separacion: 5 } }) }).estado(0).piezas;
        assert.equal(e.pie.y, 400 + 50 + 10 + 5 + 20);
        assert.throws(() => escena({ ...tres(), a: caja({ pegar: { a: 'c' } }) }), /es una cosa o la otra/);
        assert.throws(() => escena({ ...tres(), g: fila({ piezas: ['a'] }) }), /en dos filas/);
        assert.throws(() => escena({ f: fila({ piezas: ['x'] }) }), /no hay ninguna pieza/);
    });

    test('sin vínculos el estado sale igual que siempre', () => {
        const e = escena({ a: caja({ x: 1, y: 2 }) }).estado(0).piezas;
        assert.deepEqual([e.a.x, e.a.y, e.a.pegar, e.a.pegado], [1, 2, null, 1]);
    });
});

describe('flechas, cámara y espejo', () => {
    test('una flecha recta entre una pieza chica y una grande no apunta para atrás', () => {
        const curva = caminoFlecha({ x: 0, y: 0, ancho: 100, alto: 100 }, { x: 400, y: 0, ancho: 600, alto: 100 }, 0, 8);
        cerca(curva.p0.x, 58);
        cerca(curva.p1.x, 92);
        // El control queda entre las puntas: la curva va derecho hacia la grande.
        assert.ok(curva.c.x > curva.p0.x && curva.c.x < curva.p1.x);
    });

    test('enganchada a un costado', () => {
        assert.deepEqual(puntoDelLado({ x: 10, y: 20, ancho: 100, alto: 40 }, 'izquierda', -5), { x: -45, y: 20 });
        assert.deepEqual(puntoDelLado({ x: 10, y: 20, ancho: 100, alto: 40 }, 'abajo'), { x: 10, y: 40 });
        assert.throws(() => flecha({ desde: { pieza: 'a', lado: 'izquierda' } }), /necesita "desde" y "hasta"/);
    });

    test('la cámara y el espejo, redondos o con esquinas', () => {
        assert.deepEqual(camara.tipo.tamano(camara({ ancho: 300, alto: 200, forma: 'circulo' }).props), { ancho: 200, alto: 200 });
        assert.throws(() => camara({ forma: 'estrella' }), /'rect' o 'circulo'/);
        assert.deepEqual(espejo.tipo.tamano(espejo({ ancho: 300, alto: 120 }).props), { ancho: 300, alto: 120 });
        assert.throws(() => espejo({ zoom: 0 }), /mayor que 0/);
        // Un espejo se recorre como cualquier pieza, animando lo que mira.
        const c = escena({ e: espejo({ mirarX: 0 }) }, [{ pieza: 'e', a: { mirarX: 100, zoom: 3 }, dur: 1 }]);
        assert.equal(c.estado(0.5).piezas.e.mirarX, 50);
    });

    test('lineaDeCodigo: dónde está cada línea', () => {
        const cod = codigo({ x: 400, y: 300, ancho: 600, codigo: 'a = 1\nb = 2\nc = 3', tamano: 20, titulo: '' });
        const [l1, l2, l3] = [1, 2, 3].map((k) => lineaDeCodigo(cod, k));
        cerca(l2.y - l1.y, l1.alto);
        cerca(l2.y, 300, 1e-9);
        assert.equal(l3.x, 400);
    });
});
