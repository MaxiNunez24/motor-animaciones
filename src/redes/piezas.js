import { definirPieza } from '../piezas/definir.js';
import { el, poner, texto as ponerTexto } from '../piezas/svg.js';
import { ANCHO_LETRA } from '../piezas/geometria.js';
import { aCss } from '../nucleo/colores.js';
import { limitar } from '../nucleo/interpolar.js';

// Las piezas de redes: el diagrama de secuencia (quién le manda qué a quién, y
// cuándo), una dirección IP en bits, y la ventana de un protocolo.

const HALO = { 'paint-order': 'stroke', stroke: 'var(--ma-fondo)', 'stroke-width': 6, 'stroke-linejoin': 'round' };

/**
 * Un diagrama de secuencia: cada extremo (cliente, servidor, router) es una
 * línea vertical, el tiempo corre para abajo, y cada mensaje es una flecha
 * inclinada (tarda en llegar).
 *
 * Se anima con una sola propiedad, `tiempo`, en las mismas unidades que
 * `sale` y `llega` de los mensajes: cada flecha se dibuja hasta donde llegó
 * en ese tiempo. Así se pueden ver varios mensajes viajando a la vez, que es
 * lo que pasa en una ventana deslizante.
 *
 *     secuencia({
 *         extremos: ['Cliente', 'Servidor'],
 *         mensajes: [{ de: 0, a: 1, sale: 0, llega: 1, texto: 'SYN' }, { de: 1, a: 0, sale: 1, llega: 2, texto: 'SYN, ACK' }],
 *         tiempo: 0,
 *     })  →  { pieza: 's', a: { tiempo: 2 }, dur: 3, curva: 'lineal' }
 */
