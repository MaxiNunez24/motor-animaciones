import { definirPieza } from './definir.js';
import { el, poner, texto as ponerTexto } from './svg.js';
import { aCss } from '../nucleo/colores.js';
import { ANCHO_LETRA } from './geometria.js';

const ANCLAS = { inicio: 'start', centro: 'middle', fin: 'end' };

/**
 * Cómo se escribe un número en castellano: 1.234,5 (punto para los miles,
 * coma para los decimales). Se arma a mano y no con toLocaleString porque el
 * resultado de toLocaleString depende de cada navegador y sistema, y acá tiene
 * que dar lo mismo en todos lados.
 * @param {number} valor
 * @param {number} decimales
 */
export function formatearNumero(valor, decimales = 0) {
    const fijo = Math.abs(valor).toFixed(decimales);
    const [entera, fraccion] = fijo.split('.');
    const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const signo = valor < 0 && Number(fijo) !== 0 ? '-' : '';
    return signo + conMiles + (fraccion ? `,${fraccion}` : '');
}

// Un número que se puede animar: de 0 a 83 cuenta de a uno, como en un tablero.
export const contador = definirPieza({
    nombre: 'contador',
    predeterminados: {
        valor: 0,
        decimales: 0,
        prefijo: '',
        sufijo: '',
        tamano: 96,
        peso: 800,
        color: 'texto',
        alineacion: 'centro',
    },
    colores: ['color'],

    crear(grupo) {
        return {
            texto: el('text', { 'dominant-baseline': 'central', 'font-variant-numeric': 'tabular-nums' }, grupo),
        };
    },

    actualizar(partes, p) {
        poner(partes.texto, {
            fill: aCss(p.color),
            'font-size': p.tamano,
            'font-weight': p.peso,
            'text-anchor': ANCLAS[p.alineacion] ?? 'middle',
        });
        ponerTexto(partes.texto, escrito(p));
    },

    // Estimado, como el de un texto: para enganchar flechas y para avisar si
    // algo lo tapa.
    tamano(p) {
        return { ancho: Array.from(escrito(p)).length * p.tamano * ANCHO_LETRA, alto: p.tamano * 1.25 };
    },
    centro(p) {
        const medio = this.tamano(p).ancho / 2;
        return { x: p.alineacion === 'inicio' ? medio : p.alineacion === 'fin' ? -medio : 0, y: 0 };
    },
});

function escrito(p) {
    return `${p.prefijo}${formatearNumero(p.valor, p.decimales)}${p.sufijo}`;
}
