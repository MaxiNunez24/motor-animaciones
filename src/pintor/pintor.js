import { el, poner, idUnico, filtroSombra } from '../piezas/svg.js';
import { posicionAbsoluta } from '../piezas/geometria.js';
import { aCss } from '../nucleo/colores.js';

// El pintor es lo ÚNICO del motor que toca la página. Recibe un estado (lo que
// calculó la línea de tiempo para un instante) y lo deja dibujado. No decide
// nada: si el estado es el mismo, el dibujo es el mismo.

/**
 * @param {SVGSVGElement} svg
 * @param {ReturnType<import('../nucleo/linea.js').compilar>} escena
 * @param {{ arrastres?: Record<string, { x: number, y: number }>, estilo?: Record<string, any> }} [opciones]
 *     `arrastres`: cuánto corrió quien mira cada pieza arrastrable (un espejo).
 *     Es de la vista, como el zoom: no está en la escena ni sale en un video.
 *     `estilo`: el arte (ver src/estilos/). Acá se usan el fondo y los efectos.
 */
export function crearPintor(svg, escena, opciones = {}) {
    const arrastres = opciones.arrastres ?? {};
    const estilo = opciones.estilo ?? {};
    svg.replaceChildren();
    poner(svg, {
        viewBox: `0 0 ${escena.ancho} ${escena.alto}`,
        preserveAspectRatio: 'xMidYMid meet',
    });
    const defs = el('defs', {}, svg);
    el('rect', { x: 0, y: 0, width: escena.ancho, height: escena.alto, fill: fondoDelEstilo(defs, estilo.fondo) }, svg);
    // Cuando el dibujo no llena el lugar (una pantalla más alta que la escena),
    // el SVG muestra también lo que queda fuera del marco: lo que la cámara
    // dejó afuera se asomaría por arriba y por abajo. Se recorta al marco.
    const marco = idUnico('ma-marco');
    el('rect', { x: 0, y: 0, width: escena.ancho, height: escena.alto }, el('clipPath', { id: marco }, defs));
    const recorte = el('g', { 'clip-path': `url(#${marco})` }, svg);
    // Los efectos van en un grupo aparte del recorte: un filtro y un recorte
    // en el mismo grupo recortan el brillo justo en el borde de cada cosa.
    const efectos = crearEfectos(defs, svg, escena, estilo.efectos ?? {});
    const raiz = el('g', efectos.filtro ? { filter: `url(#${efectos.filtro})` } : {}, recorte);
    efectos.encima(recorte);
    // La lupa de quien mira va encima de todo y muestra otra vez el dibujo.
    const dibujo = el('g', { id: idUnico('ma-dibujo') }, raiz);
    let lupa = null;

    const inicial = escena.estado(0);
    const ctx = { estado: inicial, tipos: escena.tipos, id: '', ids: escena.ids, arrastres };
    const nodos = {};
    for (const id of escena.ids) {
        const tipo = escena.tipos[id];
        const props = inicial.piezas[id];
        const padre = props.dentro != null ? nodos[props.dentro].contenido : dibujo;
        const grupo = /** @type {SVGGElement} */ (el('g', { 'data-pieza': id }, padre));
        ctx.id = id;
        const partes = tipo.crear(grupo, props, ctx);
        nodos[id] = {
            tipo,
            grupo,
            partes,
            contenido: tipo.contenedor ? tipo.contenedor(partes) : null,
            ultimo: null,
        };
    }

    return {
        /** @param {ReturnType<ReturnType<import('../nucleo/linea.js').compilar>['estado']>} estado */
        pintar(estado) {
            ctx.estado = estado;
            efectos.pintar(estado.t);
            for (const id of escena.ids) {
                const nodo = nodos[id];
                const p = estado.piezas[id];
                // Con el trazo en 0 no hay nada dibujado; si no se esconde, las
                // puntas redondeadas de las líneas se ven como puntitos.
                const invisible = p.opacidad <= 0 || p.trazo <= 0;
                const corrida = arrastres[id] ? adentro(id, arrastres[id], estado) : { x: 0, y: 0 };
                poner(nodo.grupo, {
                    transform: `translate(${r(p.x + corrida.x)} ${r(p.y + corrida.y)})` +
                        (p.rotacion ? ` rotate(${r(p.rotacion)})` : '') +
                        (p.escala !== 1 ? ` scale(${r(p.escala)})` : ''),
                    opacity: p.opacidad >= 1 ? null : r(p.opacidad),
                    // Lo invisible tampoco se lee en voz alta ni se puede tocar.
                    visibility: invisible ? 'hidden' : null,
                });
                // Una pieza que no cambió no se vuelve a dibujar: en una escena
                // de 40 piezas, en cada cuadro se mueven tres o cuatro.
                if (invisible || (!nodo.tipo.dependeDeOtras && iguales(nodo.ultimo, p))) continue;
                ctx.id = id;
                nodo.tipo.actualizar(nodo.partes, p, ctx);
                nodo.ultimo = p;
                if (p.trazo < 1 || nodo.trazando) trazar(nodo, p.trazo);
            }
        },
        /** Dónde quedó una pieza, en coordenadas de la escena. */
        posicion(id) {
            return posicionAbsoluta(id, ctx.estado, escena.tipos);
        },
        /**
         * La lupa de quien mira (no es de la escena: no sale en un video).
         * @param {{ activa: boolean, x: number, y: number, ancho: number, alto: number, forma: 'circulo' | 'rect', zoom: number, pixel?: number } | null} l
         */
        lupa(l) {
            if (!l?.activa) {
                lupa?.grupo.setAttribute('visibility', 'hidden');
                return;
            }
            lupa ??= crearLupa(svg, defs, dibujo);
            pintarLupa(lupa, l);
        },
    };

    // Lo que corrió quien mira, sin dejar que la pieza salga del dibujo: ni
    // al arrastrarla ni cuando después se mueve sola. Lo que quedó contra el
    // borde se guarda así, contra el borde: si no, una corrida vieja la
    // volvería a sacar apenas la escena la moviera.
    function adentro(id, corrida, estado) {
        const pos = posicionAbsoluta(id, estado, escena.tipos);
        const limitar = (v, mitad, centro, total) => {
            if (mitad * 2 >= total) return total / 2 - centro;
            return Math.min(Math.max(v, mitad - centro), total - mitad - centro);
        };
        corrida.x = limitar(corrida.x, pos.ancho / 2, pos.x, escena.ancho);
        corrida.y = limitar(corrida.y, pos.alto / 2, pos.y, escena.alto);
        return corrida;
    }
}

