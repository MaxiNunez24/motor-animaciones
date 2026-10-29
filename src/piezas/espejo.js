import { definirPieza } from './definir.js';
import { el, poner, idUnico, filtroSombra } from './svg.js';
import { aCss } from '../nucleo/colores.js';
import { posicionAbsoluta } from './geometria.js';

// Un espejo: una ventana que muestra, agrandada, otra parte de la escena. No
// es una copia: es la misma parte vista otra vez (un <use> del SVG), así que lo
// que cambia allá cambia acá en el mismo cuadro, sin escribir nada dos veces.
//
// Sirve para tener cerca algo que está lejos o es chico: la línea de código
// que corre, al lado de la variable que cambia; el detalle de un gráfico. Como
// una lupa de verdad, se puede poner redondo (`forma: 'circulo'`).
//
// mirarX, mirarY: el punto de la escena que se ve en el centro de la ventana;
// zoom, cuánto se agranda. `fuente` es el id de una pieza (se ve solo esa,
// con lo que lleva adentro) o null (toda la escena, menos los espejos). Con
// `marco`, un rectángulo marca en la escena qué parte se está mirando.
//
// Quien mira lo puede arrastrar a otro lado si lo tapa algo (`arrastrable`).
// Eso es de la vista, como el zoom: la escena no cambia y un video sale igual.
// Nunca sale del dibujo, y con doble clic vuelve a su lugar.
//
// Una lupa animada es un espejo con `seguir`: mira siempre lo que tiene
// debajo, vaya a donde vaya. Esa no se arrastra: la mueve la escena, y si
// quien mira la corriera, dejaría de agrandar lo que la escena quiere mostrar.
// (Para una lupa que maneja quien mira está el botón de la lupa, al lado del zoom.)
export const espejo = definirPieza({
    nombre: 'espejo',
    predeterminados: {
        fuente: null,
        mirarX: 0,
        mirarY: 0,
        zoom: 2,
        ancho: 360,
        alto: 160,
        forma: 'rect',
        radio: 14,
        aro: 3,
        colorAro: 'acento',
        fondo: 'fondo',
        sombra: true,
        marco: false,
        colorMarco: 'acento',
        arrastrable: true,
        // Mirar lo que tiene debajo (mirarX y mirarY no se usan): una lupa.
        seguir: false,
    },
    colores: ['colorAro', 'fondo', 'colorMarco'],
    // Lo que muestra depende de otras piezas (y de dónde lo dejó quien mira).
    dependeDeOtras: true,

    validar(p) {
        if (!['rect', 'circulo'].includes(p.forma)) throw new Error(`Un espejo es 'rect' o 'circulo', no "${p.forma}".`);
        if (!(p.zoom > 0)) throw new Error('El zoom de un espejo tiene que ser mayor que 0.');
    },

    crear(grupo, p, ctx) {
        const id = idUnico('ma-espejo');
        // El marco va primero: queda debajo de la ventana si se cruzan.
        const marco = el('rect', { fill: 'none', 'stroke-dasharray': '8 6', 'stroke-width': 3, 'pointer-events': 'none' }, grupo);
        const clip = el('rect', {}, el('clipPath', { id }, el('defs', {}, grupo)));
        const fondo = el('rect', {}, grupo);
        const ventana = el('g', { 'clip-path': `url(#${id})` }, grupo);
        const contenido = el('g', {}, ventana);
        const aro = el('rect', { fill: 'none' }, grupo);
        if (p.arrastrable && !p.seguir) {
            grupo.setAttribute('data-arrastrable', ctx.id);
        }
        return { grupo, marco, clip, fondo, contenido, aro, usos: new Map(), sombra: filtroSombra(grupo, { dy: 8, desenfoque: 9, opacidad: 0.3 }) };
    },

    actualizar(partes, p, ctx) {
        const forma = ventanaDe(p);
        poner(partes.clip, forma);
        poner(partes.fondo, {
            ...forma,
            fill: aCss(p.fondo),
            filter: p.sombra ? partes.sombra : null,
        });
        poner(partes.aro, { ...forma, stroke: aCss(p.colorAro), 'stroke-width': p.aro, visibility: p.aro > 0 ? null : 'hidden' });
        // El marco está en la escena, no en la ventana: se descuenta dónde
        // quedó el espejo (y cuánto lo corrió quien mira).
        const corrida = (!p.seguir && ctx.arrastres?.[ctx.id]) || { x: 0, y: 0 };
        const yo = posicionAbsoluta(ctx.id, ctx.estado, ctx.tipos);
        const mirarX = p.seguir ? yo.x : p.mirarX;
        const mirarY = p.seguir ? yo.y : p.mirarY;
        poner(partes.contenido, { transform: `scale(${p.zoom}) translate(${-mirarX} ${-mirarY})` });
        ponerFuentes(partes, p, ctx);
        const ancho = forma.width / p.zoom;
        const alto = forma.height / p.zoom;
        poner(partes.marco, {
            x: mirarX - ancho / 2 - yo.x - corrida.x,
            y: mirarY - alto / 2 - yo.y - corrida.y,
            width: ancho,
            height: alto,
            rx: forma.rx / p.zoom,
            stroke: aCss(p.colorMarco),
            visibility: p.marco ? null : 'hidden',
        });
    },

    tamano: (p) => {
        const f = ventanaDe(p);
        return { ancho: f.width, alto: f.height };
    },
});

