import { curva } from './curvas.js';
import { interpolar, claseDe, limitar } from './interpolar.js';

// La línea de tiempo: convierte una escena escrita a mano en una función
// estado(t).
//
// Es el corazón del motor y la regla es una sola: el estado en el instante t
// depende SOLO de t. No de qué se mostró antes, ni de cuánto tardó la
// computadora, ni de si alguien adelantó. Por eso no hay setTimeout ni
// "cuando termine esto, hacé aquello": todo se calcula de nuevo cada vez a
// partir de la definición.
//
// Eso es lo que permite tres cosas que de otra manera serían tres programas:
// verla en vivo, recorrerla paso a paso, y grabarla cuadro por cuadro a video.

// Estas propiedades se siguen animando con el movimiento reducido: un fundido
// no marea. Lo que se reemplaza por un salto es lo que se DESPLAZA.
const SUAVES_SIEMPRE = new Set(['opacidad']);

// Si un subtítulo no dice cuánto dura, dura lo que se tarda en leerlo: unos 15
// caracteres por segundo, que es lo que se usa en subtitulado, y nunca menos
// de un segundo y medio. Cada escena puede pedir otro ritmo con `lectura`:
// en una pantalla que se mira de pasada, conviene más lento.
export function duracionLectura(texto, caracteresPorSegundo = 15) {
    return Math.max(1.5, String(texto).length / caracteresPorSegundo);
}

/**
 * @typedef {{ tipo: { nombre: string, colores?: string[] }, props: Record<string, any> }} Pieza
 * @typedef {{
 *     titulo?: string, descripcion?: string,
 *     ancho: number, alto: number,
 *     duracion?: number, pausaFinal?: number, lectura?: number,
 *     piezas: Record<string, Pieza>,
 *     linea: Array<Record<string, any>>,
 * }} Definicion
 * @typedef {{ nombre: string, ancho?: number, alto?: number }} Disposicion
 */

/**
 * Prepara una escena para poder preguntarle cómo está en cualquier instante.
 *
 * @param {Definicion | ((d: Disposicion) => Definicion)} definicion la escena,
 *     o una función que la arma según la disposición (ancha o angosta), para
 *     que en el celular no sea la misma escena achicada hasta no leerse.
 * @param {{ movimiento?: 'completo' | 'reducido', disposicion?: Disposicion }} [opciones]
 */
