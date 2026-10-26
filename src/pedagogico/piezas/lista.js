import { definirPieza } from '../../piezas/definir.js';
import { el, poner, texto as ponerTexto } from '../../piezas/svg.js';
import { aCss } from '../../nucleo/colores.js';
import { ANCHO_MONO } from './codigo.js';

// Una lista como una fila de casilleros numerados desde 0, con una flechita
// debajo del elemento que se está mirando. Es lo que hace un `for`: ir de un
// casillero al siguiente.
export const lista = definirPieza({
    nombre: 'lista',
    predeterminados: {
        nombre: '',
        // Los elementos como se escriben en el código: ['4', '8', '15'].
        items: [],
        celda: 90,
        alto: 76,
        tamano: 28,
        // El índice del elemento señalado (-1: ninguno). Con decimales, la
        // flechita va de un casillero al otro.
        senalar: -1,
        // Lo que se escribe debajo de la flechita, por ejemplo la variable del for.
        puntero: '',
        indices: true,
        relleno: 'superficie',
        borde: 'acento',
        destello: 0,
    },
    colores: ['relleno', 'borde'],

    crear(grupo) {
        return {
            grupo,
            forma: -1,
            nombre: el('text', { 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)', 'font-weight': 700 }, grupo),
            celdas: el('g', {}, grupo),
            flecha: el('g', {}, grupo),
        };
    },

    actualizar(partes, p) {
        const n = p.items.length;
        const w = Math.max(n, 1) * p.celda;
        const izq = -w / 2;
        const h = p.alto;
        const etiqueta = p.tamano * 0.75;
        poner(partes.nombre, { x: izq + 4, y: -h / 2 - etiqueta * 0.8, 'font-size': etiqueta, fill: 'var(--ma-texto)' });
        ponerTexto(partes.nombre, p.nombre);

        if (partes.forma !== n) {
            partes.celdas.replaceChildren();
            partes.filas = Array.from({ length: n }, () => ({
                caja: el('rect', {}, partes.celdas),
                valor: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)' }, partes.celdas),
                indice: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)' }, partes.celdas),
            }));
            // Una lista vacía también se ve: un casillero punteado, sin nada.
            partes.vacia = el('rect', { 'stroke-dasharray': '8 6', fill: 'none' }, partes.celdas);
            partes.forma = n;
        }
        poner(partes.vacia, {
            x: izq, y: -h / 2, width: w, height: h, rx: 8, stroke: aCss(p.borde), 'stroke-width': 2,
            visibility: n === 0 ? null : 'hidden',
        });

        const senalada = Math.round(p.senalar);
        partes.filas.forEach((fila, i) => {
            const x = izq + i * p.celda;
            const activa = i === senalada;
            poner(fila.caja, {
                x, y: -h / 2, width: p.celda, height: h,
                fill: activa ? `color-mix(in srgb, ${aCss(p.borde)} 22%, ${aCss(p.relleno)})` : aCss(p.relleno),
                stroke: aCss(p.borde), 'stroke-width': 3,
            });
            const texto = String(p.items[i]);
            const tamano = Math.min(p.tamano, (p.celda - 12) / (Array.from(texto).length * ANCHO_MONO));
            poner(fila.valor, { x: x + p.celda / 2, y: 0, 'font-size': tamano, fill: 'var(--ma-texto)', 'font-weight': activa ? 700 : 400 });
            ponerTexto(fila.valor, texto);
            poner(fila.indice, {
                x: x + p.celda / 2, y: h / 2 + p.tamano * 0.55, 'font-size': p.tamano * 0.6, fill: 'var(--ma-suave)',
                visibility: p.indices ? null : 'hidden',
            });
            ponerTexto(fila.indice, String(i));
        });

        // La flechita, debajo de los índices.
        const visible = p.senalar >= 0 && n > 0;
        const xf = izq + (Math.min(Math.max(p.senalar, 0), n - 1) + 0.5) * p.celda;
        const yf = h / 2 + p.tamano * 1.1;
        if (!partes.punta) {
            partes.punta = el('path', {}, partes.flecha);
            partes.etiqueta = el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)', 'font-weight': 700 }, partes.flecha);
        }
        poner(partes.flecha, { transform: `translate(${Math.round(xf * 100) / 100} ${yf})`, visibility: visible ? null : 'hidden' });
        poner(partes.punta, { d: 'M0 0 L-12 18 L12 18 Z', fill: aCss(p.borde) });
        poner(partes.etiqueta, { y: 18 + p.tamano * 0.6, 'font-size': p.tamano * 0.75, fill: aCss(p.borde), visibility: p.puntero ? null : 'hidden' });
        ponerTexto(partes.etiqueta, p.puntero);
    },

    tamano: (p) => ({ ancho: Math.max(p.items.length, 1) * p.celda, alto: p.alto }),
});
