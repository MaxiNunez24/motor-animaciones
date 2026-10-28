// Los textos que acompañan a un video: los subtítulos en .srt y los capítulos
// para la descripción de YouTube. Son funciones puras, sin archivos ni
// navegador, para poder probarlas con números.

/** 75.25 → "00:01:15,250", el formato de tiempo de un .srt. */
export function tiempoSrt(segundos) {
    const ms = Math.round(Math.max(segundos, 0) * 1000);
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    const resto = ms % 1000;
    const dos = (n) => String(n).padStart(2, '0');
    return `${dos(h)}:${dos(m)}:${dos(s)},${String(resto).padStart(3, '0')}`;
}

/**
 * Los subtítulos de una escena como archivo .srt, que YouTube acepta tal cual.
 * Se suben aparte y no "quemados" en la imagen: así se pueden apagar, se
 * leen con lector de pantalla y YouTube los puede traducir.
 * @param {{ texto: string, desde: number, hasta: number }[]} subtitulos
 */
export function aSrt(subtitulos) {
    return [...subtitulos]
        .sort((a, b) => a.desde - b.desde)
        .map((s, i) => `${i + 1}\n${tiempoSrt(s.desde)} --> ${tiempoSrt(s.hasta)}\n${s.texto}\n`)
        .join('\n');
}

/**
 * Los mismos subtítulos en WebVTT, el formato de <track> en una página web.
 * Es casi un .srt: encabezado WEBVTT y punto en vez de coma en los milisegundos.
 * @param {{ texto: string, desde: number, hasta: number }[]} subtitulos
 */
export function aVtt(subtitulos) {
    const cuerpo = aSrt(subtitulos).replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2');
    return `WEBVTT\n\n${cuerpo}`;
}

/** 75 → "1:15", como los escribe YouTube (igual que guiones/capitulos.py del curso). */
export function reloj(segundos) {
    const s = Math.floor(segundos);
    if (s >= 3600) return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Los capítulos para pegar en la descripción de YouTube, y lo que les falta
 * para que YouTube los tome: que arranquen en 0:00, que sean al menos tres y
 * que cada uno dure 10 segundos o más.
 * @param {{ nombre: string, t: number }[]} capitulos
 * @param {number} duracion
 * @returns {{ texto: string, problemas: string[] }}
 */
export function capitulosYouTube(capitulos, duracion) {
    const lista = [...capitulos].sort((a, b) => a.t - b.t);
    const problemas = [];
    if (lista.length === 0) return { texto: '', problemas: ['La escena no tiene capítulos.'] };
    if (lista[0].t > 0.5) {
        problemas.push('El primer capítulo no arranca en 0:00: YouTube los ignora. Se agregó uno "Inicio".');
        lista.unshift({ nombre: 'Inicio', t: 0 });
    }
    if (lista.length < 3) problemas.push(`Hay ${lista.length} capítulos: YouTube pide al menos 3.`);
    lista.forEach((c, i) => {
        const fin = i + 1 < lista.length ? lista[i + 1].t : duracion;
        if (fin - c.t < 10) problemas.push(`"${c.nombre}" dura ${(fin - c.t).toFixed(1)} s: YouTube pide 10 o más.`);
    });
    const texto = lista.map((c, i) => `${i === 0 ? '0:00' : reloj(c.t)} ${c.nombre}`).join('\n');
    return { texto, problemas };
}

// Lo que la voz lee raro si se lo deja tal cual: símbolos, código, siglas.
// El orden importa: ">=" tiene que ir antes que ">" y que "=".
const PARA_LEER = [
    [/°C\b/g, ' grados'],
    [/°/g, ' grados'],
    [/(\d)\s*%/g, '$1 por ciento'],
    [/>=/g, ' mayor o igual a '],
    [/<=/g, ' menor o igual a '],
    [/!=|<>/g, ' distinto de '],
    [/==/g, ' igual a '],
    [/\/\//g, ' división entera '],
    [/\s>\s/g, ' mayor que '],
    [/\s<\s/g, ' menor que '],
    [/#(\d+)/g, 'número $1'],
    [/\bNOAA\b/g, 'Noá'],
    [/\(\)/g, ''],
    [/[[\]{}«»"“”]/g, ''],
    [/\s[·—–]\s/g, ', '],
    // La matemática, como se dice en voz alta.
    [/([\p{L}\d)])²/gu, '$1 al cuadrado'],
    [/([\p{L}\d)])³/gu, '$1 al cubo'],
    [/√/g, 'raíz de '],
    [/∇/g, 'gradiente de '],
    [/\s=\s/g, ' igual a '],
    [/\s\+\s/g, ' más '],
    [/\s[−-]\s/g, ' menos '],
    [/\s[×·]\s/g, ' por '],
    [/\s\/\s/g, ' dividido '],
    [/\s±\s/g, ' más menos '],
    [/\s≈\s/g, ' aproximadamente '],
    [/′/g, ' prima'],
    [/…/g, '...'],
    // nombres_con_guion_bajo: "test mitad", no "test guion bajo mitad".
    [/([A-Za-z])_(?=[A-Za-z])/g, '$1 '],
];

/**
 * Un subtítulo, preparado para que lo lea la voz: sin emojis, con los
 * símbolos dichos en palabras, y terminado en punto (si no, la voz deja la
 * frase "colgada", con la entonación para arriba, y suena a robot).
 * @param {string} texto
 */
export function prepararParaVoz(texto) {
    let t = String(texto).replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '');
    for (const [patron, reemplazo] of PARA_LEER) t = t.replace(patron, reemplazo);
    t = t.replace(/\s+/g, ' ').replace(/\s+([.,:;!?])/g, '$1').trim();
    if (t && !/[.!?…]$/.test(t)) t += '.';
    return t;
}

/**
 * Cuánto dura un .wav, leyendo su encabezado. Alcanza con los que escribe
 * Piper (PCM), sin traer una librería de audio.
 * @param {Uint8Array} bytes
 */
export function duracionWav(bytes) {
    const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const texto = (o, n) => String.fromCharCode(...bytes.subarray(o, o + n));
    if (texto(0, 4) !== 'RIFF' || texto(8, 4) !== 'WAVE') throw new Error('No es un archivo WAV.');
    let o = 12;
    let bytesPorSegundo = 0;
    while (o + 8 <= bytes.length) {
        const id = texto(o, 4);
        const tam = vista.getUint32(o + 4, true);
        if (id === 'fmt ') bytesPorSegundo = vista.getUint32(o + 16, true);
        // Piper escribe el tamaño de los datos en 0 cuando manda a la salida
        // estándar; ahí se cuenta hasta el final del archivo.
        if (id === 'data') return ((tam || bytes.length - o - 8) / bytesPorSegundo);
        o += 8 + tam + (tam % 2);
    }
    throw new Error('El WAV no tiene datos.');
}
