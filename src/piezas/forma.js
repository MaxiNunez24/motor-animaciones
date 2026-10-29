import { definirPieza } from './definir.js';
import { el, poner } from './svg.js';
import { aCss } from '../nucleo/colores.js';
import { figuras, leerCamino } from '../nucleo/formas.js';

// Una forma libre: cualquier camino de SVG, o una de las figuras que trae el
// motor. Lo que la hace distinta es que `d` se anima: un círculo se puede
// volver estrella, y la estrella, corazón.
//
//     forma({ d: figuras.circulo(60), relleno: 'acento' })
//     { pieza: 'f', a: { d: figuras.estrella(5, 70) }, dur: 1, curva: 'resorte' }
export const forma = definirPieza({
    nombre: 'forma',
    predeterminados: {
        d: figuras.circulo(60),
        relleno: 'acento',
        borde: 'ninguno',
        grosor: 4,
        // Las puntas de las líneas abiertas (una tilde): redondeadas.
        puntas: 'redondas',
    },
    colores: ['relleno', 'borde'],
    formas: ['d'],

    validar(p) {
        // Que un camino mal escrito avise al armar la escena, no en el cuadro 300.
        leerCamino(p.d);
    },

    crear(grupo) {
        return { camino: el('path', { 'stroke-linejoin': 'round' }, grupo) };
    },

    actualizar(partes, p) {
        poner(partes.camino, {
            d: p.d,
            fill: aCss(p.relleno),
            stroke: aCss(p.borde),
            'stroke-width': p.grosor,
            'stroke-linecap': p.puntas === 'redondas' ? 'round' : 'butt',
        });
    },

    // Para enganchar flechas: el rectángulo que la contiene.
    tamano(p) {
        const c = caja(p.d);
        return { ancho: c.ancho, alto: c.alto };
    },
    centro(p) {
        const c = caja(p.d);
        return { x: c.x, y: c.y };
    },
});

const cajas = new Map();
function caja(d) {
    let c = cajas.get(d);
    if (!c) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const borde of leerCamino(d)) {
            for (const [x, y] of borde.puntos) {
                x0 = Math.min(x0, x); x1 = Math.max(x1, x);
                y0 = Math.min(y0, y); y1 = Math.max(y1, y);
            }
        }
        c = Number.isFinite(x0) ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2, ancho: x1 - x0, alto: y1 - y0 } : { x: 0, y: 0, ancho: 0, alto: 0 };
        if (cajas.size > 200) cajas.clear();
        cajas.set(d, c);
    }
    return c;
}