// ---------------- La lupa de quien mira ----------------

function crearLupa(svg, defs, dibujo) {
    const id = idUnico('ma-lupa');
    const recorte = el('rect', {}, el('clipPath', { id }, defs));
    const grupo = el('g', { 'data-lupa': 'cuerpo', class: 'ma-lupa' }, svg);
    const fondo = el('rect', { fill: 'var(--ma-fondo)', filter: filtroSombra(defs, { dy: 8, desenfoque: 9, opacidad: 0.35 }) }, grupo);
    const vista = el('g', { 'clip-path': `url(#${id})` }, grupo);
    // Un <use> por pieza de arriba (como hace el espejo), no uno del dibujo
    // entero: en algunos navegadores, la copia de un grupo grande con
    // cámaras y recortes adentro salía sin los textos.
    const uso = el('g', {}, vista);
    for (const pieza of dibujo.querySelectorAll(':scope > g[data-pieza]')) {
        if (!pieza.id) pieza.id = idUnico('ma-pieza');
        el('use', { href: `#${pieza.id}` }, uso);
    }
    const aro = el('rect', { fill: 'none', stroke: 'var(--ma-texto)' }, grupo);
    // El asa: de donde se agarra para cambiarle el tamaño.
    const asa = el('circle', { 'data-lupa': 'asa', fill: 'var(--ma-acento)', stroke: 'var(--ma-fondo)', class: 'ma-lupa-asa' }, grupo);
    return { grupo, recorte, fondo, uso, aro, asa };
}

function pintarLupa(l, d) {
    const circulo = d.forma === 'circulo';
    const ancho = circulo ? Math.min(d.ancho, d.alto) : d.ancho;
    const alto = circulo ? ancho : d.alto;
    const radio = circulo ? ancho / 2 : Math.min(18, ancho / 4);
    const forma = { x: d.x - ancho / 2, y: d.y - alto / 2, width: ancho, height: alto, rx: radio, ry: radio };
    const pixel = d.pixel ?? 1;
    l.grupo.removeAttribute('visibility');
    poner(l.recorte, forma);
    poner(l.fondo, forma);
    poner(l.aro, { ...forma, 'stroke-width': 3 * pixel });
    poner(l.uso, { transform: `translate(${r(d.x)} ${r(d.y)}) scale(${r(d.zoom)}) translate(${r(-d.x)} ${r(-d.y)})` });
    // En un círculo, el asa va sobre el borde, abajo a la derecha.
    const ax = circulo ? d.x + (ancho / 2) * Math.SQRT1_2 : d.x + ancho / 2;
    const ay = circulo ? d.y + (alto / 2) * Math.SQRT1_2 : d.y + alto / 2;
    poner(l.asa, { cx: ax, cy: ay, r: 11 * pixel, 'stroke-width': 3 * pixel });
}

