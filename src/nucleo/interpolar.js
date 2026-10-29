import { mezclarColores } from './colores.js';
import { mezclarFormas } from './formas.js';

/**
 * El valor de una propiedad en un punto del camino entre dos valores.
 *
 * Hay cuatro clases de propiedades y cada una se mezcla distinto:
 *   - números: se recorre el camino (la posición, la opacidad);
 *   - colores: se mezclan (la pieza dice cuáles de sus propiedades son colores);
 *   - formas: un camino de SVG se transforma en otro (la pieza dice cuáles);
 *   - todo lo demás (un texto, una lista de filas): no tiene "punto medio", así
 *     que cambia de golpe cuando la animación termina.
 *
 * @param {any} desde
 * @param {any} hasta
 * @param {number} p el avance ya pasado por la curva (puede salirse de 0..1 con "pasarse")
 * @param {'numero' | 'color' | 'forma' | 'discreto'} clase
 */
export function interpolar(desde, hasta, p, clase) {
    if (clase === 'numero') {
        // Infinity no tiene camino ("todas las filas" a "dos filas"): salta.
        if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return p >= 1 ? hasta : desde;
        return desde + (hasta - desde) * p;
    }
    if (clase === 'color') return mezclarColores(desde, hasta, Math.min(Math.max(p, 0), 1));
    if (clase === 'forma') return mezclarFormas(desde, hasta, p);
    return p >= 1 ? hasta : desde;
}

/**
 * Qué clase de propiedad es, mirando el valor y lo que declaró la pieza.
 * @param {string} prop
 * @param {any} valor
 * @param {Set<string>} colores las propiedades que la pieza declara como color
 * @param {Set<string>} [formas] las que declara como forma (un camino de SVG)
 * @returns {'numero' | 'color' | 'forma' | 'discreto'}
 */
export function claseDe(prop, valor, colores, formas) {
    if (colores.has(prop)) return 'color';
    if (formas?.has(prop)) return 'forma';
    if (typeof valor === 'number') return 'numero';
    return 'discreto';
}

/** Recorta un número entre dos límites. */
export function limitar(valor, min, max) {
    return Math.min(Math.max(valor, min), max);
}
