// Funciones, recursión, referencias y objetos: el trazador de Python, las
// explicaciones automáticas y la escena que se arma con eso.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { compilar } from '../../src/nucleo/index.js';
import { explicarPaso, desdeTraza, pila } from '../../src/pedagogico/index.js';

let hayPython = true;
try {
    execFileSync('python', ['--version']);
} catch {
    hayPython = false;
}
const sinPython = !hayPython && 'no hay Python en esta compu';

// Corre el trazador del .py (el mismo que corre en el navegador con Pyodide).
function trazar(codigo) {
    const programa = "exec(open('src/pedagogico/trazador.py', encoding='utf-8').read())\nimport json, sys\nsys.stdout.reconfigure(encoding='utf-8')\nprint(_motor_trazar(json.loads(sys.argv[1])))";
    return JSON.parse(execFileSync('python', ['-I', '-c', programa, JSON.stringify(codigo)], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 }));
}

const FUNCIONES = 'def sumar(a, b):\n    total = a + b\n    return total\n\nx = sumar(3, 4)\nprint(x)\n';
const RECURSION = 'def factorial(n):\n    if n == 1:\n        return 1\n    return n * factorial(n - 1)\n\nprint(factorial(4))\n';
const REFERENCIAS = 'a = [1, 2, 3]\nb = a\nb.append(4)\nc = a.copy()\n';
const OBJETOS = 'class Alumno:\n    def __init__(self, nombre):\n        self.nombre = nombre\n        self.presentes = 0\n\n    def marcar(self):\n        self.presentes += 1\n\nlucia = Alumno("Lucía")\notra = lucia\notra.marcar()\n';

describe('el trazador: funciones y pila de llamadas', { skip: sinPython }, () => {
    test('adentro de una función, el paso trae la pila con sus variables', () => {
        const { traza } = trazar(FUNCIONES);
        const adentro = traza.find((p) => p.pila?.length);
        assert.equal(adentro.pila[0].funcion, 'sumar');
        assert.deepEqual(Object.keys(adentro.pila[0].variables), ['a', 'b']);
    });

    test('cuando termina, anota qué devuelve', () => {
        const { traza } = trazar(FUNCIONES);
        assert.deepEqual(traza.find((p) => p.retorno).retorno, { funcion: 'sumar', valor: '7' });
    });

    test('la recursión apila una llamada por cada n', () => {
        const { traza } = trazar(RECURSION);
        const profundidad = Math.max(...traza.map((p) => p.pila?.length ?? 0));
        assert.equal(profundidad, 4);
        assert.deepEqual(traza.filter((p) => p.retorno).map((p) => p.retorno.valor), ['1', '2', '6', '24']);
    });

    test('el cuerpo de una clase no es una llamada', () => {
        const { traza } = trazar(OBJETOS);
        assert.ok(traza.every((p) => (p.pila ?? []).every((m) => m.funcion !== 'Alumno')));
    });

    test('una recursión sin caso base se corta con un mensaje que explica', () => {
        const { traza } = trazar('def f(n):\n    return f(n + 1)\n\nf(1)\n');
        assert.match(traza.at(-1).excepcion.tipo, /RecursionError|Corte/);
    });
});

describe('el trazador: referencias y objetos', { skip: sinPython }, () => {
    test('b = a es la misma lista: el mismo número; a.copy() es otra', () => {
        const { traza } = trazar(REFERENCIAS);
        const fin = traza.at(-1).variables;
        assert.equal(fin.a.ref, fin.b.ref);
        assert.notEqual(fin.a.ref, fin.c.ref);
    });

    test('un objeto trae sus atributos, y self es el mismo objeto que la variable', () => {
        const { traza } = trazar(OBJETOS);
        const fin = traza.at(-1).variables;
        assert.deepEqual(fin.lucia.atributos, [['nombre', "'Lucía'"], ['presentes', '1']]);
        assert.equal(fin.lucia.ref, fin.otra.ref);
        const enMarcar = traza.find((p) => p.pila?.[0]?.funcion === 'marcar');
        assert.equal(enMarcar.pila[0].variables.self.ref, fin.lucia.ref);
    });

    test('nada de direcciones de memoria: la traza sale igual en cada corrida', () => {
        const una = JSON.stringify(trazar(OBJETOS));
        assert.ok(!/0x[0-9a-f]+/i.test(una));
        assert.equal(JSON.stringify(trazar(OBJETOS)), una);
    });
});

