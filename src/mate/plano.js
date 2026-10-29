import { definirPieza } from '../piezas/definir.js';
import { el, poner, texto as ponerTexto, idUnico } from '../piezas/svg.js';
import { aCss } from '../nucleo/colores.js';
import { limitar } from '../nucleo/interpolar.js';
import { pasoLindo, numero, curvaDeNivel, gradiente } from './calculo.js';

// Un plano cartesiano, y lo que se dibuja sobre él: gráficas, puntos, vectores,
// rectas, curvas de nivel.
//
// El plano dibuja solo los ejes y la cuadrícula. Cada cosa que va encima es
// otra pieza que dice `plano: 'p'` y se ubica con coordenadas de la
// matemática (mx, my), no en píxeles. Así cada una se anima por su cuenta: el
// punto camina sobre la curva, la recta gira hasta ser tangente, y si el plano
// hace zoom (cambian xmin, xmax...) todo lo de encima lo sigue solo.
//
//     piezas: {
//         p: plano({ x: 800, y: 450, xmin: -1, xmax: 4, ymin: -1, ymax: 9 }),
//         f: grafica({ plano: 'p', f: (x) => x * x, trazo: 0 }),
//         a: punto({ plano: 'p', mx: 1, my: 1, etiqueta: 'P' }),
//     },
//     linea: [{ pieza: 'f', a: { trazo: 1 }, dur: 2 }, { pieza: 'a', a: { mx: 2, my: 4 }, dur: 1.5 }],
//
// Las piezas de encima van "dentro" de lo mismo que el plano (de la escena, o
// de la misma cámara): se ubican con su x, y. La escala y el giro del plano no
// se tienen en cuenta.

/** Lo que tiene que saber una pieza para pasar de la matemática a píxeles. */
function marco(p) {
    return {
        izq: p.x - p.ancho / 2,
        der: p.x + p.ancho / 2,
        arriba: p.y - p.alto / 2,
        abajo: p.y + p.alto / 2,
        xmin: p.xmin,
        xmax: p.xmax,
        ymin: p.ymin,
        ymax: p.ymax,
    };
}

/**
 * De coordenadas del plano a píxeles de la escena.
 * @param {{ x: number, y: number, ancho: number, alto: number, xmin: number, xmax: number, ymin: number, ymax: number }} plano
 * @param {number} mx
 * @param {number} my
 */
export function aPixelPlano(plano, mx, my) {
    const m = marco(plano);
    return {
        x: m.izq + ((mx - m.xmin) / (m.xmax - m.xmin)) * (m.der - m.izq),
        y: m.abajo - ((my - m.ymin) / (m.ymax - m.ymin)) * (m.abajo - m.arriba),
    };
}

/** Cuántos píxeles mide una unidad del plano, en x y en y. */
function unidades(plano) {
    return { ux: plano.ancho / (plano.xmax - plano.xmin), uy: plano.alto / (plano.ymax - plano.ymin) };
}

// Los rótulos llevan un borde del color del fondo del plano: así se leen aunque
// pasen por encima de una línea de la cuadrícula o de una curva.
const HALO = { 'paint-order': 'stroke', stroke: 'var(--ma-superficie)', 'stroke-width': 6, 'stroke-linejoin': 'round' };