export const secuencia = definirPieza({
    nombre: 'secuencia',
    predeterminados: {
        // Nombres, o { texto, icono }.
        extremos: [],
        // { de, a, sale, llega, texto, color, perdido (de 0 a 1: dónde se pierde), punteada }. de y a: índices de extremos.
        mensajes: [],
        // { extremo, t, texto, color }: un estado o un comentario al costado de una línea, desde el instante t.
        notas: [],
        // { extremo, desde, hasta, texto, color }: un timer, como una barra al costado de la línea.
        intervalos: [],
        tiempo: 0,
        // El tiempo que entra en el alto. null: lo que dura el último mensaje.
        duracion: null,
        ancho: 1100,
        alto: 700,
        tamano: 22,
        // Un mensaje para destacar (su índice; −1: ninguno).
        resaltar: -1,
        color: 'texto',
        colorLinea: 'borde',
        colorMensaje: 'acento',
        colorResaltado: 'acento2',
        relleno: 'superficie',
        // Una regla de tiempo a la izquierda.
        regla: false,
        // Dónde va el nombre de cada mensaje: 'medio' (girado, sobre la flecha) u
        // 'origen' (derecho, al lado de donde sale). Con muchos mensajes seguidos,
        // como en una ventana deslizante, 'origen' no se pisa.
        rotulos: 'medio',
    },
    colores: ['color', 'colorLinea', 'colorMensaje', 'colorResaltado', 'relleno'],

    validar(p) {
        if (p.extremos.length < 2) throw new Error('Un diagrama de secuencia necesita al menos dos extremos: ["Cliente", "Servidor"].');
        p.mensajes.forEach((m, i) => {
            for (const k of ['de', 'a']) {
                if (!(m[k] >= 0 && m[k] < p.extremos.length)) throw new Error(`El mensaje ${i} tiene ${k}: ${m[k]}, y los extremos van de 0 a ${p.extremos.length - 1}.`);
            }
            if (!(m.llega > m.sale)) throw new Error(`El mensaje ${i} tiene que llegar después de salir (llega > sale).`);
        });
    },

    crear(grupo) {
        return {
            regla: el('g', {}, grupo),
            lineas: el('g', {}, grupo),
            intervalos: el('g', {}, grupo),
            mensajes: el('g', { fill: 'none', 'stroke-linecap': 'round' }, grupo),
            notas: el('g', {}, grupo),
        };
    },

    actualizar(partes, p) {
        const g = geometriaSecuencia(p);
        const extremos = p.extremos.map((e) => (typeof e === 'object' ? e : { texto: e }));

        // Las cabeceras y las líneas de vida.
        reusar(partes.lineas, extremos.length, (n) => {
            el('line', { 'stroke-width': 3, 'stroke-dasharray': '2 8', 'stroke-linecap': 'round' }, n);
            el('rect', { rx: 12 }, n);
            el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 700 }, n);
        });
        // Cada cabecera entra en el lugar que hay entre un extremo y el siguiente:
        // con cinco extremos en un celular, si no, se pisan.
        const espacio = extremos.length > 1 ? (g.x(1) - g.x(0)) * 0.94 : p.ancho;
        extremos.forEach((e, i) => {
            const [linea, caja, nombre] = hijos(partes.lineas.childNodes[i]);
            const x = g.x(i);
            const rotulo = `${e.icono ? `${e.icono} ` : ''}${e.texto}`;
            const tamNombre = Math.min(p.tamano * 1.1, (espacio - 20) / (Array.from(rotulo).length * ANCHO_LETRA));
            const anchoCaja = Math.min(espacio, Math.max(140, Array.from(rotulo).length * tamNombre * ANCHO_LETRA + 36));
            poner(linea, { x1: x, x2: x, y1: g.arriba + g.cabecera / 2, y2: g.abajo, stroke: aCss(p.colorLinea) });
            poner(caja, { x: x - anchoCaja / 2, y: g.arriba, width: anchoCaja, height: g.cabecera, fill: aCss(p.relleno), stroke: aCss(p.colorLinea), 'stroke-width': 2.5 });
            poner(nombre, { x, y: g.arriba + g.cabecera / 2, 'font-size': r(tamNombre), fill: aCss(p.color) });
            ponerTexto(nombre, rotulo);
        });

        // La regla de tiempo (opcional): una marca por unidad.
        const marcas = p.regla ? Math.floor(g.duracion) + 1 : 0;
        reusar(partes.regla, marcas, (n) => el('text', { 'text-anchor': 'end', 'dominant-baseline': 'central' }, n));
        for (let k = 0; k < marcas; k++) {
            const [t] = hijos(partes.regla.childNodes[k]);
            poner(t, { x: g.izq - 14, y: g.y(k), 'font-size': p.tamano * 0.75, fill: aCss('suave'), opacity: p.tiempo >= k ? 1 : 0.35 });
            ponerTexto(t, `t${k}`);
        }

        // Los timers.
        reusar(partes.intervalos, p.intervalos.length, (n) => {
            el('path', { fill: 'none', 'stroke-width': 3 }, n);
            el('text', { 'dominant-baseline': 'central', 'font-weight': 600, ...HALO }, n);
        });
        p.intervalos.forEach((iv, i) => {
            const [barra, rot] = hijos(partes.intervalos.childNodes[i]);
            const lado = iv.extremo === 0 ? -1 : 1;
            const x = g.x(iv.extremo) + lado * 18;
            const hasta = Math.min(iv.hasta, p.tiempo);
            const visible = p.tiempo > iv.desde;
            const y0 = g.y(iv.desde);
            const y1 = g.y(hasta);
            poner(barra, {
                d: `M${x - lado * 6} ${y0}H${x}V${y1}${p.tiempo >= iv.hasta ? `H${x - lado * 6}` : ''}`,
                stroke: aCss(iv.color ?? 'alerta'), visibility: visible ? null : 'hidden',
            });
            poner(rot, {
                x: x + lado * 8, y: (y0 + y1) / 2, 'text-anchor': lado < 0 ? 'end' : 'start',
                'font-size': p.tamano * 0.8, fill: aCss(iv.color ?? 'alerta'), visibility: visible && iv.texto ? null : 'hidden',
            });
            ponerTexto(rot, iv.texto ?? '');
        });

        // Los mensajes.
        reusar(partes.mensajes, p.mensajes.length, (n) => {
            el('path', {}, n);
            el('path', { stroke: 'none' }, n);
            el('text', { 'text-anchor': 'middle', 'font-weight': 700, ...HALO, stroke: 'var(--ma-fondo)' }, n);
            el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 800 }, n);
        });
        p.mensajes.forEach((m, i) => {
            const [linea, punta, rot, cruz] = hijos(partes.mensajes.childNodes[i]);
            const destacado = i === p.resaltar;
            const color = aCss(destacado ? p.colorResaltado : (m.color ?? p.colorMensaje));
            const a = { x: g.x(m.de), y: g.y(m.sale) };
            const b = { x: g.x(m.a), y: g.y(m.llega) };
            // Las flechas salen y llegan un poco afuera de las líneas, para no taparlas.
            const sentido = Math.sign(b.x - a.x) || 1;
            a.x += sentido * 6;
            b.x -= sentido * 6;
            const hastaDonde = m.perdido ? limitar(m.perdido, 0.1, 0.95) : 1;
            const avance = limitar((p.tiempo - m.sale) / (m.llega - m.sale), 0, hastaDonde);
            const fin = { x: a.x + (b.x - a.x) * avance, y: a.y + (b.y - a.y) * avance };
            const ang = Math.atan2(b.y - a.y, b.x - a.x);
            const grosor = destacado ? 4.5 : 3.2;
            const L = grosor * 3.6;
            const W = grosor * 2.2;
            const llego = avance >= hastaDonde;
            const visible = avance > 0;
            poner(linea, {
                d: `M${r(a.x)} ${r(a.y)}L${r(fin.x - (m.perdido ? 0 : Math.cos(ang) * L * 0.6 * Math.min(1, avance * 4)))} ${r(fin.y - (m.perdido ? 0 : Math.sin(ang) * L * 0.6 * Math.min(1, avance * 4)))}`,
                stroke: color, 'stroke-width': grosor, 'stroke-dasharray': m.punteada ? '10 8' : null,
                visibility: visible ? null : 'hidden',
            });
            const bx = fin.x - Math.cos(ang) * L;
            const by = fin.y - Math.sin(ang) * L;
            poner(punta, {
                d: `M${r(fin.x)} ${r(fin.y)}L${r(bx - Math.sin(ang) * W)} ${r(by + Math.cos(ang) * W)}L${r(bx + Math.sin(ang) * W)} ${r(by - Math.cos(ang) * W)}Z`,
                fill: color, visibility: visible && !m.perdido ? null : 'hidden',
            });
            const largoFlecha = Math.hypot(b.x - a.x, b.y - a.y);
            const letras = Array.from(m.texto ?? '').length || 1;
            if (p.rotulos === 'origen') {
                // Derecho, al lado del punto de salida, del lado de afuera de la línea.
                const tam = Math.min(p.tamano, (Math.abs(b.x - a.x) * 0.42) / (letras * ANCHO_LETRA));
                poner(rot, {
                    // Apenas arriba de la flecha: si no, la línea lo tacha.
                    x: r(a.x + sentido * 8), y: r(a.y - Math.max(3, tam * 0.2)), transform: null,
                    'text-anchor': sentido > 0 ? 'start' : 'end', 'font-size': r(tam), fill: color,
                    visibility: m.texto && avance > 0 ? null : 'hidden',
                });
            } else {
                // Girado, siguiendo la flecha, arriba de su mitad. Si no entra a lo largo, se achica.
                const tam = Math.min(p.tamano, (largoFlecha * 0.85) / (letras * ANCHO_LETRA * 1.1));
                const mx = (a.x + b.x) / 2;
                const my = (a.y + b.y) / 2;
                let grados = (ang * 180) / Math.PI;
                if (grados > 90) grados -= 180;
                if (grados < -90) grados += 180;
                const gr = (grados * Math.PI) / 180;
                const tx = mx + Math.sin(gr) * tam * 0.6;
                const ty = my - Math.cos(gr) * tam * 0.6;
                poner(rot, {
                    x: r(tx), y: r(ty), transform: `rotate(${grados.toFixed(1)} ${r(tx)} ${r(ty)})`,
                    'text-anchor': 'middle', 'font-size': r(tam), fill: color,
                    visibility: m.texto && avance >= Math.min(0.5, hastaDonde * 0.8) ? null : 'hidden',
                });
            }
            ponerTexto(rot, m.texto ?? '');
            poner(cruz, {
                x: fin.x, y: fin.y, 'font-size': p.tamano * 1.6, fill: aCss('error'),
                visibility: m.perdido && llego ? null : 'hidden',
            });
            ponerTexto(cruz, '✗');
        });

        // Las notas: al costado de la línea, desde su instante.
        reusar(partes.notas, p.notas.length, (n) => el('text', { 'dominant-baseline': 'central', 'font-weight': 600, ...HALO }, n));
        p.notas.forEach((nota, i) => {
            const [t] = hijos(partes.notas.childNodes[i]);
            const ultimo = nota.extremo === extremos.length - 1;
            const primero = nota.extremo === 0;
            const lado = primero ? -1 : ultimo ? 1 : 1;
            poner(t, {
                x: g.x(nota.extremo) + lado * 18, y: g.y(nota.t), 'text-anchor': lado < 0 ? 'end' : 'start',
                'font-size': p.tamano * 0.82, fill: aCss(nota.color ?? 'suave'),
                opacity: limitar((p.tiempo - nota.t) * 4, 0, 1), visibility: p.tiempo >= nota.t ? null : 'hidden',
            });
            ponerTexto(t, nota.texto);
        });
    },

    tamano: (p) => ({ ancho: p.ancho, alto: p.alto }),
});

