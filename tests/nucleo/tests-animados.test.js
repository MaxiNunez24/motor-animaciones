// Los tests animados: el corredor de tests del trazador (en Python) y la
// escena que muestra el rojo y el verde.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { compilar } from '../../src/nucleo/index.js';
import { desdeTests } from '../../src/pedagogico/index.js';

let hayPython = true;
try {
    execFileSync('python', ['--version']);
} catch {
    hayPython = false;
}

function probar(codigo) {
    const programa = "exec(open('src/pedagogico/trazador.py', encoding='utf-8').read())\nimport json, sys\nsys.stdout.reconfigure(encoding='utf-8')\nprint(_motor_probar(json.loads(sys.argv[1])))";
    return JSON.parse(execFileSync('python', ['-I', '-c', programa, JSON.stringify(codigo)], { encoding: 'utf-8' }));
}

const CON_ERROR = 'def porcentaje(p, c):\n    return p // c * 100\n\ndef test_mitad():\n    assert porcentaje(10, 20) == 50\n\ndef test_todas():\n    assert porcentaje(20, 20) == 100\n';
const CORREGIDO = CON_ERROR.replace('p // c * 100', 'p * 100 // c');

describe('el corredor de tests', { skip: !hayPython && 'no hay Python en esta compu' }, () => {
    test('cada test con su estado, y cada assert con lo que dio y lo que se esperaba', () => {
        const { tests } = probar(CON_ERROR);
        assert.deepEqual(tests.map((t) => [t.nombre, t.estado]), [['test_mitad', 'falla'], ['test_todas', 'pasa']]);
        assert.deepEqual(tests[0].asserts[0], { linea: 5, texto: 'porcentaje(10, 20) == 50', obtenido: '0', esperado: '50', ok: false });
    });

    test('un assert que no es una comparación se anota igual', () => {
        const { tests } = probar('def test_vacia():\n    assert [] \n');
        assert.equal(tests[0].estado, 'falla');
        assert.equal(tests[0].asserts[0].texto, '[]');
    });

    test('un test que se rompe es "error", no "falla"', () => {
        const { tests } = probar('def test_division():\n    assert 1 / 0 == 0\n');
        assert.equal(tests[0].estado, 'error');
        assert.match(tests[0].error, /ZeroDivisionError/);
    });

    test('se corta en el primer assert que falla, como pytest', () => {
        const { tests } = probar('def test_dos():\n    assert 1 == 2\n    assert 2 == 2\n');
        assert.equal(tests[0].asserts.length, 1);
    });

    test('un error de sintaxis se avisa en vez de correr', () => {
        assert.match(probar('def test_x(:\n    pass\n').error, /SyntaxError/);
    });
});

describe('la escena de los tests', { skip: !hayPython && 'no hay Python en esta compu' }, () => {
    const escena = () => compilar(desdeTests({
        corridas: [
            { codigo: CON_ERROR, ...probar(CON_ERROR) },
            { codigo: CORREGIDO, ...probar(CORREGIDO), titulo: 'Corregido', explicacion: 'Se multiplica primero.' },
        ],
        preguntas: { '0.test_mitad': { pregunta: '¿Qué va a dar?', opciones: ['50', '0'], correcta: 1 } },
    }));

    test('un capítulo por corrida, y la pregunta antes del primer assert', () => {
        const e = escena();
        assert.deepEqual(e.capitulos.map((c) => c.nombre), ['Corren los tests', 'Corregido']);
        assert.equal(e.marcas.filter((m) => m.tipo === 'pregunta').length, 1);
    });

    test('la primera corrida termina en rojo y la segunda en verde', () => {
        const e = escena();
        const finPrimera = e.estado(e.capitulos[1].t - 0.01).piezas;
        assert.equal(finPrimera.resumen.texto, '1 falla, 1 pasa');
        assert.equal(finPrimera.test0.texto, '❌  test_mitad');
        const fin = e.estado(e.duracion).piezas;
        assert.equal(fin.resumen.texto, '2 de 2: todos pasan');
        assert.equal(fin.test0.texto, '✅  test_mitad');
    });

    test('el detalle dice qué se esperaba y qué dio', () => {
        const e = escena();
        const t = e.subtitulos.find((s) => s.texto.includes('se esperaba 50')).desde + 0.6;
        assert.match(e.estado(t).piezas.detalle.texto, /esperaba 50, y dio 0/);
    });
});
