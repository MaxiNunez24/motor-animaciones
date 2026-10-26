import { definirPieza } from '../../piezas/definir.js';
import { el, poner, texto as ponerTexto } from '../../piezas/svg.js';
import { aCss } from '../../nucleo/colores.js';
import { ANCHO_MONO } from './codigo.js';

// La pila de llamadas: una tarjeta por cada función que se está ejecutando,
// con sus variables. La de arriba es la que corre ahora; las de abajo están
// esperando a que la de arriba termine. Una función que se llama a sí misma
// (recursión) se ve como tarjetas iguales apiladas, cada una con su `n`.
//
// A diferencia de las demás piezas, `y` es el BORDE DE ARRIBA y no el centro:
// la pila crece y se achica, y si estuviera centrada saltaría para arriba y
// para abajo con cada llamada.
export const pila = definirPieza({
    nombre: 'pila',
    predeterminados: {
        // [{ funcion: 'sumar', filas: [['a', '3'], ['b', '4']], retorno: '7' }], de la de afuera a la actual.
        marcos: [],
        ancho: 460,
        tamano: 24,
        titulo: 'Llamadas',
        relleno: 'superficie',
        borde: 'acento2',
        destello: 0,
    },
    colores: ['relleno', 'borde'],

    crear(grupo) {
        return {
            titulo: el('text', { 'dominant-baseline': 'central', 'font-weight': 700 }, grupo),
            cuerpo: el('g', {}, grupo),
            clave: '',
        };
    },

    actualizar(partes, p) {
        const { altoFila, encabezado, separacion } = medidas(p);
        const izq = -p.ancho / 2;
        poner(partes.titulo, {
            x: izq + 4, y: -p.tamano * 0.6, 'font-size': p.tamano * 0.8, fill: 'var(--ma-suave)',
            visibility: p.titulo && p.marcos.length ? null : 'hidden',
        });
        ponerTexto(partes.titulo, p.titulo);

        // Se rearma solo si cambió lo que dice; el destello es lo único que
        // cambia en cada cuadro.
        const clave = JSON.stringify(p.marcos);
        if (partes.clave !== clave) {
            partes.cuerpo.replaceChildren();
            partes.actual = null;
            // La actual (la última de la lista) va arriba de todo.
            const enOrden = [...p.marcos].reverse();
            let y = 0;
            enOrden.forEach((m, i) => {
                const actual = i === 0;
                const filas = [...m.filas];
                if (m.retorno !== undefined) filas.push(['↩ devuelve', m.retorno]);
                const alto = encabezado + Math.max(filas.length, 1) * altoFila + 10;
                const g = el('g', { transform: `translate(0 ${y})`, opacity: actual ? 1 : 0.62 }, partes.cuerpo);
                el('rect', {
                    x: izq, y: 0, width: p.ancho, height: alto, rx: 10,
                    fill: aCss(p.relleno), stroke: actual ? aCss(p.borde) : 'var(--ma-borde)', 'stroke-width': actual ? 3 : 2,
                }, g);
                el('rect', {
                    x: izq, y: 0, width: p.ancho, height: encabezado, rx: 10,
                    fill: `color-mix(in srgb, ${aCss(p.borde)} ${actual ? 24 : 10}%, transparent)`,
                }, g);
                const nombre = el('text', {
                    x: izq + 14, y: encabezado / 2, 'dominant-baseline': 'central', 'font-weight': 700,
                    'font-family': 'var(--ma-fuente-mono)', 'font-size': p.tamano, fill: 'var(--ma-texto)',
                }, g);
                ponerTexto(nombre, `${m.funcion}()`);
                if (filas.length === 0) {
                    const vacio = el('text', {
                        x: izq + 14, y: encabezado + altoFila / 2, 'dominant-baseline': 'central',
                        'font-size': p.tamano * 0.8, fill: 'var(--ma-suave)',
                    }, g);
                    ponerTexto(vacio, 'sin variables todavía');
                }
                filas.forEach(([k, v], j) => {
                    const fy = encabezado + (j + 0.5) * altoFila + 4;
                    const esRetorno = k === '↩ devuelve';
                    const color = esRetorno ? 'var(--ma-exito)' : 'var(--ma-texto)';
                    const nk = el('text', {
                        x: izq + 18, y: fy, 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)',
                        'font-size': p.tamano * 0.9, fill: esRetorno ? color : 'var(--ma-suave)', 'font-weight': esRetorno ? 700 : 400,
                    }, g);
                    ponerTexto(nk, k);
                    // El valor se achica si no entra, como en la caja de una variable.
                    const lugar = p.ancho * 0.58 - 18;
                    const tam = Math.min(p.tamano * 0.9, lugar / (Math.max(String(v).length, 1) * ANCHO_MONO));
                    const nv = el('text', {
                        x: izq + p.ancho - 16, y: fy, 'text-anchor': 'end', 'dominant-baseline': 'central',
                        'font-family': 'var(--ma-fuente-mono)', 'font-size': tam, fill: color, 'font-weight': 700,
                    }, g);
                    ponerTexto(nv, String(v));
                });
                if (actual) {
                    partes.actual = el('rect', { x: izq, y: 0, width: p.ancho, height: alto, rx: 10, fill: 'var(--ma-acento2)' }, g);
                }
                y += alto + separacion;
            });
            partes.clave = clave;
        }
        if (partes.actual) {
            poner(partes.actual, { opacity: p.destello * 0.25, visibility: p.destello > 0 ? null : 'hidden' });
        }
    },

    // Lo que ocupa, por si se le engancha una flecha.
    tamano(p) {
        const { altoFila, encabezado, separacion } = medidas(p);
        const alto = p.marcos.reduce((n, m) => n + encabezado + Math.max(m.filas.length + (m.retorno !== undefined ? 1 : 0), 1) * altoFila + 10 + separacion, 0);
        return { ancho: p.ancho, alto };
    },
});

function medidas(p) {
    return { altoFila: p.tamano * 1.5, encabezado: p.tamano * 1.75, separacion: p.tamano * 0.5 };
}
