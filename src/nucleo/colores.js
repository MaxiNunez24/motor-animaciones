// Los colores de una escena se escriben por su PAPEL ("acento", "texto"), no
// por su valor ("#2563eb"). Así la misma escena se ve bien en modo claro y en
// modo oscuro, y cada sitio la puede adaptar a sus colores sin tocarla.
//
// Cada nombre de acá es una variable CSS (--ma-acento, etc.) que define el tema.

export const TOKENS = [
    'fondo',      // detrás de todo
    'superficie', // el relleno de cajas y tarjetas
    'texto',
    'suave',      // texto secundario, líneas finas
    'borde',
    'acento',     // lo que hay que mirar
    'acento2',    // un segundo protagonista
    'exito',
    'alerta',
    'error',
    'papel',      // hojas, planillas, lo que es "de papel"
    'marco',      // el cuerpo de un celular o de una pantalla
];

const ES_TOKEN = new Set(TOKENS);

/**
 * Convierte un color de escena en CSS: los nombres de tokens pasan a ser
 * variables y cualquier otra cosa ("#c00", "rgb(...)") pasa tal cual.
 * @param {string} valor
 */
export function aCss(valor) {
    if (valor == null || valor === '' || valor === 'ninguno') return 'none';
    return ES_TOKEN.has(valor) ? `var(--ma-${valor})` : valor;
}

/**
 * La mezcla de dos colores en un punto del camino.
 *
 * Se resuelve con color-mix() de CSS y no con cuentas en JavaScript porque los
 * tokens recién tienen valor en el navegador, cuando se aplica el tema: acá no
 * sabemos qué es "acento". El resultado igual es determinista, porque es un
 * texto que depende solo de p.
 * @param {string} desde
 * @param {string} hasta
 * @param {number} p de 0 a 1
 */
export function mezclarColores(desde, hasta, p) {
    if (p <= 0) return desde;
    if (p >= 1) return hasta;
    // Redondeado a centésimas de por ciento: más precisión no se ve, y así el
    // texto no cambia por diferencias de coma flotante entre una corrida y otra.
    const pct = Math.round((1 - p) * 10000) / 100;
    return `color-mix(in srgb, ${aCss(desde)} ${pct}%, ${aCss(hasta)})`;
}
