// La capa de matemática: primero que las cuentas den lo que tienen que dar (si
// la animación mostrara un número mal, enseñaría mal), y después que las
// escenas se armen y se recorran sin errores.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compilar } from '../../src/nucleo/index.js';
import {
    derivada, gradiente, cocienteIncremental, descensoGradiente, regresionLineal, sumaResiduos, curvaDeNivel,
    euclides, modulo, propiedadesRelacion, matrizRelacion, pasoLindo, numero, analizarCuenta,
    desdeDerivada, desdeDescenso, desdeRegresion, desdeEuclides, desdeRelacion, desdeModulo,
    plano, grafica, punto,
} from '../../src/mate/index.js';

const cerca = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} no es ${b}`);

describe('las cuentas', () => {
    test('la derivada y el gradiente numéricos', () => {
        cerca(derivada((x) => x * x, 3), 6);
        cerca(derivada(Math.sin, 0), 1);
        const [gx, gy] = gradiente((x, y) => x * x * y + y ** 3, 1, 2);
        cerca(gx, 4);
        cerca(gy, 13);
        // El cociente incremental de x² en 1 es exactamente 2 + h.
        cerca(cocienteIncremental((x) => x * x, 1, 0.5), 2.5);
    });

    test('el descenso del gradiente llega al mínimo, rebota o diverge según la tasa', () => {
        const f = (x, y) => x * x + 3 * y * y;
        const grad = (x, y) => [2 * x, 6 * y];
        const bien = descensoGradiente(f, { inicio: [-3, 2], tasa: 0.1, pasos: 200, gradiente: grad });
        assert.equal(bien.motivo, 'minimo');
        cerca(bien.puntos.at(-1).x, 0, 1e-5);
        cerca(bien.puntos.at(-1).y, 0, 1e-5);
        // Cada paso es exactamente x − α∇f: en x multiplica por 1 − 2α.
        cerca(bien.puntos[1].x, -3 * 0.8);
        cerca(bien.puntos[1].y, 2 * 0.4);
        const mal = descensoGradiente(f, { inicio: [-3, 2], tasa: 0.4, pasos: 200, gradiente: grad });
        assert.equal(mal.motivo, 'diverge');
    });

    test('la regresión lineal: una recta exacta, y valores conocidos', () => {
        const exacta = regresionLineal([[0, 1], [1, 3], [2, 5], [3, 7]]);
        cerca(exacta.b0, 1);
        cerca(exacta.b1, 2);
        cerca(exacta.r2, 1);
        cerca(exacta.ssr, 0);
        // Calculado a mano: x̄ = 3, ȳ = 4, Sxx = 10, Sxy = 9.
        const r = regresionLineal([[1, 2], [2, 3], [3, 5], [4, 4], [5, 6]]);
        cerca(r.b1, 0.9);
        cerca(r.b0, 1.3);
        cerca(r.ssr, sumaResiduos([[1, 2], [2, 3], [3, 5], [4, 4], [5, 6]], r.b0, r.b1));
        cerca(r.r * r.r, r.r2);
        assert.throws(() => regresionLineal([[1, 2], [1, 3]]), /mismo x/);
    });

    test('las curvas de nivel de x² + y² son circunferencias', () => {
        const segmentos = curvaDeNivel((x, y) => x * x + y * y, { xmin: -2, xmax: 2, ymin: -2, ymax: 2 }, 1, 40);
        assert.ok(segmentos.length > 20);
        for (const [x1, y1, x2, y2] of segmentos) {
            cerca(Math.hypot(x1, y1), 1, 0.02);
            cerca(Math.hypot(x2, y2), 1, 0.02);
        }
    });

    test('Euclides: cada división y el mcd', () => {
        const { mcd, pasos } = euclides(1071, 462);
        assert.equal(mcd, 21);
        assert.deepEqual(pasos.map((p) => [p.a, p.q, p.b, p.r]), [[1071, 2, 462, 147], [462, 3, 147, 21], [147, 7, 21, 0]]);
        assert.equal(euclides(462, 1071).mcd, 21);
        assert.equal(euclides(-90, 90).mcd, 90);
        assert.equal(euclides(17, 5).mcd, 1);
        assert.throws(() => euclides(0, 0), /no está definido/);
    });

    test('el resto modular siempre queda entre 0 y n − 1', () => {
        assert.equal(modulo(14, 12), 2);
        assert.equal(modulo(-3, 12), 9);
        assert.equal(modulo(387, 5), 2);
        assert.deepEqual(analizarCuenta('2 - 5'), { a: 2, op: '-', b: 5, valor: -3, texto: '2 − 5' });
        assert.equal(analizarCuenta('4 · 5').valor, 20);
        assert.throws(() => analizarCuenta('2 ^ 5'), /No entiendo/);
    });

    test('las propiedades de una relación, con el contraejemplo', () => {
        const A = [1, 2, 3, 4];
        const R = [[1, 1], [2, 2], [3, 3], [4, 4], [1, 2], [2, 1], [3, 4]];
        const p = propiedadesRelacion(A, R);
        assert.equal(p.reflexiva.cumple, true);
        assert.equal(p.simetrica.cumple, false);
        assert.deepEqual(p.simetrica.contraejemplo, [3, 4]);
        assert.equal(p.antisimetrica.cumple, false);
        assert.equal(p.transitiva.cumple, true);
        assert.equal(p.equivalencia, false);
        // Tener el mismo resto al dividir por 2 es de equivalencia.
        const paridad = [];
        for (const a of A) for (const b of A) if ((a - b) % 2 === 0) paridad.push([a, b]);
        assert.equal(propiedadesRelacion(A, paridad).equivalencia, true);
        // Transitiva no: está (1, 2) y (2, 3), pero falta (1, 3).
        const t = propiedadesRelacion([1, 2, 3], [[1, 2], [2, 3]]).transitiva;
        assert.deepEqual(t.contraejemplo.falta, [1, 3]);
        assert.deepEqual(matrizRelacion([1, 2], [[1, 2]]), [[0, 1], [0, 0]]);
    });

    test('los números de los ejes y los que se muestran', () => {
        assert.equal(pasoLindo(10, 8), 1);
        assert.equal(pasoLindo(100, 8), 10);
        assert.equal(pasoLindo(3, 8), 0.5);
        assert.equal(numero(2.5), '2,5');
        assert.equal(numero(-0.0001), '0');
        assert.equal(numero(1 / 3, 3), '0,333');
    });
});

describe('las piezas', () => {
    test('las piezas que van sobre un plano piden el plano', () => {
        assert.throws(() => grafica({ f: (x) => x }), /va sobre un plano/);
        assert.throws(() => punto({ mx: 1 }), /va sobre un plano/);
        assert.throws(() => plano({ xmin: 2, xmax: 1 }), /xmax mayor/);
        assert.throws(() => grafica({ plano: 'p' }), /qué dibujar/);
    });
});

describe('las escenas', () => {
    const escenas = {
        derivada: desdeDerivada({ f: (x) => x * x, x0: 1, expresion: 'x²', preguntas: { limite: { pregunta: '¿?', opciones: ['1', '2'], correcta: 1 } } }),
        descenso: desdeDescenso({ f: (x, y) => x * x + 3 * y * y, inicio: [-3, 2], tasa: 0.1, expresion: 'x² + 3y²' }),
        zigzag: desdeDescenso({ f: (x, y) => x * x + 3 * y * y, inicio: [-3, 2], tasa: 0.3, pasos: 8 }),
        regresion: desdeRegresion({ datos: [[1, 2], [2, 3], [3, 5], [4, 4], [5, 6]], predecir: [3.5, 12] }),
        euclides: desdeEuclides({ a: 1071, b: 462 }),
        relacion: desdeRelacion({ conjunto: [1, 2, 3], pares: [[1, 1], [1, 2], [2, 3]] }),
        modulo: desdeModulo({ n: 12, cuentas: ['9 + 5', '4 * 5', '100', '2 - 5'] }),
    };

    for (const [nombre, escena] of Object.entries(escenas)) {
        test(`${nombre}: se arma ancha y angosta, y se recorre sin errores`, () => {
            for (const disposicion of ['ancha', 'angosta']) {
                const c = compilar(escena, { disposicion: { nombre: disposicion } });
                assert.ok(c.duracion > 10);
                assert.ok(c.capitulos.length >= 2);
                for (let t = 0; t <= c.duracion; t += 0.25) c.estado(t);
            }
        });
    }

    test('la derivada termina mostrando f′(1) = 2, con la tangente dibujada', () => {
        const c = compilar(escenas.derivada);
        const fin = c.estado(c.duracion).piezas;
        assert.equal(fin.valorDerivada.texto, 'f′(1) = 2');
        assert.equal(fin.tangente.progreso, 1);
        cerca(fin.tangente.pendiente, 2);
        // Mientras h se achica, Q está siempre sobre la parábola.
        for (let t = 0; t <= c.duracion; t += 0.37) {
            const q = c.estado(t).piezas.Q;
            cerca(q.my, q.mx * q.mx, 0.05);
        }
    });

    test('la regresión termina con la recta de mínimos cuadrados y avisa al extrapolar', () => {
        const c = compilar(escenas.regresion);
        const fin = c.estado(c.duracion);
        cerca(fin.piezas.recta.pendiente, 0.9);
        assert.ok(c.subtitulos.some((s) => s.texto.includes('extrapolar')));
        assert.ok(c.subtitulos.some((s) => s.texto.includes('dentro del rango')));
    });

    test('el reloj modular cae en el resto correcto', () => {
        const c = compilar(escenas.modulo);
        const textos = c.subtitulos.map((s) => s.texto).join(' ');
        assert.match(textos, /9 \+ 5 ≡ 2/);
        assert.match(textos, /4 · 5 ≡ 8/);
        assert.match(textos, /100 ≡ 4/);
        assert.match(textos, /2 − 5 ≡ 9/);
    });

    test('el zigzag avisa que rebota, en vez de sugerir una tasa más grande', () => {
        const c = compilar(escenas.zigzag);
        assert.ok(c.subtitulos.some((s) => s.texto.includes('rebotando')));
    });
});
