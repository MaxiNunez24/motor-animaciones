// ¿Algo tapa a algo? Las cuentas para saber, antes de mirar la escena, si un
// subtítulo va a caer encima de un texto, o si dos textos se pisan.
//
// Como el estado depende solo de t, no hace falta reproducir nada: se le
// pregunta a la escena cómo está cada cuarto de segundo y se comparan los
// rectángulos de lo que se ve. Los tamaños son estimados (los de las piezas,
// los mismos que usan las flechas), así que es un aviso, no una medición al
// pixel: alcanza para encontrar los choques de verdad.
//
// Lo usan tres cosas: los subtítulos de pantalla completa (para esquivar),
// el atributo `revisar` del componente (avisa en la consola) y
// herramientas/revisar.js (revisa todos los ejemplos de una vez).

import { posicionAbsoluta } from './geometria.js';

/**
 * Los rectángulos de lo que se ve en el instante t, en coordenadas de la
 * escena. Quedan afuera los contenedores (una cámara, un celular: lo que
 * importa es lo que llevan adentro), las piezas sin tamaño (las flechas) y las
 * enormes, que son fondos (un plano entero, una banda).
 * @param {any} compilada lo que devuelve compilar()
 * @param {number} t
 * @returns {{ id: string, tipo: string, texto: boolean, x0: number, y0: number, x1: number, y1: number }[]}
 */
export function cajasEn(compilada, t) {
    const estado = compilada.estado(t);
    const tipos = compilada.tipos;
    const area = compilada.ancho * compilada.alto;
    const cajas = [];
    // Las cajas del color del fondo (un velo de 0,6 para arriba) tapan lo que se dibujó
    // antes debajo de ellas (un cartel de cierre sobre la escena).
    const tapas = [];
    compilada.ids.forEach((id, orden) => {
        const p = estado.piezas[id];
        if (tipos[id].nombre !== 'caja' || p.relleno !== 'fondo' || p.opacidad < 0.6 || !seVe(id, estado)) return;
        const r = posicionAbsoluta(id, estado, tipos);
        tapas.push({ orden, x0: r.x - r.ancho / 2, y0: r.y - r.alto / 2, x1: r.x + r.ancho / 2, y1: r.y + r.alto / 2 });
    });
    const tapada = (orden, c) => tapas.some((t) => t.orden > orden && c.x0 >= t.x0 - 1 && c.y0 >= t.y0 - 1 && c.x1 <= t.x1 + 1 && c.y1 <= t.y1 + 1);
    for (const [orden, id] of compilada.ids.entries()) {
        const tipo = tipos[id];
        const p = estado.piezas[id];
        if (!tipo.tamano || tipo.contenedor || !seVe(id, estado)) continue;
        // Una caja sin texto pintada del color del fondo no se ve: es una
        // banda para tapar algo, no algo que mirar.
        if (tipo.nombre === 'caja' && !p.texto && !p.icono && p.relleno === 'fondo' && (p.borde === 'ninguno' || !(p.grosorBorde > 0))) continue;
        const r = posicionAbsoluta(id, estado, tipos);
        if (!(r.ancho > 0 && r.alto > 0) || r.ancho * r.alto > area * 0.35) continue;
        let caja = { x0: r.x - r.ancho / 2, y0: r.y - r.alto / 2, x1: r.x + r.ancho / 2, y1: r.y + r.alto / 2 };
        // Lo que va dentro de una cámara o de un celular se ve solo por su
        // ventana: lo que queda afuera está recortado.
        for (let padre = p.dentro; padre != null && caja; padre = estado.piezas[padre].dentro) {
            const v = posicionAbsoluta(padre, estado, tipos);
            caja = recortar(caja, { x0: v.x - v.ancho / 2, y0: v.y - v.alto / 2, x1: v.x + v.ancho / 2, y1: v.y + v.alto / 2 });
        }
        if (!caja || tapada(orden, caja)) continue;
        cajas.push({
            id,
            tipo: tipo.nombre,
            // Lo que se lee: si se tapa, se pierde algo que hay que leer.
            texto: ['texto', 'contador'].includes(tipo.nombre) || (tipo.nombre === 'caja' && !!p.texto),
            ...caja,
        });
    }
    return cajas;
}

function recortar(a, b) {
    const c = { x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) };
    return c.x1 - c.x0 > 1 && c.y1 - c.y0 > 1 ? c : null;
}

// Se ve si ni ella ni lo que la contiene están apagados. Lo que quedó muy
// tenue (menos de un 30 %) es fondo a propósito: que algo lo tape no importa.
function seVe(id, estado) {
    let actual = id;
    let opacidad = 1;
    while (actual != null) {
        const p = estado.piezas[actual];
        opacidad *= p.opacidad;
        if (opacidad < 0.3 || p.trazo <= 0) return false;
        actual = p.dentro;
    }
    return true;
}