export const plano = definirPieza({
    nombre: 'plano',
    predeterminados: {
        ancho: 900,
        alto: 600,
        xmin: -5,
        xmax: 5,
        ymin: -5,
        ymax: 5,
        // Cada cuánto va una marca. null: lo elige solo (1, 2 o 5 por una potencia de 10).
        pasoX: null,
        pasoY: null,
        grilla: true,
        numeros: true,
        etiquetaX: 'x',
        etiquetaY: 'y',
        tamano: 20,
        relleno: 'superficie',
        borde: 'borde',
        color: 'suave',
        // Para los números de los ejes: cuántos decimales y qué ponerles atrás (por ejemplo, ' s').
        decimales: 2,
        unidadX: '',
        unidadY: '',
    },
    colores: ['relleno', 'borde', 'color'],

    validar(p) {
        if (!(p.xmax > p.xmin) || !(p.ymax > p.ymin)) {
            throw new Error('Un plano necesita xmax mayor que xmin, e ymax mayor que ymin.');
        }
    },

    crear(grupo) {
        const id = idUnico('ma-plano');
        const clip = el('clipPath', { id }, el('defs', {}, grupo));
        return {
            fondo: el('rect', {}, grupo),
            clipRect: el('rect', {}, clip),
            grilla: el('path', { fill: 'none', 'stroke-width': 1 }, grupo),
            ejes: el('path', { fill: 'none', 'stroke-width': 2.5 }, grupo),
            numeros: el('g', {}, grupo),
            etiquetaX: el('text', { 'text-anchor': 'end', 'font-style': 'italic', 'font-weight': 600, ...HALO }, grupo),
            etiquetaY: el('text', { 'text-anchor': 'start', 'font-style': 'italic', 'font-weight': 600, ...HALO }, grupo),
            idClip: id,
        };
    },

    actualizar(partes, p) {
        // El plano se dibuja centrado en su (0, 0): el motor ya lo corre a x, y.
        const local = { ...p, x: 0, y: 0 };
        const m = marco(local);
        const a = (mx, my) => aPixelPlano(local, mx, my);
        poner(partes.fondo, {
            x: m.izq, y: m.arriba, width: p.ancho, height: p.alto, rx: 10,
            fill: aCss(p.relleno), stroke: aCss(p.borde), 'stroke-width': 2,
        });
        poner(partes.clipRect, { x: m.izq, y: m.arriba, width: p.ancho, height: p.alto });

        const pasoX = p.pasoX ?? pasoLindo(p.xmax - p.xmin, Math.max(3, Math.round(p.ancho / 110)));
        const pasoY = p.pasoY ?? pasoLindo(p.ymax - p.ymin, Math.max(3, Math.round(p.alto / 80)));
        const marcasX = marcas(p.xmin, p.xmax, pasoX);
        const marcasY = marcas(p.ymin, p.ymax, pasoY);

        let d = '';
        if (p.grilla) {
            for (const x of marcasX) d += `M${r(a(x, 0).x)} ${r(m.arriba)}V${r(m.abajo)}`;
            for (const y of marcasY) d += `M${r(m.izq)} ${r(a(0, y).y)}H${r(m.der)}`;
        }
        poner(partes.grilla, { d, stroke: aCss(p.borde), opacity: 0.55 });

        // Si el 0 no entra en el rango, el eje va pegado al borde: así siempre
        // se ve dónde están los números.
        const ejeY = limitar(a(0, 0).x, m.izq, m.der);
        const ejeX = limitar(a(0, 0).y, m.arriba, m.abajo);
        poner(partes.ejes, {
            d: `M${r(m.izq)} ${r(ejeX)}H${r(m.der)}M${r(ejeY)} ${r(m.arriba)}V${r(m.abajo)}`,
            stroke: aCss(p.color),
        });

        // Los números: se rearman solo si cambia cuántos son.
        const rotulos = [];
        // Los números van abajo del eje x y a la izquierda del eje y; pero si el
        // eje está pegado al borde, del otro lado: si no, quedarían afuera del plano.
        const yNumX = ejeX + p.tamano * 0.95 > m.abajo - 2 ? ejeX - p.tamano * 0.8 : ejeX + p.tamano * 0.95;
        const adentroY = ejeY - p.tamano * 2 < m.izq;
        const xNumY = adentroY ? ejeY + p.tamano * 0.45 : ejeY - p.tamano * 0.45;
        if (p.numeros) {
            // Los números que caerían debajo del nombre de un eje no se escriben.
            const libreX = m.der - (Array.from(p.etiquetaX).length + 1) * p.tamano * 0.7;
            const libreY = m.arriba + p.tamano * 1.9;
            for (const x of marcasX) {
                if (Math.abs(x) < pasoX / 1e6) continue;
                if (a(x, 0).x > libreX && Math.abs(yNumX - (ejeX - p.tamano * 0.8)) < p.tamano) continue;
                rotulos.push({ x: a(x, 0).x, y: yNumX, texto: numero(x, p.decimales) + p.unidadX, ancla: 'middle' });
            }
            for (const y of marcasY) {
                if (Math.abs(y) < pasoY / 1e6) continue;
                if (a(0, y).y < libreY) continue;
                rotulos.push({ x: xNumY, y: a(0, y).y, texto: numero(y, p.decimales) + p.unidadY, ancla: adentroY ? 'start' : 'end' });
            }
            // El 0, una sola vez, en la esquina de los ejes.
            if (p.xmin <= 0 && p.xmax >= 0 && p.ymin <= 0 && p.ymax >= 0) {
                rotulos.push({ x: xNumY, y: yNumX, texto: '0', ancla: adentroY ? 'start' : 'end' });
            }
        }
        while (partes.numeros.childNodes.length > rotulos.length) partes.numeros.lastChild.remove();
        while (partes.numeros.childNodes.length < rotulos.length) {
            el('text', { 'dominant-baseline': 'central', ...HALO, 'stroke-width': 4 }, partes.numeros);
        }
        rotulos.forEach((rot, i) => {
            const nodo = /** @type {Element} */ (partes.numeros.childNodes[i]);
            poner(nodo, {
                x: rot.x, y: rot.y, 'text-anchor': rot.ancla, 'font-size': p.tamano, fill: aCss(p.color),
                // Un número que caería afuera del plano no se muestra.
                visibility: rot.x < m.izq - 2 || rot.x > m.der + 2 || rot.y < m.arriba - 2 || rot.y > m.abajo + 2 ? 'hidden' : null,
            });
            ponerTexto(nodo, rot.texto);
        });

        poner(partes.etiquetaX, { x: m.der - 10, y: ejeX - p.tamano * 0.8, 'font-size': p.tamano * 1.2, fill: aCss(p.color) });
        ponerTexto(partes.etiquetaX, p.etiquetaX);
        poner(partes.etiquetaY, { x: ejeY + 10, y: m.arriba + p.tamano * 1.1, 'font-size': p.tamano * 1.2, fill: aCss(p.color) });
        ponerTexto(partes.etiquetaY, p.etiquetaY);
    },

    tamano: (p) => ({ ancho: p.ancho, alto: p.alto }),
});

