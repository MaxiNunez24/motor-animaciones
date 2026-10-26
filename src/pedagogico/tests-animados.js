import { duracionLectura } from '../nucleo/linea.js';
import { caja, texto } from '../piezas/index.js';
import { codigo, caracteresPorLinea } from './piezas/codigo.js';

// Tests, animados: cómo corre pytest, test por test y assert por assert, y
// qué se ve cuando uno falla. Es un curso de testing: tiene que poder
// mostrarse el rojo, encontrar el error, corregirlo, y ver el verde.
//
// Los datos salen de _motor_probar() (en trazador.py): por la consola con
// `python herramientas/trazar.py programa.py --tests`, o en el navegador con
// probarConPyodide(). Cada test trae sus asserts con lo que dio y lo que se
// esperaba, así la escena puede decir "esperaba 50 y dio 0".

const ICONO = { espera: '⏳', corre: '▶', pasa: '✅', falla: '❌', error: '💥' };
const COLOR = { espera: 'borde', corre: 'acento', pasa: 'exito', falla: 'error', error: 'error' };

/**
 * @param {{
 *     corridas: { codigo: string, resultado?: any, tests?: any[], titulo?: string, explicacion?: string }[],
 *     titulo?: string, descripcion?: string, archivo?: string, ritmo?: number, lectura?: number,
 *     preguntas?: Record<string, any>,
 * }} opciones
 *     Cada corrida es una versión del programa con sus resultados: la primera
 *     puede fallar, y la segunda (con `explicacion` de qué se corrigió) pasar.
 *     `preguntas` va por "corrida.test" (por ejemplo "0.test_mitad"): frena
 *     justo antes del primer assert de ese test.
 */