/** Cuánto se pisan dos rectángulos (el área en común). */
export function cruce(a, b) {
    const ancho = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
    const alto = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
    return ancho > 0 && alto > 0 ? ancho * alto : 0;
}

/**
 * Qué tapa un rectángulo (el lugar de un subtítulo) entre dos instantes.
 * Devuelve cuánto (el peor momento, en fracción del subtítulo) y qué piezas.
 * @param {any} compilada
 * @param {{ x0: number, y0: number, x1: number, y1: number }} zona
 * @param {number} desde
 * @param {number} hasta
 * @param {number} [paso]
 */
export function queTapa(compilada, zona, desde, hasta, paso = 0.25) {
    return tapaEn(muestrear(compilada, desde, hasta, paso), zona);
}

// Lo que se ve en cada instante de un tramo: se calcula una vez y se prueba
// contra muchos lugares posibles (buscar lugar es probar cientos).
function muestrear(compilada, desde, hasta, paso = 0.25) {
    const muestras = [];
    for (let t = desde; t < hasta + 1e-9; t += paso) muestras.push(cajasEn(compilada, Math.min(t, hasta - 1e-6)));
    return muestras;
}

// `roce`: qué parte de la pieza (o de la zona) tiene que quedar tapada para
// que cuente. Para una franja a lo ancho, un roce de unos pixeles no importa;
// para una columna, nada: si no, queda montada sobre el borde de lo de al lado.
function tapaEn(muestras, zona, roce = 0.12) {
    const areaZona = (zona.x1 - zona.x0) * (zona.y1 - zona.y0) || 1;
    let peor = 0;
    const piezas = new Set();
    for (const cajas of muestras) {
        let suma = 0;
        for (const c of cajas) {
            const comun = cruce(zona, c);
            // Un roce de unos pixeles no tapa nada: cuenta si se pierde un
            // pedazo de verdad de la pieza (o del subtítulo).
            if (comun > roce * Math.min(areaZona, (c.x1 - c.x0) * (c.y1 - c.y0))) {
                suma += comun;
                piezas.add(c.id);
            }
        }
        peor = Math.max(peor, suma / areaZona);
    }
    return { peor, piezas: [...piezas] };
}

/**
 * El lugar que suele ocupar un subtítulo en pantalla completa, con un
 * renglón o dos, en coordenadas de la escena.
 * @param {any} compilada
 * @param {'abajo' | 'arriba'} donde
 * @param {number} [renglones]
 */
export function zonaDeSubtitulo(compilada, donde, renglones = 2) {
    const { ancho, alto } = compilada;
    // Un renglón de subtítulo en pantalla completa mide un 6 % del alto, y
    // el margen hasta el borde, un 2,5 %.
    const h = alto * 0.06 * renglones;
    const m = alto * 0.025;
    const y0 = donde === 'abajo' ? alto - m - h : m;
    return { x0: ancho * 0.12, x1: ancho * 0.88, y0, y1: y0 + h };
}

/**
 * Dónde poner un subtítulo para que no tape nada mientras dura. Prueba
 * franjas a todo lo ancho, de abajo para arriba; y también más angostas
 * (con más renglones), contra el costado izquierdo, al medio o contra el
 * derecho: al final de un programa paso a paso no hay ninguna franja libre a
 * lo ancho, pero sí una columna. De los lugares libres elige el que menos se
 * aleja de lo de siempre (abajo, ancho, al medio). Si no hay ninguno, el que
 * menos tapa (abajo, salvo que otro tape mucho menos).
 * @param {any} compilada
 * @param {{ x0: number, y0: number, x1: number, y1: number }} zona su lugar de siempre, en coordenadas de la escena
 * @param {number} desde
 * @param {number} hasta
 * @param {{ renglon?: number, relleno?: number, anchos?: number[], altoPara?: (ancho: number) => number, aire?: number }} [opciones]
 *     renglon y relleno (en unidades de la escena): para estimar cuánto crece
 *     de alto al angostarlo; `altoPara`, si quien llama lo puede medir de
 *     verdad (el componente lo mide en la página). `anchos`: qué fracciones
 *     del ancho probar. `aire`: cuánto lugar dejar alrededor (por defecto, un
 *     1 % de la escena), para que no quede pegado a lo que esquiva.
 * @returns {{ subir: number, correr: number, ancho: number, alto: number, libre: boolean, tapa: string[] }}
 *     subir: cuánto más arriba; correr: cuánto a la derecha (negativo: a la
 *     izquierda); ancho y alto: los que va a tener. Todo en unidades de la escena.
 */
