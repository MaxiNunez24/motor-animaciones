// La capa pedagógica, sin navegador: el resaltado de código, las marcas y las
// paradas que usa, las escenas armadas desde una traza, y el trazador de Python.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { compilar, Reloj } from '../../src/nucleo/index.js';
import { caja } from '../../src/piezas/index.js';
import { tokenizar, desdeTraza } from '../../src/pedagogico/index.js';

describe('resaltado de código', () => {
    const clases = (linea, lenguaje) => tokenizar(linea, lenguaje).filter((p) => p.clase !== 'normal').map((p) => `${p.clase}:${p.texto}`);

    test('Python: palabras clave, números, textos y funciones de fábrica', () => {
        assert.deepEqual(clases('for n in numeros:'), ['palabra:for', 'palabra:in']);
        assert.deepEqual(clases('print("Total:", 27)'), ['propia:print', 'texto:"Total:"', 'numero:27']);
    });

    test('un comentario va hasta el final, aunque tenga comillas', () => {
        assert.deepEqual(clases('x = 1  # "no es un texto"'), ['numero:1', 'comentario:# "no es un texto"']);
    });

    test('una f-string es un texto entero, con su f', () => {
        assert.deepEqual(clases('f"Hola {nombre}"'), ['texto:f"Hola {nombre}"']);
    });

    test('un número pegado a un nombre no es un número', () => {
        assert.deepEqual(clases('alumno2 = 3'), ['numero:3']);
    });

    test('JavaScript: sus palabras y sus comentarios', () => {
        assert.deepEqual(clases('let clics = 0; // cuenta', 'js'), ['palabra:let', 'numero:0', 'comentario:// cuenta']);
        assert.deepEqual(clases('boton.addEventListener("click", f)', 'js'), ['funcion:addEventListener', 'texto:"click"']);
    });

    test('juntando los pedazos vuelve a salir la línea, con sus espacios', () => {
        const linea = '    total = total + n  # sumar';
        assert.equal(tokenizar(linea).map((p) => p.texto).join(''), linea);
    });
});

describe('marcas y paradas (lo que el núcleo le da a cualquier capa)', () => {
    test('una marca queda en la escena compilada, con sus datos y su tramo', () => {
        const e = compilar({
            ancho: 1,
            alto: 1,
            piezas: { a: caja() },
            linea: [
                { pieza: 'a', a: { x: 1 }, dur: 2 },
                { marca: 'pregunta', datos: { pregunta: '¿?' }, dur: 3 },
                { pieza: 'a', a: { x: 2 }, dur: 1 },
            ],
        });
        assert.deepEqual(e.marcas, [{ tipo: 'pregunta', t: 2, hasta: 5, datos: { pregunta: '¿?' } }]);
        // Ocupa su tramo: lo que sigue arranca después.
        assert.equal(e.duracion, 6);
    });

    test('el reloj frena justo en una parada, y al seguir no vuelve a frenar ahí', () => {
        let ahora = 0;
        let pendiente = null;
        const paradas = [];
        const reloj = new Reloj({
            duracion: 10,
            paradas: [1],
            alParar: (t) => paradas.push(t),
            ahora: () => ahora,
            pedirCuadro: (f) => { pendiente = f; return 1; },
            cancelarCuadro: () => { pendiente = null; },
        });
        const pasar = (ms) => { ahora += ms; const f = pendiente; pendiente = null; f?.(); };
        reloj.reproducir();
        for (let i = 0; i < 8; i++) pasar(200);
        assert.equal(reloj.t, 1);
        assert.equal(reloj.corriendo, false);
        assert.deepEqual(paradas, [1]);
        reloj.reproducir();
        pasar(200);
        assert.ok(Math.abs(reloj.t - 1.2) < 1e-9);
    });
});

