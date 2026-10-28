// Las cuentas de las piezas que no necesitan una página: dónde empieza una
// flecha, cómo se parte un texto en renglones. Están aparte del dibujo para que
// se puedan probar desde Node, con números, sin abrir un navegador.

/**
 * Dónde está una pieza en el dibujo entero, aunque esté dentro de otra (un
 * botón dentro de la pantalla de un celular). La rotación no se tiene en
 * cuenta: alcanza para enganchar flechas, que es para lo que se usa.
 * @param {string} id
 * @param {{ piezas: Record<string, any> }} estado
 * @param {Record<string, any>} tipos
 */
export function posicionAbsoluta(id, estado, tipos) {
    const p = estado.piezas[id];
    const tam = tipos[id].tamano?.(p) ?? { ancho: 0, alto: 0 };
    // Si x, y no es el centro de lo que se ve (un texto alineado a la
    // izquierda), la pieza dice dónde queda el centro.
    const c = tipos[id].centro?.(p) ?? { x: 0, y: 0 };
    let x = p.x + c.x * p.escala;
    let y = p.y + c.y * p.escala;
    let escala = p.escala;
    let padre = p.dentro;
    while (padre != null) {
        const pp = estado.piezas[padre];
        const o = tipos[padre].origenContenedor?.(pp) ?? { x: 0, y: 0, escala: 1 };
        x = pp.x + pp.escala * (o.x + o.escala * x);
        y = pp.y + pp.escala * (o.y + o.escala * y);
        escala *= pp.escala * o.escala;
        padre = pp.dentro;
    }
    return { x, y, ancho: tam.ancho * escala, alto: tam.alto * escala };
}

/**
 * Lo contrario de posicionAbsoluta: un punto del dibujo entero, en las
 * coordenadas de adentro de un contenedor (una cámara, un celular). Lo usan las
 * flechas que van dentro de una cámara para enganchar piezas de cualquier lado.
 * @param {{ x: number, y: number }} punto
 * @param {string} contenedor
 * @param {{ piezas: Record<string, any> }} estado
 * @param {Record<string, any>} tipos
 */
export function aCoordenadasDe(punto, contenedor, estado, tipos) {
    // Lo de adentro de un contenedor solo se corre y se escala (no se gira),
    // así que alcanza con saber dónde caen el (0, 0) y el (1, 0) de adentro.
    const donde = (x, y) => {
        const falso = { piezas: { ...estado.piezas, __punto: { x, y, escala: 1, dentro: contenedor } } };
        return posicionAbsoluta('__punto', falso, { ...tipos, __punto: {} });
    };
    const origen = donde(0, 0);
    const escala = donde(1, 0).x - origen.x || 1;
    return { x: (punto.x - origen.x) / escala, y: (punto.y - origen.y) / escala, escala };
}

/**
 * El camino de una flecha entre dos rectángulos (o dos puntos): una curva que
 * sale del borde del primero y llega al borde del segundo, no a su centro.
 * @param {{ x: number, y: number, ancho?: number, alto?: number }} a
 * @param {{ x: number, y: number, ancho?: number, alto?: number }} b
 * @param {number} curvatura 0 es recta; 0.3 se arquea un 30 % del largo (positivo: a la derecha del camino)
 * @param {number} separacion cuánto aire dejar entre la flecha y la pieza
 */
export function caminoFlecha(a, b, curvatura = 0, separacion = 0) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const largo = Math.hypot(dx, dy) || 1;
    const c = {
        x: (a.x + b.x) / 2 - (dy / largo) * curvatura * largo,
        y: (a.y + b.y) / 2 + (dx / largo) * curvatura * largo,
    };
    if (curvatura === 0) {
        // Recta: el punto de control va en el medio de las puntas, no de los
        // centros. Si una pieza es mucho más grande que la otra, el medio de
        // los centros puede caer adentro de la grande, y la punta quedaría
        // apuntando para atrás.
        const p0 = bordeHacia(a, b, separacion);
        const p1 = bordeHacia(b, a, separacion);
        return { p0, c: { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }, p1 };
    }
    // Cada punta sale en la dirección del punto de control: así una flecha
    // curva sale "derecha" de la pieza, como la dibujaría una persona.
    return { p0: bordeHacia(a, c, separacion), c, p1: bordeHacia(b, c, separacion) };
}

function bordeHacia(r, hacia, separacion) {
    const dx = hacia.x - r.x;
    const dy = hacia.y - r.y;
    const d = Math.hypot(dx, dy);
    if (d === 0) return { x: r.x, y: r.y };
    const ux = dx / d;
    const uy = dy / d;
    const mx = (r.ancho ?? 0) / 2;
    const my = (r.alto ?? 0) / 2;
    // Cuánto hay que andar desde el centro para tocar el borde del rectángulo.
    const hastaBorde = Math.min(
        ux === 0 ? Infinity : mx / Math.abs(ux),
        uy === 0 ? Infinity : my / Math.abs(uy),
    );
    const t = (Number.isFinite(hastaBorde) ? hastaBorde : 0) + separacion;
    return { x: r.x + ux * t, y: r.y + uy * t };
}

