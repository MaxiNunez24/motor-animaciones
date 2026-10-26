// Las cuentas de las piezas: curvas, azar, renglones, flechas. Todo lo que se
// puede probar con números, sin dibujar.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { curvas, curva, azar } from '../../src/nucleo/index.js';
import { partirLineas, revelar, caminoFlecha, posicionAbsoluta } from '../../src/piezas/index.js';
import { celular } from '../../src/piezas/index.js';
import { caja } from '../../src/piezas/index.js';

describe('curvas', () => {
    // Exactamente 0 y 1, no "casi": ver por qué en curva().
    for (const nombre of Object.keys(curvas)) {
        test(`"${nombre}" empieza exactamente en 0 y termina exactamente en 1`, () => {
            const f = curva(nombre);
            assert.equal(f(0), 0);
            assert.equal(f(1), 1);
        });
    }

    test('"pasarse" se pasa de 1 antes de volver', () => {
        assert.ok(curva('pasarse')(0.7) > 1);
    });

    test('"suave" nunca retrocede', () => {
        let anterior = 0;
        for (let p = 0; p <= 1; p += 0.01) {
            assert.ok(curvas.suave(p) >= anterior);
            anterior = curvas.suave(p);
        }
    });
});

describe('azar con semilla', () => {
    test('la misma semilla da siempre los mismos números', () => {
        const a = azar(42);
        const b = azar(42);
        for (let i = 0; i < 20; i++) assert.equal(a.siguiente(), b.siguiente());
    });

    test('semillas distintas dan números distintos', () => {
        assert.notEqual(azar('papeles').siguiente(), azar('papeles2').siguiente());
    });

    test('entero() respeta los límites, los dos incluidos', () => {
        const r = azar(7);
        const vistos = new Set();
        for (let i = 0; i < 500; i++) vistos.add(r.entero(1, 3));
        assert.deepEqual([...vistos].sort(), [1, 2, 3]);
    });
});

describe('renglones', () => {
    test('parte sin cortar palabras', () => {
        assert.deepEqual(partirLineas('la misma información cargada dos veces', 16), [
            'la misma',
            'información',
            'cargada dos',
            'veces',
        ]);
    });

    test('respeta los saltos de línea que trae', () => {
        assert.deepEqual(partirLineas('uno\ndos'), ['uno', 'dos']);
    });

    test('"escrito" muestra los primeros caracteres de todos los renglones', () => {
        assert.deepEqual(revelar(['hola', 'che'], 0), ['', '']);
        assert.deepEqual(revelar(['hola', 'che'], 6 / 7), ['hola', 'ch']);
        assert.deepEqual(revelar(['hola', 'che'], 1), ['hola', 'che']);
    });

    test('un emoji no se corta al medio', () => {
        // 🥟 son dos "caracteres" para JavaScript, pero una sola letra para quien lo ve.
        assert.deepEqual(revelar(['🥟ab'], 1 / 3), ['🥟']);
    });
});

describe('flechas', () => {
    test('una flecha recta sale del borde de una caja y llega al borde de la otra', () => {
        const a = { x: 0, y: 0, ancho: 100, alto: 50 };
        const b = { x: 300, y: 0, ancho: 100, alto: 50 };
        const { p0, p1 } = caminoFlecha(a, b, 0, 0);
        assert.deepEqual(p0, { x: 50, y: 0 });
        assert.deepEqual(p1, { x: 250, y: 0 });
    });

    test('la separación deja aire entre la flecha y la caja', () => {
        const { p0 } = caminoFlecha({ x: 0, y: 0, ancho: 100, alto: 50 }, { x: 0, y: 300, ancho: 100, alto: 50 }, 0, 10);
        assert.deepEqual(p0, { x: 0, y: 35 });
    });

    test('una pieza dentro de un celular está donde se la ve', () => {
        const tipos = { cel: celular.tipo, boton: caja.tipo };
        const estado = {
            piezas: {
                cel: celular({ x: 500, y: 400, alto: 772 }).props,
                boton: caja({ dentro: 'cel', x: 180, y: 370 }).props,
            },
        };
        // Con alto 772 el celular está a escala 1: el centro de la pantalla (180, 370)
        // es el centro del celular.
        const p = posicionAbsoluta('boton', estado, tipos);
        assert.ok(Math.abs(p.x - 500) < 1e-9 && Math.abs(p.y - 400) < 1e-9, JSON.stringify(p));
    });
});
