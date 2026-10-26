import { definirPieza } from '../../piezas/definir.js';
import { el, poner, texto as ponerTexto } from '../../piezas/svg.js';
import { aCss } from '../../nucleo/colores.js';
import { ANCHO_MONO } from './codigo.js';

// Una variable como una caja con su nombre afuera, como una etiqueta. Es la
// imagen que se usa en el curso: la variable no "es" el valor, lo guarda, y
// cuando se le asigna otro, el de antes se va.
export const variable = definirPieza({
    nombre: 'variable',
    predeterminados: {
        nombre: 'x',
        // El valor como se escribe en el código: 0, 'Ana', [1, 2], True.
        valor: '',
        // Lo que dice type(): int, str... Vacío: no se muestra.
        tipoDato: '',
        ancho: 220,
        alto: 80,
        tamano: 30,
        relleno: 'superficie',
        borde: 'acento',
        // De 0 a 1: se ilumina cuando cambia, para que el ojo vaya ahí.
        destello: 0,
    },
    colores: ['relleno', 'borde'],

    crear(grupo) {
        return {
            nombre: el('text', { 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)', 'font-weight': 700 }, grupo),
            tipo: el('text', { 'text-anchor': 'end', 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)' }, grupo),
            caja: el('rect', {}, grupo),
            destello: el('rect', { fill: 'var(--ma-acento)' }, grupo),
            valor: el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)' }, grupo),
        };
    },

    actualizar(partes, p) {
        const w = p.ancho;
        const h = p.alto;
        const etiqueta = p.tamano * 0.75;
        poner(partes.nombre, { x: -w / 2 + 4, y: -h / 2 - etiqueta * 0.8, 'font-size': etiqueta, fill: 'var(--ma-texto)' });
        ponerTexto(partes.nombre, p.nombre);
        poner(partes.tipo, {
            x: w / 2 - 4, y: -h / 2 - etiqueta * 0.8, 'font-size': etiqueta * 0.85, fill: 'var(--ma-suave)',
            visibility: p.tipoDato ? null : 'hidden',
        });
        ponerTexto(partes.tipo, p.tipoDato);
        poner(partes.caja, {
            x: -w / 2, y: -h / 2, width: w, height: h, rx: 10,
            fill: aCss(p.relleno), stroke: aCss(p.borde), 'stroke-width': 3,
        });
        poner(partes.destello, {
            x: -w / 2, y: -h / 2, width: w, height: h, rx: 10,
            opacity: p.destello * 0.3, visibility: p.destello > 0 ? null : 'hidden',
        });
        // Si el valor no entra, se achica la letra en vez de cortarlo: un valor
        // cortado es un valor mentiroso.
        const largo = Array.from(String(p.valor)).length || 1;
        const tamano = Math.min(p.tamano, (w - 24) / (largo * ANCHO_MONO));
        poner(partes.valor, { 'font-size': tamano, fill: 'var(--ma-texto)' });
        ponerTexto(partes.valor, String(p.valor));
    },

    tamano: (p) => ({ ancho: p.ancho, alto: p.alto }),
});