describe('una escena armada desde una traza', () => {
    const traza = [
        { linea: 1, variables: {} },
        { linea: 2, variables: { x: { tipo: 'int', repr: '1' } } },
        { linea: 0, variables: { x: { tipo: 'int', repr: '2' } }, salida: '2\n' },
    ];
    const armar = (extra = {}) => compilar(desdeTraza({ codigo: 'x = 1\nx = x + 1\nprint(x)', traza, ritmo: 1, ...extra }));

    test('tiene el código, una pieza por variable y la consola', () => {
        const e = armar();
        assert.ok(e.ids.includes('codigo'));
        assert.ok(e.ids.includes('var_x'));
        assert.ok(e.ids.includes('consola'));
    });

    test('al final de cada paso, la variable vale lo que dice la traza', () => {
        const e = armar();
        const pasos = e.marcas.filter((m) => m.tipo === 'paso');
        assert.equal(pasos.length, 3);
        assert.equal(e.estado(pasos[1].t).piezas.var_x.valor, '1');
        assert.equal(e.estado(pasos[2].t).piezas.var_x.valor, '2');
        assert.equal(e.estado(pasos[2].t).piezas.consola.salida, '2\n');
    });

    test('la marca del código sigue a la línea que está por correr', () => {
        const e = armar();
        const pasos = e.marcas.filter((m) => m.tipo === 'paso');
        assert.equal(e.estado(pasos[0].t).piezas.codigo.linea, 1);
        assert.equal(e.estado(pasos[1].t).piezas.codigo.linea, 2);
        // Al terminar, la marca se apaga.
        assert.equal(e.estado(pasos[2].t).piezas.codigo.marca, 0);
    });

    test('una pregunta frena ANTES de mostrar el paso siguiente', () => {
        const e = armar({ preguntas: { 1: { pregunta: '¿Cuánto vale x después?', opciones: ['1', '2'], correcta: 1 } } });
        const pregunta = e.marcas.find((m) => m.tipo === 'pregunta');
        assert.equal(pregunta.datos.correcta, 1);
        // Durante la pregunta, x todavía vale 1: la respuesta no se ve antes de contestar.
        assert.equal(e.estado(pregunta.t).piezas.var_x.valor, '1');
        assert.equal(e.estado(pregunta.hasta - 0.01).piezas.var_x.valor, '1');
    });

    test('una traza vacía es un error que se entiende', () => {
        assert.throws(() => desdeTraza({ codigo: '', traza: [] }), /no puede estar vacía/);
    });
});

// El trazador es Python: si en la compu no hay Python, estos se saltean.
let hayPython = true;
try {
    execFileSync('python', ['--version']);
} catch {
    hayPython = false;
}

describe('el trazador de Python', { skip: !hayPython && 'no hay Python en esta compu' }, () => {
    const trazar = (archivo) => JSON.parse(execFileSync('python', ['-I', 'herramientas/trazar.py', archivo, '--json'], { encoding: 'utf-8' }));

    test('un for vuelve a la misma línea en cada vuelta', () => {
        const { traza } = trazar('ejemplos/conceptos/programas/bucle-for.py');
        assert.deepEqual(traza.map((p) => p.linea), [1, 2, 3, 4, 3, 4, 3, 4, 3, 5, 0]);
        assert.equal(traza.at(-1).variables.total.repr, '27');
        assert.equal(traza.at(-1).salida, 'Total: 27\n');
    });

    test('una lista viene con sus elementos ya escritos', () => {
        const { traza } = trazar('ejemplos/conceptos/programas/bucle-for.py');
        assert.deepEqual(traza[1].variables.numeros.items, ['4', '8', '15']);
    });

    test('un error queda en la línea donde pasó, con su tipo', () => {
        const { traza } = trazar('ejemplos/conceptos/programas/diccionario.py');
        const ultimo = traza.at(-1);
        assert.equal(ultimo.linea, 4);
        assert.deepEqual(ultimo.excepcion, { tipo: 'KeyError', mensaje: "'Lucía'" });
    });
});