export function compilar(definicion, opciones = {}) {
    const movimiento = opciones.movimiento ?? 'completo';
    const disposicion = opciones.disposicion ?? { nombre: 'ancha' };
    const def = typeof definicion === 'function' ? definicion(disposicion) : definicion;

    if (!def || typeof def !== 'object') throw new Error('La escena tiene que ser un objeto.');
    for (const medida of ['ancho', 'alto']) {
        if (!(def[medida] > 0)) {
            throw new Error(`A la escena le falta el ${medida}: es el tamaño del dibujo, por ejemplo 1600 × 900.`);
        }
    }

    // ---- Las piezas: de qué propiedades parte cada una ----
    const piezas = {};
    for (const [id, pieza] of Object.entries(def.piezas ?? {})) {
        if (!pieza || !pieza.tipo || !pieza.props) {
            throw new Error(`"${id}" no es una pieza: armala con caja({...}), texto({...}), etc.`);
        }
        piezas[id] = {
            id,
            tipo: pieza.tipo,
            base: { ...pieza.props },
            colores: new Set(pieza.tipo.colores ?? []),
            segmentos: {},
        };
    }
    for (const p of Object.values(piezas)) {
        const padre = p.base.dentro;
        if (padre != null && !piezas[padre]) {
            throw new Error(`"${p.id}" va dentro de "${padre}", pero no hay ninguna pieza que se llame así.`);
        }
    }

    // ---- La línea: cuándo empieza y termina cada cosa ----
    const capitulos = [];
    const subtitulos = [];
    let fin = 0;
    let finSubtitulos = 0;
    let finUltimoSubtitulo = 0;
    let previo = { inicio: 0, fin: 0 };
    let orden = 0;

    (def.linea ?? []).forEach((item, i) => {
        const donde = `el paso ${i + 1} de la línea`;
        const inicio = resolverEn(item.en, fin, previo, donde);
        let finItem = inicio;

        if ('capitulo' in item) {
            capitulos.push({ nombre: String(item.capitulo), t: inicio });
        } else if ('subtitulo' in item) {
            // Los subtítulos corren en paralelo, como una pista aparte: no
            // corren el "después de todo lo anterior". Si no, escribir un
            // subtítulo atrasaría la animación que viene, que es justo lo que
            // ese subtítulo está contando.
            const dur = item.dur ?? (item.hasta != null ? item.hasta - inicio : duracionLectura(item.subtitulo, def.lectura));
            subtitulos.push({ texto: String(item.subtitulo), desde: inicio, hasta: inicio + dur });
            finSubtitulos = Math.max(finSubtitulos, inicio + dur);
            finUltimoSubtitulo = inicio + dur;
            return;
        } else if ('espera' in item) {
            // espera: 'subtitulo' es "hasta que se termine de leer el último
            // subtítulo". Así lo que sigue no arranca mientras alguien todavía
            // está leyendo, sin tener que calcular a mano cuánto falta.
            finItem = item.espera === 'subtitulo' ? Math.max(inicio, finUltimoSubtitulo) : inicio + item.espera;
        } else if ('pieza' in item) {
            const ids = Array.isArray(item.pieza) ? item.pieza : [item.pieza];
            const dur = item.dur ?? 0.6;
            const escalonar = item.escalonar ?? 0;
            const fCurva = curva(item.curva ?? 'suave');
            if (!item.a || typeof item.a !== 'object') {
                throw new Error(`En ${donde} falta "a": a qué valores va la pieza, por ejemplo a: { opacidad: 1 }.`);
            }
            ids.forEach((id, j) => {
                const p = piezas[id];
                if (!p) throw new Error(`En ${donde} se anima "${id}", pero no hay ninguna pieza que se llame así.`);
                const t0 = inicio + j * escalonar;
                for (const [prop, hasta] of Object.entries(item.a)) {
                    if (!(prop in p.base)) {
                        throw new Error(
                            `En ${donde}, "${id}" (una ${p.tipo.nombre}) no tiene la propiedad "${prop}". ` +
                            `Las que tiene son: ${Object.keys(p.base).join(', ')}.`,
                        );
                    }
                    (p.segmentos[prop] ??= []).push({
                        t0,
                        t1: t0 + dur,
                        hasta,
                        desde: item.desde?.[prop],
                        curva: fCurva,
                        orden: orden++,
                    });
                }
            });
            finItem = inicio + Math.max(ids.length - 1, 0) * escalonar + dur;
        } else {
            throw new Error(`No entiendo ${donde}: tiene que ser una animación (pieza), un capitulo, un subtitulo o una espera.`);
        }

        previo = { inicio, fin: finItem };
        fin = Math.max(fin, finItem);
    });

    // ---- Cada segmento sabe de dónde parte ----
    // Se ordenan por cuándo empiezan, y el "desde" de cada uno es el valor que
    // la propiedad tiene en ese instante. Si dos animaciones se pisan, manda la
    // que empezó después: es lo que uno espera al escribir "y ahora, que vaya
    // para allá".
    for (const p of Object.values(piezas)) {
        for (const [prop, segs] of Object.entries(p.segmentos)) {
            segs.sort((a, b) => a.t0 - b.t0 || a.orden - b.orden);
            const clase = claseDe(prop, p.base[prop], p.colores);
            segs.forEach((seg, k) => {
                if (clase === 'numero' && typeof seg.hasta !== 'number') {
                    throw new Error(`"${p.id}.${prop}" es un número y se la quiere llevar a ${JSON.stringify(seg.hasta)}.`);
                }
                seg.clase = clase;
                if (seg.desde === undefined) seg.desde = valorEn(segs.slice(0, k), p.base[prop], seg.t0);
                if (movimiento === 'reducido' && clase === 'numero' && !SUAVES_SIEMPRE.has(prop)) {
                    seg.curva = curva('salto');
                }
            });
        }
    }

    capitulos.sort((a, b) => a.t - b.t);
    // Que ningún subtítulo quede cortado por el final.
    const duracion = def.duracion ?? Math.max(fin, finSubtitulos) + (def.pausaFinal ?? 0);
    const ids = ordenarPadresPrimero(piezas);

    return {
        titulo: def.titulo ?? '',
        descripcion: def.descripcion ?? '',
        ancho: def.ancho,
        alto: def.alto,
        duracion,
        movimiento,
        disposicion: disposicion.nombre,
        /** Los ids en el orden en que se dibujan: los contenedores antes que lo que llevan adentro. */
        ids,
        tipos: Object.fromEntries(ids.map((id) => [id, piezas[id].tipo])),
        capitulos,
        subtitulos,
        /** Cómo está todo en el instante t. */
        estado(t) {
            const tt = limitar(Number(t) || 0, 0, duracion);
            const props = {};
            for (const id of ids) {
                const p = piezas[id];
                const actual = { ...p.base };
                for (const [prop, segs] of Object.entries(p.segmentos)) {
                    actual[prop] = valorEn(segs, p.base[prop], tt);
                }
                props[id] = actual;
            }
            return {
                t: tt,
                piezas: props,
                capitulo: capituloEn(capitulos, tt),
                subtitulo: subtituloEn(subtitulos, tt),
            };
        },
    };
}

