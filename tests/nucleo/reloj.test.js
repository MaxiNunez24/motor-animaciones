// El reloj se prueba con un tiempo de mentira: nosotros decidimos cuántos
// milisegundos pasan entre un cuadro y el siguiente. Así el test no depende de
// lo rápida que sea la compu, que es justo lo que tiene que lograr el motor.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Reloj } from '../../src/nucleo/index.js';

function relojDePrueba(opciones = {}) {
    let ahora = 0;
    let pendiente = null;
    const reloj = new Reloj({
        duracion: 10,
        ahora: () => ahora,
        pedirCuadro: (f) => { pendiente = f; return 1; },
        cancelarCuadro: () => { pendiente = null; },
        ...opciones,
    });
    // Pasan `ms` milisegundos y el navegador dibuja un cuadro.
    const pasar = (ms) => {
        ahora += ms;
        const f = pendiente;
        pendiente = null;
        f?.();
    };
    return { reloj, pasar };
}

describe('reloj', () => {
    test('avanza con el tiempo real', () => {
        const { reloj, pasar } = relojDePrueba();
        reloj.reproducir();
        pasar(100);
        pasar(100);
        assert.ok(Math.abs(reloj.t - 0.2) < 1e-9);
    });

    test('a velocidad 2 avanza el doble', () => {
        const { reloj, pasar } = relojDePrueba({ velocidad: 2 });
        reloj.reproducir();
        pasar(100);
        assert.ok(Math.abs(reloj.t - 0.2) < 1e-9);
    });

    test('en pausa no avanza', () => {
        const { reloj, pasar } = relojDePrueba();
        reloj.reproducir();
        pasar(100);
        reloj.pausar();
        pasar(5000);
        assert.ok(Math.abs(reloj.t - 0.1) < 1e-9);
    });

    test('sin loop, se detiene al final', () => {
        const { reloj, pasar } = relojDePrueba({ duracion: 0.3 });
        reloj.reproducir();
        for (let i = 0; i < 10; i++) pasar(100);
        assert.equal(reloj.t, 0.3);
        assert.equal(reloj.corriendo, false);
    });

    test('con loop, vuelve a empezar', () => {
        const { reloj, pasar } = relojDePrueba({ duracion: 1, loop: true });
        reloj.reproducir();
        for (let i = 0; i < 12; i++) pasar(100);
        assert.ok(Math.abs(reloj.t - 0.2) < 1e-9, String(reloj.t));
        assert.equal(reloj.corriendo, true);
    });

    test('darle play al final vuelve al principio', () => {
        const { reloj } = relojDePrueba();
        reloj.irA(10);
        reloj.reproducir();
        assert.equal(reloj.t, 0);
    });

    test('irA no se sale de la escena', () => {
        const { reloj } = relojDePrueba();
        reloj.irA(50);
        assert.equal(reloj.t, 10);
        reloj.irA(-3);
        assert.equal(reloj.t, 0);
    });

    test('si la compu se trabó, no pega un salto', () => {
        const { reloj, pasar } = relojDePrueba();
        reloj.reproducir();
        pasar(4000);
        assert.ok(reloj.t <= 0.25);
    });

    test('avisa cada instante que muestra', () => {
        const vistos = [];
        const { reloj, pasar } = relojDePrueba({ alCambiar: (t) => vistos.push(Math.round(t * 10) / 10) });
        reloj.irA(2);
        reloj.reproducir();
        pasar(100);
        assert.deepEqual(vistos, [2, 2.1]);
    });
});
