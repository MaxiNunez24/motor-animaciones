import { posicionAbsoluta, aCoordenadasDe } from '../piezas/geometria.js';

// Los vínculos: piezas cuya posición sale de otras.
//
//   - `pegar`: una pieza se pega a un costado de otra. Si la otra se mueve o
//     crece, la pegada la acompaña: una etiqueta a la derecha de una caja, un
//     cartel debajo de una lista que va agregando elementos.
//   - Una `fila` (o columna) acomoda sus piezas una al lado de la otra: si una
//     crece, corre a las que vienen después.
//
// Se resuelven en cada instante, después de la línea de tiempo: el estado en t
// sigue dependiendo solo de t. Las flechas, que ya se enganchan al borde de
// las piezas, siguen a las pegadas y a las acomodadas sin hacer nada.

const LADOS = ['derecha', 'izquierda', 'arriba', 'abajo', 'centro'];

/**
 * Revisa los vínculos al compilar, para que un error se vea al armar la
 * escena y no en el cuadro 300.
 * @param {Record<string, { tipo: any, base: Record<string, any> }>} piezas
 */
export function revisarVinculos(piezas) {
    /** @type {Record<string, string>} */
    const enFila = {};
    for (const [id, p] of Object.entries(piezas)) {
        const pegar = p.base.pegar;
        if (pegar != null) {
            if (typeof pegar !== 'object' || typeof pegar.a !== 'string') {
                throw new Error(`"${id}" tiene pegar, pero le falta "a": el id de la pieza a la que se pega, por ejemplo pegar: { a: 'caja', lado: 'derecha' }.`);
            }
            if (!piezas[pegar.a]) throw new Error(`"${id}" se pega a "${pegar.a}", y no hay ninguna pieza que se llame así.`);
            if (pegar.lado != null && !LADOS.includes(pegar.lado)) {
                throw new Error(`"${id}" se pega del lado "${pegar.lado}": los lados son ${LADOS.join(', ')}.`);
            }
        }
        if (p.tipo.nombre === 'fila') {
            for (const hijo of p.base.piezas) {
                if (!piezas[hijo]) throw new Error(`La fila "${id}" lleva "${hijo}", y no hay ninguna pieza que se llame así.`);
                if (enFila[hijo]) throw new Error(`"${hijo}" está en dos filas: "${enFila[hijo]}" y "${id}".`);
                if (piezas[hijo].base.pegar != null) throw new Error(`"${hijo}" está en la fila "${id}" y además pegada a otra pieza: es una cosa o la otra.`);
                enFila[hijo] = id;
            }
        }
    }
    return enFila;
}

/** ¿Hace falta resolver algo? Si nadie usa vínculos, el estado sale como viene. */
export function hayVinculos(piezas) {
    return Object.values(piezas).some((p) => p.base.pegar != null || p.tipo.nombre === 'fila');
}

/**
 * Corrige, en el estado de un instante, la posición de las piezas pegadas y
 * acomodadas. Cambia `props` (el estado recién calculado, que es de este cuadro).
 * @param {Record<string, Record<string, any>>} props
 * @param {Record<string, any>} tipos
 * @param {Record<string, string>} enFila
 */
