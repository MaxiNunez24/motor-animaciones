// Las cuentas del globo 3D: que el mapa plano, la esfera y el giro de la
// cámara coincidan. Si no coinciden, la flecha de los vientos aparece en otro
// océano, o la cámara "mira la Argentina" y muestra Australia.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { aPixel, posicionEnEsfera, haciaElEste, giroParaMirar } from '../../src/3d/esfera.js';

const cerca = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} ≠ ${b}`);

// Aplica el giro como lo hace Three.js con rotation.x y rotation.y (orden XYZ):
// primero el giro sobre el eje vertical, después el del horizontal.
function girar({ x, y, z }, giro) {
    const x1 = x * Math.cos(giro.y) + z * Math.sin(giro.y);
    const z1 = -x * Math.sin(giro.y) + z * Math.cos(giro.y);
    const y2 = y * Math.cos(giro.x) - z1 * Math.sin(giro.x);
    const z2 = y * Math.sin(giro.x) + z1 * Math.cos(giro.x);
    return { x: x1, y: y2, z: z2 };
}

describe('el mapa plano', () => {
    test('las esquinas y el centro', () => {
        assert.deepEqual(aPixel(-180, 90, 2048, 1024), { x: 0, y: 0 });
        assert.deepEqual(aPixel(0, 0, 2048, 1024), { x: 1024, y: 512 });
        assert.deepEqual(aPixel(180, -90, 2048, 1024), { x: 2048, y: 1024 });
    });
});

describe('la esfera', () => {
    test('el polo norte está arriba', () => {
        const p = posicionEnEsfera(0, 90);
        cerca(p.x, 0, 'x');
        cerca(p.y, 1, 'y');
        cerca(p.z, 0, 'z');
    });

    test('la longitud -90 mira a la cámara, y el este de ahí va a la derecha', () => {
        const p = posicionEnEsfera(-90, 0);
        cerca(p.z, 1, 'z');
        const e = haciaElEste(-90);
        cerca(e.x, 1, 'el este, a la derecha');
    });

    test('cada punto está a distancia r del centro', () => {
        const p = posicionEnEsfera(-63, -34, 1.03);
        cerca(Math.hypot(p.x, p.y, p.z), 1.03, 'radio');
    });

    test('el este es tangente: perpendicular al radio', () => {
        for (const lon of [-170, -63, 0, 120]) {
            const p = posicionEnEsfera(lon, 10);
            const e = haciaElEste(lon);
            cerca(p.x * e.x + p.y * e.y + p.z * e.z, 0, `lon ${lon}`);
        }
    });
});

describe('mirar un lugar', () => {
    for (const [nombre, lon, lat] of [['Argentina', -63, -34], ['el Pacífico', -120, 0], ['Indonesia', 118, -2], ['el polo', 0, 80]]) {
        test(`después del giro, ${nombre} queda de frente a la cámara`, () => {
            const p = girar(posicionEnEsfera(lon, lat), giroParaMirar(lon, lat));
            cerca(p.x, 0, 'x');
            cerca(p.y, 0, 'y');
            cerca(p.z, 1, 'z');
        });
    }
});
