import { definirPieza } from './definir.js';
import { el, poner, texto as ponerTexto } from './svg.js';
import {
    caminoFlecha, medirCurva, uParaFraccion, cortarCurva, puntoCurva, anguloCurva, posicionAbsoluta, aCoordenadasDe, ANCHO_LETRA,
} from './geometria.js';
import { aCss } from '../nucleo/colores.js';
import { limitar } from '../nucleo/interpolar.js';

// Una flecha entre dos piezas (o dos puntos). Se engancha al BORDE de cada
// pieza y la sigue si la pieza se mueve. Puede ir `dentro` de una cámara, y
// entonces se mueve y se recorta con ella. Con `progreso` se dibuja de a poco,
// que es la forma más clara de decir "esto va para allá".
export const flecha = definirPieza({
    nombre: 'flecha',
    predeterminados: {
        // El id de una pieza, o un punto { x, y }.
        desde: null,
        hasta: null,
        // De 0 (no se ve) a 1 (dibujada entera).
        progreso: 1,
        // 0 es recta. Positivo se arquea a la derecha del camino; negativo, a la izquierda.
        curvatura: 0,
        separacion: 12,
        grosor: 5,
        color: 'suave',
        punta: true,
        punteada: false,
        etiqueta: '',
        tamanoEtiqueta: 24,
        colorEtiqueta: 'suave',
    },
    colores: ['color', 'colorEtiqueta'],
    // Depende de dónde están las otras piezas, así que se recalcula siempre.
    dependeDeOtras: true,

    validar(p) {
        if (p.desde == null || p.hasta == null) throw new Error('Una flecha necesita "desde" y "hasta".');
    },

    crear(grupo) {
        return {
            linea: el('path', { fill: 'none', 'stroke-linecap': 'round' }, grupo),
            punta: el('path', {}, grupo),
            etiqueta: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 600 }, grupo),
        };
    },

    actualizar(partes, p, ctx) {
        let a = extremo(p.desde, ctx);
        let b = extremo(p.hasta, ctx);
        // Dentro de una cámara, la flecha se acerca y se recorta con todo lo
        // demás: las puntas se pasan a las coordenadas de adentro.
        if (p.dentro != null) {
            a = adentro(a, p.dentro, ctx);
            b = adentro(b, p.dentro, ctx);
        }
        const curva = caminoFlecha(a, b, p.curvatura, p.separacion);
        const largos = medirCurva(curva);
        const total = largos[largos.length - 1];
        const avance = limitar(p.progreso, 0, 1);
        const visible = avance > 0 && total > 0;

        // La línea termina un poco antes que la punta: si no, con un trazo
        // grueso se asoma por delante del triángulo.
        const largoPunta = p.punta ? p.grosor * 3.2 : 0;
        const fLinea = limitar((avance * total - largoPunta * 0.7) / total, 0, 1);
        const tramo = cortarCurva(curva, uParaFraccion(largos, fLinea));
        poner(partes.linea, {
            d: `M${n(tramo.p0.x)} ${n(tramo.p0.y)} Q${n(tramo.c.x)} ${n(tramo.c.y)} ${n(tramo.p1.x)} ${n(tramo.p1.y)}`,
            stroke: aCss(p.color),
            'stroke-width': p.grosor,
            'stroke-dasharray': p.punteada ? `${p.grosor * 2.4} ${p.grosor * 2}` : null,
            visibility: visible && fLinea > 0 ? null : 'hidden',
        });

        const uPunta = uParaFraccion(largos, avance);
        const tip = puntoCurva(curva, uPunta);
        const ang = anguloCurva(curva, uPunta);
        const L = largoPunta;
        const W = p.grosor * 2.2;
        const base = { x: tip.x - Math.cos(ang) * L, y: tip.y - Math.sin(ang) * L };
        const nx = -Math.sin(ang) * W;
        const ny = Math.cos(ang) * W;
        poner(partes.punta, {
            d: `M${n(tip.x)} ${n(tip.y)} L${n(base.x + nx)} ${n(base.y + ny)} L${n(base.x - nx)} ${n(base.y - ny)} Z`,
            fill: aCss(p.color),
            visibility: visible && p.punta ? null : 'hidden',
        });

        // La etiqueta aparece cuando la flecha ya va por la mitad, no antes:
        // primero se ve el camino, después qué es.
        // Se corre hacia un costado del camino lo justo para no pisarlo: en una
        // flecha vertical, medio ancho de la etiqueta; en una horizontal, media altura.
        const medio = puntoCurva(curva, 0.5);
        const angMedio = anguloCurva(curva, 0.5);
        const ex = Math.sin(angMedio);
        const ey = -Math.cos(angMedio);
        const medioAncho = (Array.from(p.etiqueta).length * p.tamanoEtiqueta * ANCHO_LETRA) / 2;
        const corrimiento = p.tamanoEtiqueta * 0.5 + Math.abs(ex) * medioAncho + Math.abs(ey) * p.tamanoEtiqueta * 0.5;
        poner(partes.etiqueta, {
            x: medio.x + ex * corrimiento,
            y: medio.y + ey * corrimiento,
            'font-size': p.tamanoEtiqueta,
            fill: aCss(p.colorEtiqueta),
            opacity: limitar((avance - 0.5) / 0.4, 0, 1),
            visibility: p.etiqueta && avance > 0.5 ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

function extremo(cual, ctx) {
    if (typeof cual === 'string') {
        if (!ctx.estado.piezas[cual]) throw new Error(`La flecha apunta a "${cual}", y no hay ninguna pieza que se llame así.`);
        return posicionAbsoluta(cual, ctx.estado, ctx.tipos);
    }
    return { x: cual.x, y: cual.y };
}

function adentro(r, contenedor, ctx) {
    const { x, y, escala } = aCoordenadasDe(r, contenedor, ctx.estado, ctx.tipos);
    return { x, y, ancho: (r.ancho ?? 0) / escala, alto: (r.alto ?? 0) / escala };
}

function n(v) {
    return Math.round(v * 100) / 100;
}
