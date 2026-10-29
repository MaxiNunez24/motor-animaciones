// Los efectos de sonido, fabricados con cuentas en vez de grabados.
//
// Un "pop", un "whoosh" o un "ding" son pocas cosas: una onda que baja de
// tono, un ruido que se filtra, una campana que se apaga. Armarlos acá tiene
// tres ventajas sobre bajar archivos: no hay licencias que revisar, pesan
// nada, y cada estilo los puede cambiar con números (más grave, más largo, más
// brillante). El ruido sale de un azar con semilla: el mismo sonido es siempre
// el mismo, en vivo y en el video.
//
// Cada receta recibe sus opciones y la frecuencia de muestreo, y devuelve las
// muestras (de −1 a 1). No toca el navegador: se usa igual en la página (con
// Web Audio) y en Node (herramientas/video.js, que los mezcla en el video).

import { azar } from '../nucleo/azar.js';

/** Cuántas muestras por segundo, si no se dice otra cosa. */
export const FRECUENCIA = 48000;

const muestras = (seg, fm) => new Float32Array(Math.max(1, Math.round(seg * fm)));

// Un filtro de un polo: deja pasar lo grave (o, restando, lo agudo). Alcanza
// para darle color a un ruido.
function pasaBajos(senal, corte, fm) {
    const a = 1 - Math.exp((-2 * Math.PI * corte) / fm);
    let y = 0;
    return (x) => (y += a * (x - y));
}

/**
 * Las recetas. Todas aceptan `tono` (semitonos: +12 es una octava más
 * aguda), `dur` (segundos) y `volumen`, además de las suyas.
 */
