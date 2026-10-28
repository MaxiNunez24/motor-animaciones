import { definirPieza } from './definir.js';
import { el, poner } from './svg.js';
import { aCss } from '../nucleo/colores.js';

// Una fila (o una columna, con `direccion: 'vertical'`) que acomoda piezas una
// al lado de la otra, con `separacion` entre cada una. Si una crece (una lista
// que agrega un elemento, un texto más largo), corre a las demás: nadie tiene
// que calcular a mano dónde va cada cosa.
//
// x e y son el centro de la fila. Sus piezas no van "adentro" (cada una sigue
// teniendo sus coordenadas), solo se acomodan; la que no está en la fila
// puede pegarse a ella como a cualquier otra. Para que una pieza entre sin
// empujar de golpe, animá su escala de 0 a 1: ocupa lo que mide por su escala.
//
// Con `relleno` o `borde` se dibuja la caja que las rodea (con `margen`), que
// crece con ellas. Para que quede detrás, definí la fila antes que sus piezas.
export const fila = definirPieza({
    nombre: 'fila',
    predeterminados: {
        piezas: [],
        direccion: 'horizontal',
        separacion: 24,
        // A lo ancho de la fila: 'centro', 'inicio' (arriba, o a la izquierda en una columna) o 'fin'.
        alinear: 'centro',
        margen: 0,
        relleno: '',
        borde: '',
        radio: 12,
        // Las calcula la fila en cada instante (lo que miden sus piezas): no se escriben.
        ancho: 0,
        alto: 0,
    },
    colores: ['relleno', 'borde'],

    validar(p) {
        if (!Array.isArray(p.piezas)) throw new Error('Una fila necesita "piezas": la lista de ids que acomoda, por ejemplo [\'a\', \'b\'].');
        if (!['horizontal', 'vertical'].includes(p.direccion)) throw new Error(`Una fila es 'horizontal' o 'vertical', no "${p.direccion}".`);
    },

    crear(grupo) {
        return { caja: el('rect', {}, grupo) };
    },

    actualizar(partes, p) {
        const ancho = p.ancho + 2 * p.margen;
        const alto = p.alto + 2 * p.margen;
        poner(partes.caja, {
            x: -ancho / 2, y: -alto / 2, width: ancho, height: alto, rx: p.radio,
            fill: p.relleno ? aCss(p.relleno) : 'none',
            stroke: p.borde ? aCss(p.borde) : 'none',
            'stroke-width': p.borde ? 2 : 0,
            visibility: p.relleno || p.borde ? null : 'hidden',
        });
    },

    tamano: (p) => ({ ancho: p.ancho + 2 * p.margen, alto: p.alto + 2 * p.margen }),
});
