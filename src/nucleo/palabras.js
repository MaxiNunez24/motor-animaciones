// Cuándo se dice cada palabra de un subtítulo: para los subtítulos "de reel",
// que se van iluminando a medida que la voz avanza.
//
// No se escucha la voz (eso sería otra cosa en vivo y otra en el video): se
// estima, como el tiempo de lectura. Cada palabra pesa lo que tiene de letras,
// y después de una coma o un punto hay una pausa. Con voz, la voz dura más o
// menos eso; sin voz, es el ritmo al que se lee.

/**
 * @param {string} texto
 * @param {number} desde cuándo aparece el subtítulo
 * @param {number} hasta cuándo se va
 * @param {{ ritmo?: number, porGrupo?: number }} [opciones]
 *     ritmo: letras por segundo (unos 15 es lo que se habla).
 *     porGrupo: cuántas palabras se ven a la vez (0: todas). Un grupo también
 *     se corta en un punto o una coma, para que no quede media frase colgada.
 * @returns {{ texto: string, desde: number, hasta: number, grupo: number }[]}
 */
export function palabrasDe(texto, desde, hasta, { ritmo = 15, porGrupo = 0 } = {}) {
    const palabras = String(texto).split(/\s+/).filter(Boolean);
    if (!palabras.length) return [];
    const pesos = palabras.map((p) => Array.from(p).length + 1 + (/[.!?…]$/.test(p) ? 5 : /[,;:]$/.test(p) ? 3 : 0));
    const total = pesos.reduce((a, b) => a + b, 0);
    // Lo que se tarda en decirlo, sin pasarse de lo que dura el subtítulo.
    const habla = Math.min(hasta - desde, total / ritmo);
    let acum = 0;
    let grupo = 0;
    let enGrupo = 0;
    return palabras.map((p, k) => {
        const inicio = desde + (habla * acum) / total;
        acum += pesos[k];
        const fin = desde + (habla * acum) / total;
        const esta = { texto: p, desde: inicio, hasta: fin, grupo };
        enGrupo += 1;
        const corta = porGrupo > 0 && (enGrupo >= porGrupo || /[.!?…,;:]$/.test(p));
        if (corta && k < palabras.length - 1) {
            grupo += 1;
            enGrupo = 0;
        }
        return esta;
    });
}
