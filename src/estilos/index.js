// Los estilos: el arte de una escena, aparte de lo que la escena cuenta.
//
// La misma escena (las mismas piezas, la misma línea de tiempo) se puede ver
// sobria, como pizarrón, en neón o como un reel, cambiando un atributo:
//
//     <motor-escena escena="mi-escena" estilo="neon"></motor-escena>
//     <motor-escena escena="mi-escena" estilo="./mi-estilo.json"></motor-escena>
//
// Un estilo son solo datos (se puede guardar en un .json y compartir) y puede
// partir de otro con `extiende`. Lo que puede cambiar:
//
//   colores      la paleta, en claro y en oscuro (o una sola para los dos)
//   fuentes      { texto, mono, cargar: [url de Google Fonts...] }
//   fondo        { degradado: ['fondo', '#000'], forma: 'lineal' | 'radial', angulo }
//   efectos      brillo, sombra, aMano (trazo tembloroso, que puede "hervir"),
//                grano (de película) y viñeta
//   piezas       los predeterminados de cada pieza: { caja: { radio: 0 } }
//   movimiento   { curva, curvas: { x: 'resorte' }, dur, escalonar }
//   sonidos      los automáticos ({ aparecer: 'pop', mover: 'whoosh' }), su
//                volumen y un paquete propio ({ pop: { receta: 'pop', agudo: 1400 } })
//   musica       { archivo, volumen }
//   subtitulos   { modo: 'reel', palabras: 3, posicion, tamano, peso, mayusculas, resaltado, caja, esquivar }
//   video        { desenfoque, obturador }: lo que usa herramientas/video.js
//
// La escena no se entera de nada de esto salvo de lo que cambia su línea de
// tiempo (curvas, escalonado, sonidos, predeterminados). Lo demás es del dibujo.

import { TOKENS } from '../nucleo/colores.js';

const registro = new Map();

/**
 * Deja un estilo disponible por nombre. Puede extender otro: { extiende: 'neon', ... }.
 * @param {string} nombre
 * @param {Record<string, any>} definicion
 */
export function registrarEstilo(nombre, definicion) {
    if (!definicion || typeof definicion !== 'object') throw new Error(`El estilo "${nombre}" tiene que ser un objeto.`);
    registro.set(nombre, definicion);
}

let porDefecto = null;

/**
 * El estilo de todas las escenas de la página que no eligieron uno.
 * @param {string | Record<string, any> | null} cual
 */
export function usarEstilo(cual) {
    porDefecto = cual ?? null;
    if (typeof document !== 'undefined') document.dispatchEvent(new Event('motor-estilo'));
}

/** El de usarEstilo(), si hay. */
export function estiloPorDefecto() {
    return porDefecto;
}

/** Los nombres de los estilos que hay. */
export function estilosDisponibles() {
    return [...registro.keys()];
}

/**
 * Un estilo listo para usar: con lo que hereda de `extiende` ya mezclado.
 * @param {string | Record<string, any> | null | undefined} cual un nombre o el estilo mismo
 * @returns {Record<string, any>}
 */
export function resolverEstilo(cual) {
    if (cual == null || cual === '') return {};
    const vistos = new Set();
    const resolver = (def, donde) => {
        if (typeof def === 'string') {
            if (vistos.has(def)) throw new Error(`El estilo "${def}" se extiende a sí mismo, dando una vuelta.`);
            vistos.add(def);
            const encontrado = registro.get(def);
            if (!encontrado) {
                throw new Error(`No conozco el estilo "${def}"${donde}. Los que hay son: ${estilosDisponibles().join(', ')}.`);
            }
            return resolver(encontrado, '');
        }
        const { extiende, ...propio } = def;
        if (extiende == null) return propio;
        return mezclar(resolver(extiende, ` (lo extiende otro estilo)`), propio);
    };
    return resolver(cual, '');
}

/**
 * Trae un estilo guardado en un archivo .json y lo registra con su dirección
 * como nombre. Si extiende otro que también es un archivo, lo trae primero.
 * @param {string} url
 */
export async function cargarEstilo(url) {
    if (registro.has(url)) return registro.get(url);
    const respuesta = await fetch(url);
    if (!respuesta.ok) throw new Error(`No pude traer el estilo de ${url} (${respuesta.status}).`);
    const def = await respuesta.json();
    if (typeof def.extiende === 'string' && esArchivo(def.extiende)) {
        const otro = new URL(def.extiende, new URL(url, globalThis.location?.href)).href;
        await cargarEstilo(otro);
        def.extiende = otro;
    }
    registrarEstilo(url, def);
    return def;
}

