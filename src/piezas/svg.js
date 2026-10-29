// Ayudas para armar SVG a mano, sin librerías.

const NS = 'http://www.w3.org/2000/svg';

/**
 * Crea un elemento SVG con sus atributos y lo cuelga de un padre.
 * @param {string} nombre
 * @param {Record<string, any>} [atributos]
 * @param {Element} [padre]
 * @returns {SVGElement}
 */
export function el(nombre, atributos = {}, padre) {
    const nodo = /** @type {SVGElement} */ (document.createElementNS(NS, nombre));
    poner(nodo, atributos);
    if (padre) padre.appendChild(nodo);
    return nodo;
}

/**
 * Cambia atributos, pero solo los que cambiaron de verdad.
 *
 * Tocar el DOM es lo más caro de una animación, y en las compus del CFP se
 * nota: si un atributo ya tiene ese valor, no se vuelve a escribir.
 * @param {Element} nodo
 * @param {Record<string, any>} atributos
 */
export function poner(nodo, atributos) {
    const previos = (/** @type {any} */ (nodo).__previos ??= {});
    for (const [k, v] of Object.entries(atributos)) {
        const valor = v == null ? null : typeof v === 'number' ? redondear(v) : String(v);
        if (previos[k] === valor) continue;
        previos[k] = valor;
        if (valor === null) nodo.removeAttribute(k);
        else nodo.setAttribute(k, valor);
    }
}

/** El texto de un nodo, si cambió. */
export function texto(nodo, valor) {
    if (nodo.__texto === valor) return;
    nodo.__texto = valor;
    nodo.textContent = valor;
}

// Dos decimales alcanzan para que no se note, y así un mismo instante da
// exactamente el mismo SVG (lo usan los tests de captura).
export function redondear(n) {
    return String(Math.round(n * 100) / 100);
}

/**
 * Una sombra suave, como filtro de SVG. No se usa "drop-shadow(...)" de CSS
 * en el atributo filter: Safari no lo entiende ahí y deja la forma sin dibujar.
 * @param {Element} padre donde va el <defs> con el filtro
 * @param {{ dy?: number, desenfoque?: number, opacidad?: number }} [opciones]
 * @returns {string} lo que va en filter="..."
 */
export function filtroSombra(padre, { dy = 8, desenfoque = 9, opacidad = 0.3 } = {}) {
    const id = idUnico('ma-sombra');
    const f = el('filter', { id, x: '-20%', y: '-20%', width: '140%', height: '160%' }, el('defs', {}, padre));
    el('feDropShadow', { dx: 0, dy, stdDeviation: desenfoque, 'flood-color': '#000', 'flood-opacity': opacidad }, f);
    return `url(#${id})`;
}

let contador = 0;
/** Un id que no se repite, para clipPath y similares. */
export function idUnico(prefijo) {
    contador += 1;
    return `${prefijo}-${contador}`;
}

/**
 * Dibuja unos renglones dentro de un <text>, centrados en vertical alrededor de
 * `y`. Reusa los <tspan> que ya hay: solo agrega o saca si cambia la cantidad.
 * @param {SVGElement} nodoTexto
 * @param {string[]} lineas
 * @param {{ x?: number, y?: number, tamano: number, interlineado?: number }} medidas
 */
export function renglones(nodoTexto, lineas, { x = 0, y = 0, tamano, interlineado = 1.25 }) {
    while (nodoTexto.childNodes.length > lineas.length) nodoTexto.lastChild.remove();
    while (nodoTexto.childNodes.length < lineas.length) el('tspan', {}, nodoTexto);
    const alto = tamano * interlineado;
    const primero = y - ((lineas.length - 1) * alto) / 2;
    lineas.forEach((linea, i) => {
        const tspan = /** @type {Element} */ (nodoTexto.childNodes[i]);
        poner(tspan, { x, y: primero + i * alto });
        // Un renglón vacío igual tiene que ocupar su lugar.
        texto(tspan, linea === '' ? ' ' : linea);
    });
}
