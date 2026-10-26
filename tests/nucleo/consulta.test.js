// Las consultas SQL animadas. Lo más importante: que el resultado sea el
// mismo que da SQLite de verdad. Si la animación mostrara otra cosa, enseñaría mal.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { compilar } from '../../src/nucleo/index.js';
import { ejecutarConsulta, desdeConsulta, tokenizar } from '../../src/pedagogico/index.js';

const ALUMNOS = {
    nombre: 'alumnos',
    columnas: ['nombre', 'curso', 'presentes'],
    filas: [
        ['Lucía', 'Programación', 12],
        ['Martín', 'Electricidad', 5],
        ['Sofía', 'Programación', 9],
        ['Diego', 'Gastronomía', 14],
        ['Ana', 'Electricidad', 3],
        ['Pablo', 'Programación', 7],
        ['Bruno', 'Electricidad', 12],
    ],
};

let hayPython = true;
try {
    execFileSync('python', ['--version']);
} catch {
    hayPython = false;
}

// La misma consulta, en SQLite (con Python, que lo trae adentro).
function enSqlite(sql) {
    const programa = [
        'import sqlite3, json, sys',
        'sys.stdout.reconfigure(encoding="utf-8")',
        'datos = json.loads(sys.argv[2])',
        'c = sqlite3.connect(":memory:")',
        'c.execute("CREATE TABLE alumnos (nombre TEXT, curso TEXT, presentes INTEGER)")',
        'c.executemany("INSERT INTO alumnos VALUES (?, ?, ?)", datos)',
        'print(json.dumps(c.execute(sys.argv[1]).fetchall(), ensure_ascii=False))',
    ].join('\n');
    return JSON.parse(execFileSync('python', ['-I', '-c', programa, sql, JSON.stringify(ALUMNOS.filas)], { encoding: 'utf-8' }));
}

const CONSULTAS = [
    'SELECT nombre, presentes FROM alumnos WHERE presentes >= 8 ORDER BY presentes DESC',
    "SELECT nombre FROM alumnos WHERE curso = 'Programación' AND presentes > 8",
    "SELECT nombre, curso FROM alumnos WHERE curso = 'Gastronomía' OR presentes < 5",
    'SELECT * FROM alumnos ORDER BY nombre',
    'SELECT nombre, presentes FROM alumnos ORDER BY presentes DESC LIMIT 3',
    "SELECT nombre FROM alumnos WHERE curso != 'Electricidad'",
    // Dos con 12: el empate tiene que quedar en el mismo orden que en SQLite.
    'SELECT nombre, presentes FROM alumnos WHERE presentes >= 12 ORDER BY presentes',
];

describe('el mismo resultado que SQLite', { skip: !hayPython && 'no hay Python en esta compu' }, () => {
    for (const sql of CONSULTAS) {
        test(sql, () => {
            assert.deepEqual(ejecutarConsulta(sql, ALUMNOS).resultado, enSqlite(sql));
        });
    }
});

describe('los errores se explican', () => {
    test('una columna que no existe', () => {
        assert.throws(() => ejecutarConsulta('SELECT edad FROM alumnos', ALUMNOS), /no tiene la columna "edad"/);
    });

    test('una tabla con otro nombre', () => {
        assert.throws(() => ejecutarConsulta('SELECT * FROM cursos', ALUMNOS), /la tabla se llama "alumnos"/);
    });

    test('algo que no es una consulta de las que entiende', () => {
        assert.throws(() => ejecutarConsulta('DELETE FROM alumnos', ALUMNOS), /No entiendo esa consulta/);
    });

    test('ordenar por una columna que no se eligió', () => {
        assert.throws(() => ejecutarConsulta('SELECT nombre FROM alumnos ORDER BY presentes', ALUMNOS), /tiene que estar en el SELECT/);
    });
});

describe('la escena de la consulta', () => {
    const escena = () => compilar(desdeConsulta({
        tabla: ALUMNOS,
        sql: 'SELECT nombre, presentes FROM alumnos WHERE presentes >= 8 ORDER BY presentes DESC',
    }));

    test('muestra las partes en el orden en que se EJECUTAN, no en el que se escriben', () => {
        const nombres = escena().capitulos.map((c) => c.nombre.split(' ')[0]);
        assert.deepEqual(nombres.slice(1), ['FROM', 'WHERE', 'SELECT', 'ORDER']);
    });

    test('al final, la tabla del resultado tiene lo que devuelve la consulta', () => {
        const e = escena();
        const fin = e.estado(e.duracion).piezas.destino;
        assert.deepEqual(fin.columnas, ['nombre', 'presentes']);
        assert.deepEqual(fin.filas, [['Diego', '14'], ['Lucía', '12'], ['Bruno', '12'], ['Sofía', '9']]);
    });

    test('mientras filtra, marca cada fila: cumple o no', () => {
        const e = escena();
        const fin = e.estado(e.duracion).piezas.origen;
        assert.deepEqual(fin.filas.map((f) => f.at(-1)), ['✓ sí', '✗ no', '✓ sí', '✓ sí', '✗ no', '✗ no', '✓ sí']);
    });
});

describe('el resaltado de SQL', () => {
    test('las palabras clave, en mayúscula o en minúscula', () => {
        const palabras = (l) => tokenizar(l, 'sql').filter((p) => p.clase === 'palabra').map((p) => p.texto);
        assert.deepEqual(palabras('select nombre from alumnos where x > 1'), ['select', 'from', 'where']);
        assert.deepEqual(palabras('ORDER BY presentes DESC'), ['ORDER', 'BY', 'DESC']);
    });

    test('un comentario de SQL empieza con --', () => {
        assert.equal(tokenizar("SELECT 1 -- 'no es texto'", 'sql').at(-1).clase, 'comentario');
    });
});