/** Si el valor de estilo="..." es un archivo y no un nombre. */
export function esArchivo(valor) {
    return /\.json($|\?)|\//.test(String(valor));
}

// Lo de abajo pisa a lo de arriba, objeto por objeto. Las listas y los
// valores sueltos se reemplazan enteros.
function mezclar(a, b) {
    const salida = { ...a };
    for (const [k, v] of Object.entries(b)) {
        salida[k] = esObjeto(v) && esObjeto(a[k]) ? mezclar(a[k], v) : v;
    }
    return salida;
}

function esObjeto(v) {
    return v != null && typeof v === 'object' && !Array.isArray(v);
}

// ---------------- Lo que el estilo le dice al CSS ----------------

/**
 * Las paletas del estilo, como { claro, oscuro }. Una sola paleta sirve
 * para los dos (un pizarrón es oscuro siempre).
 * @param {Record<string, any>} estilo
 */
export function paletas(estilo) {
    const c = estilo.colores;
    if (!c) return { claro: {}, oscuro: {} };
    if (c.claro || c.oscuro) return { claro: c.claro ?? c.oscuro ?? {}, oscuro: c.oscuro ?? c.claro ?? {} };
    return { claro: c, oscuro: c };
}

/**
 * El CSS que pone el estilo dentro del componente. Las variables del sitio
 * (--motor-acento) siguen mandando sobre las del estilo, como mandan sobre el tema.
 * @param {Record<string, any>} estilo
 */
export function cssDelEstilo(estilo) {
    const { claro, oscuro } = paletas(estilo);
    const vars = (colores, enOscuro) => Object.entries(colores)
        .filter(([nombre]) => TOKENS.includes(nombre))
        .map(([nombre, valor]) => `--ma-${nombre}: ${enOscuro
            ? `var(--motor-${nombre}-oscuro, var(--motor-${nombre}, ${valor}))`
            : `var(--motor-${nombre}, ${valor})`};`)
        .join(' ');
    const f = estilo.fuentes ?? {};
    const s = estilo.subtitulos ?? {};
    const extra = [
        f.texto && `--ma-fuente: var(--motor-fuente, ${f.texto});`,
        f.mono && `--ma-fuente-mono: var(--motor-fuente-mono, ${f.mono});`,
        s.tamano && `--ma-sub-tamano: ${Number(s.tamano)};`,
        s.peso && `--ma-sub-peso: ${Number(s.peso)};`,
        s.mayusculas && '--ma-sub-mayusculas: uppercase;',
        s.resaltado && `--ma-sub-resaltado: ${TOKENS.includes(s.resaltado) ? `var(--ma-${s.resaltado})` : s.resaltado};`,
    ].filter(Boolean).join(' ');
    return `.ma-raiz[data-estilo] { ${vars(claro, false)} ${extra} }\n` +
        `.ma-raiz[data-estilo][data-tema="oscuro"] { ${vars(oscuro, true)} }`;
}

/**
 * Cómo se muestran los subtítulos con este estilo.
 * @param {Record<string, any>} estilo
 */
export function subtitulosDelEstilo(estilo) {
    const s = estilo.subtitulos ?? {};
    return {
        modo: s.modo === 'reel' ? 'reel' : 'clasico',
        palabras: Math.max(0, Math.round(s.palabras ?? 0)),
        posicion: ['arriba', 'centro', 'abajo'].includes(s.posicion) ? s.posicion : 'abajo',
        // 'caja' (un fondo detrás), 'contorno' (letras con borde, sin fondo) o 'ninguno'.
        caja: ['caja', 'contorno', 'ninguno'].includes(s.caja) ? s.caja : 'caja',
        ritmo: s.ritmo ?? 15,
        // Si sube solo cuando taparía algo (en pantalla completa y en los de reel).
        esquivar: s.esquivar !== false,
    };
}

// Las fuentes de Google se cargan en la página, no adentro del componente:
// un @font-face dentro de un shadow DOM no siempre se registra.
const fuentesPedidas = new Set();
/** @param {Record<string, any>} estilo */
export function cargarFuentes(estilo) {
    if (typeof document === 'undefined') return;
    for (const url of [estilo.fuentes?.cargar ?? []].flat()) {
        if (fuentesPedidas.has(url)) continue;
        fuentesPedidas.add(url);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = url;
        document.head.appendChild(link);
    }
}

// ---------------- Los que trae el motor ----------------
// Cinco artes bien distintos, para probar que la escena no cambia. Sirven
// también de ejemplo para armar uno propio: se copian y se tocan.

