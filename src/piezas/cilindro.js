import { definirPieza } from './definir.js';
import { el, poner, renglones } from './svg.js';
import { partirLineas, ANCHO_LETRA } from './geometria.js';
import { aCss } from '../nucleo/colores.js';
import { limitar } from '../nucleo/interpolar.js';

// Un cilindro: el dibujo con el que todo el mundo reconoce "una base de datos".
// Con `nivel` (de 0 a 1) se va llenando, para mostrar que los datos quedan
// guardados ahí.
export const cilindro = definirPieza({
    nombre: 'cilindro',
    predeterminados: {
        ancho: 200,
        alto: 150,
        relleno: 'superficie',
        borde: 'acento',
        grosorBorde: 4,
        nivel: 0,
        colorNivel: 'acento',
        texto: '',
        tamano: 24,
        peso: 700,
        color: 'texto',
    },
    colores: ['relleno', 'borde', 'colorNivel', 'color'],

    crear(grupo) {
        return {
            cuerpo: el('path', {}, grupo),
            liquido: el('path', { stroke: 'none' }, grupo),
            tapa: el('ellipse', {}, grupo),
            texto: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, grupo),
        };
    },

    actualizar(partes, p) {
        const rx = p.ancho / 2;
        // La tapa se ve achatada, como mirada un poco desde arriba.
        const ry = p.ancho * 0.14;
        const arriba = -p.alto / 2 + ry;
        const abajo = p.alto / 2 - ry;
        poner(partes.cuerpo, {
            d: `M${-rx} ${arriba} V${abajo} A${rx} ${ry} 0 0 0 ${rx} ${abajo} V${arriba} Z`,
            fill: aCss(p.relleno),
            stroke: aCss(p.borde),
            'stroke-width': p.grosorBorde,
        });

        const nivel = limitar(p.nivel, 0, 1);
        const y = abajo - nivel * (abajo - arriba);
        const m = p.grosorBorde / 2;
        poner(partes.liquido, {
            d: `M${-rx + m} ${y} V${abajo} A${rx - m} ${ry - m} 0 0 0 ${rx - m} ${abajo} V${y} A${rx - m} ${ry - m} 0 0 1 ${-rx + m} ${y} Z`,
            fill: `color-mix(in srgb, ${aCss(p.colorNivel)} 35%, transparent)`,
            visibility: nivel > 0 ? null : 'hidden',
        });
        poner(partes.tapa, {
            cx: 0, cy: arriba, rx, ry,
            fill: aCss(p.relleno),
            stroke: aCss(p.borde),
            'stroke-width': p.grosorBorde,
        });

        poner(partes.texto, { fill: aCss(p.color), 'font-size': p.tamano, 'font-weight': p.peso });
        const lineas = partirLineas(p.texto, Math.floor((p.ancho - 24) / (p.tamano * ANCHO_LETRA)));
        renglones(partes.texto, lineas, { y: (arriba + abajo) / 2 + ry / 2, tamano: p.tamano, interlineado: 1.15 });
    },

    tamano: (p) => ({ ancho: p.ancho, alto: p.alto }),
});