// Un <use> por pieza que se ve en el espejo. Cada pieza se dibuja en las
// coordenadas de su contenedor (una cámara, un celular): el <use> va dentro de
// un grupo que las pasa a coordenadas de la escena.
function ponerFuentes(partes, p, ctx) {
    const svg = partes.grupo.ownerSVGElement;
    if (!svg) return;
    const ids = p.fuente != null
        ? [p.fuente]
        : ctx.ids.filter((id) => ctx.estado.piezas[id].dentro == null && ctx.tipos[id].nombre !== 'espejo');
    for (const id of ids) {
        if (!ctx.estado.piezas[id]) throw new Error(`El espejo mira "${id}", y no hay ninguna pieza que se llame así.`);
        let uso = partes.usos.get(id);
        if (!uso) {
            const original = svg.querySelector(`[data-pieza="${id}"]`);
            if (!original) continue;
            if (!original.id) original.id = idUnico('ma-pieza');
            const envoltorio = el('g', {}, partes.contenido);
            el('use', { href: `#${original.id}` }, envoltorio);
            uso = { envoltorio };
            partes.usos.set(id, uso);
        }
        const padre = ctx.estado.piezas[id].dentro;
        let transform = null;
        if (padre != null) {
            // Dónde caen el (0, 0) y la escala de adentro del contenedor.
            const falso = { piezas: { ...ctx.estado.piezas, __origen: { x: 0, y: 0, escala: 1, dentro: padre } } };
            const o = posicionAbsoluta('__origen', falso, { ...ctx.tipos, __origen: {} });
            const uno = posicionAbsoluta('__origen', { piezas: { ...falso.piezas, __origen: { x: 1, y: 0, escala: 1, dentro: padre } } }, { ...ctx.tipos, __origen: {} });
            transform = `translate(${o.x} ${o.y}) scale(${uno.x - o.x || 1})`;
        }
        poner(uso.envoltorio, { transform });
    }
}

function ventanaDe(p) {
    const circulo = p.forma === 'circulo';
    const ancho = circulo ? Math.min(p.ancho, p.alto) : p.ancho;
    const alto = circulo ? ancho : p.alto;
    const radio = circulo ? ancho / 2 : Math.min(Math.max(p.radio, 0), ancho / 2, alto / 2);
    return { x: -ancho / 2, y: -alto / 2, width: ancho, height: alto, rx: radio, ry: radio };
}
