// La animación que se arma sola: explicaciones automáticas, punteros
// deducidos, la pregunta que se narra, y el trazador de Python (el mismo que
// corre en el navegador con Pyodide).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compilar } from '../../src/nucleo/index.js';
import { explicarPaso, detectarPunteros, desdeTraza, TRAZADOR_PY } from '../../src/pedagogico/index.js';

const v = (repr, tipo = 'int') => ({ tipo, repr });
const lista = (items) => ({ tipo: 'list', repr: `[${items.join(', ')}]`, items });

// La traza de: numeros = [4, 8] / total = 0 / for n in numeros: / total = total + n / print(total)
const CODIGO = ['numeros = [4, 8]', 'total = 0', 'for n in numeros:', '    total = total + n', 'print(total)'];
const TRAZA = [
    { linea: 1, variables: {} },
    { linea: 2, variables: { numeros: lista(['4', '8']) } },
    { linea: 3, variables: { numeros: lista(['4', '8']), total: v('0') } },
    { linea: 4, variables: { numeros: lista(['4', '8']), total: v('0'), n: v('4') } },
    { linea: 3, variables: { numeros: lista(['4', '8']), total: v('4'), n: v('4') } },
    { linea: 4, variables: { numeros: lista(['4', '8']), total: v('4'), n: v('8') } },
    { linea: 3, variables: { numeros: lista(['4', '8']), total: v('12'), n: v('8') } },
    { linea: 5, variables: { numeros: lista(['4', '8']), total: v('12'), n: v('8') } },
    { linea: 0, variables: { numeros: lista(['4', '8']), total: v('12'), n: v('8') }, salida: '12\n' },
];
const explicar = (i) => explicarPaso(TRAZA, i, CODIGO);

describe('explicaciones automáticas', () => {
    test('una variable nueva, y una lista nueva', () => {
        assert.equal(explicar(1), 'numeros es una lista con 2 elementos.');
        assert.equal(explicar(2), 'total vale 0.');
    });

    test('la variable del for se explica como vuelta del for', () => {
        assert.equal(explicar(3), 'El for toma el primer elemento: n vale 4.');
        assert.equal(explicar(5), 'Otra vuelta del for: n vale 8.');
    });

    test('un cambio dice de cuánto a cuánto', () => {
        assert.equal(explicar(4), 'total pasa de 0 a 4.');
    });

    test('al salir del for, lo dice', () => {
        assert.equal(explicar(7), 'No quedan elementos: termina el for.');
    });

    test('lo que se muestra, y el final', () => {
        assert.equal(explicar(8), 'Se muestra: 12 Terminó el programa.');
    });

    test('un error dice la línea y el tipo', () => {
        const traza = [{ linea: 1, variables: {} }, { linea: 1, variables: {}, excepcion: { tipo: 'ZeroDivisionError', mensaje: 'division by zero' } }];
        assert.equal(explicarPaso(traza, 1, ['x = 1 / 0']), 'Se corta con un error en la línea 1: ZeroDivisionError (division by zero).');
    });

    test('un if que se cumple y uno que no', () => {
        const codigo = ['x = 5', 'if x > 3:', '    print("grande")', 'print("fin")'];
        const base = { x: v('5') };
        const entra = [{ linea: 2, variables: base }, { linea: 3, variables: base }];
        const saltea = [{ linea: 2, variables: base }, { linea: 4, variables: base }];
        assert.equal(explicarPaso(entra, 1, codigo), 'La condición se cumple: entra.');
        assert.equal(explicarPaso(saltea, 1, codigo), 'La condición no se cumple: la saltea.');
    });
});

describe('punteros deducidos', () => {
    test('encuentra la variable que recorre la lista', () => {
        assert.deepEqual(detectarPunteros(TRAZA), { numeros: 'n' });
    });

    test('una variable que no sigue a la lista no es un puntero', () => {
        assert.deepEqual(detectarPunteros(TRAZA.map((p) => ({ ...p, variables: { numeros: p.variables.numeros, total: p.variables.total } }))), {});
    });

    test("desdeTraza con punteros: 'auto' señala el elemento", () => {
        const e = compilar(desdeTraza({ codigo: CODIGO.join('\n'), traza: TRAZA, punteros: 'auto' }));
        const pasos = e.marcas.filter((m) => m.tipo === 'paso');
        assert.equal(e.estado(pasos[5].t).piezas.var_numeros.senalar, 1);
        assert.equal(e.estado(pasos[5].t).piezas.var_numeros.puntero, 'n');
    });
});

