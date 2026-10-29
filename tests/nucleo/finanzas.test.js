// La capa de finanzas. Black-Scholes se compara con los ejemplos resueltos
// de los libros (Hull) y con la paridad put-call; las griegas, con
// diferencias finitas del precio (que es lo que son: derivadas); la
// simulación, con la fórmula.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { compilar } from '../../src/nucleo/index.js';
import {
    valorFuturo, valorPresente, caminoPrecio, volatilidad, rendimientos, pagoAlVencer, blackScholes, griegas,
    densidadFinal, montecarlo, plata, fijo,
    desdeAccion, desdeInteres, desdePago, desdeBlackScholes, desdeGriegas, desdeEstrategias,
} from '../../src/finanzas/index.js';

const cerca = (a, b, tol, mensaje) => assert.ok(Math.abs(a - b) <= tol, `${mensaje ?? ''} ${a} no está cerca de ${b} (±${tol})`);

describe('el valor del dinero en el tiempo', () => {
    test('interés compuesto: anual, mensual y continuo', () => {
        cerca(valorFuturo(100, 0.1, 1, 1), 110, 1e-9);
        cerca(valorFuturo(100, 0.12, 1, 12), 112.6825, 1e-4);
        cerca(valorFuturo(100, 0.1, 2), 100 * Math.E ** 0.2, 1e-9);
    });
    test('el valor presente deshace al futuro', () => {
        cerca(valorPresente(valorFuturo(1234, 0.07, 3), 0.07, 3), 1234, 1e-9);
    });
});

describe('el precio de una acción', () => {
    test('con la misma semilla, el mismo camino', () => {
        const a = caminoPrecio({ S0: 100, sigma: 0.3, dias: 50, semilla: 9 });
        assert.deepEqual(a, caminoPrecio({ S0: 100, sigma: 0.3, dias: 50, semilla: 9 }));
        assert.equal(a.length, 51);
        assert.equal(a[0], 100);
    });
    test('la volatilidad que se mide se parece a la del modelo', () => {
        const largo = caminoPrecio({ S0: 100, sigma: 0.3, dias: 252 * 20, semilla: 2 });
        cerca(volatilidad(largo), 0.3, 0.01);
    });
    test('los rendimientos logarítmicos se suman', () => {
        const p = caminoPrecio({ S0: 50, sigma: 0.2, dias: 30, semilla: 5 });
        const suma = rendimientos(p).reduce((a, b) => a + b, 0);
        cerca(suma, Math.log(p.at(-1) / p[0]), 1e-12);
    });
});

describe('Black-Scholes', () => {
    test('el ejemplo de Hull: S = 42, K = 40, r = 10 %, σ = 20 %, 6 meses', () => {
        const call = blackScholes({ S: 42, K: 40, T: 0.5, r: 0.1, sigma: 0.2 });
        const put = blackScholes({ S: 42, K: 40, T: 0.5, r: 0.1, sigma: 0.2, tipo: 'put' });
        cerca(call.d1, 0.7693, 1e-4);
        cerca(call.d2, 0.6278, 1e-4);
        cerca(call.precio, 4.76, 0.005);
        cerca(put.precio, 0.81, 0.005);
    });
    test('el caso de manual: S = K = 100, un año, r = 5 %, σ = 20 %', () => {
        cerca(blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2 }).precio, 10.4506, 1e-4);
        cerca(blackScholes({ S: 100, K: 100, T: 1, r: 0.05, sigma: 0.2, tipo: 'put' }).precio, 5.5735, 1e-4);
    });
    test('paridad put-call: C − P = S − K·e^(−rT)', () => {
        for (const [S, K, T, r, sigma] of [[100, 90, 0.25, 0.03, 0.4], [55, 60, 2, 0.08, 0.15], [10, 10, 0.01, 0, 0.9]]) {
            const c = blackScholes({ S, K, T, r, sigma }).precio;
            const p = blackScholes({ S, K, T, r, sigma, tipo: 'put' }).precio;
            cerca(c - p, S - K * Math.exp(-r * T), 1e-9);
        }
    });
    test('al vencer vale lo que paga', () => {
        assert.equal(blackScholes({ S: 120, K: 100, T: 0, r: 0.05, sigma: 0.2 }).precio, 20);
        assert.equal(blackScholes({ S: 80, K: 100, T: 0, r: 0.05, sigma: 0.2 }).precio, 0);
        assert.equal(pagoAlVencer('put', 80, 100), 20);
    });
    test('la densidad del precio final suma 1', () => {
        let suma = 0;
        for (let x = 0.05; x < 400; x += 0.1) suma += densidadFinal(x, { S: 100, T: 0.5, r: 0.05, sigma: 0.25 }) * 0.1;
        cerca(suma, 1, 1e-3);
    });
    test('la simulación da lo mismo que la fórmula', () => {
        const o = { S: 100, K: 105, T: 0.5, r: 0.05, sigma: 0.25 };
        const mc = montecarlo({ ...o, n: 200000, semilla: 3 });
        cerca(mc.precio, blackScholes(o).precio, 0.08);
        cerca(mc.probEnDinero, blackScholes(o).Nd2, 0.005);
    });
});