function marcas(min, max, paso) {
    const lista = [];
    // Un poco de tolerancia, para que 0,1 + 0,2 no deje afuera la última marca.
    for (let v = Math.ceil(min / paso - 1e-9) * paso; v <= max + paso * 1e-9; v += paso) {
        lista.push(Math.round(v / paso) * paso);
        if (lista.length > 200) break;
    }
    return lista;
}

function r(v) {
    return Math.round(v * 100) / 100;
}

// ---------------- Lo que va encima del plano ----------------

/**
 * Lo común de las piezas que van sobre un plano: buscan al plano, se recortan
 * a su rectángulo y le preguntan cómo pasar a píxeles.
 */
function sobrePlano(definicion) {
    return definirPieza({
        ...definicion,
        predeterminados: { plano: null, ...definicion.predeterminados },
        dependeDeOtras: true,
        validar(p) {
            if (p.plano == null) throw new Error(`Un${definicion.articulo ?? ''} ${definicion.nombre} va sobre un plano: plano: 'p'.`);
            definicion.validar?.(p);
        },
        crear(grupo, props, ctx) {
            const id = idUnico('ma-sobre');
            const clip = el('clipPath', { id }, el('defs', {}, grupo));
            const rect = el('rect', {}, clip);
            const recortado = el('g', { 'clip-path': `url(#${id})` }, grupo);
            // Lo que va arriba del recorte: los rótulos, que pueden asomar del plano.
            const libre = el('g', {}, grupo);
            return { rect, ...definicion.crear(recortado, libre, props, ctx) };
        },
        actualizar(partes, p, ctx) {
            const pl = ctx.estado.piezas[p.plano];
            if (!pl) throw new Error(`"${p.plano}" no es ninguna pieza: un${definicion.articulo ?? ''} ${definicion.nombre} necesita el id de un plano.`);
            const m = marco(pl);
            poner(partes.rect, { x: m.izq, y: m.arriba, width: pl.ancho, height: pl.alto });
            definicion.actualizar(partes, p, {
                plano: pl,
                marco: m,
                a: (mx, my) => aPixelPlano(pl, mx, my),
                ...unidades(pl),
            });
        },
    });
}

/**
 * La gráfica de una función y = f(x), de unos datos (una poligonal) o de una
 * curva paramétrica t ↦ (x(t), y(t)). Con `trazo` se dibuja de a poco, de
 * izquierda a derecha.
 */