/** Dónde cae cada extremo y cada instante, relativo al centro de la pieza. */
export function geometriaSecuencia(p) {
    const duracion = p.duracion ?? Math.max(1, ...p.mensajes.map((m) => m.llega), ...p.notas.map((n) => n.t));
    const n = p.extremos.length;
    const cabecera = p.tamano * 2.4;
    const arriba = -p.alto / 2;
    const abajo = p.alto / 2;
    const inicio = arriba + cabecera + p.tamano * 0.9;
    const fin = abajo - p.tamano * 0.6;
    // Los extremos de las puntas dejan lugar para las notas y los timers.
    const margen = Math.min(p.ancho * (n > 3 ? 0.08 : 0.2), 220);
    const izq = -p.ancho / 2 + margen;
    const der = p.ancho / 2 - margen;
    return {
        duracion,
        cabecera,
        arriba,
        abajo,
        izq,
        x: (i) => (n === 1 ? 0 : izq + ((der - izq) * i) / (n - 1)),
        y: (t) => inicio + ((fin - inicio) * t) / duracion,
    };
}

/**
 * Una dirección IP, en decimal y en sus 32 bits. Con `prefijo` y `verMascara`
 * se pintan de un color los bits de red y de otro los de host: es la forma de
 * ver qué hace la máscara.
 */
