import { definirPieza } from './definir.js';
import { el, poner, renglones, texto as ponerTexto } from './svg.js';
import { partirLineas, revelar, ANCHO_LETRA } from './geometria.js';
import { aCss } from '../nucleo/colores.js';

// Una caja con texto: la pieza más usada. Sirve de tarjeta, de etiqueta, de
// "variable" o de paso de un proceso. x e y son el CENTRO, no la esquina: así
// alinear cajas y enganchar flechas es pensar en dónde está la cosa, no en
// dónde arranca.
export const caja = definirPieza({
    nombre: 'caja',
    predeterminados: {
        ancho: 280,
        alto: 140,
        radio: 18,
        relleno: 'superficie',
        borde: 'borde',
        grosorBorde: 3,
        texto: '',
        color: 'texto',
        tamano: 30,
        peso: 600,
        // Un emoji arriba del texto.
        icono: '',
        tamanoIcono: 56,
        // De 0 a 1: cuánto del texto ya se escribió.
        escrito: 1,
        // De 0 a 1: un anillo alrededor, para decir "mirá esta".
        resaltado: 0,
    },
    colores: ['relleno', 'borde', 'color'],

    crear(grupo) {
        return {
            anillo: el('rect', { fill: 'none', stroke: 'var(--ma-acento)', 'stroke-width': 6 }, grupo),
            fondo: el('rect', {}, grupo),
            icono: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grupo),
            texto: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grupo),
        };
    },

    actualizar(partes, p) {
        const { ancho: w, alto: h } = p;
        poner(partes.fondo, {
            x: -w / 2, y: -h / 2, width: w, height: h, rx: p.radio,
            fill: aCss(p.relleno), stroke: aCss(p.borde), 'stroke-width': p.grosorBorde,
        });
        const aire = 10;
        poner(partes.anillo, {
            x: -w / 2 - aire, y: -h / 2 - aire, width: w + 2 * aire, height: h + 2 * aire,
            rx: p.radio + aire, opacity: p.resaltado, visibility: p.resaltado > 0 ? null : 'hidden',
        });

        const lineas = partirLineas(p.texto, Math.floor((w - 32) / (p.tamano * ANCHO_LETRA)));
        const altoTexto = p.texto ? lineas.length * p.tamano * 1.2 : 0;
        const altoIcono = p.icono ? p.tamanoIcono : 0;
        const hueco = p.icono && p.texto ? 10 : 0;
        // El ícono y el texto se centran JUNTOS, como un bloque.
        const arriba = -(altoIcono + hueco + altoTexto) / 2;

        poner(partes.icono, {
            y: arriba + altoIcono / 2, 'font-size': p.tamanoIcono,
            visibility: p.icono ? null : 'hidden',
        });
        ponerTexto(partes.icono, p.icono);

        poner(partes.texto, { fill: aCss(p.color), 'font-size': p.tamano, 'font-weight': p.peso });
        renglones(partes.texto, revelar(lineas, p.escrito), {
            y: arriba + altoIcono + hueco + altoTexto / 2,
            tamano: p.tamano,
            interlineado: 1.2,
        });
    },

    tamano: (p) => ({ ancho: p.ancho, alto: p.alto }),
});