export const grafica = sobrePlano({
    nombre: 'grafica',
    articulo: 'a',
    predeterminados: {
        f: null,
        datos: null,
        parametrica: null,
        // El dominio que se dibuja (de f o de t). null: el ancho del plano (para t, de 0 a 1).
        desde: null,
        hasta: null,
        trazo: 1,
        color: 'acento',
        grosor: 4,
        punteada: false,
        muestras: 400,
        // Un número que se le pasa a f como segundo argumento, f(x, k), y que se
        // puede animar: la curva se va deformando de a poco (el precio de una
        // opción a medida que pasa el tiempo, una campana que se ensancha).
        k: 0,
        // Un rótulo al final de lo dibujado: "f(x) = x²".
        etiqueta: '',
        tamanoEtiqueta: 24,
    },
    colores: ['color'],
    validar(p) {
        if (!p.f && !p.datos && !p.parametrica) {
            throw new Error('Una gráfica necesita qué dibujar: f: (x) => x * x, datos: [[0, 1], [1, 3]] o parametrica: (t) => [x, y].');
        }
    },
    crear(grupo, libre) {
        return {
            linea: el('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, grupo),
            etiqueta: el('text', { 'font-weight': 700, 'dominant-baseline': 'central', ...HALO }, libre),
            cache: { clave: null, puntos: [] },
        };
    },
    actualizar(partes, p, c) {
        const puntos = puntosDeGrafica(p, c);
        const avance = limitar(p.trazo, 0, 1);
        const { d, fin } = caminoHasta(puntos, avance, c);
        poner(partes.linea, {
            d,
            stroke: aCss(p.color),
            'stroke-width': p.grosor,
            'stroke-dasharray': p.punteada ? `${p.grosor * 2.5} ${p.grosor * 2}` : null,
            visibility: avance > 0 ? null : 'hidden',
        });
        poner(partes.etiqueta, {
            x: fin ? fin.x + 12 : 0,
            y: fin ? fin.y - p.tamanoEtiqueta * 0.7 : 0,
            'font-size': p.tamanoEtiqueta,
            fill: aCss(p.color),
            'text-anchor': fin && fin.x > c.marco.der - 160 ? 'end' : 'start',
            visibility: p.etiqueta && fin && avance > 0.6 ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

// Los puntos de la gráfica en coordenadas del plano, con cortes (null) donde la
// función no está definida o salta (1/x en el 0).
function puntosDeGrafica(p, c) {
    const pl = c.plano;
    if (p.datos) return p.datos.map(([x, y]) => [x, y]);
    const lista = [];
    if (p.parametrica) {
        const t0 = p.desde ?? 0;
        const t1 = p.hasta ?? 1;
        for (let i = 0; i <= p.muestras; i++) {
            const t = t0 + ((t1 - t0) * i) / p.muestras;
            const [x, y] = p.parametrica(t, p.k);
            lista.push(Number.isFinite(x) && Number.isFinite(y) ? [x, y] : null);
        }
        return lista;
    }
    const x0 = p.desde ?? pl.xmin;
    const x1 = p.hasta ?? pl.xmax;
    const alto = pl.ymax - pl.ymin;
    let anterior = null;
    for (let i = 0; i <= p.muestras; i++) {
        const x = x0 + ((x1 - x0) * i) / p.muestras;
        const y = p.f(x, p.k);
        if (!Number.isFinite(y)) {
            lista.push(null);
            anterior = null;
            continue;
        }
        // Un salto de más de dos altos del plano entre dos muestras seguidas es
        // una asíntota: no se une con una línea vertical.
        if (anterior != null && Math.abs(y - anterior) > alto * 2) lista.push(null);
        lista.push([x, y]);
        anterior = y;
    }
    return lista;
}

// El camino SVG de los primeros `avance` (de 0 a 1) de la poligonal, medido por
// su largo en pantalla: así se dibuja a velocidad pareja.
function caminoHasta(puntos, avance, c) {
    const px = puntos.map((q) => (q ? c.a(q[0], q[1]) : null));
    // Para que no haya números gigantes en el SVG: una curva que se va muy
    // afuera del plano se recorta (igual no se ve, la tapa el recorte).
    const lim = (q) => ({ x: limitar(q.x, c.marco.izq - 4000, c.marco.der + 4000), y: limitar(q.y, c.marco.arriba - 4000, c.marco.abajo + 4000) });
    let total = 0;
    for (let i = 1; i < px.length; i++) if (px[i] && px[i - 1]) total += Math.hypot(px[i].x - px[i - 1].x, px[i].y - px[i - 1].y);
    const objetivo = total * avance;
    let d = '';
    let andado = 0;
    let fin = null;
    let nuevo = true;
    for (let i = 0; i < px.length; i++) {
        const q = px[i];
        if (!q) {
            nuevo = true;
            continue;
        }
        if (nuevo) {
            const l = lim(q);
            d += `M${r(l.x)} ${r(l.y)}`;
            nuevo = false;
            fin = q;
            continue;
        }
        const prev = px[i - 1];
        const tramo = Math.hypot(q.x - prev.x, q.y - prev.y);
        if (andado + tramo >= objetivo) {
            const t = tramo === 0 ? 0 : (objetivo - andado) / tramo;
            const l = lim({ x: prev.x + (q.x - prev.x) * t, y: prev.y + (q.y - prev.y) * t });
            d += `L${r(l.x)} ${r(l.y)}`;
            fin = l;
            break;
        }
        andado += tramo;
        const l = lim(q);
        d += `L${r(l.x)} ${r(l.y)}`;
        fin = q;
    }
    return { d: d || 'M0 0', fin };
}

const LADOS = {
    arriba: { dx: 0, dy: -1, ancla: 'middle' },
    abajo: { dx: 0, dy: 1, ancla: 'middle' },
    derecha: { dx: 1, dy: 0, ancla: 'start' },
    izquierda: { dx: -1, dy: 0, ancla: 'end' },
    'arriba-derecha': { dx: 0.75, dy: -0.75, ancla: 'start' },
    'arriba-izquierda': { dx: -0.75, dy: -0.75, ancla: 'end' },
    'abajo-derecha': { dx: 0.75, dy: 0.75, ancla: 'start' },
    'abajo-izquierda': { dx: -0.75, dy: 0.75, ancla: 'end' },
};

/** Un punto del plano, con su rótulo y, si se pide, las guías punteadas hasta los ejes. */
export const punto = sobrePlano({
    nombre: 'punto',
    predeterminados: {
        mx: 0,
        my: 0,
        radio: 9,
        color: 'acento2',
        etiqueta: '',
        tamanoEtiqueta: 24,
        lado: 'arriba-derecha',
        // Líneas punteadas hasta los ejes, para leer las coordenadas.
        guias: false,
        // De 0 a 1: un anillo alrededor, para decir "mirá este".
        resaltado: 0,
    },
    colores: ['color'],
    validar(p) {
        if (!(p.lado in LADOS)) throw new Error(`El lado del rótulo de un punto es uno de: ${Object.keys(LADOS).join(', ')}.`);
    },
    crear(grupo, libre) {
        return {
            guias: el('path', { fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '6 6' }, grupo),
            anillo: el('circle', { fill: 'none', 'stroke-width': 4 }, grupo),
            circulo: el('circle', { stroke: 'var(--ma-superficie)', 'stroke-width': 3 }, grupo),
            etiqueta: el('text', { 'font-weight': 700, 'dominant-baseline': 'central', ...HALO }, libre),
        };
    },
    actualizar(partes, p, c) {
        const q = c.a(p.mx, p.my);
        const ejeY = limitar(c.a(0, 0).x, c.marco.izq, c.marco.der);
        const ejeX = limitar(c.a(0, 0).y, c.marco.arriba, c.marco.abajo);
        poner(partes.guias, {
            d: `M${r(q.x)} ${r(q.y)}V${r(ejeX)}M${r(q.x)} ${r(q.y)}H${r(ejeY)}`,
            stroke: aCss(p.color),
            visibility: p.guias ? null : 'hidden',
        });
        poner(partes.anillo, {
            cx: q.x, cy: q.y, r: p.radio * 2.2, stroke: aCss(p.color),
            opacity: p.resaltado, visibility: p.resaltado > 0 ? null : 'hidden',
        });
        poner(partes.circulo, { cx: q.x, cy: q.y, r: p.radio, fill: aCss(p.color) });
        const lado = LADOS[p.lado];
        const aire = p.radio + p.tamanoEtiqueta * 0.7;
        poner(partes.etiqueta, {
            x: q.x + lado.dx * aire, y: q.y + lado.dy * aire, 'text-anchor': lado.ancla,
            'font-size': p.tamanoEtiqueta, fill: aCss(p.color), visibility: p.etiqueta ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

/** Un vector: una flecha que sale de (mx, my) y avanza (dx, dy), en unidades del plano. */
export const vector = sobrePlano({
    nombre: 'vector',
    predeterminados: {
        mx: 0,
        my: 0,
        dx: 1,
        dy: 1,
        progreso: 1,
        color: 'acento',
        grosor: 4,
        etiqueta: '',
        tamanoEtiqueta: 24,
    },
    colores: ['color'],
    crear(grupo, libre) {
        return {
            linea: el('path', { fill: 'none', 'stroke-linecap': 'round' }, grupo),
            punta: el('path', {}, grupo),
            etiqueta: el('text', { 'font-weight': 700, 'dominant-baseline': 'central', 'text-anchor': 'middle', ...HALO }, libre),
        };
    },
    actualizar(partes, p, c) {
        const a = c.a(p.mx, p.my);
        const avance = limitar(p.progreso, 0, 1);
        const b0 = c.a(p.mx + p.dx, p.my + p.dy);
        const b = { x: a.x + (b0.x - a.x) * avance, y: a.y + (b0.y - a.y) * avance };
        const largo = Math.hypot(b.x - a.x, b.y - a.y);
        const ang = Math.atan2(b.y - a.y, b.x - a.x);
        const L = Math.min(p.grosor * 3.4, largo * 0.6);
        const W = L * 0.62;
        const base = { x: b.x - Math.cos(ang) * L, y: b.y - Math.sin(ang) * L };
        const visible = avance > 0 && largo > 0.5;
        poner(partes.linea, {
            d: `M${r(a.x)} ${r(a.y)}L${r(base.x + Math.cos(ang) * L * 0.3)} ${r(base.y + Math.sin(ang) * L * 0.3)}`,
            stroke: aCss(p.color), 'stroke-width': p.grosor, visibility: visible ? null : 'hidden',
        });
        const nx = -Math.sin(ang) * W;
        const ny = Math.cos(ang) * W;
        poner(partes.punta, {
            d: `M${r(b.x)} ${r(b.y)}L${r(base.x + nx)} ${r(base.y + ny)}L${r(base.x - nx)} ${r(base.y - ny)}Z`,
            fill: aCss(p.color), visibility: visible ? null : 'hidden',
        });
        // El rótulo va al costado de la mitad del vector, del lado de arriba.
        const lado = Math.cos(ang) >= 0 ? -1 : 1;
        const corr = p.tamanoEtiqueta * 0.9;
        poner(partes.etiqueta, {
            x: (a.x + b.x) / 2 + Math.sin(ang) * corr * -lado, y: (a.y + b.y) / 2 - Math.cos(ang) * corr * -lado,
            'font-size': p.tamanoEtiqueta, fill: aCss(p.color),
            visibility: p.etiqueta && avance > 0.5 ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

/**
 * Una recta que pasa por (mx, my) con una pendiente: la tangente, una secante,
 * la recta de regresión. Animar `pendiente` la hace girar sobre ese punto.
 * Con `vertical: true` es la recta x = mx.
 */
export const recta = sobrePlano({
    nombre: 'recta',
    articulo: 'a',
    predeterminados: {
        mx: 0,
        my: 0,
        pendiente: 1,
        vertical: false,
        color: 'acento2',
        grosor: 3.5,
        punteada: false,
        // De 0 a 1: se dibuja desde el punto hacia los dos lados.
        progreso: 1,
        etiqueta: '',
        tamanoEtiqueta: 22,
    },
    colores: ['color'],
    crear(grupo, libre) {
        return {
            linea: el('path', { fill: 'none', 'stroke-linecap': 'round' }, grupo),
            etiqueta: el('text', { 'font-weight': 700, 'dominant-baseline': 'central', 'text-anchor': 'end', ...HALO }, libre),
        };
    },
    actualizar(partes, p, c) {
        const pl = c.plano;
        const avance = limitar(p.progreso, 0, 1);
        let a;
        let b;
        if (p.vertical) {
            const ym = (pl.ymin + pl.ymax) / 2;
            const media = ((pl.ymax - pl.ymin) / 2) * 1.05 * avance;
            a = c.a(p.mx, ym - media);
            b = c.a(p.mx, ym + media);
        } else {
            // Se calcula hasta un poco más allá de los bordes: el recorte la corta prolija.
            const ancho = (pl.xmax - pl.xmin) * 1.05;
            const izq = p.mx - (p.mx - pl.xmin + ancho * 0.05) * avance;
            const der = p.mx + (pl.xmax - p.mx + ancho * 0.05) * avance;
            a = c.a(izq, p.my + p.pendiente * (izq - p.mx));
            b = c.a(der, p.my + p.pendiente * (der - p.mx));
        }
        const lim = (v, min, max) => limitar(v, min - 4000, max + 4000);
        poner(partes.linea, {
            d: `M${r(lim(a.x, c.marco.izq, c.marco.der))} ${r(lim(a.y, c.marco.arriba, c.marco.abajo))}L${r(lim(b.x, c.marco.izq, c.marco.der))} ${r(lim(b.y, c.marco.arriba, c.marco.abajo))}`,
            stroke: aCss(p.color), 'stroke-width': p.grosor,
            'stroke-dasharray': p.punteada ? `${p.grosor * 2.5} ${p.grosor * 2}` : null,
            visibility: avance > 0 ? null : 'hidden',
        });
        // El rótulo, cerca del borde derecho del plano, sobre la recta (si entra).
        const xe = pl.xmax - (pl.xmax - pl.xmin) * 0.03;
        let e = p.vertical ? c.a(p.mx, pl.ymax - (pl.ymax - pl.ymin) * 0.06) : c.a(xe, p.my + p.pendiente * (xe - p.mx));
        if (!p.vertical && (e.y < c.marco.arriba + 20 || e.y > c.marco.abajo - 20)) {
            // Si a la derecha se sale del plano, va donde la recta cruza el borde de arriba o de abajo.
            const yb = e.y < c.marco.arriba + 20 ? pl.ymax - (pl.ymax - pl.ymin) * 0.05 : pl.ymin + (pl.ymax - pl.ymin) * 0.05;
            const xb = p.pendiente === 0 ? xe : p.mx + (yb - p.my) / p.pendiente;
            e = c.a(xb, yb);
        }
        poner(partes.etiqueta, {
            x: p.vertical ? e.x - 10 : e.x - 6, y: e.y - p.tamanoEtiqueta * 0.85,
            'font-size': p.tamanoEtiqueta, fill: aCss(p.color),
            visibility: p.etiqueta && avance > 0.6 ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

/** Un segmento entre dos puntos del plano: un residuo, una distancia, un lado. */
export const segmento = sobrePlano({
    nombre: 'segmento',
    predeterminados: {
        x1: 0,
        y1: 0,
        x2: 1,
        y2: 1,
        progreso: 1,
        color: 'suave',
        grosor: 3,
        punteada: false,
        etiqueta: '',
        tamanoEtiqueta: 20,
    },
    colores: ['color'],
    crear(grupo, libre) {
        return {
            linea: el('path', { fill: 'none', 'stroke-linecap': 'round' }, grupo),
            etiqueta: el('text', { 'font-weight': 600, 'dominant-baseline': 'central', 'text-anchor': 'start', ...HALO }, libre),
        };
    },
    actualizar(partes, p, c) {
        const a = c.a(p.x1, p.y1);
        const b0 = c.a(p.x2, p.y2);
        const avance = limitar(p.progreso, 0, 1);
        const b = { x: a.x + (b0.x - a.x) * avance, y: a.y + (b0.y - a.y) * avance };
        poner(partes.linea, {
            d: `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`,
            stroke: aCss(p.color), 'stroke-width': p.grosor,
            'stroke-dasharray': p.punteada ? `${p.grosor * 2.5} ${p.grosor * 2}` : null,
            visibility: avance > 0 ? null : 'hidden',
        });
        poner(partes.etiqueta, {
            x: (a.x + b.x) / 2 + 10, y: (a.y + b.y) / 2, 'font-size': p.tamanoEtiqueta, fill: aCss(p.color),
            visibility: p.etiqueta && avance > 0.5 ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

/**
 * La región entre la gráfica de f y la de g (o el eje x, si no hay g), de x =
 * desde a x = hasta: el área bajo una campana (una probabilidad), las colas de
 * un test, una banda de confianza. `desde` y `hasta` se animan: la región
 * crece o se corre.
 */
export const area = sobrePlano({
    nombre: 'area',
    articulo: 'a',
    predeterminados: {
        f: null,
        g: null,
        desde: 0,
        hasta: 1,
        color: 'acento',
        relleno: 0.3,
        // Un borde arriba (sobre f), para que la región se lea aunque el relleno sea claro.
        borde: true,
        muestras: 160,
        // Como en la gráfica: f(x, k) y g(x, k), con k animable.
        k: 0,
        etiqueta: '',
        tamanoEtiqueta: 22,
        // Dónde va el rótulo, en coordenadas del plano. null: en el medio de la región.
        etiquetaX: null,
        etiquetaY: null,
    },
    colores: ['color'],
    validar(p) {
        if (typeof p.f !== 'function') throw new Error('Un área necesita la curva de arriba: f: (x) => ...');
    },
    crear(grupo, libre) {
        return {
            relleno: el('path', { stroke: 'none' }, grupo),
            borde: el('path', { fill: 'none', 'stroke-width': 3, 'stroke-linejoin': 'round' }, grupo),
            etiqueta: el('text', { 'font-weight': 700, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...HALO }, libre),
        };
    },
    actualizar(partes, p, c) {
        const pl = c.plano;
        // Lo que no entra en el plano no se calcula (las colas de una campana van hasta el infinito).
        const x0 = Math.max(Math.min(p.desde, p.hasta), pl.xmin - (pl.xmax - pl.xmin) * 0.02);
        const x1 = Math.min(Math.max(p.desde, p.hasta), pl.xmax + (pl.xmax - pl.xmin) * 0.02);
        const lim = (y) => limitar(y, pl.ymin - (pl.ymax - pl.ymin), pl.ymax + (pl.ymax - pl.ymin));
        const vacia = !(x1 > x0);
        let arriba = '';
        let abajo = '';
        if (!vacia) {
            const n = Math.max(2, Math.ceil(p.muestras * ((x1 - x0) / (pl.xmax - pl.xmin))));
            const xs = Array.from({ length: n + 1 }, (_, i) => x0 + ((x1 - x0) * i) / n);
            arriba = xs.map((x, i) => {
                const q = c.a(x, lim(p.f(x, p.k)));
                return `${i ? 'L' : 'M'}${r(q.x)} ${r(q.y)}`;
            }).join('');
            abajo = xs.reverse().map((x) => {
                const q = c.a(x, lim(p.g ? p.g(x, p.k) : 0));
                return `L${r(q.x)} ${r(q.y)}`;
            }).join('');
        }
        poner(partes.relleno, {
            d: vacia ? 'M0 0' : `${arriba}${abajo}Z`,
            fill: aCss(p.color), 'fill-opacity': p.relleno,
            visibility: vacia ? 'hidden' : null,
        });
        poner(partes.borde, {
            d: vacia ? 'M0 0' : arriba, stroke: aCss(p.color),
            visibility: vacia || !p.borde ? 'hidden' : null,
        });
        const xm = p.etiquetaX ?? (x0 + x1) / 2;
        const ym = p.etiquetaY ?? ((p.g ? p.g(xm, p.k) : 0) + p.f(xm, p.k)) / 2;
        const e = c.a(xm, ym);
        poner(partes.etiqueta, {
            x: e.x, y: e.y, 'font-size': p.tamanoEtiqueta, fill: aCss(p.color),
            visibility: p.etiqueta && !vacia ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

/**
 * Las curvas de nivel de f(x, y): para cada altura c, los puntos donde
 * f(x, y) = c. Con `progreso` aparecen de a una, en el orden de `niveles`;
 * con `resaltar` se destaca una (su índice).
 */
export const curvasNivel = sobrePlano({
    nombre: 'curvasNivel',
    articulo: 'as',
    predeterminados: {
        f: null,
        niveles: [],
        // Cuántas curvas se ven: 2.5 es dos enteras y la tercera apareciendo.
        progreso: Infinity,
        color: 'acento',
        grosor: 2.5,
        resolucion: 56,
        // El índice de una curva para destacarla (−1: ninguna).
        resaltar: -1,
        colorResaltada: 'acento2',
        // Escribir la altura de cada curva.
        rotulos: true,
        tamanoEtiqueta: 18,
    },
    colores: ['color', 'colorResaltada'],
    validar(p) {
        if (typeof p.f !== 'function') throw new Error('Unas curvas de nivel necesitan la función: f: (x, y) => x * x + y * y.');
    },
    crear(grupo, libre) {
        return { lineas: el('g', { fill: 'none', 'stroke-linecap': 'round' }, grupo), rotulos: el('g', {}, libre), cache: { clave: '', curvas: [] } };
    },
    actualizar(partes, p, c) {
        const pl = c.plano;
        // Calcular las curvas es lo caro: se hace de nuevo solo si cambia el rango o la función.
        const clave = [pl.xmin, pl.xmax, pl.ymin, pl.ymax, p.niveles.join(','), p.resolucion].join('|');
        if (partes.cache.clave !== clave || partes.cache.f !== p.f) {
            const rango = { xmin: pl.xmin, xmax: pl.xmax, ymin: pl.ymin, ymax: pl.ymax };
            partes.cache = {
                clave,
                f: p.f,
                curvas: p.niveles.map((nivel) => {
                    const segmentos = curvaDeNivel(p.f, rango, nivel, p.resolucion);
                    // El rótulo va en el punto de la curva que queda más arriba a la derecha.
                    let mejor = null;
                    for (const s of segmentos) if (!mejor || s[0] + s[1] > mejor[0] + mejor[1]) mejor = s;
                    return { nivel, segmentos, rotulo: mejor };
                }),
            };
        }
        const curvas = partes.cache.curvas;
        while (partes.lineas.childNodes.length > curvas.length) partes.lineas.lastChild.remove();
        while (partes.lineas.childNodes.length < curvas.length) el('path', {}, partes.lineas);
        while (partes.rotulos.childNodes.length > curvas.length) partes.rotulos.lastChild.remove();
        while (partes.rotulos.childNodes.length < curvas.length) {
            el('text', { 'font-weight': 600, 'text-anchor': 'middle', 'dominant-baseline': 'central', ...HALO, 'stroke-width': 5 }, partes.rotulos);
        }
        curvas.forEach((curva, i) => {
            const visible = limitar(p.progreso - i, 0, 1);
            const resaltada = i === p.resaltar;
            let d = '';
            for (const [x1, y1, x2, y2] of curva.segmentos) {
                const a = c.a(x1, y1);
                const b = c.a(x2, y2);
                d += `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`;
            }
            poner(/** @type {Element} */ (partes.lineas.childNodes[i]), {
                d: d || 'M0 0',
                stroke: aCss(resaltada ? p.colorResaltada : p.color),
                'stroke-width': resaltada ? p.grosor * 1.8 : p.grosor,
                opacity: visible,
                visibility: visible > 0 && d ? null : 'hidden',
            });
            const nodo = /** @type {Element} */ (partes.rotulos.childNodes[i]);
            const q = curva.rotulo ? c.a(curva.rotulo[0], curva.rotulo[1]) : { x: 0, y: 0 };
            poner(nodo, {
                x: q.x, y: q.y, 'font-size': p.tamanoEtiqueta, fill: aCss(resaltada ? p.colorResaltada : p.color),
                opacity: visible, visibility: p.rotulos && visible > 0 && curva.rotulo ? null : 'hidden',
            });
            ponerTexto(nodo, numero(curva.nivel));
        });
    },
});

/**
 * Un campo de vectores sobre una grilla. Con `f` (una función de dos
 * variables) dibuja su gradiente, o el gradiente cambiado de signo si
 * `sentido` es 'bajada' (hacia dónde se baja más rápido). Con `vectores`
 * dibuja cualquier campo (x, y) ↦ [dx, dy].
 */
export const campo = sobrePlano({
    nombre: 'campo',
    predeterminados: {
        f: null,
        vectores: null,
        sentido: 'subida',
        // Cuántas flechas por lado.
        cantidad: 11,
        // El largo de la flecha más larga, en píxeles: las demás, en proporción.
        largo: 38,
        color: 'suave',
        grosor: 2.5,
        // De 0 a 1: las flechas crecen desde su base.
        progreso: 1,
    },
    colores: ['color'],
    validar(p) {
        if (typeof p.f !== 'function' && typeof p.vectores !== 'function') {
            throw new Error('Un campo necesita f: (x, y) => ... (dibuja su gradiente) o vectores: (x, y) => [dx, dy].');
        }
        if (!['subida', 'bajada'].includes(p.sentido)) throw new Error("El sentido de un campo es 'subida' o 'bajada'.");
    },
    crear(grupo) {
        return { flechas: el('path', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, grupo) };
    },
    actualizar(partes, p, c) {
        const pl = c.plano;
        const signo = p.sentido === 'bajada' ? -1 : 1;
        const vec = p.vectores ?? ((x, y) => gradiente(p.f, x, y));
        const lista = [];
        let maximo = 0;
        for (let j = 0; j < p.cantidad; j++) {
            for (let i = 0; i < p.cantidad; i++) {
                const x = pl.xmin + ((i + 0.5) / p.cantidad) * (pl.xmax - pl.xmin);
                const y = pl.ymin + ((j + 0.5) / p.cantidad) * (pl.ymax - pl.ymin);
                const [dx, dy] = vec(x, y);
                // En píxeles: el eje y de la pantalla va para abajo.
                const v = { x, y, dx: dx * signo * c.ux, dy: -dy * signo * c.uy };
                const n = Math.hypot(v.dx, v.dy);
                if (Number.isFinite(n)) {
                    maximo = Math.max(maximo, n);
                    lista.push({ ...v, n });
                }
            }
        }
        const avance = limitar(p.progreso, 0, 1);
        let d = '';
        for (const v of lista) {
            if (v.n < 1e-9 || maximo === 0) continue;
            const l = (v.n / maximo) * p.largo * avance;
            if (l < 2) continue;
            const a = c.a(v.x, v.y);
            const ux = v.dx / v.n;
            const uy = v.dy / v.n;
            const b = { x: a.x + ux * l, y: a.y + uy * l };
            const pl2 = Math.min(9, l * 0.4);
            d += `M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}`;
            d += `M${r(b.x - ux * pl2 - uy * pl2 * 0.6)} ${r(b.y - uy * pl2 + ux * pl2 * 0.6)}L${r(b.x)} ${r(b.y)}L${r(b.x - ux * pl2 + uy * pl2 * 0.6)} ${r(b.y - uy * pl2 - ux * pl2 * 0.6)}`;
        }
        poner(partes.flechas, {
            d: d || 'M0 0', stroke: aCss(p.color), 'stroke-width': p.grosor, visibility: d ? null : 'hidden',
        });
    },
});
