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
        // El id de una pieza (se engancha al borde que mira a la otra punta),
        // un punto { x, y }, o un costado de una pieza: { pieza: 'id', lado:
        // 'izquierda' | 'derecha' | 'arriba' | 'abajo' | 'centro', dx, dy }.
        // Enganchada a un costado, la sigue aunque la pieza crezca.
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
        // De qué lado del camino va la etiqueta: 1 o -1 (para que no quede encima de otra pieza).
        ladoEtiqueta: 1,
        // Girar la etiqueta para que siga la flecha (en una flecha vertical, no ocupa ancho).
        girarEtiqueta: false,
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
        // La flecha se dibuja corrida a su x, y (como toda pieza). Un punto
        // { x, y } está en esas coordenadas, pero una punta enganchada a una
        // pieza ya está donde está la pieza: si la flecha también se corrió
        // (una escena que baja todo para centrarlo), se descuenta, o la
        // flecha quedaría corrida dos veces.
        if (esDePieza(p.desde)) a = { ...a, x: a.x - p.x, y: a.y - p.y };
        if (esDePieza(p.hasta)) b = { ...b, x: b.x - p.x, y: b.y - p.y };
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
        const ex = Math.sin(angMedio) * (p.ladoEtiqueta < 0 ? -1 : 1);
        const ey = -Math.cos(angMedio) * (p.ladoEtiqueta < 0 ? -1 : 1);
        const medioAncho = (Array.from(p.etiqueta).length * p.tamanoEtiqueta * ANCHO_LETRA) / 2;
        // Girada, la etiqueta sigue la flecha: alcanza con correrla media altura.
        // Si no, en una flecha vertical hay que correrla medio ancho de texto.
        const corrimiento = p.girarEtiqueta
            ? p.tamanoEtiqueta * 0.8
            : p.tamanoEtiqueta * 0.5 + Math.abs(ex) * medioAncho + Math.abs(ey) * p.tamanoEtiqueta * 0.5;
        const ex2 = medio.x + ex * corrimiento;
        const ey2 = medio.y + ey * corrimiento;
        // El ángulo se da vuelta si haría falta leerla cabeza abajo.
        let grados = (angMedio * 180) / Math.PI;
        if (grados > 90) grados -= 180;
        if (grados < -90) grados += 180;
        poner(partes.etiqueta, {
            x: ex2,
            y: ey2,
            transform: p.girarEtiqueta ? `rotate(${grados.toFixed(1)} ${ex2.toFixed(1)} ${ey2.toFixed(1)})` : null,
            'font-size': p.tamanoEtiqueta,
            fill: aCss(p.colorEtiqueta),
            opacity: limitar((avance - 0.5) / 0.4, 0, 1),
            visibility: p.etiqueta && avance > 0.5 ? null : 'hidden',
        });
        ponerTexto(partes.etiqueta, p.etiqueta);
    },
});

const esDePieza = (cual) => typeof cual === 'string' || cual?.pieza != null;

function extremo(cual, ctx) {
    const pieza = typeof cual === 'string' ? cual : cual.pieza;
    if (pieza == null) return { x: cual.x, y: cual.y };
    if (!ctx.estado.piezas[pieza]) throw new Error(`La flecha apunta a "${pieza}", y no hay ninguna pieza que se llame así.`);
    const r = posicionAbsoluta(pieza, ctx.estado, ctx.tipos);
    if (typeof cual === 'string') return r;
    return puntoDelLado(r, cual.lado, cual.dx ?? 0, cual.dy ?? 0);
}

// El medio de un costado de una pieza (como un punto, sin tamaño: la flecha
// arranca justo ahí).
export function puntoDelLado(r, lado = 'centro', dx = 0, dy = 0) {
    const x = r.x + (lado === 'derecha' ? r.ancho / 2 : lado === 'izquierda' ? -r.ancho / 2 : 0);
    const y = r.y + (lado === 'abajo' ? r.alto / 2 : lado === 'arriba' ? -r.alto / 2 : 0);
    return { x: x + dx, y: y + dy };
}

function adentro(r, contenedor, ctx) {
    const { x, y, escala } = aCoordenadasDe(r, contenedor, ctx.estado, ctx.tipos);
    return { x, y, ancho: (r.ancho ?? 0) / escala, alto: (r.alto ?? 0) / escala };
}

function n(v) {
    return Math.round(v * 100) / 100;
}
