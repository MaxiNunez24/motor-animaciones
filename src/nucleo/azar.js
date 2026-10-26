// Azar con semilla.
//
// Math.random() da otra cosa cada vez que se carga la página: una escena que lo
// use se vería distinta en vivo, en el paso a paso y en el video. Con semilla,
// la "casualidad" es siempre la misma: los papeles quedan desparramados igual
// cada vez, y se pueden escribir tests que lo verifiquen.
//
// El generador es mulberry32: corto, rápido y suficiente para decidir dónde
// cae un papel. No sirve para criptografía, ni hace falta.

/**
 * @param {number | string} semilla un número, o un texto que se convierte en número
 */
export function azar(semilla = 1) {
    let a = typeof semilla === 'string' ? hashTexto(semilla) : semilla >>> 0;

    /** Un número entre 0 (incluido) y 1 (excluido). */
    function siguiente() {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    return {
        siguiente,
        /** Un número con coma entre min y max. */
        entre: (min, max) => min + siguiente() * (max - min),
        /** Un entero entre min y max, los dos incluidos. */
        entero: (min, max) => min + Math.floor(siguiente() * (max - min + 1)),
        /** Un elemento cualquiera de una lista. */
        elegir: (lista) => lista[Math.floor(siguiente() * lista.length)],
    };
}

// FNV-1a: para que "papeles" y "papeles2" den semillas bien distintas.
function hashTexto(texto) {
    let h = 0x811c9dc5;
    for (let i = 0; i < texto.length; i++) {
        h ^= texto.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
