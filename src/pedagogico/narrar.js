import { duracionLectura } from '../nucleo/linea.js';

// Lo que tienen en común las escenas que se arman solas (una derivada, una
// subred, un saludo de TCP): se van diciendo cosas, una detrás de la otra, con
// capítulos y alguna pregunta en el medio.
//
// El narrador lleva la cuenta del tiempo: cada `decir` dura lo que se tarda en
// leerlo, y lo que se anima mientras tanto se agrega con `en: n.tiempo`. Así
// la escena se arma de arriba para abajo, como se cuenta, sin calcular a mano
// en qué segundo pasa cada cosa.

/**
 * @param {{ ritmo?: number, lectura?: number, preguntas?: Record<string, any>, inicio?: number }} [opciones]
 */
export function crearNarrador(opciones = {}) {
    const ritmo = opciones.ritmo ?? 1;
    const lectura = opciones.lectura ?? 13;
    const preguntas = opciones.preguntas ?? {};
    /** @type {any[]} */
    const linea = [];
    let respuestaPendiente = '';

    const n = {
        linea,
        tiempo: opciones.inicio ?? 0.3,
        ritmo,
        lectura,

        /** Agrega una animación (o varias) que arranca ahora, o `demora` segundos después. */
        animar(item, demora = 0) {
            for (const i of [item].flat()) linea.push({ en: n.tiempo + demora, ...i });
            return n;
        },

        /**
         * Un subtítulo. Dura lo que se tarda en leerlo (nunca menos de dos
         * ritmos) y el tiempo avanza hasta que termina, más `extra`. Si antes
         * hubo una pregunta, su respuesta se dice primero.
         */
        decir(texto, extra = 0.4) {
            const subtitulo = respuestaPendiente + texto;
            respuestaPendiente = '';
            const dur = Math.max(ritmo * 2, duracionLectura(subtitulo, lectura));
            linea.push({ subtitulo, en: n.tiempo, dur });
            n.tiempo += dur + extra;
            return dur;
        },

        /** Deja pasar un rato sin decir nada (para mirar algo que se mueve). */
        esperar(segundos) {
            n.tiempo += segundos * ritmo;
        },

        capitulo(nombre) {
            linea.push({ capitulo: nombre, en: n.tiempo });
        },

        /**
         * Si hay una pregunta con esa clave, la hace (frena la lección) y
         * guarda la respuesta para el próximo `decir`.
         */
        preguntar(clave) {
            const p = preguntas[clave];
            if (!p) return false;
            const enunciado = `${p.pregunta} Pausá y pensalo.`;
            const dur = Math.max(p.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
            linea.push({ marca: 'pregunta', datos: p, en: n.tiempo, dur }, { subtitulo: enunciado, en: n.tiempo, dur });
            n.tiempo += dur + 0.2;
            respuestaPendiente = p.opciones && p.correcta !== undefined
                ? `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ? `${p.explicacion} ` : ''}`
                : '';
            return true;
        },
    };
    return n;
}