describe('las griegas', () => {
    const o = { S: 100, K: 95, T: 0.4, r: 0.04, sigma: 0.3 };
    const precio = (cambios, tipo) => blackScholes({ ...o, ...cambios, tipo }).precio;
    for (const tipo of ['call', 'put']) {
        test(`${tipo}: son las derivadas del precio (comparadas con diferencias finitas)`, () => {
            const g = griegas({ ...o, tipo });
            const h = 1e-3;
            cerca(g.delta, (precio({ S: o.S + h }, tipo) - precio({ S: o.S - h }, tipo)) / (2 * h), 1e-6, 'delta');
            cerca(g.gamma, (precio({ S: o.S + h }, tipo) - 2 * precio({}, tipo) + precio({ S: o.S - h }, tipo)) / (h * h), 1e-4, 'gamma');
            cerca(g.vegaEntera, (precio({ sigma: o.sigma + h }, tipo) - precio({ sigma: o.sigma - h }, tipo)) / (2 * h), 1e-4, 'vega');
            cerca(g.rhoEntera, (precio({ r: o.r + h }, tipo) - precio({ r: o.r - h }, tipo)) / (2 * h), 1e-4, 'rho');
            // Theta: cuánto cambia si pasa el tiempo (T baja).
            cerca(g.thetaAnual, -(precio({ T: o.T + h }, tipo) - precio({ T: o.T - h }, tipo)) / (2 * h), 1e-4, 'theta');
            cerca(g.theta * 365, g.thetaAnual, 1e-9);
            cerca(g.vega * 100, g.vegaEntera, 1e-9);
        });
    }
    test('delta del put = delta del call − 1', () => {
        cerca(griegas({ ...o, tipo: 'put' }).delta, griegas(o).delta - 1, 1e-12);
    });
});

describe('los números para mostrar', () => {
    test('plata y fijo llevan siempre sus decimales, con coma', () => {
        assert.equal(plata(12.3), '$ 12,30');
        assert.equal(plata(-6), '−$ 6,00');
        assert.equal(plata(-0.001), '$ 0,00');
        assert.equal(fijo(0.5), '0,500');
        assert.equal(fijo(-0.01757, 4), '−0,0176');
    });
});

describe('las escenas', () => {
    const escenas = {
        accion: desdeAccion(),
        interes: desdeInteres(),
        pago: desdePago(),
        blackScholes: desdeBlackScholes({ simulaciones: 4000 }),
        griegas: desdeGriegas(),
        estrategias: desdeEstrategias(),
    };
    for (const [nombre, escena] of Object.entries(escenas)) {
        test(`${nombre}: se arma ancha y angosta, y se recorre sin errores`, () => {
            for (const disposicion of ['ancha', 'angosta']) {
                const c = compilar(escena, { disposicion: { nombre: disposicion } });
                for (let t = 0; t <= c.duracion; t += 0.5) c.estado(t);
            }
        });
    }
    test('Black-Scholes dice el mismo precio que la fórmula', () => {
        const o = { S: 100, K: 105, T: 0.5, r: 0.05, sigma: 0.25 };
        const c = compilar(desdeBlackScholes({ ...o, simulaciones: 4000 }), { disposicion: { nombre: 'ancha' } });
        const fin = c.estado(c.duracion);
        const textos = Object.values(fin.piezas).map((p) => p.texto).filter(Boolean).join(' | ');
        assert.match(textos, new RegExp(plata(blackScholes({ ...o, sigma: 0.4 }).precio).replace('$', '\\$')));
    });
    test('las estrategias: el straddle pierde como mucho las dos primas', () => {
        const c = compilar(desdeEstrategias(), { disposicion: { nombre: 'ancha' } });
        const subtitulos = c.subtitulos.map((s) => s.texto).join(' ');
        const call = blackScholes({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.25 }).precio;
        const put = blackScholes({ S: 100, K: 100, T: 0.25, r: 0.05, sigma: 0.25, tipo: 'put' }).precio;
        assert.ok(subtitulos.includes(`pérdida máxima: ${plata(-(call + put))}`), subtitulos);
    });
});
