import { definirPieza } from '../../piezas/definir.js';
import { el, poner, texto as ponerTexto } from '../../piezas/svg.js';
import { aCss } from '../../nucleo/colores.js';

// La salida del programa: lo que muestra print() o console.log(). Se ve como
// una terminal, oscura en los dos temas, porque así la conocen.
export const consola = definirPieza({
    nombre: 'consola',
    predeterminados: {
        // Todo lo que se mostró hasta ahora. Se ven los últimos `renglones`.
        salida: '',
        ancho: 700,
        renglones: 4,
        tamano: 24,
        titulo: 'Salida',
        relleno: '#0f141b',
        color: '#e8ebf0',
    },
    colores: ['relleno', 'color'],

    crear(grupo) {
        return {
            fondo: el('rect', {}, grupo),
            titulo: el('text', { 'dominant-baseline': 'central', 'font-family': 'var(--ma-fuente-mono)' }, grupo),
            texto: el('text', { 'font-family': 'var(--ma-fuente-mono)', 'dominant-baseline': 'central', style: 'white-space: pre' }, grupo),
            lineas: [],
        };
    },

    actualizar(partes, p) {
        const { alto, altoLinea, encabezado } = medir(p);
        const izq = -p.ancho / 2;
        const arriba = -alto / 2;
        poner(partes.fondo, { x: izq, y: arriba, width: p.ancho, height: alto, rx: 12, fill: aCss(p.relleno), stroke: 'var(--ma-borde)', 'stroke-width': 2 });
        poner(partes.titulo, { x: izq + 18, y: arriba + encabezado / 2, 'font-size': p.tamano * 0.7, fill: '#8b95a5' });
        ponerTexto(partes.titulo, p.titulo);

        const todas = String(p.salida).replace(/\n$/, '').split('\n');
        const visibles = p.salida === '' ? [] : todas.slice(-p.renglones);
        while (partes.lineas.length < p.renglones) partes.lineas.push(el('tspan', {}, partes.texto));
        partes.lineas.forEach((tspan, i) => {
            poner(tspan, { x: izq + 18, y: arriba + encabezado + (i + 0.5) * altoLinea + 6 });
            ponerTexto(tspan, visibles[i] ?? '');
        });
        poner(partes.texto, { 'font-size': p.tamano, fill: aCss(p.color) });
    },

    tamano(p) {
        return { ancho: p.ancho, alto: medir(p).alto };
    },
});

function medir(p) {
    const altoLinea = p.tamano * 1.45;
    const encabezado = p.tamano * 1.4;
    return { altoLinea, encabezado, alto: encabezado + p.renglones * altoLinea + 12 };
}