export const direccionIp = definirPieza({
    nombre: 'direccionIp',
    predeterminados: {
        // Lo que dice a la izquierda: "IP", "Máscara", "Red".
        rotulo: '',
        decimal: '0.0.0.0',
        // Los 32 bits, como '11000000.10101000...'. Vacío: se calculan del decimal.
        bits: '',
        prefijo: 24,
        // De 0 a 1.
        verBits: 1,
        verMascara: 0,
        tamano: 30,
        ancho: 1200,
        color: 'texto',
        colorRed: 'acento',
        colorHost: 'acento2',
        resaltado: 0,
    },
    colores: ['color', 'colorRed', 'colorHost'],

    crear(grupo) {
        return {
            fondo: el('rect', { rx: 10, fill: 'var(--ma-superficie)', 'stroke-width': 3 }, grupo),
            rotulo: el('text', { 'dominant-baseline': 'central', 'font-weight': 700, 'text-anchor': 'start' }, grupo),
            decimal: el('text', { 'dominant-baseline': 'central', 'font-weight': 700, 'text-anchor': 'start', 'font-family': 'var(--ma-fuente-mono)' }, grupo),
            bits: el('text', { 'dominant-baseline': 'central', 'text-anchor': 'middle', 'font-family': 'var(--ma-fuente-mono)' }, grupo),
            corte: el('line', { 'stroke-width': 3, 'stroke-dasharray': '6 5' }, grupo),
        };
    },

    actualizar(partes, p) {
        const bits = p.bits || bitsDe(p.decimal);
        const izq = -p.ancho / 2;
        const tam = p.tamano;
        poner(partes.fondo, {
            x: izq - 14, y: apiladoFondo(p).y, width: p.ancho + 28, height: apiladoFondo(p).alto,
            stroke: 'var(--ma-acento2)', opacity: p.resaltado, visibility: p.resaltado > 0 ? null : 'hidden',
        });
        poner(partes.rotulo, { x: izq, y: 0, 'font-size': tam * 0.85, fill: aCss('suave') });
        ponerTexto(partes.rotulo, p.rotulo);
        // Columnas fijas: rótulo, decimal y bits, para que varias filas queden
        // alineadas. Si no entran en un renglón (en un celular), los bits van abajo.
        const apilado = p.ancho < 900;
        const xDecimal = izq + p.ancho * (apilado ? 0.3 : 0.15);
        const xBits = apilado ? izq : izq + p.ancho * 0.42;
        const yDecimal = apilado ? -tam * 0.55 : 0;
        const yBits = apilado ? tam * 0.6 : 0;
        poner(partes.rotulo, { y: yDecimal });
        poner(partes.decimal, { x: xDecimal, y: yDecimal, 'font-size': tam, fill: aCss(p.color) });
        ponerTexto(partes.decimal, p.decimal);

        // Los bits: un <tspan> para los de red y otro para los de host. El
        // punto que separa octetos no cuenta como bit.
        const tamBits = Math.min(tam * 0.92, (p.ancho - (xBits - izq)) / (35 * 0.6));
        const corteChar = p.prefijo + Math.floor(Math.max(p.prefijo - 1, 0) / 8);
        const enRed = bits.slice(0, corteChar);
        const enHost = bits.slice(corteChar);
        if (!partes.bits.firstChild) {
            el('tspan', {}, partes.bits);
            el('tspan', {}, partes.bits);
        }
        const [tRed, tHost] = hijos(partes.bits);
        const m = limitar(p.verMascara, 0, 1);
        poner(partes.bits, { x: xBits, y: yBits, 'font-size': tamBits, opacity: limitar(p.verBits, 0, 1), visibility: p.verBits > 0 ? null : 'hidden' });
        poner(tRed, { fill: m > 0 ? aCss(p.colorRed) : aCss(p.color), 'font-weight': m > 0.5 ? 700 : 400 });
        poner(tHost, { fill: m > 0 ? aCss(p.colorHost) : aCss(p.color), 'font-weight': m > 0.5 ? 700 : 400 });
        ponerTexto(tRed, enRed);
        ponerTexto(tHost, enHost);
        // Cada caracter en un lugar fijo (una lista de x por tspan): cuánto
        // mide de verdad una letra depende de la fuente de cada compu, y en
        // negrita más. Así la línea de corte cae siempre justo entre dos bits.
        const paso = tamBits * 0.6;
        // Cada uno centrado en su casillero (text-anchor middle vale para cada
        // caracter con x propia): si la letra es más angosta o más ancha, el
        // aire se reparte a los dos lados.
        const lugares = (desde, n) => Array.from({ length: n }, (_, i) => Math.round((xBits + (desde + i + 0.5) * paso) * 100) / 100).join(' ');
        poner(tRed, { x: lugares(0, Array.from(enRed).length) });
        poner(tHost, { x: lugares(Array.from(enRed).length, Array.from(enHost).length) });
        // Una línea donde termina la red.
        const xCorte = xBits + (corteChar + (enHost.startsWith('.') ? 0.5 : 0)) * paso;
        poner(partes.corte, {
            x1: xCorte, x2: xCorte, y1: yBits - tamBits * 0.8, y2: yBits + tamBits * 0.8, stroke: aCss(p.colorHost),
            opacity: m * limitar(p.verBits, 0, 1), visibility: m > 0 && p.verBits > 0 ? null : 'hidden',
        });
    },

    tamano: (p) => ({ ancho: p.ancho, alto: apiladoFondo(p).alto }),
});