describe('preguntas en un video', () => {
    const conPregunta = () => compilar(desdeTraza({
        codigo: CODIGO.join('\n'),
        traza: TRAZA,
        preguntas: { 5: { pregunta: '¿Cuánto va a valer total?', opciones: ['8', '12'], correcta: 1, explicacion: '4 + 8 = 12.' } },
    }));

    test('la pregunta también es un subtítulo, para que la lea la voz', () => {
        const e = conPregunta();
        const q = e.marcas.find((m) => m.tipo === 'pregunta');
        assert.equal(e.estado(q.t + 0.1).subtitulo, '¿Cuánto va a valer total? Pausá y pensalo.');
    });

    test('el paso siguiente dice la respuesta', () => {
        const e = conPregunta();
        assert.ok(e.subtitulos.some((s) => s.texto.startsWith('Respuesta: 12. 4 + 8 = 12.')));
    });
});

describe('el trazador, en el navegador y en la consola', () => {
    test('el módulo para el navegador tiene exactamente el mismo trazador que el .py', () => {
        assert.equal(TRAZADOR_PY, readFileSync('src/pedagogico/trazador.py', 'utf-8'));
    });
});

let hayPython = true;
try {
    execFileSync('python', ['--version']);
} catch {
    hayPython = false;
}

describe('el trazador de Python, con programas difíciles', { skip: !hayPython && 'no hay Python en esta compu' }, () => {
    // Corre el trazador del .py, igual que lo haría Pyodide.
    function trazar(codigo, entradas = [], maxPasos = 400) {
        const programa = `exec(open('src/pedagogico/trazador.py', encoding='utf-8').read())\nimport json, sys\nsys.stdout.reconfigure(encoding='utf-8')\nprint(_motor_trazar(json.loads(sys.argv[1]), ${maxPasos}, json.loads(sys.argv[2])))`;
        return JSON.parse(execFileSync('python', ['-I', '-c', programa, JSON.stringify(codigo), JSON.stringify(entradas)], { encoding: 'utf-8' })).traza;
    }

    test('input() usa las entradas cargadas, y se ve como en la consola', () => {
        const traza = trazar('nombre = input("¿Nombre? ")\nprint("Hola", nombre)', ['Lucía']);
        assert.equal(traza.at(-1).variables.nombre.repr, "'Lucía'");
        assert.equal(traza.at(-1).salida, '¿Nombre? Lucía\nHola Lucía\n');
    });

    test('si faltan entradas, se corta y lo explica', () => {
        const traza = trazar('a = input()\nb = input()', ['1']);
        assert.equal(traza.at(-1).excepcion.tipo, 'Falta una entrada');
    });

    test('un bucle infinito se corta en el tope de pasos', () => {
        const traza = trazar('x = 0\nwhile True:\n    x = x + 1', [], 50);
        assert.equal(traza.at(-1).excepcion.tipo, 'Corte');
        assert.ok(traza.length <= 51);
    });

    test('un error de sintaxis da un solo paso, en su línea', () => {
        const traza = trazar('x = 1\nif x > 0\n    print(x)');
        assert.equal(traza.length, 1);
        assert.equal(traza[0].excepcion.tipo, 'SyntaxError');
        assert.equal(traza[0].linea, 2);
    });

    test('después de trazar, input vuelve a ser el de siempre', () => {
        const programa = "exec(open('src/pedagogico/trazador.py', encoding='utf-8').read())\nimport builtins\nantes = builtins.input\n_motor_trazar('x = 1')\nprint(builtins.input is antes)";
        assert.equal(execFileSync('python', ['-I', '-c', programa], { encoding: 'utf-8' }).trim(), 'True');
    });
});