export function resolverVinculos(props, tipos, enFila) {
    const estado = { piezas: props };

    // 1. Lo que mide cada fila: la suma de lo que miden sus piezas. Las filas
    // de adentro primero (una fila puede llevar otra).
    const medidas = {};
    const medir = (id, camino = new Set()) => {
        if (medidas[id]) return medidas[id];
        if (camino.has(id)) throw new Error(`La fila "${id}" está dentro de sí misma.`);
        camino.add(id);
        const f = props[id];
        const horizontal = f.direccion !== 'vertical';
        let largo = 0;
        let ancho = 0;
        const tramos = f.piezas.map((hijo, k) => {
            if (tipos[hijo].nombre === 'fila') medir(hijo, camino);
            const t = posicionAbsoluta(hijo, estado, tipos);
            const [a, b] = horizontal ? [t.ancho, t.alto] : [t.alto, t.ancho];
            // El hueco antes de una pieza crece con ella: una que entra con la
            // escala de 0 a 1 no abre de golpe su separación.
            const hueco = k === 0 ? 0 : f.separacion * Math.min(Math.max(props[hijo].escala, 0), 1);
            largo += hueco + a;
            ancho = Math.max(ancho, b);
            return { hijo, largo: a, ancho: b, hueco };
        });
        f.ancho = horizontal ? largo : ancho;
        f.alto = horizontal ? ancho : largo;
        return (medidas[id] = { tramos, largo, ancho, horizontal });
    };
    for (const id of Object.keys(props)) if (tipos[id].nombre === 'fila') medir(id);

    // 2. Las posiciones, cada una después de las que necesita: la fila antes
    // que sus piezas, la pieza de referencia antes que la pegada, el
    // contenedor antes que lo de adentro.
    const listo = new Set();
    const resolver = (id, camino = new Set()) => {
        if (listo.has(id)) return;
        if (camino.has(id)) throw new Error(`"${id}" depende de sí misma dando una vuelta: revisá los pegar y las filas.`);
        camino.add(id);
        const p = props[id];
        if (p.dentro != null) resolver(p.dentro, camino);
        const fila = enFila[id];
        if (fila) {
            resolver(fila, camino);
            ubicar(id, lugarEnFila(fila, id), p);
        } else if (p.pegar != null) {
            resolver(p.pegar.a, camino);
            ubicar(id, lugarPegado(id, p.pegar), p);
        }
        listo.add(id);
    };

    // Dónde va el centro de una pieza de la fila, en la escena. Las medidas
    // están en unidades de la escena (la fila no se escala: se escalan sus piezas).
    const lugarEnFila = (fila, hijo) => {
        const m = medidas[fila];
        const f = posicionAbsoluta(fila, estado, tipos);
        const centroLargo = m.horizontal ? f.x : f.y;
        const centroAncho = m.horizontal ? f.y : f.x;
        let cursor = centroLargo - m.largo / 2;
        for (const t of m.tramos) {
            cursor += t.hueco;
            if (t.hijo === hijo) {
                const a = alineado(props[fila].alinear, centroAncho, m.ancho, t.ancho);
                const l = cursor + t.largo / 2;
                return m.horizontal ? { x: l, y: a } : { x: a, y: l };
            }
            cursor += t.largo;
        }
        return null;
    };

    const lugarPegado = (id, pegar) => {
        const otra = posicionAbsoluta(pegar.a, estado, tipos);
        const yo = posicionAbsoluta(id, estado, tipos);
        const sep = pegar.separacion ?? 0;
        const lado = pegar.lado ?? 'derecha';
        let x = otra.x;
        let y = otra.y;
        if (lado === 'derecha') x = otra.x + otra.ancho / 2 + sep + yo.ancho / 2;
        if (lado === 'izquierda') x = otra.x - otra.ancho / 2 - sep - yo.ancho / 2;
        if (lado === 'abajo') y = otra.y + otra.alto / 2 + sep + yo.alto / 2;
        if (lado === 'arriba') y = otra.y - otra.alto / 2 - sep - yo.alto / 2;
        // A lo largo del costado: centrada, o alineada con un borde.
        if (lado === 'derecha' || lado === 'izquierda') y = alineado(pegar.alinear, otra.y, otra.alto, yo.alto);
        if (lado === 'arriba' || lado === 'abajo') x = alineado(pegar.alinear, otra.x, otra.ancho, yo.ancho);
        return { x: x + (pegar.dx ?? 0), y: y + (pegar.dy ?? 0) };
    };

    // Pone el centro calculado (en la escena) en las coordenadas de la pieza,
    // mezclado con su posición propia según `pegado` (de 0 a 1): así se puede
    // despegar o pegar de a poco.
    const ubicar = (id, lugar, p) => {
        if (!lugar) return;
        const local = p.dentro != null ? { ...aCoordenadasDe(lugar, p.dentro, estado, tipos) } : { ...lugar };
        // `lugar` es el centro de lo que se ve; x, y puede no serlo (un texto alineado a la izquierda).
        const c = tipos[id].centro?.(p) ?? { x: 0, y: 0 };
        local.x -= c.x * p.escala;
        local.y -= c.y * p.escala;
        const k = Math.min(Math.max(p.pegado ?? 1, 0), 1);
        p.x += (local.x - p.x) * k;
        p.y += (local.y - p.y) * k;
    };

    for (const id of Object.keys(props)) resolver(id);
}

// El centro a lo ancho de un costado: 'centro', o pegado a 'inicio' (arriba o
// a la izquierda) o a 'fin'.
function alineado(alinear, centro, largoOtra, largoMio) {
    if (alinear === 'inicio') return centro - largoOtra / 2 + largoMio / 2;
    if (alinear === 'fin') return centro + largoOtra / 2 - largoMio / 2;
    return centro;
}
