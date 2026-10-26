import { el, poner } from '../piezas/svg.js';
import { posicionAbsoluta } from '../piezas/geometria.js';

// El pintor es lo ÚNICO del motor que toca la página. Recibe un estado (lo que
// calculó la línea de tiempo para un instante) y lo deja dibujado. No decide
// nada: si el estado es el mismo, el dibujo es el mismo.

/**
 * @param {SVGSVGElement} svg
 * @param {ReturnType<import('../nucleo/linea.js').compilar>} escena
 */
export function crearPintor(svg, escena) {
    svg.replaceChildren();
    poner(svg, {
        viewBox: `0 0 ${escena.ancho} ${escena.alto}`,
        preserveAspectRatio: 'xMidYMid meet',
    });
    el('rect', { x: 0, y: 0, width: escena.ancho, height: escena.alto, fill: 'var(--ma-fondo)' }, svg);
    const raiz = el('g', {}, svg);

    const inicial = escena.estado(0);
    const ctx = { estado: inicial, tipos: escena.tipos };
    const nodos = {};
    for (const id of escena.ids) {
        const tipo = escena.tipos[id];
        const props = inicial.piezas[id];
        const padre = props.dentro != null ? nodos[props.dentro].contenido : raiz;
        const grupo = /** @type {SVGGElement} */ (el('g', { 'data-pieza': id }, padre));
        const partes = tipo.crear(grupo, props, ctx);
        nodos[id] = {
            tipo,
            grupo,
            partes,
            contenido: tipo.contenedor ? tipo.contenedor(partes) : null,
            ultimo: null,
        };
    }

    return {
        /** @param {ReturnType<ReturnType<import('../nucleo/linea.js').compilar>['estado']>} estado */
        pintar(estado) {
            ctx.estado = estado;
            for (const id of escena.ids) {
                const nodo = nodos[id];
                const p = estado.piezas[id];
                const invisible = p.opacidad <= 0;
                poner(nodo.grupo, {
                    transform: `translate(${r(p.x)} ${r(p.y)})` +
                        (p.rotacion ? ` rotate(${r(p.rotacion)})` : '') +
                        (p.escala !== 1 ? ` scale(${r(p.escala)})` : ''),
                    opacity: p.opacidad >= 1 ? null : r(p.opacidad),
                    // Lo invisible tampoco se lee en voz alta ni se puede tocar.
                    visibility: invisible ? 'hidden' : null,
                });
                // Una pieza que no cambió no se vuelve a dibujar: en una escena
                // de 40 piezas, en cada cuadro se mueven tres o cuatro.
                if (invisible || (!nodo.tipo.dependeDeOtras && iguales(nodo.ultimo, p))) continue;
                nodo.tipo.actualizar(nodo.partes, p, ctx);
                nodo.ultimo = p;
            }
        },
        /** Dónde quedó una pieza, en coordenadas de la escena. */
        posicion(id) {
            return posicionAbsoluta(id, ctx.estado, escena.tipos);
        },
    };
}

function iguales(a, b) {
    if (!a) return false;
    for (const k in b) if (a[k] !== b[k]) return false;
    return true;
}

function r(n) {
    return Math.round(n * 100) / 100;
}