// ---------------- El trazo ----------------
// Para dibujar un borde de a poco, cada forma se mide como si tuviera largo 1
// (pathLength) y se le pone un guion de largo `trazo` seguido de un hueco. El
// relleno aparece al final, cuando el borde ya está casi entero: es como lo
// haría alguien a mano, y como lo hace Manim.

const FORMAS = 'path, line, polyline, polygon, rect, circle, ellipse';
// Desde dónde del trazo empieza a aparecer el relleno.
const RELLENO_DESDE = 0.7;

function trazar(nodo, trazo) {
    const grupo = nodo.grupo;
    // Solo las formas de esta pieza, no las de las piezas que lleva adentro.
    const propias = [...grupo.querySelectorAll(FORMAS)].filter((f) => f.closest('[data-pieza]') === grupo);
    if (trazo >= 1) {
        for (const f of propias) {
            f.removeAttribute('pathLength');
            /** @type {any} */ (f).style.removeProperty('stroke-dasharray');
            if (/** @type {any} */ (f).__trazoPrestado) {
                /** @type {any} */ (f).style.removeProperty('stroke');
                /** @type {any} */ (f).style.removeProperty('stroke-width');
                /** @type {any} */ (f).__trazoPrestado = false;
            }
        }
        grupo.style.removeProperty('fill-opacity');
        nodo.trazando = false;
        return;
    }
    nodo.trazando = true;
    for (const f of propias) {
        const s = /** @type {any} */ (f).style;
        f.setAttribute('pathLength', '1');
        s.setProperty('stroke-dasharray', `${Math.max(trazo, 0).toFixed(4)} 1`);
        // Una forma que no tiene borde (un círculo relleno) igual se dibuja
        // primero: con un borde prestado del color de su relleno.
        const borde = f.getAttribute('stroke');
        const relleno = f.getAttribute('fill');
        if ((!borde || borde === 'none') && relleno && relleno !== 'none') {
            s.setProperty('stroke', relleno);
            s.setProperty('stroke-width', '3');
            /** @type {any} */ (f).__trazoPrestado = true;
        }
    }
    const relleno = Math.min(Math.max((trazo - RELLENO_DESDE) / (1 - RELLENO_DESDE), 0), 1);
    grupo.style.setProperty('fill-opacity', relleno.toFixed(3));
}

// ---------------- El fondo y los efectos del estilo ----------------

function fondoDelEstilo(defs, fondo) {
    if (!fondo?.degradado) return 'var(--ma-fondo)';
    const [desde, hasta] = fondo.degradado.map(aCss);
    const id = idUnico('ma-fondo');
    const radial = fondo.forma === 'radial';
    const angulo = ((fondo.angulo ?? 90) * Math.PI) / 180;
    const g = el(radial ? 'radialGradient' : 'linearGradient', radial
        ? { id, cx: '50%', cy: '45%', r: '75%' }
        : { id, x1: r(0.5 - Math.cos(angulo) / 2), y1: r(0.5 - Math.sin(angulo) / 2), x2: r(0.5 + Math.cos(angulo) / 2), y2: r(0.5 + Math.sin(angulo) / 2) }, defs);
    el('stop', { offset: 0, 'stop-color': desde }, g);
    el('stop', { offset: 1, 'stop-color': hasta }, g);
    return `url(#${id})`;
}

/**
 * Los efectos del estilo. Todo depende de t (el grano y el temblor de la tiza
 * cambian con el tiempo, pero con una semilla que sale de t): el mismo instante
 * se ve igual en vivo y en el video.
 */