/** Un punto de la curva cuadrática, para u entre 0 y 1. */
export function puntoCurva({ p0, c, p1 }, u) {
    const v = 1 - u;
    return {
        x: v * v * p0.x + 2 * v * u * c.x + u * u * p1.x,
        y: v * v * p0.y + 2 * v * u * c.y + u * u * p1.y,
    };
}

/** Hacia dónde va la curva en u, en radianes. */
export function anguloCurva({ p0, c, p1 }, u) {
    const dx = 2 * (1 - u) * (c.x - p0.x) + 2 * u * (p1.x - c.x);
    const dy = 2 * (1 - u) * (c.y - p0.y) + 2 * u * (p1.y - c.y);
    return Math.atan2(dy, dx);
}

// Una curva cuadrática no avanza parejo: con u = 0,5 no siempre se está en la
// mitad del largo. Para que la flecha se DIBUJE a velocidad pareja, se mide el
// largo en tramos cortos y se busca qué u corresponde a cada fracción del largo.
const TRAMOS = 32;

export function medirCurva(curva) {
    const largos = [0];
    let anterior = curva.p0;
    for (let i = 1; i <= TRAMOS; i++) {
        const p = puntoCurva(curva, i / TRAMOS);
        largos.push(largos[i - 1] + Math.hypot(p.x - anterior.x, p.y - anterior.y));
        anterior = p;
    }
    return largos;
}

/** El u en el que ya se recorrió `fraccion` del largo total. */
export function uParaFraccion(largos, fraccion) {
    const total = largos[TRAMOS];
    if (fraccion <= 0 || total === 0) return 0;
    if (fraccion >= 1) return 1;
    const objetivo = fraccion * total;
    let i = 1;
    while (largos[i] < objetivo) i++;
    const tramo = largos[i] - largos[i - 1];
    const dentro = tramo === 0 ? 0 : (objetivo - largos[i - 1]) / tramo;
    return (i - 1 + dentro) / TRAMOS;
}

/** El pedazo de la curva que va de 0 a u, como otra curva (de Casteljau). */
export function cortarCurva({ p0, c, p1 }, u) {
    const c2 = { x: p0.x + (c.x - p0.x) * u, y: p0.y + (c.y - p0.y) * u };
    return { p0, c: c2, p1: puntoCurva({ p0, c, p1 }, u) };
}

/**
 * Parte un texto en renglones de a lo sumo `maxCaracteres`, sin cortar
 * palabras. Los saltos de línea que ya trae el texto se respetan.
 *
 * Se cuentan caracteres y no se mide el texto dibujado porque la medida
 * depende de la fuente que tenga cada compu: así la escena se parte igual en
 * todos lados, que es lo que importa para que sea determinista.
 * @param {string} texto
 * @param {number} maxCaracteres 0 o menos: no partir
 */
export function partirLineas(texto, maxCaracteres = 0) {
    const parrafos = String(texto ?? '').split('\n');
    if (!(maxCaracteres > 0)) return parrafos;
    const lineas = [];
    for (const parrafo of parrafos) {
        let actual = '';
        for (const palabra of parrafo.split(' ')) {
            const prueba = actual ? `${actual} ${palabra}` : palabra;
            if (largo(prueba) > maxCaracteres && actual) {
                lineas.push(actual);
                actual = palabra;
            } else {
                actual = prueba;
            }
        }
        lineas.push(actual);
    }
    return lineas;
}

/**
 * Lo que se ve de unos renglones cuando se está "escribiendo" el texto: los
 * primeros `escrito` (de 0 a 1) de todos los caracteres.
 *
 * Se cuentan con Array.from para que un emoji no quede cortado al medio.
 * @param {string[]} lineas
 * @param {number} escrito
 */
export function revelar(lineas, escrito) {
    if (escrito >= 1) return lineas;
    const total = lineas.reduce((n, l) => n + largo(l), 0);
    let quedan = Math.floor(total * Math.max(escrito, 0) + 1e-9);
    return lineas.map((l) => {
        const letras = Array.from(l);
        const visibles = letras.slice(0, quedan).join('');
        quedan = Math.max(quedan - letras.length, 0);
        return visibles;
    });
}

function largo(texto) {
    return Array.from(texto).length;
}

// Cuánto ocupa, más o menos, un caracter de la fuente de la interfaz, en
// proporción a su tamaño. Sirve para partir renglones y para estimar anchos.
export const ANCHO_LETRA = 0.55;
