// La lupa de desdeTraza y su disposición media: un programa de 20 líneas con
// tres marcos en la pila, visto en la columna angosta de una clase.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilar } from '../../src/nucleo/index.js';
import { desdeTraza } from '../../src/pedagogico/index.js';

// La traza la generó herramientas/trazar.py: es un script que la deja en
// Motor.trazas; acá se saca el JSON de adentro.
const archivo = readFileSync(new URL('../../ejemplos/funciones-y-objetos/pila.traza.js', import.meta.url), 'utf-8');
const pila = JSON.parse(archivo.slice(archivo.indexOf('= {') + 2, archivo.lastIndexOf('}') + 1));

const columna = { nombre: 'media', ancho: 650 };

test('el programa de prueba: 20 líneas y tres marcos en la pila', () => {
    assert.equal(pila.codigo.trimEnd().split('\n').length, 20);
    assert.equal(Math.max(...pila.traza.map((p) => p.pila?.length ?? 0)), 3);
});

test('con lupa, el código va dentro de una cámara que acerca, sin cortar la línea más larga', () => {
    const c = compilar(desdeTraza({ ...pila, archivo: 'ticket.py', lupa: true }), { disposicion: columna });
    const inicio = c.estado(0).piezas;
    assert.ok(inicio.lupa, 'tendría que haber una cámara');
    assert.equal(inicio.codigo.dentro, 'lupa');
    assert.ok(inicio.lupa.zoom > 1.1 && inicio.lupa.zoom <= 1.8);
    // Lo escrito (números de línea + la línea más larga) entra en la ventana.
    const largo = Math.max(...pila.codigo.split('\n').map((l) => l.length));
    const { tamano, ancho } = inicio.codigo;
    assert.ok((16 + 2 * tamano * 0.6 + tamano * 0.9 + largo * tamano * 0.6 + 16) * inicio.lupa.zoom <= ancho + 1);
});

test('la cámara sigue a la línea marcada, con contexto arriba y abajo', () => {
    const c = compilar(desdeTraza({ ...pila, lupa: 3, contexto: 2 }), { disposicion: columna });
    const movimientos = new Set();
    for (let t = 0; t <= c.duracion; t += 0.1) {
        const { lupa, codigo } = c.estado(t).piezas;
        movimientos.add(Math.round(lupa.mirarY));
        // Cuando la marca ya llegó a su línea y la cámara terminó de moverse,
        // la línea marcada se ve entera.
        const quieto = c.estado(t + 0.7).piezas;
        if (quieto.lupa.mirarY !== lupa.mirarY || quieto.codigo.linea !== codigo.linea || codigo.marca < 1) continue;
        const altoLinea = codigo.tamano * codigo.interlineado;
        const altoCodigo = 2 * codigo.tamano * 0.5 + 20 * altoLinea;
        const y = codigo.y - altoCodigo / 2 + codigo.tamano * 0.5 + (codigo.linea - 0.5) * altoLinea;
        const medio = lupa.alto / (2 * lupa.zoom);
        assert.ok(y - altoLinea / 2 >= lupa.mirarY - medio - 1 && y + altoLinea / 2 <= lupa.mirarY + medio + 1, `línea ${codigo.linea} fuera de la vista en t = ${t.toFixed(1)}`);
    }
    assert.ok(movimientos.size > 2, 'la cámara tendría que haberse movido');
});

test('lupaDebajoDe: en un lugar ancho no hay lupa; y sin lupa, nada cambia', () => {
    const conUmbral = desdeTraza({ ...pila, lupa: true, lupaDebajoDe: 900 });
    assert.ok(compilar(conUmbral, { disposicion: columna }).estado(0).piezas.lupa);
    assert.equal(compilar(conUmbral, { disposicion: { nombre: 'ancha', ancho: 1200 } }).estado(0).piezas.lupa, undefined);
    assert.equal(compilar(desdeTraza(pila), { disposicion: columna }).estado(0).piezas.lupa, undefined);
});

test('la disposición media: 1200 de ancho, y se recorre entera en las tres', () => {
    for (const nombre of ['ancha', 'media', 'angosta']) {
        const c = compilar(desdeTraza({ ...pila, lupa: true }), { disposicion: { nombre, ancho: 650 } });
        assert.equal(c.ancho, { ancha: 1600, media: 1200, angosta: 640 }[nombre]);
        for (let t = 0; t <= c.duracion; t += 0.25) c.estado(t);
    }
});
