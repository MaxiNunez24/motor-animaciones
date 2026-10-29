import { sintetizar, FRECUENCIA } from './sintetizar.js';

// Los sonidos en vivo, en la página. Es lo único del motor que no depende
// solo de t: suena cuando la animación PASA por el instante de un sonido
// mientras corre. Si alguien arrastra la barra o salta de capítulo, no suena
// nada (sería una ametralladora de pops).
//
// El audio del navegador arranca recién después de que alguien toca algo:
// por eso el contexto se crea la primera vez que hace falta, que siempre es
// después de apretar reproducir.

export function crearReproductor() {
    /** @type {AudioContext | null} */
    let ctx = null;
    const buffers = new Map();
    /** @type {HTMLAudioElement | null} */
    let musica = null;
    let paquete = {};
    let volumen = 1;
    let base = '';

    function contexto() {
        if (!ctx) {
            const Clase = globalThis.AudioContext ?? /** @type {any} */ (globalThis).webkitAudioContext;
            if (!Clase) return null;
            ctx = new Clase();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }

    async function buffer(nombre, tono) {
        const clave = `${nombre}|${tono}`;
        if (buffers.has(clave)) return buffers.get(clave);
        const c = contexto();
        if (!c) return null;
        const promesa = (async () => {
            const def = paquete[nombre];
            if (def && typeof def === 'object' && def.archivo) {
                const r = await fetch(new URL(def.archivo, base || globalThis.location.href));
                return c.decodeAudioData(await r.arrayBuffer());
            }
            const m = sintetizar(nombre, { tono, paquete, frecuencia: FRECUENCIA });
            const b = c.createBuffer(1, m.length, FRECUENCIA);
            b.getChannelData(0).set(m);
            return b;
        })().catch((e) => {
            console.warn(`No pude preparar el sonido "${nombre}":`, e);
            return null;
        });
        buffers.set(clave, promesa);
        return promesa;
    }

    return {
        /**
         * @param {{ paquete?: Record<string, any>, volumenGeneral?: number }} [sonidos] lo que dice el estilo
         *     (volumenGeneral: el de todos los sonidos; el volumen de los automáticos lo usa la línea)
         * @param {string} [desde] la página o el estilo, para resolver archivos relativos
         */
        configurar(sonidos = {}, desde = '') {
            if (paquete !== (sonidos.paquete ?? {})) buffers.clear();
            paquete = sonidos.paquete ?? {};
            volumen = sonidos.volumenGeneral ?? 1;
            base = desde;
        },
        /** @param {{ nombre: string, volumen?: number, tono?: number }} s */
        async tocar(s) {
            const c = contexto();
            if (!c) return;
            const b = await buffer(s.nombre, s.tono ?? 0);
            if (!b) return;
            const fuente = c.createBufferSource();
            fuente.buffer = b;
            const g = c.createGain();
            g.gain.value = (s.volumen ?? 1) * volumen;
            fuente.connect(g).connect(c.destination);
            fuente.start();
        },
        /** Prepara los sonidos de una escena antes de que hagan falta. */
        precargar(lista) {
            // Se llama justo después de que alguien tocó: es cuando el
            // navegador deja crear el audio.
            if (!contexto()) return;
            for (const s of lista) buffer(s.nombre, s.tono ?? 0);
        },
        /**
         * La música de fondo, siguiendo al reloj.
         * @param {{ archivo: string, volumen?: number } | null} m
         * @param {number} t
         * @param {boolean} corriendo
         */
        musica(m, t, corriendo) {
            if (!m?.archivo) {
                musica?.pause();
                return;
            }
            const url = new URL(m.archivo, base || globalThis.location.href).href;
            if (!musica || musica.dataset.url !== url) {
                musica?.pause();
                musica = new Audio(url);
                musica.dataset.url = url;
                musica.loop = true;
            }
            musica.volume = Math.min(Math.max((m.volumen ?? 0.3) * volumen, 0), 1);
            if (corriendo) {
                // La música da vueltas: el segundo 75 de una canción de 60 es el 15.
                const donde = musica.duration > 0 ? t % musica.duration : t;
                if (Math.abs(musica.currentTime - donde) > 0.3) musica.currentTime = donde;
                if (musica.paused) musica.play().catch(() => {});
            } else musica.pause();
        },
        callar() {
            musica?.pause();
        },
    };
}
