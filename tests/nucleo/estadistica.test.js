// La estadística inferencial: los valores críticos y los p-valores contra los
// de las tablas (y contra fórmulas cerradas, donde las hay), la regresión
// contra una cuenta a mano, y que las escenas se armen y se recorran.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compilar } from '../../src/nucleo/index.js';
import {
    normal, normalAcumulada, normalInversa, student, studentAcumulada, studentInversa, valorCritico,
    resumen, muestraNormal, intervaloMedia, decidir, testMedia, inferenciaRegresion, minimosCuadrados, regresionLineal,
    desdeIntervalo, desdeCobertura, desdeTest, desdeVariabilidad, desdeBandas, desdeTasas, area, plano,
} from '../../src/mate/index.js';

const cerca = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} no es ${b}`);

describe('las distribuciones', () => {
    test('la normal: densidad, área e inversa', () => {
        cerca(normal(0), 1 / Math.sqrt(2 * Math.PI));
        cerca(normalAcumulada(1.96), 0.9750021, 1e-7);
        cerca(normalAcumulada(0), 0.5, 1e-12);
        cerca(normalAcumulada(-3), 0.0013499, 1e-7);
        // Una cola chiquita no se redondea a cero (un p-valor de 1e-15 sigue siendo un número).
        assert.ok(normalAcumulada(-8) > 0 && normalAcumulada(-8) < 1e-14);
        cerca(normalInversa(0.975), 1.959964, 1e-6);
        cerca(normalInversa(0.005), -2.575829, 1e-6);
        assert.throws(() => normalInversa(1), /entre 0 y 1/);
    });

    test('la t: contra las fórmulas cerradas de 1 y 2 grados de libertad', () => {
        for (const t of [-3, -0.5, 0.7, 2, 6]) {
            cerca(studentAcumulada(t, 1), 0.5 + Math.atan(t) / Math.PI, 1e-10);
            cerca(studentAcumulada(t, 2), 0.5 + t / (2 * Math.sqrt(2 + t * t)), 1e-10);
        }
        cerca(student(0, 1), 1 / Math.PI, 1e-10);
    });

    test('los valores críticos de la tabla', () => {
        cerca(valorCritico(0.05), 1.959964, 1e-6);
        cerca(valorCritico(0.05, 10), 2.228139, 1e-6);
        cerca(valorCritico(0.05, 30), 2.042272, 1e-6);
        cerca(valorCritico(0.01, 2), 9.924843, 1e-5);
        cerca(valorCritico(0.05, 1), 12.706205, 1e-5);
        cerca(studentInversa(0.95, 5), 2.015048, 1e-6);
        // Con muchísimos grados de libertad, la t es la normal.
        cerca(valorCritico(0.05, 35038), 1.960, 1e-3);
    });
});

describe('intervalos y tests', () => {
    test('el resumen divide por n − 1', () => {
        const r = resumen([2, 4, 4, 4, 5, 5, 7, 9]);
        cerca(r.media, 5);
        cerca(r.varianza, 32 / 7);
    });

    test('una muestra con semilla es siempre la misma, y se parece a la población', () => {
        assert.deepEqual(muestraNormal({ n: 5, semilla: 3 }), muestraNormal({ n: 5, semilla: 3 }));
        const r = resumen(muestraNormal({ n: 4000, media: 10, desvio: 2, semilla: 1 }));
        cerca(r.media, 10, 0.15);
        cerca(r.desvio, 2, 0.1);
    });

    test('el intervalo para la media, con t y con z', () => {
        const ic = intervaloMedia({ media: 50, desvio: 4, n: 16 });
        cerca(ic.error, 1);
        cerca(ic.critico, 2.13145, 1e-5);
        cerca(ic.desde, 50 - 2.13145, 1e-5);
        const z = intervaloMedia({ media: 50, sigma: 4, n: 16 });
        assert.equal(z.distribucion, 'normal');
        cerca(z.margen, 1.959964, 1e-6);
        assert.ok(intervaloMedia({ media: 50, desvio: 4, n: 16, confianza: 0.99 }).margen > ic.margen);
    });

    test('el test: estadístico, p-valor y decisión, en las tres colas', () => {
        const d = decidir({ estadistico: 2.5, gl: 20 });
        cerca(d.pValor, 0.021234, 1e-6);
        assert.equal(d.rechaza, true);
        assert.equal(decidir({ estadistico: 2.5, gl: 20, alfa: 0.01 }).rechaza, false);
        cerca(decidir({ estadistico: 2.5, gl: 20, cola: 'derecha' }).pValor, 0.010617, 1e-6);
        assert.equal(decidir({ estadistico: 2.5, gl: 20, cola: 'izquierda' }).rechaza, false);
        const t = testMedia({ media: 498.6, desvio: 4.1, n: 20, mu0: 500 });
        cerca(t.estadistico, -1.4 / (4.1 / Math.sqrt(20)), 1e-9);
        assert.equal(t.rechaza, false);
        assert.throws(() => decidir({ estadistico: 1, cola: 'arriba' }), /cola/);
    });
});

describe('la regresión', () => {
    const datos = [[1, 2], [2, 4.1], [3, 5.9], [4, 8.2]];

    test('STC = SCR + SCE, la varianza, el test de la pendiente y los intervalos, contra la cuenta a mano', () => {
        const r = inferenciaRegresion(datos);
        cerca(r.b1, 2.04);
        cerca(r.stc, 20.85);
        cerca(r.sce, 0.042);
        cerca(r.scr + r.sce, r.stc, 1e-9);
        cerca(r.sigma2, 0.021);
        cerca(r.eeB1, Math.sqrt(0.021 / 5));
        cerca(r.t, 2.04 / Math.sqrt(0.021 / 5));
        cerca(r.critico, 4.302653, 1e-6);
        // En x̄ el intervalo para la media es el más angosto; el de predicción tiene el 1 de más.
        cerca(r.icm(2.5).margen, 4.302653 * Math.sqrt(0.021 / 4), 1e-6);
        cerca(r.ip(2.5).margen, 4.302653 * Math.sqrt(0.021 * 1.25), 1e-6);
        assert.ok(r.icm(4).margen > r.icm(2.5).margen);
    });

    test('mínimos cuadrados con matrices da lo mismo que la recta', () => {
        const m = minimosCuadrados(datos.map(([x]) => [x]), datos.map(([, y]) => y));
        const r = regresionLineal(datos);
        cerca(m.coeficientes[0], r.b0, 1e-9);
        cerca(m.coeficientes[1], r.b1, 1e-9);
        cerca(m.r2, r.r2, 1e-12);
    });

    test('una cuadrática exacta se recupera, y el R² ajustado castiga lo que no aporta', () => {
        const xs = [0, 1, 2, 3, 4, 5];
        const m = minimosCuadrados(xs.map((x) => [x, x * x]), xs.map((x) => 3 - 2 * x + 0.5 * x * x));
        m.coeficientes.forEach((c, i) => cerca(c, [3, -2, 0.5][i], 1e-9));
        const ruido = muestraNormal({ n: 30, semilla: 4 });
        const x1 = muestraNormal({ n: 30, semilla: 5 });
        const y = x1.map((x, i) => 2 * x + ruido[i]);
        const uno = minimosCuadrados(x1.map((x) => [x]), y);
        const basura = muestraNormal({ n: 30, semilla: 6 });
        const dos = minimosCuadrados(x1.map((x, i) => [x, basura[i]]), y);
        assert.ok(dos.r2 >= uno.r2);
        cerca(dos.r2Ajustado, 1 - ((1 - dos.r2) * 29) / 27, 1e-12);
        assert.throws(() => minimosCuadrados([[1, 2], [2, 4], [3, 6], [4, 8]], [1, 2, 3, 4]), /solución única/);
    });
});

describe('las escenas', () => {
    const datos = [[1, 3], [2, 4.5], [3, 4.4], [4, 6.8], [5, 7.1], [6, 8.9], [7, 9.2], [8, 11.5]];
    const escenas = {
        intervalo: desdeIntervalo({ datos: [10, 12, 9, 14, 11, 13, 12, 10] }),
        cobertura: desdeCobertura({ media: 10, desvio: 3, n: 12, muestras: 10, otraConfianza: 0.99 }),
        test: desdeTest({ media: 52, desvio: 4, n: 25, mu0: 50, h0: 'μ = 50', h1: 'μ ≠ 50', siRechaza: 'Sí.', siNoRechaza: 'No.' }),
        testLejos: desdeTest({ estadistico: 40, gl: 3000, h0: 'β₁ = 0', h1: 'β₁ ≠ 0', siRechaza: 'Sí.', siNoRechaza: 'No.' }),
        derecha: desdeTest({ estadistico: 1.2, gl: 10, cola: 'derecha', h0: 'μ = 0', h1: 'μ > 0', siRechaza: 'Sí.', siNoRechaza: 'No.' }),
        variabilidad: desdeVariabilidad({ datos }),
        bandas: desdeBandas({ datos, xEstrella: 5 }),
        tasas: desdeTasas({
            f: (x, y) => x * x + 3 * y * y, gradiente: (x, y) => [2 * x, 6 * y], inicio: [-3, 2],
            tasas: [{ tasa: 0.01, nombre: 'chica' }, { tasa: 0.1, nombre: 'buena' }, { tasa: 0.4, nombre: 'grande' }], minimo: [0, 0],
        }),
    };
    for (const [nombre, escena] of Object.entries(escenas)) {
        test(`${nombre}: se arma ancha y angosta, y se recorre sin errores`, () => {
            for (const disposicion of ['ancha', 'angosta']) {
                const c = compilar(escena, { disposicion: { nombre: disposicion } });
                for (let t = 0; t <= c.duracion; t += 0.25) c.estado(t);
            }
        });
    }

    test('lo que se dice sale de las cuentas', () => {
        const textos = (e) => compilar(e).subtitulos.map((s) => s.texto).join(' ');
        assert.match(textos(escenas.test), /T = 2,5/);
        assert.match(textos(escenas.testLejos), /ni entra en el dibujo/);
        assert.match(textos(escenas.derecha), /No rechazar H₀ no prueba/);
        assert.match(textos(escenas.tasas), /diverge/);
        assert.match(textos(escenas.tasas), /lentísimo/);
    });

    test('un área necesita su curva, y va sobre un plano', () => {
        assert.throws(() => area({ plano: 'p' }), /curva de arriba/);
        assert.throws(() => area({ f: (x) => x }), /va sobre un plano/);
        compilar({ ancho: 100, alto: 100, piezas: { p: plano({}), a: area({ plano: 'p', f: (x) => x, desde: 3, hasta: 1 }) }, linea: [] });
    });
});