export const RECETAS = {
    /** Una burbuja que revienta: un tono que cae rápido. Para que algo aparezca. */
    pop({ tono = 0, dur = 0.11, agudo = 900, grave = 260, volumen = 0.8 } = {}, fm = FRECUENCIA) {
        const f = 2 ** (tono / 12);
        const s = muestras(dur, fm);
        let fase = 0;
        for (let i = 0; i < s.length; i++) {
            const t = i / fm;
            const p = t / dur;
            const hz = (grave + (agudo - grave) * Math.exp(-p * 7)) * f;
            fase += (2 * Math.PI * hz) / fm;
            // Ataque de medio milisegundo: sin él, el arranque hace "clic".
            const env = Math.min(1, t / 0.0005) * Math.exp(-p * 6);
            s[i] = Math.sin(fase) * env * volumen;
        }
        return s;
    },

    /** Aire que pasa: un ruido que se abre y se cierra. Para algo que se mueve. */
    whoosh({ tono = 0, dur = 0.42, brillo = 0.5, volumen = 0.55, semilla = 7 } = {}, fm = FRECUENCIA) {
        const f = 2 ** (tono / 12);
        const s = muestras(dur, fm);
        const r = azar(semilla);
        // Dos filtros que se mueven juntos: el sonido "pasa" de grave a agudo.
        let y1 = 0, y2 = 0;
        for (let i = 0; i < s.length; i++) {
            const p = i / s.length;
            const corte = (300 + 3200 * brillo * Math.sin(Math.PI * p)) * f;
            const a = 1 - Math.exp((-2 * Math.PI * corte) / fm);
            const ruido = r.siguiente() * 2 - 1;
            y1 += a * (ruido - y1);
            y2 += a * (y1 - y2);
            // Sube rápido y se apaga despacio, como algo que pasa cerca.
            const env = Math.sin(Math.PI * Math.min(1, p * 1.6)) ** 2 * (1 - p) ** 0.6;
            s[i] = (y1 - y2 * 0.4) * env * volumen * 2.2;
        }
        return s;
    },

    /** Un toque seco, como una tecla o un clic de mouse. */
    clic({ tono = 0, dur = 0.03, volumen = 0.6, semilla = 3 } = {}, fm = FRECUENCIA) {
        const f = 2 ** (tono / 12);
        const s = muestras(dur, fm);
        const r = azar(semilla);
        const bajos = pasaBajos(s, 2500 * f, fm);
        let fase = 0;
        for (let i = 0; i < s.length; i++) {
            const p = i / s.length;
            const ruido = r.siguiente() * 2 - 1;
            const agudo = ruido - bajos(ruido);
            fase += (2 * Math.PI * 1800 * f) / fm;
            s[i] = (agudo * 0.7 + Math.sin(fase) * 0.4) * Math.exp(-p * 9) * volumen;
        }
        return s;
    },

    /** Una campanita. Para "esto es lo importante" o una respuesta. */
    ding({ tono = 0, dur = 0.7, nota = 1320, volumen = 0.45 } = {}, fm = FRECUENCIA) {
        const hz = nota * 2 ** (tono / 12);
        const s = muestras(dur, fm);
        // Una campana no es una onda sola: lleva parciales que no son
        // múltiplos exactos, y los agudos se apagan antes.
        const parciales = [[1, 1, 3.5], [2.01, 0.45, 6], [3.02, 0.22, 9], [4.17, 0.12, 12]];
        for (let i = 0; i < s.length; i++) {
            const t = i / fm;
            let v = 0;
            for (const [m, a, caida] of parciales) v += a * Math.sin(2 * Math.PI * hz * m * t) * Math.exp(-t * caida);
            s[i] = v * Math.min(1, t / 0.002) * volumen * 0.7;
        }
        return s;
    },

    /** Un golpe grave, como algo que cae y pesa. */
    golpe({ tono = 0, dur = 0.25, volumen = 0.9 } = {}, fm = FRECUENCIA) {
        const f = 2 ** (tono / 12);
        const s = muestras(dur, fm);
        let fase = 0;
        for (let i = 0; i < s.length; i++) {
            const t = i / fm;
            const p = t / dur;
            fase += (2 * Math.PI * (45 + 110 * Math.exp(-p * 10)) * f) / fm;
            s[i] = Math.tanh(Math.sin(fase) * 1.6) * Math.min(1, t / 0.001) * Math.exp(-p * 5) * volumen;
        }
        return s;
    },

    /** Dos notas que suben: bien. */
    exito({ tono = 0, volumen = 0.45 } = {}, fm = FRECUENCIA) {
        return encadenar([
            [0, RECETAS.ding({ tono, nota: 1046.5, dur: 0.5, volumen }, fm)],
            [0.1, RECETAS.ding({ tono, nota: 1568, dur: 0.6, volumen }, fm)],
        ], fm);
    },

    /** Dos notas graves que bajan: no era por ahí. */
    error({ tono = 0, volumen = 0.4, dur = 0.16 } = {}, fm = FRECUENCIA) {
        const nota = (hz, d) => {
            const s = muestras(d, fm);
            for (let i = 0; i < s.length; i++) {
                const t = i / fm;
                // Un poco cuadrada (con armónicos impares) para que suene a "bip".
                const x = 2 * Math.PI * hz * 2 ** (tono / 12) * t;
                s[i] = (Math.sin(x) + Math.sin(3 * x) / 3 + Math.sin(5 * x) / 5) * Math.min(1, t / 0.003) * Math.exp(-t * 5) * volumen;
            }
            return s;
        };
        return encadenar([[0, nota(330, dur)], [dur * 0.9, nota(247, dur * 1.6)]], fm);
    },

    /** Unos destellos agudos, uno detrás del otro. Para algo que brilla o se completa. */
    chispa({ tono = 0, volumen = 0.3, cuantas = 5, semilla = 5 } = {}, fm = FRECUENCIA) {
        const r = azar(semilla);
        const partes = [];
        for (let k = 0; k < cuantas; k++) {
            partes.push([k * 0.045, RECETAS.ding({ tono: tono + Math.round(r.entre(10, 22)), nota: 1046.5, dur: 0.25, volumen: volumen * (1 - k / (cuantas + 2)) }, fm)]);
        }
        return encadenar(partes, fm);
    },
};

