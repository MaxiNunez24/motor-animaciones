import { definirPieza } from './definir.js';
import { el, poner, texto as ponerTexto } from './svg.js';
import { caminoFlecha, puntoCurva, anguloCurva } from './geometria.js';
import { aCss } from '../nucleo/colores.js';
import { limitar } from '../nucleo/interpolar.js';

// Un grafo: nodos unidos por aristas. Sirve para el dígrafo de una relación,
// la topología de una red, los estados de un autómata.
//
//     grafo({
//         nodos: ['a', 'b', 'c'],                     // o [{ id: 'a', texto: 'Router', x: -200, y: 0 }]
//         aristas: [['a', 'b'], ['b', 'a'], ['c', 'c', 'lazo']],
//         visibles: 0,                                // y se anima hasta aristas.length
//     })
//
// Sin posiciones, los nodos se reparten en un círculo. Un par que va y vuelve
// (a→b y b→a) se dibuja como dos curvas, para que se vean las dos; un par
// (a, a) es un lazo, que es lo que marca la reflexividad.
export const grafo = definirPieza({
    nombre: 'grafo',
    predeterminados: {
        // Ids, o { id, texto, x, y, icono }. x e y son relativas al centro del grafo.
        nodos: [],
        // [de, a] o [de, a, etiqueta], o { de, a, etiqueta }.
        aristas: [],
        dirigido: true,
        // El radio del círculo en el que se reparten los nodos sin posición.
        radio: 230,
        radioNodo: 38,
        tamano: 28,
        tamanoEtiqueta: 20,
        // Cuántas aristas se ven, en orden: 2.5 es dos y la tercera dibujándose.
        visibles: Infinity,
        // Cuántos nodos se ven, en orden.
        nodosVisibles: Infinity,
        // Ids de nodos y "de→a" de aristas para destacar.
        resaltar: [],
        // Ids de nodos y "de→a" de aristas para apagar (lo que no importa ahora).
        apagar: [],
        relleno: 'superficie',
        borde: 'acento',
        color: 'texto',
        colorArista: 'suave',
        colorResaltado: 'acento2',
        grosor: 3.5,
    },
    colores: ['relleno', 'borde', 'color', 'colorArista', 'colorResaltado'],

    validar(p) {
        const ids = new Set(normalizarNodos(p).map((n) => n.id));
        for (const a of normalizarAristas(p.aristas)) {
            for (const extremo of [a.de, a.a]) {
                if (!ids.has(extremo)) throw new Error(`La arista ${a.de}→${a.a} usa "${extremo}", que no es ningún nodo del grafo.`);
            }
        }
    },

    crear(grupo) {
        return { aristas: el('g', { fill: 'none', 'stroke-linecap': 'round' }, grupo), nodos: el('g', {}, grupo) };
    },

    actualizar(partes, p) {
        const nodos = normalizarNodos(p);
        const aristas = normalizarAristas(p.aristas);
        const donde = Object.fromEntries(nodos.map((n) => [n.id, n]));
        const resaltar = new Set(p.resaltar);
        const apagar = new Set(p.apagar);

        reusar(partes.aristas, aristas.length, (g) => {
            el('path', {}, g);
            el('path', {}, g);
            el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 600, 'paint-order': 'stroke', stroke: 'var(--ma-fondo)', 'stroke-width': 5 }, g);
        });
        aristas.forEach((a, i) => {
            const g = /** @type {Element} */ (partes.aristas.childNodes[i]);
            const [linea, punta, etiqueta] = /** @type {Element[]} */ ([...g.childNodes]);
            const avance = limitar(p.visibles - i, 0, 1);
            const clave = `${a.de}→${a.a}`;
            const color = resaltar.has(clave) ? p.colorResaltado : p.colorArista;
            const grosor = resaltar.has(clave) ? p.grosor * 1.5 : p.grosor;
            poner(g, { opacity: apagar.has(clave) ? 0.25 : 1, visibility: avance > 0 ? null : 'hidden' });

            let d;
            let tip;
            let ang;
            let medio;
            if (a.de === a.a) {
                // Un lazo: un círculo chico afuera del nodo, del lado opuesto al centro.
                const n = donde[a.de];
                const hacia = Math.atan2(n.y, n.x) || -Math.PI / 2;
                const R = p.radioNodo * 0.62;
                const cx = n.x + Math.cos(hacia) * (p.radioNodo + R * 0.55);
                const cy = n.y + Math.sin(hacia) * (p.radioNodo + R * 0.55);
                // Se dibuja de a poco: un arco de 0 a 300° (el resto lo tapa el nodo).
                const inicio = hacia + Math.PI * 0.75;
                const fin = inicio + Math.PI * 1.5 * avance;
                const x0 = cx + Math.cos(inicio) * R;
                const y0 = cy + Math.sin(inicio) * R;
                const x1 = cx + Math.cos(fin) * R;
                const y1 = cy + Math.sin(fin) * R;
                d = `M${r(x0)} ${r(y0)}A${r(R)} ${r(R)} 0 ${fin - inicio > Math.PI ? 1 : 0} 1 ${r(x1)} ${r(y1)}`;
                tip = { x: x1, y: y1 };
                ang = fin + Math.PI / 2;
                medio = { x: cx + Math.cos(hacia) * (R + p.tamanoEtiqueta * 0.8), y: cy + Math.sin(hacia) * (R + p.tamanoEtiqueta * 0.8) };
            } else {
                const de = donde[a.de];
                const ha = donde[a.a];
                // Si también existe la vuelta, cada una se arquea para su lado.
                const vuelta = aristas.some((b) => b.de === a.a && b.a === a.de);
                const curva = caminoFlecha(
                    { x: de.x, y: de.y, ancho: 0, alto: 0 },
                    { x: ha.x, y: ha.y, ancho: 0, alto: 0 },
                    vuelta ? 0.18 : 0,
                    0,
                );
                // Se corta en el borde de los círculos (no de un rectángulo).
                const largo = Math.hypot(ha.x - de.x, ha.y - de.y) || 1;
                const u0 = Math.min(0.45, (p.radioNodo + 4) / largo);
                const u1 = 1 - Math.min(0.45, (p.radioNodo + 6) / largo);
                const uFin = u0 + (u1 - u0) * avance;
                const pasos = 16;
                d = '';
                for (let k = 0; k <= pasos; k++) {
                    const q = puntoCurva(curva, u0 + ((uFin - u0) * k) / pasos);
                    d += `${k === 0 ? 'M' : 'L'}${r(q.x)} ${r(q.y)}`;
                }
                tip = puntoCurva(curva, uFin);
                ang = anguloCurva(curva, uFin);
                const m = puntoCurva(curva, 0.5);
                const am = anguloCurva(curva, 0.5);
                medio = { x: m.x + Math.sin(am) * p.tamanoEtiqueta * 0.9, y: m.y - Math.cos(am) * p.tamanoEtiqueta * 0.9 };
            }
            poner(linea, { d, stroke: aCss(color), 'stroke-width': grosor });
            const L = grosor * 3.4;
            const W = grosor * 2.2;
            const bx = tip.x - Math.cos(ang) * L;
            const by = tip.y - Math.sin(ang) * L;
            poner(punta, {
                d: `M${r(tip.x)} ${r(tip.y)}L${r(bx - Math.sin(ang) * W)} ${r(by + Math.cos(ang) * W)}L${r(bx + Math.sin(ang) * W)} ${r(by - Math.cos(ang) * W)}Z`,
                fill: aCss(color),
                visibility: p.dirigido && avance > 0.3 ? null : 'hidden',
            });
            poner(etiqueta, {
                x: medio.x, y: medio.y, 'font-size': p.tamanoEtiqueta, fill: aCss(color),
                visibility: a.etiqueta && avance > 0.6 ? null : 'hidden',
            });
            ponerTexto(etiqueta, a.etiqueta);
        });

        reusar(partes.nodos, nodos.length, (g) => {
            el('circle', { fill: 'none', 'stroke-width': 6 }, g);
            el('circle', {}, g);
            el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
            el('text', { 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-weight': 600 }, g);
        });
        nodos.forEach((n, i) => {
            const g = /** @type {Element} */ (partes.nodos.childNodes[i]);
            const [anillo, circulo, icono, rotulo] = /** @type {Element[]} */ ([...g.childNodes]);
            const visible = limitar(p.nodosVisibles - i, 0, 1);
            const destacado = resaltar.has(n.id);
            poner(g, { opacity: visible * (apagar.has(n.id) ? 0.3 : 1), visibility: visible > 0 ? null : 'hidden' });
            poner(anillo, { cx: n.x, cy: n.y, r: p.radioNodo + 9, stroke: aCss(p.colorResaltado), visibility: destacado ? null : 'hidden' });
            poner(circulo, {
                cx: n.x, cy: n.y, r: p.radioNodo, fill: aCss(p.relleno),
                stroke: aCss(destacado ? p.colorResaltado : p.borde), 'stroke-width': 3.5,
            });
            poner(icono, { x: n.x, y: n.y, 'font-size': p.radioNodo * 1.05, visibility: n.icono ? null : 'hidden' });
            ponerTexto(icono, n.icono ?? '');
            // Con ícono, el nombre va abajo del círculo; sin ícono, adentro.
            poner(rotulo, {
                x: n.x, y: n.icono ? n.y + p.radioNodo + p.tamano * 0.75 : n.y,
                'font-size': n.icono ? p.tamano * 0.8 : p.tamano, fill: aCss(p.color),
            });
            ponerTexto(rotulo, n.texto);
        });
    },

    tamano(p) {
        const nodos = normalizarNodos(p);
        const xs = nodos.map((n) => Math.abs(n.x));
        const ys = nodos.map((n) => Math.abs(n.y));
        return { ancho: 2 * (Math.max(0, ...xs) + p.radioNodo), alto: 2 * (Math.max(0, ...ys) + p.radioNodo) };
    },
});