// El valor de una propiedad en t, recorriendo sus segmentos en orden. Cada uno
// que ya empezó pisa al anterior; el primero que todavía no empezó corta.
function valorEn(segs, base, t) {
    let v = base;
    for (const seg of segs) {
        if (t < seg.t0) break;
        if (t >= seg.t1) {
            v = seg.hasta;
        } else {
            const p = (t - seg.t0) / (seg.t1 - seg.t0);
            v = interpolar(seg.desde, seg.hasta, seg.curva(p), seg.clase);
        }
    }
    return v;
}

// Cuándo empieza algo. Se escribe igual que en GSAP, que es lo que más gente
// conoce, pero con menos variantes. "Lo anterior" es la animación, espera o
// capítulo de antes: los subtítulos no cuentan, van por su pista.
//   (nada)  apenas termina todo lo anterior
//   3       a los 3 segundos, contados desde el principio
//   '+0.5'  medio segundo después de que termina todo lo anterior
//   '<'     junto con lo anterior;  '<0.2'  0,2 s después de que empezó lo anterior
//   '>'     cuando termina lo anterior (aunque otra cosa siga);  '>-0.3'  un poco antes
function resolverEn(en, fin, previo, donde) {
    if (en === undefined) return fin;
    if (typeof en === 'number') return en;
    const m = typeof en === 'string' && en.trim().match(/^([+<>])\s*([+-]?\d*\.?\d+)?$/);
    if (!m) {
        throw new Error(`En ${donde}, "en: ${JSON.stringify(en)}" no se entiende. Usá un número, '+0.5', '<', '<0.2' o '>'.`);
    }
    const ancla = m[1] === '+' ? fin : m[1] === '<' ? previo.inicio : previo.fin;
    return ancla + (m[2] ? parseFloat(m[2]) : 0);
}

function capituloEn(capitulos, t) {
    let i = -1;
    for (let k = 0; k < capitulos.length; k++) if (capitulos[k].t <= t) i = k;
    return i;
}

// Si dos subtítulos se pisan, se ve el que empezó último.
function subtituloEn(subtitulos, t) {
    let texto = '';
    let desde = -Infinity;
    for (const s of subtitulos) {
        if (s.desde <= t && t < s.hasta && s.desde >= desde) {
            texto = s.texto;
            desde = s.desde;
        }
    }
    return texto;
}

// Una pieza que va "dentro" de otra se dibuja adentro de su grupo: el
// contenedor tiene que existir antes.
function ordenarPadresPrimero(piezas) {
    const listos = new Set();
    const orden = [];
    const visitar = (id, camino) => {
        if (listos.has(id)) return;
        if (camino.has(id)) throw new Error(`"${id}" está dentro de sí misma, dando una vuelta: revisá los "dentro".`);
        camino.add(id);
        const padre = piezas[id].base.dentro;
        if (padre != null) visitar(padre, camino);
        listos.add(id);
        orden.push(id);
    };
    for (const id of Object.keys(piezas)) visitar(id, new Set());
    return orden;
}