function crearEfectos(defs, svg, escena, e) {
    const { ancho, alto } = escena;
    const resultado = { filtro: null, encima: (_padre) => {}, pintar: (_t) => {} };
    const capas = [];

    // Un filtro solo, con los pasos encadenados: a mano → sombra → brillo.
    if (e.aMano || e.sombra || e.brillo) {
        const id = idUnico('ma-efectos');
        const margen = 0.06;
        const f = el('filter', {
            id, filterUnits: 'userSpaceOnUse',
            x: -ancho * margen, y: -alto * margen, width: ancho * (1 + 2 * margen), height: alto * (1 + 2 * margen),
            'color-interpolation-filters': 'sRGB',
        }, defs);
        let entrada = 'SourceGraphic';
        if (e.aMano) {
            const m = e.aMano === true ? {} : e.aMano;
            const ruido = el('feTurbulence', { type: 'fractalNoise', baseFrequency: m.detalle ?? 0.03, numOctaves: 2, seed: 1, result: 'temblor' }, f);
            el('feDisplacementMap', { in: entrada, in2: 'temblor', scale: (m.fuerza ?? 2) * 2, xChannelSelector: 'R', yChannelSelector: 'G', result: 'amano' }, f);
            entrada = 'amano';
            // Hervir: la tiza cambia unas veces por segundo (no en cada cuadro:
            // eso sería un temblor, no un dibujo).
            const veces = m.hervir ?? 0;
            if (veces > 0) capas.push((t) => poner(ruido, { seed: (Math.floor(t * veces) % 97) + 1 }));
        }
        if (e.sombra) {
            const s = e.sombra === true ? {} : e.sombra;
            el('feDropShadow', {
                in: entrada, dx: s.dx ?? 0, dy: s.dy ?? 6, stdDeviation: s.desenfoque ?? 8,
                'flood-color': aCss(s.color ?? '#000'), 'flood-opacity': s.opacidad ?? 0.3, result: 'sombra',
            }, f);
            entrada = 'sombra';
        }
        if (e.brillo) {
            const fuerza = Math.min(Math.max(Number(e.brillo) || 0, 0), 1.5);
            el('feGaussianBlur', { in: entrada, stdDeviation: 4 + 10 * fuerza, result: 'halo' }, f);
            el('feComponentTransfer', { in: 'halo', result: 'haloFuerte' }, f)
                .appendChild(el('feFuncA', { type: 'linear', slope: 0.6 + fuerza }));
            const juntar = el('feMerge', {}, f);
            el('feMergeNode', { in: 'haloFuerte' }, juntar);
            el('feMergeNode', { in: entrada }, juntar);
        }
        resultado.filtro = id;
    }

    resultado.encima = (padre) => {
        if (e.vineta) {
            const id = idUnico('ma-vineta');
            const g = el('radialGradient', { id, cx: '50%', cy: '50%', r: '72%' }, defs);
            el('stop', { offset: 0.55, 'stop-color': '#000', 'stop-opacity': 0 }, g);
            el('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': Math.min(Number(e.vineta) || 0, 1) }, g);
            el('rect', { x: 0, y: 0, width: ancho, height: alto, fill: `url(#${id})`, 'pointer-events': 'none', 'aria-hidden': 'true' }, padre);
        }
        if (e.grano) {
            const g = e.grano === true ? {} : e.grano;
            const id = idUnico('ma-grano');
            const f = el('filter', { id, x: 0, y: 0, width: '100%', height: '100%' }, defs);
            const ruido = el('feTurbulence', { type: 'fractalNoise', baseFrequency: 0.85, numOctaves: 1, seed: 1, stitchTiles: 'stitch' }, f);
            el('feColorMatrix', { type: 'saturate', values: 0 }, f);
            el('rect', {
                x: 0, y: 0, width: ancho, height: alto, filter: `url(#${id})`,
                opacity: Math.min(Number(g.cantidad ?? 0.08), 0.5), 'pointer-events': 'none', 'aria-hidden': 'true',
                style: 'mix-blend-mode: overlay',
            }, padre);
            // El grano de una película cambia en cada cuadro; 12 veces por
            // segundo alcanza para que se note vivo sin costar tanto.
            if (g.animado !== false) capas.push((t) => poner(ruido, { seed: (Math.floor(t * 12) % 89) + 1 }));
        }
    };
    resultado.pintar = (t) => { for (const c of capas) c(t); };
    void svg;
    return resultado;
}

function iguales(a, b) {
    if (!a) return false;
    for (const k in b) if (a[k] !== b[k]) return false;
    return true;
}

function r(n) {
    return Math.round(n * 100) / 100;
}