export function lugarLibre(compilada, zona, desde, hasta, opciones = {}) {
    const anchoBase = zona.x1 - zona.x0;
    const altoBase = zona.y1 - zona.y0;
    const relleno = opciones.relleno ?? 0;
    const renglon = opciones.renglon ?? altoBase;
    const anchos = opciones.anchos ?? [1, 0.75, 0.6, 0.45];
    const margen = compilada.ancho * 0.02;
    const centro = (zona.x0 + zona.x1) / 2;
    const paso = compilada.alto * 0.03;
    const muestras = muestrear(compilada, desde, hasta);
    const aire = opciones.aire ?? compilada.ancho * 0.01;
    const conAire = (z) => ({ x0: z.x0 - aire, x1: z.x1 + aire, y0: z.y0 - aire, y1: z.y1 + aire });
    // Al angostarlo, lo escrito ocupa más renglones (lo mismo de texto en menos ancho).
    const altoCon = (f) => {
        if (f === 1) return altoBase;
        if (opciones.altoPara) return opciones.altoPara(anchoBase * f);
        const renglones = Math.max(1, Math.round((altoBase - relleno) / renglon));
        return relleno + Math.ceil(renglones / f - 1e-9) * renglon;
    };
    let elegido = null;
    for (const f of anchos) {
        const ancho = anchoBase * f;
        const alto = altoCon(f);
        if (ancho < compilada.ancho * 0.2) continue;
        // A lo ancho, al medio; angosto, también contra cada costado.
        const xs = f === 1 ? [centro] : [centro, compilada.ancho - margen - ancho / 2, margen + ancho / 2];
        for (const [k, x] of xs.entries()) {
            const max = Math.max(0, zona.y1 - alto - compilada.alto * 0.02);
            for (let subir = 0; subir <= max + 1e-9; subir += paso) {
                const z = { x0: x - ancho / 2, x1: x + ancho / 2, y0: zona.y1 - subir - alto, y1: zona.y1 - subir };
                if (f === 1 ? tapaEn(muestras, z).peor >= 0.02 : tapaEn(muestras, conAire(z), 0).peor > 0) continue;
                // Lo que cuesta alejarse de lo de siempre: subir, angostarlo y
                // correrlo a un costado. Subir poco y angostarlo un poco gana
                // a irse arriba de todo.
                const costo = subir / compilada.alto + (1 - f) * 0.6 + (k > 0 ? 0.05 : 0);
                if (!elegido || costo < elegido.costo) elegido = { costo, subir, correr: x - centro, ancho, alto };
                break;
            }
        }
    }
    if (elegido) return { subir: elegido.subir, correr: elegido.correr, ancho: elegido.ancho, alto: elegido.alto, libre: true, tapa: [] };
    // Sin lugar libre: abajo, que es donde se lo busca, salvo que otro lugar
    // a lo ancho tape mucho menos.
    let mejor = null;
    const max = Math.max(0, zona.y0 - compilada.alto * 0.02);
    for (let subir = 0; subir <= max + 1e-9; subir += paso) {
        const r = tapaEn(muestras, { ...zona, y0: zona.y0 - subir, y1: zona.y1 - subir });
        if (!mejor || r.peor < mejor.peor - 1e-9) mejor = { subir, peor: r.peor, tapa: r.piezas };
    }
    const abajo = tapaEn(muestras, zona);
    const sube = mejor && mejor.peor < abajo.peor * 0.5;
    return { subir: sube ? mejor.subir : 0, correr: 0, ancho: anchoBase, alto: altoBase, libre: false, tapa: sube ? mejor.tapa : abajo.piezas };
}

/**
 * Dónde está lo que conviene mirar en el instante t: lo último que cambió (y
 * que se ve). Si esa pieza dice dónde está lo suyo (un código, su línea
 * marcada), ahí; si no, su centro. Lo usa la lupa de quien mira para arrancar
 * sobre algo y no en el medio, que en muchas escenas es un hueco.
 * @param {any} compilada
 * @param {number} t
 * @returns {{ x: number, y: number, id: string } | null}
 */
