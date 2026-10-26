import { TRAZADOR_PY } from './trazador-py.js';

// Trazar un programa de Python en el navegador, con Pyodide.
//
// El motor no carga Pyodide ni depende de él: recibe uno ya cargado. La
// plataforma del curso ya tiene el suyo (en un worker), y una página suelta
// puede cargarlo de jsDelivr. Lo que corre adentro es src/pedagogico/trazador.py,
// el mismo trazador de la consola.

export { TRAZADOR_PY };

/**
 * @param {{ runPython: (codigo: string) => any, globals: { get: (nombre: string) => any } }} pyodide
 *     un Pyodide ya cargado (loadPyodide()).
 * @param {string} codigo el programa
 * @param {{ maxPasos?: number, entradas?: string[] }} [opciones]
 *     `entradas`: las respuestas para cada input(), en orden.
 * @returns {{ codigo: string, lenguaje: 'python', traza: any[] }}
 *     lo que espera desdeTraza().
 */
export function trazarConPyodide(pyodide, codigo, opciones = {}) {
    const { maxPasos = 400, entradas = [] } = opciones;
    pyodide.runPython(TRAZADOR_PY);
    const trazar = pyodide.globals.get('_motor_trazar');
    try {
        return JSON.parse(trazar(codigo, maxPasos, entradas));
    } finally {
        // Las funciones de Python que llegan a JavaScript se liberan a mano:
        // si no, quedan ocupando memoria en Pyodide.
        trazar.destroy?.();
    }
}
