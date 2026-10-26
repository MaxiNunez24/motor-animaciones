import { mezclarColores } from './colores.js';

/**
 * El valor de una propiedad en un punto del camino entre dos valores.
 *
 * Hay tres clases de propiedades y cada una se mezcla distinto:
 *   - números: se recorre el camino (la posición, la opacidad);
 *   - colores: se mezclan (la pieza dice cuáles de sus propiedades son colores);
 *   - todo lo demás (un texto, una lista de filas): no tiene "punto medio", así
 *     que cambia de golpe cuando la animación termina.
 *
 * @param {any} desde
 * @param {any} hasta
 * @param {number} p el avance ya pasado por la curva (puede salirse de 0..1 con "pasarse")
 * @param {'numero' | 'color' | 'discreto'} clase
 */
export function interpolar(desde, hasta, p, clase) {
    if (clase === 'numero') {
        // Infinity no tiene camino ("todas las filas" a "dos filas"): salta.
        if (!Number.isFinite(desde) || !Number.isFinite(hasta)) return p >= 1 ? hasta : desde;
        return desde + (hasta - desde) * p;
    }
    if (clase === 'color') return mezclarColores(desde, hasta, Math.min(Math.max(p, 0), 1));
    return p >= 1 ? hasta : desde;
}

/**
 * Qué clase de propiedad es, mirando el valor y lo que declaró la pieza.
 * @param {string} prop
 * @param {any} valor
 * @param {Set<string>} colores las propiedades que la pieza declara como color
 * @returns {'numero' | 'color' | 'discreto'}
 */
export function claseDe(prop, valor, colores) {
    if (colores.has(prop)) return 'color';
    if (typeof valor === 'number') return 'numero';
    return 'discreto';
}

/** Recorta un número entre dos límites. */
export function limitar(valor, min, max) {
    return Math.min(Math.max(valor, min), max);
}
