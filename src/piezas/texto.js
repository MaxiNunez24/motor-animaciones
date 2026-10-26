import { definirPieza } from './definir.js';
import { el, poner, renglones } from './svg.js';
import { partirLineas, revelar, ANCHO_LETRA } from './geometria.js';
import { aCss } from '../nucleo/colores.js';

const ANCLAS = { inicio: 'start', centro: 'middle', fin: 'end' };

// Texto suelto: títulos, rótulos, explicaciones. Con `anchoMax` se parte en
// renglones solo; con `escrito` se puede ir "tipeando".
export const texto = definirPieza({
    nombre: 'texto',
    predeterminados: {
        texto: '',
        tamano: 32,
        peso: 400,
        color: 'texto',
        // Respecto de x: 'inicio' (x es el borde izquierdo), 'centro' o 'fin'.
        alineacion: 'centro',
        // En unidades de la escena. 0: no partir (salvo donde el texto trae \n).
        anchoMax: 0,
        interlineado: 1.25,
        escrito: 1,
        // 'normal' o 'mono' (para código).
        fuente: 'normal',
    },
    colores: ['color'],

    validar(p) {
        if (!(p.alineacion in ANCLAS)) {
            throw new Error(`La alineación de un texto es 'inicio', 'centro' o 'fin', no "${p.alineacion}".`);
        }
    },

    crear(grupo) {
        return { texto: el('text', { 'dominant-baseline': 'central' }, grupo) };
    },

    actualizar(partes, p) {
        poner(partes.texto, {
            fill: aCss(p.color),
            'font-size': p.tamano,
            'font-weight': p.peso,
            'text-anchor': ANCLAS[p.alineacion],
            'font-family': p.fuente === 'mono' ? 'var(--ma-fuente-mono)' : null,
        });
        const lineas = partirLineas(p.texto, anchoEnLetras(p));
        renglones(partes.texto, revelar(lineas, p.escrito), { tamano: p.tamano, interlineado: p.interlineado });
    },

    // Estimado, no medido: ver por qué en partirLineas.
    tamano(p) {
        const lineas = partirLineas(p.texto, anchoEnLetras(p));
        const letras = Math.max(0, ...lineas.map((l) => Array.from(l).length));
        return { ancho: letras * p.tamano * ANCHO_LETRA, alto: lineas.length * p.tamano * p.interlineado };
    },
});

function anchoEnLetras(p) {
    return p.anchoMax > 0 ? Math.floor(p.anchoMax / (p.tamano * ANCHO_LETRA)) : 0;
}
