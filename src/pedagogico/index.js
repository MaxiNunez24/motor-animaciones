// La capa pedagógica: está ENCIMA del motor y el motor no sabe que existe.
// Usa lo que el núcleo ofrece a cualquiera (las piezas, las marcas, las
// paradas del reloj) para explicar conceptos: código que corre, variables
// que cambian, preguntas que frenan la animación.
export { codigo, caracteresPorLinea } from './piezas/codigo.js';
export { variable } from './piezas/variable.js';
export { lista } from './piezas/lista.js';
export { consola } from './piezas/consola.js';
export { tokenizar, COLORES_CODIGO } from './resaltar.js';
export { desdeTraza } from './traza.js';
export { MotorLeccion, definirLeccion } from './leccion.js';
export { trazarConPyodide, probarConPyodide, TRAZADOR_PY } from './trazador.js';
export { explicarPaso, detectarPunteros } from './explicar.js';
export { pila } from './piezas/pila.js';
export { desdeConsulta, ejecutarConsulta } from './consulta.js';
export { desdeTests } from './tests-animados.js';
export { crearNarrador } from './narrar.js';
