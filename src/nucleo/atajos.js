// Atajos para escribir la línea de tiempo más corto, al estilo de Manim
// (Create, FadeIn, Transform). Cada uno devuelve un paso común de la línea:
// se pueden mezclar con los escritos a mano y no hacen nada que no se pueda
// escribir largo.
//
//     linea: [
//         dibujar('circulo'),                       // { pieza: 'circulo', desde: { trazo: 0 }, a: { trazo: 1 }, dur: 1.2 }
//         aparecer(['a', 'b', 'c'], { escalonar: 0.08, crecer: true }),
//         transformar('circulo', figuras.estrella(5, 70), { curva: 'resorte' }),
//         mover('a', { x: 600 }),
//         desaparecer('b'),
//     ]
//
// El último argumento es siempre lo de cualquier paso: en, dur, curva,
// escalonar, sonido.

/** @typedef {Record<string, any>} Opciones */

/** Lo que pasa tal cual al paso (todo menos lo propio del atajo). @param {Opciones} op */
const comunes = ({ crecer, ...resto } = {}) => resto;

/**
 * Aparece con un fundido. Con `crecer`, además crece desde más chica.
 * @param {string | string[]} pieza
 * @param {Opciones} [op]
 */
export function aparecer(pieza, op = {}) {
    const crecer = op.crecer === true ? 0.6 : op.crecer;
    return {
        pieza,
        desde: { opacidad: 0, ...(crecer ? { escala: crecer } : {}) },
        a: { opacidad: 1, ...(crecer ? { escala: 1 } : {}) },
        ...comunes(op),
    };
}

/** @param {string | string[]} pieza @param {Opciones} [op] */
export function desaparecer(pieza, op = {}) {
    const achicar = op.crecer === true ? 0.6 : op.crecer;
    return { pieza, a: { opacidad: 0, ...(achicar ? { escala: achicar } : {}) }, ...comunes(op) };
}

/**
 * Se dibuja el borde de a poco y después se rellena (como Create de Manim).
 * @param {string | string[]} pieza @param {Opciones} [op]
 */
export function dibujar(pieza, op = {}) {
    return { pieza, desde: { trazo: 0, opacidad: 1 }, a: { trazo: 1, opacidad: 1 }, dur: 1.2, curva: 'suave', ...comunes(op) };
}

/** Lo contrario de dibujar: se va borrando. @param {string | string[]} pieza @param {Opciones} [op] */
export function borrar(pieza, op = {}) {
    return { pieza, a: { trazo: 0 }, dur: 0.8, ...comunes(op) };
}

/**
 * @param {string | string[]} pieza
 * @param {Record<string, any>} a a dónde: { x, y }, o cualquier propiedad
 * @param {Opciones} [op]
 */
export function mover(pieza, a, op = {}) {
    return { pieza, a, ...comunes(op) };
}

/**
 * Una forma que se transforma en otra (como Transform de Manim).
 * @param {string} pieza una forma({...})
 * @param {string} d el camino de llegada, por ejemplo figuras.estrella()
 * @param {Opciones} [op] también colores de llegada: { relleno: 'acento2' }
 */
export function transformar(pieza, d, op = {}) {
    const { relleno, borde, ...resto } = op;
    return {
        pieza,
        a: { d, ...(relleno ? { relleno } : {}), ...(borde ? { borde } : {}) },
        dur: 1,
        ...comunes(resto),
    };
}

/**
 * Un subtítulo que dura lo que se tarda en leerlo.
 * @param {string} texto @param {Opciones} [op]
 */
export function decir(texto, op = {}) {
    return { subtitulo: texto, ...op };
}

/**
 * Un sonido suelto en la línea.
 * @param {string} nombre pop, whoosh, clic, ding, golpe, exito, error, chispa (o uno del estilo)
 * @param {Opciones} [op] en, volumen, tono
 */
export function sonar(nombre, op = {}) {
    return { sonido: nombre, ...op };
}