describe('explicaciones de funciones y objetos', { skip: sinPython }, () => {
    const explicar = (codigo) => {
        const { traza } = trazar(codigo);
        return traza.map((_, i) => explicarPaso(traza, i, codigo.split('\n')));
    };

    test('un def no ejecuta nada todavía', () => {
        assert.ok(explicar(FUNCIONES).includes('Se define la función sumar: todavía no se ejecuta, queda guardada para cuando se la llame.'));
    });

    test('la llamada dice con qué valores, y el return qué devuelve', () => {
        const e = explicar(FUNCIONES);
        assert.ok(e.includes('Se llama a sumar(3, 4). Adentro, a vale 3 y b vale 4.'));
        assert.ok(e.includes('sumar termina y devuelve 7.'));
    });

    test('la recursión se nombra como tal', () => {
        assert.ok(explicar(RECURSION).some((x) => x.includes('la función se llama a sí misma')));
    });

    test('la misma lista y una copia se distinguen', () => {
        const e = explicar(REFERENCIAS);
        assert.ok(e.includes('b no es una copia: es la misma lista que a.'));
        assert.ok(e.some((x) => x.startsWith('Se agregó 4 a la lista a. Y también b: son la misma lista.')));
        assert.ok(e.some((x) => x.startsWith('c es una copia: tiene lo mismo que a, pero es otra lista.')));
    });

    test('los atributos que cambian, y el mismo objeto con dos nombres', () => {
        const e = explicar(OBJETOS);
        assert.ok(e.includes('Se define la clase Alumno: es el molde, todavía no hay ningún objeto.'));
        assert.ok(e.includes('otra no es una copia: es el mismo objeto que lucia.'));
        assert.ok(e.some((x) => x.startsWith('self.presentes pasa de 0 a 1.')));
    });
});

describe('la escena con pila y referencias', { skip: sinPython }, () => {
    test('con funciones aparece la pila, y en el paso de la llamada tiene su tarjeta', () => {
        const { traza, codigo } = trazar(FUNCIONES);
        const e = compilar(desdeTraza({ codigo, traza }));
        assert.ok(e.ids.includes('pila'));
        const pasos = e.marcas.filter((m) => m.tipo === 'paso');
        const i = traza.findIndex((p) => p.pila?.length);
        assert.equal(e.estado(pasos[i].t).piezas.pila.marcos[0].funcion, 'sumar');
    });

    test('dos nombres de la misma lista: aparece la flecha que los une', () => {
        const { traza, codigo } = trazar(REFERENCIAS);
        const e = compilar(desdeTraza({ codigo, traza }));
        assert.ok(e.ids.includes('alias_a_b'));
        assert.equal(e.estado(e.duracion).piezas.alias_a_b.progreso, 1);
    });

    test('si cambia un atributo, se redibujan los DOS nombres del mismo objeto', () => {
        // Este se escapó una vez: lucia mostraba presentes 0 y otra presentes 1,
        // porque los dos se escriben "Alumno #1" antes y después.
        const { traza, codigo } = trazar(OBJETOS);
        const e = compilar(desdeTraza({ codigo, traza }));
        const fin = e.estado(e.duracion).piezas;
        assert.deepEqual(fin.var_lucia.filas, fin.var_otra.filas);
        assert.deepEqual(fin.var_lucia.filas.at(-1), ['presentes', '1']);
    });
});

describe('la pieza de la pila', () => {
    test('mide más cuantas más llamadas hay', () => {
        const una = pila({ marcos: [{ funcion: 'f', filas: [['n', '1']] }] }).props;
        const dos = pila({ marcos: [{ funcion: 'f', filas: [['n', '2']] }, { funcion: 'f', filas: [['n', '1']] }] }).props;
        assert.ok(pila.tipo.tamano(dos).alto > pila.tipo.tamano(una).alto);
    });
});