registrarEstilo('sobrio', {
    // El de siempre: sin efectos, sin sonidos, con las curvas suaves. Existe
    // para poder volver a él y para extenderlo.
});

registrarEstilo('pizarra', {
    colores: {
        fondo: '#1d3a2f', superficie: '#24463a', texto: '#f1eee4', suave: '#b6c4b4', borde: '#e2ddd0',
        acento: '#ffd66b', acento2: '#ff9eb0', exito: '#a6e89a', alerta: '#ffd66b', error: '#ff8f85',
        papel: '#2b4d40', marco: '#11241c',
    },
    fuentes: {
        texto: '"Caveat", "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive',
        cargar: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap',
    },
    efectos: {
        // La tiza tiembla un poquito, y cambia unas pocas veces por segundo:
        // así parece dibujado a mano cuadro por cuadro.
        aMano: { fuerza: 2.4, detalle: 0.035, hervir: 6 },
        grano: { cantidad: 0.07 },
        vineta: 0.35,
    },
    piezas: {
        // La letra de tiza es más chica que la común a igual tamaño.
        caja: { relleno: 'superficie', radio: 6, grosorBorde: 2.5, tamano: 40 },
        texto: { tamano: 40 },
    },
    sonidos: { aparecer: 'clic', volumen: 0.5 },
});

registrarEstilo('neon', {
    colores: {
        fondo: '#07060f', superficie: '#120f24', texto: '#f3f0ff', suave: '#a59ccc', borde: '#5a48b0',
        acento: '#22e3ff', acento2: '#ff3dc8', exito: '#39ff9c', alerta: '#ffe14d', error: '#ff4d6d',
        papel: '#1a1533', marco: '#3a3170',
    },
    fondo: { degradado: ['#1a1240', '#07060f'], forma: 'radial' },
    efectos: { brillo: 0.8 },
    piezas: {
        caja: { radio: 22, grosorBorde: 2.5, borde: 'acento' },
    },
    movimiento: {
        curvas: { x: 'resorte', y: 'resorte', escala: 'resorte', rotacion: 'resorte' },
    },
    sonidos: { aparecer: 'pop', mover: 'whoosh', volumen: 0.7 },
    subtitulos: { peso: 600 },
    video: { desenfoque: 6, obturador: 0.5 },
});

registrarEstilo('papel', {
    colores: {
        fondo: '#f1e7d2', superficie: '#fffaf0', texto: '#3a2e22', suave: '#7b6a58', borde: '#a8957a',
        acento: '#c0392b', acento2: '#2e6f9e', exito: '#4f7f3a', alerta: '#b7791f', error: '#a83226',
        papel: '#fff6dd', marco: '#4a3b2c',
    },
    fuentes: { texto: 'Georgia, "Iowan Old Style", "Palatino Linotype", serif' },
    efectos: {
        aMano: { fuerza: 1.3, detalle: 0.02 },
        sombra: { dx: 3, dy: 5, desenfoque: 5, opacidad: 0.22 },
        grano: { cantidad: 0.09, animado: false },
        vineta: 0.3,
    },
    piezas: {
        caja: { radio: 4, grosorBorde: 2 },
    },
    movimiento: { curvas: { x: 'pasarse', y: 'pasarse' } },
    sonidos: { aparecer: 'clic', volumen: 0.35 },
});

registrarEstilo('reel', {
    colores: {
        fondo: '#111418', superficie: '#1d232b', texto: '#ffffff', suave: '#aab3bf', borde: '#38424f',
        acento: '#ffd60a', acento2: '#ff5d8f', exito: '#3ddc84', alerta: '#ffb703', error: '#ff595e',
        papel: '#262d36', marco: '#3a4452',
    },
    fuentes: {
        texto: '"Poppins", "Segoe UI", system-ui, sans-serif',
        cargar: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap',
    },
    efectos: { sombra: { dx: 0, dy: 8, desenfoque: 14, opacidad: 0.35 } },
    piezas: {
        caja: { radio: 26, grosorBorde: 0, peso: 800 },
        texto: { peso: 800 },
    },
    movimiento: {
        curvas: { x: 'resorte', y: 'resorte', escala: 'gelatina', rotacion: 'resorte' },
        escalonar: { cada: 0.07, orden: 'centro' },
    },
    sonidos: { aparecer: 'pop', mover: 'whoosh', desaparecer: null, volumen: 0.8 },
    subtitulos: { modo: 'reel', palabras: 3, posicion: 'abajo', tamano: 1.9, peso: 800, mayusculas: true, resaltado: 'acento', caja: 'contorno' },
    video: { desenfoque: 8, obturador: 0.5 },
});