/** Los nodos con su posición: la que traen, o repartidos en un círculo (empezando arriba). */
export function normalizarNodos(p) {
    const lista = p.nodos.map((n) => (typeof n === 'object' ? { ...n, id: String(n.id) } : { id: String(n) }));
    return lista.map((n, i) => {
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / Math.max(lista.length, 1);
        return {
            id: n.id,
            texto: n.texto ?? n.id,
            icono: n.icono,
            x: n.x ?? (lista.length > 1 ? Math.cos(ang) * p.radio : 0),
            y: n.y ?? (lista.length > 1 ? Math.sin(ang) * p.radio : 0),
        };
    });
}

/** @param {any[]} aristas */
export function normalizarAristas(aristas) {
    return aristas.map((a) => (Array.isArray(a)
        ? { de: String(a[0]), a: String(a[1]), etiqueta: a[2] ?? '' }
        : { de: String(a.de), a: String(a.a), etiqueta: a.etiqueta ?? '' }));
}

// Deja `cuantos` hijos en un grupo: agrega los que faltan (armados con `armar`)
// y saca los que sobran. Los que ya estaban se reusan.
function reusar(grupo, cuantos, armar) {
    while (grupo.childNodes.length > cuantos) grupo.lastChild.remove();
    while (grupo.childNodes.length < cuantos) armar(el('g', {}, grupo));
}

function r(v) {
    return Math.round(v * 100) / 100;
}