function encadenar(partes, fm) {
    const largo = Math.max(...partes.map(([t, s]) => Math.round(t * fm) + s.length));
    const salida = new Float32Array(largo);
    for (const [t, s] of partes) {
        const desde = Math.round(t * fm);
        for (let i = 0; i < s.length; i++) salida[desde + i] += s[i];
    }
    return salida;
}

/**
 * Las muestras de un sonido por nombre. El estilo puede traer su propio
 * paquete: cambiar las opciones de una receta ({ receta: 'pop', agudo: 1400 })
 * o inventar un nombre nuevo a partir de una que ya existe.
 * @param {string} nombre
 * @param {{ tono?: number, paquete?: Record<string, any>, frecuencia?: number }} [opciones]
 * @returns {Float32Array | null} null si el sonido es un archivo (lo resuelve quien reproduce)
 */
export function sintetizar(nombre, { tono = 0, paquete = {}, frecuencia = FRECUENCIA } = {}) {
    const def = paquete[nombre];
    if (def && typeof def === 'object' && def.archivo) return null;
    const { receta = nombre, ...ajustes } = def && typeof def === 'object' ? def : {};
    const fabricar = RECETAS[receta];
    if (!fabricar) {
        throw new Error(`No conozco el sonido "${nombre}". Los que trae el motor son: ${Object.keys(RECETAS).join(', ')}; un estilo puede sumar otros en sonidos.paquete.`);
    }
    return fabricar({ ...ajustes, tono: (ajustes.tono ?? 0) + tono }, frecuencia);
}

/**
 * Mezcla todos los sonidos de una escena en una sola pista: es lo que va al
 * video. Si dos se pisan, se suman; al final, un limitador suave para que no
 * se rompa si suman más de 1.
 * @param {{ nombre: string, t: number, volumen?: number, tono?: number }[]} sonidos
 * @param {number} duracion segundos
 * @param {{ paquete?: Record<string, any>, volumen?: number, frecuencia?: number, desde?: number }} [opciones]
 */
export function mezclarPista(sonidos, duracion, { paquete = {}, volumen = 1, frecuencia = FRECUENCIA, desde = 0 } = {}) {
    const pista = new Float32Array(Math.max(1, Math.ceil(duracion * frecuencia)));
    const hechos = new Map();
    for (const s of sonidos) {
        const clave = `${s.nombre}|${s.tono ?? 0}`;
        if (!hechos.has(clave)) hechos.set(clave, sintetizar(s.nombre, { tono: s.tono ?? 0, paquete, frecuencia }));
        const m = hechos.get(clave);
        if (!m) continue;
        const inicio = Math.round((s.t - desde) * frecuencia);
        const g = (s.volumen ?? 1) * volumen;
        for (let i = Math.max(0, -inicio); i < m.length && inicio + i < pista.length; i++) pista[inicio + i] += m[i] * g;
    }
    for (let i = 0; i < pista.length; i++) pista[i] = Math.tanh(pista[i]);
    return pista;
}

/**
 * Pasa muestras a un archivo WAV (mono, 16 bits).
 * @param {Float32Array} m
 * @param {number} [frecuencia]
 */
export function aWav(m, frecuencia = FRECUENCIA) {
    const datos = m.length * 2;
    const b = new DataView(new ArrayBuffer(44 + datos));
    const texto = (o, t) => { for (let i = 0; i < t.length; i++) b.setUint8(o + i, t.charCodeAt(i)); };
    texto(0, 'RIFF'); b.setUint32(4, 36 + datos, true); texto(8, 'WAVE');
    texto(12, 'fmt '); b.setUint32(16, 16, true); b.setUint16(20, 1, true); b.setUint16(22, 1, true);
    b.setUint32(24, frecuencia, true); b.setUint32(28, frecuencia * 2, true); b.setUint16(32, 2, true); b.setUint16(34, 16, true);
    texto(36, 'data'); b.setUint32(40, datos, true);
    for (let i = 0; i < m.length; i++) b.setInt16(44 + i * 2, Math.max(-1, Math.min(1, m[i])) * 32767, true);
    return new Uint8Array(b.buffer);
}