function apiladoFondo(p) {
    return p.ancho < 900 ? { y: -p.tamano * 1.3, alto: p.tamano * 2.6 } : { y: -p.tamano * 0.95, alto: p.tamano * 1.9 };
}

function bitsDe(decimal) {
    return String(decimal).split('.').map((o) => Number(o).toString(2).padStart(8, '0')).join('.');
}

/**
 * La ventana de un protocolo: los números de secuencia en fila, cada uno con
 * su estado, y un corchete que abarca la ventana. Animar `base` lo hace
 * deslizarse.
 */
export const ventanaDeslizante = definirPieza({
    nombre: 'ventanaDeslizante',
    predeterminados: {
        cantidad: 8,
        // El primero que todavía no se confirmó, y el tamaño de la ventana.
        base: 0,
        ventana: 4,
        // El próximo que se va a mandar (los de base a siguiente − 1 están en viaje).
        siguiente: 0,
        // Números confirmados aunque estén después de base (Selective Repeat).
        confirmados: [],
        lado: 64,
        tamano: 26,
        rotulo: '',
        colorConfirmado: 'exito',
        colorEnviado: 'alerta',
        colorDisponible: 'acento',
    },
    colores: ['colorConfirmado', 'colorEnviado', 'colorDisponible'],

    crear(grupo) {
        return {
            rotulo: el('text', { 'dominant-baseline': 'central', 'text-anchor': 'end', 'font-weight': 700 }, grupo),
            celdas: el('g', {}, grupo),
            corchete: el('rect', { fill: 'none', 'stroke-width': 4, rx: 12 }, grupo),
        };
    },

    actualizar(partes, p) {
        const izq = -(p.cantidad * p.lado) / 2;
        poner(partes.rotulo, { x: izq - 18, y: 0, 'font-size': p.tamano * 0.85, fill: aCss('suave') });
        ponerTexto(partes.rotulo, p.rotulo);
        const confirmados = new Set(p.confirmados);
        reusar(partes.celdas, p.cantidad, (n) => {
            el('rect', { rx: 8, 'stroke-width': 2.5 }, n);
            el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 700 }, n);
        });
        const base = Math.floor(p.base + 1e-6);
        for (let i = 0; i < p.cantidad; i++) {
            const [rect, num] = hijos(partes.celdas.childNodes[i]);
            const estado = i < base || confirmados.has(i)
                ? p.colorConfirmado
                : i < p.siguiente
                    ? p.colorEnviado
                    : i < base + p.ventana
                        ? p.colorDisponible
                        : null;
            const x = izq + i * p.lado;
            poner(rect, {
                x: x + 4, y: -p.lado / 2 + 4, width: p.lado - 8, height: p.lado - 8,
                fill: estado ? `color-mix(in srgb, ${aCss(estado)} 28%, var(--ma-superficie))` : 'var(--ma-superficie)',
                stroke: estado ? aCss(estado) : 'var(--ma-borde)',
            });
            poner(num, { x: x + p.lado / 2, y: 0, 'font-size': p.tamano, fill: estado ? 'var(--ma-texto)' : 'var(--ma-suave)' });
            ponerTexto(num, String(i));
        }
        // El corchete se mueve con `base` (con decimales, para que se deslice).
        const ancho = Math.min(p.ventana, Math.max(p.cantidad - p.base, 0)) * p.lado;
        poner(partes.corchete, {
            x: izq + p.base * p.lado - 2, y: -p.lado / 2 - 4, width: Math.max(ancho + 4, 0), height: p.lado + 8,
            stroke: 'var(--ma-acento)', visibility: ancho > 0 ? null : 'hidden',
        });
    },

    tamano: (p) => ({ ancho: p.cantidad * p.lado, alto: p.lado }),
});

function reusar(grupo, cuantos, armar) {
    while (grupo.childNodes.length > cuantos) grupo.lastChild.remove();
    while (grupo.childNodes.length < cuantos) armar(el('g', {}, grupo));
}

function hijos(nodo) {
    return /** @type {Element[]} */ ([...nodo.childNodes]);
}

function r(v) {
    return Math.round(v * 100) / 100;
}