export function focoEn(compilada, t) {
    const estado = compilada.estado(t);
    const visibles = new Map(cajasEn(compilada, t).map((c) => [c.id, c]));
    const igual = (a, b) => a === b || (typeof a === 'object' && JSON.stringify(a) === JSON.stringify(b));
    const cambio = (antes) => [...visibles.keys()].filter((id) => {
        const p = estado.piezas[id];
        const q = antes.piezas[id];
        return Object.keys(p).some((k) => typeof p[k] !== 'function' && !igual(p[k], q[k]));
    });
    let candidatas = [];
    // Hacia atrás, de a cuarto de segundo, hasta encontrar algo que cambió.
    for (let dt = 0.25; dt <= 15 && t - dt >= -0.25 && !candidatas.length; dt += 0.25) {
        candidatas = cambio(compilada.estado(Math.max(0, t - dt)));
    }
    if (!candidatas.length) candidatas = [...visibles.keys()];
    if (!candidatas.length) return null;
    // De las que cambiaron juntas: la que sabe dónde está lo suyo; si no, la más chica (la más precisa).
    const area = (id) => { const c = visibles.get(id); return (c.x1 - c.x0) * (c.y1 - c.y0); };
    const id = candidatas.find((x) => compilada.tipos[x].foco?.(estado.piezas[x])) ?? candidatas.sort((a, b) => area(a) - area(b))[0];
    const p = estado.piezas[id];
    const propio = compilada.tipos[id].foco?.(p);
    if (propio) {
        // El foco viene en las coordenadas de la pieza (como su x e y): se pasa al dibujo entero.
        const falso = { piezas: { ...estado.piezas, __foco: { x: propio.x, y: propio.y, escala: 1, dentro: p.dentro } } };
        const r = posicionAbsoluta('__foco', falso, { ...compilada.tipos, __foco: {} });
        return { x: r.x, y: r.y, id };
    }
    const c = visibles.get(id);
    return { x: (c.x0 + c.x1) / 2, y: (c.y0 + c.y1) / 2, id };
}

/**
 * Revisa una escena entera y dice qué se tapa: los subtítulos que caen sobre
 * algo (y si arriba hay lugar), y los textos que se pisan entre sí.
 * @param {any} compilada
 * @param {{ paso?: number }} [opciones]
 */
export function revisarSuperposiciones(compilada, { paso = 0.25 } = {}) {
    const subtitulos = [];
    compilada.subtitulos.forEach((s, indice) => {
        const renglones = s.texto.length > 70 ? 2 : 1;
        const abajo = queTapa(compilada, zonaDeSubtitulo(compilada, 'abajo', renglones), s.desde, s.hasta, paso);
        if (abajo.peor < 0.02) return;
        const lugar = lugarLibre(compilada, zonaDeSubtitulo(compilada, 'abajo', renglones), s.desde, s.hasta);
        subtitulos.push({
            indice, texto: s.texto, desde: s.desde, hasta: s.hasta, tapa: abajo.piezas,
            // Si hay una franja libre más arriba, en pantalla completa el
            // subtítulo sube solo hasta ahí.
            libre: lugar.libre,
        });
    });

    // Textos que se pisan: cada par, con el tramo en que se pisan.
    const pares = new Map();
    for (let t = 0; t <= compilada.duracion + 1e-9; t += paso) {
        const textos = cajasEn(compilada, Math.min(t, compilada.duracion)).filter((c) => c.texto);
        for (let i = 0; i < textos.length; i++) {
            for (let j = i + 1; j < textos.length; j++) {
                const a = textos[i];
                const b = textos[j];
                const menor = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
                if (cruce(a, b) <= 0.15 * menor) continue;
                const clave = `${a.id}|${b.id}`;
                const par = pares.get(clave);
                if (par && t - par.hasta <= paso + 1e-9) par.hasta = t;
                else if (!par) pares.set(clave, { a: a.id, b: b.id, desde: t, hasta: t });
            }
        }
    }
    return { subtitulos, textos: [...pares.values()] };
}

/**
 * El resultado de revisarSuperposiciones() en palabras, para la consola.
 * @param {ReturnType<typeof revisarSuperposiciones>} r
 * @param {string} [nombre]
 */
export function describirSuperposiciones(r, nombre = 'la escena') {
    const s = (t) => `${t.toFixed(1).replace('.', ',')} s`;
    const lineas = [];
    for (const x of r.subtitulos) {
        lineas.push(`  ${s(x.desde)}–${s(x.hasta)}: el subtítulo «${x.texto.slice(0, 50)}${x.texto.length > 50 ? '…' : ''}» tapa ${x.tapa.join(', ')}` +
            (x.libre ? ' (en pantalla completa sube solo a un lugar libre)' : ' (y no hay un lugar libre: corré la pieza o partí el subtítulo)'));
    }
    for (const x of r.textos) lineas.push(`  ${s(x.desde)}–${s(x.hasta)}: «${x.a}» y «${x.b}» se pisan`);
    return lineas.length ? `En ${nombre}:\n${lineas.join('\n')}` : '';
}