export function desdeTests(opciones) {
    const { titulo = '', descripcion = '', archivo = 'test_programa.py', ritmo = 1.1, lectura = 13, preguntas = {} } = opciones;
    if (!opciones.corridas?.length) throw new Error('desdeTests necesita al menos una corrida: { codigo, resultado }.');
    // Una corrida puede venir como { codigo, resultado: { tests } } o tal cual
    // sale de la herramienta, { codigo, tests }: las dos sirven.
    const corridas = opciones.corridas.map((c) => ({ ...c, resultado: c.resultado ?? { tests: c.tests ?? [] } }));
    const maxTests = Math.max(...corridas.map((c) => c.resultado.tests.length));

    return function (disposicion) {
        const angosta = disposicion.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 1140 : 900;
        const arriba = titulo ? 100 : 30;

        const programas = corridas.map((c) => c.codigo.replace(/\s+$/, ''));
        const maxLineas = Math.max(...programas.map((p) => p.split('\n').length));
        const necesario = Math.max(...programas.flatMap((p) => p.split('\n').map((l) => l.length)));
        const cod = angosta ? { x: 320, ancho: 610, tamano: 20 } : { x: 450, ancho: 840, tamano: 30 };
        cod.tamano = Math.min(cod.tamano, cod.tamano * caracteresPorLinea(cod) / necesario);
        const disponible = angosta ? H * 0.45 : H - arriba - 40;
        cod.tamano = Math.min(cod.tamano, disponible / (maxLineas * 1.6 + 2.6));
        const piezaCodigo = codigo({ x: cod.x, y: 0, ancho: cod.ancho, tamano: cod.tamano, codigo: programas[0], titulo: archivo, marca: 0 });
        const altoCodigo = piezaCodigo.tipo.tamano(piezaCodigo.props).alto;
        piezaCodigo.props.y = arriba + altoCodigo / 2;

        const col = angosta
            ? { x: 320, ancho: 600, y: arriba + altoCodigo + 40, alto: 52, tamano: 22 }
            : { x: 1250, ancho: 560, y: arriba + 40, alto: 64, tamano: 27 };
        const piezas = {};
        if (titulo) piezas.titulo = texto({ x: W / 2, y: angosta ? 50 : 52, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
        piezas.codigo = piezaCodigo;
        piezas.rotulo = texto({ x: col.x - col.ancho / 2, y: col.y - 4, texto: 'pytest', tamano: col.tamano * 0.85, peso: 700, alineacion: 'inicio', color: 'suave', fuente: 'mono', opacidad: 0 });
        for (let i = 0; i < maxTests; i++) {
            piezas['test' + i] = caja({
                x: col.x, y: col.y + 20 + col.alto / 2 + i * (col.alto + 12), ancho: col.ancho, alto: col.alto, radio: 10,
                texto: '', tamano: col.tamano, peso: 600, borde: 'borde', grosorBorde: 3, opacidad: 0,
            });
        }
        const yDetalle = col.y + 20 + maxTests * (col.alto + 12) + (angosta ? 60 : 90);
        piezas.detalle = caja({
            x: col.x, y: yDetalle, ancho: col.ancho, alto: angosta ? 120 : 170, radio: 10, texto: '', tamano: col.tamano,
            peso: 500, borde: 'borde', opacidad: 0,
        });
        piezas.resumen = texto({
            x: col.x, y: yDetalle + (angosta ? 100 : 140), texto: '', tamano: col.tamano * 1.15, peso: 800, color: 'exito', opacidad: 0,
            anchoMax: col.ancho,
        });

        /** @type {any[]} */
        const linea = [];
        let t = 0.3;
        const decir = (subtitulo, extra = 0.3) => {
            const dur = Math.max(ritmo * 1.6, duracionLectura(subtitulo, lectura));
            linea.push({ subtitulo, en: t, dur });
            t += dur + extra;
        };
        const ponerTest = (i, estado, nombre) => {
            linea.push({ pieza: 'test' + i, a: { texto: `${ICONO[estado]}  ${nombre}`, borde: COLOR[estado], color: estado === 'espera' ? 'suave' : 'texto' }, dur: 0, en: t });
            linea.push({ pieza: 'test' + i, a: { resaltado: estado === 'corre' ? 1 : 0 }, dur: 0.25, en: t });
        };

        corridas.forEach((corrida, c) => {
            const tests = corrida.resultado.tests;
            linea.push({ capitulo: corrida.titulo ?? (c === 0 ? 'Corren los tests' : `Otra vez, ${c + 1}`), en: t });
            if (c > 0) {
                // El programa cambia: la corrección.
                linea.push({ pieza: 'codigo', a: { codigo: programas[c], marca: 0, colorMarca: 'acento' }, dur: 0, en: t });
                linea.push({ pieza: ['detalle', 'resumen'], a: { opacidad: 0 }, dur: 0.3, en: t });
                if (corrida.explicacion) decir(corrida.explicacion);
            }
            tests.forEach((test, i) => ponerTest(i, 'espera', test.nombre));
            for (let i = tests.length; i < maxTests; i++) linea.push({ pieza: 'test' + i, a: { opacidad: 0 }, dur: 0, en: t });
            linea.push({ pieza: ['rotulo', ...tests.map((_, i) => 'test' + i)], a: { opacidad: 1 }, dur: 0.4, en: t });
            if (c === 0) decir('pytest busca las funciones que empiezan con test_, y las corre una por una.');
            else decir('Se vuelven a correr todos los tests, no solo el que fallaba.');

            tests.forEach((test, i) => {
                ponerTest(i, 'corre', test.nombre);
                linea.push({ pieza: 'codigo', a: { linea: test.linea, marca: 1, colorMarca: 'acento' }, dur: 0.35, en: t });
                t += ritmo * 0.6;
                const p = preguntas[`${c}.${test.nombre}`];
                let respuesta = '';
                if (p) {
                    const enunciado = `${p.pregunta} Pausá y pensalo.`;
                    const dur = Math.max(p.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
                    linea.push({ marca: 'pregunta', datos: p, en: t, dur }, { subtitulo: enunciado, en: t, dur });
                    t += dur + 0.2;
                    if (p.opciones && p.correcta !== undefined) respuesta = `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ?? ''} `;
                }
                for (const a of test.asserts) {
                    linea.push({ pieza: 'codigo', a: { linea: a.linea, colorMarca: a.ok ? 'acento' : 'error' }, dur: 0.3, en: t });
                    const llamada = a.texto.split(' == ')[0];
                    linea.push({
                        pieza: 'detalle',
                        a: {
                            texto: a.ok ? `assert ${a.texto}\n✓ dio ${a.obtenido}` : `assert ${a.texto}\n✗ esperaba ${a.esperado}, y dio ${a.obtenido}`,
                            borde: a.ok ? 'exito' : 'error', color: a.ok ? 'texto' : 'error', opacidad: 1,
                        },
                        dur: 0, en: t + 0.4,
                    });
                    decir(a.ok
                        ? `${respuesta}${llamada} da ${a.obtenido}, como se esperaba.`
                        : `${respuesta}${llamada} dio ${a.obtenido}, y se esperaba ${a.esperado}: el test falla.`);
                    respuesta = '';
                }
                if (test.estado === 'error') {
                    linea.push({ pieza: 'detalle', a: { texto: `💥 ${test.error}`, borde: 'error', color: 'error', opacidad: 1 }, dur: 0, en: t });
                    decir(`El test se rompió antes de terminar: ${test.error}.`);
                }
                ponerTest(i, test.estado, test.nombre);
                t += ritmo * 0.4;
            });

            const fallan = tests.filter((x) => x.estado !== 'pasa').length;
            const pasan = tests.length - fallan;
            const resumen = fallan
                ? `${fallan} ${fallan === 1 ? 'falla' : 'fallan'}, ${pasan} ${pasan === 1 ? 'pasa' : 'pasan'}`
                : `${pasan} de ${tests.length}: todos pasan`;
            linea.push({ pieza: 'codigo', a: { marca: 0 }, dur: 0.3, en: t });
            linea.push({ pieza: 'resumen', a: { texto: resumen, color: fallan ? 'error' : 'exito', opacidad: 1 }, dur: 0.4, en: t });
            decir(fallan
                ? `Resultado: ${resumen}. Un test que falla no es una mala noticia: encontró un error antes que los usuarios.`
                : `Resultado: ${resumen}. Ahora el código hace lo que los tests dicen que tiene que hacer.`);
        });

        return {
            titulo: titulo || 'Tests, paso a paso',
            descripcion: descripcion || 'Los tests de un programa, corriendo uno por uno: qué se esperaba, qué dio, y cuáles pasan.',
            ancho: W,
            alto: H,
            lectura,
            pausaFinal: 1.5,
            piezas,
            linea,
        };
    };
}
