import { curva } from './curvas.js';
import { interpolar, claseDe, limitar } from './interpolar.js';
import { revisarVinculos, hayVinculos, resolverVinculos } from './vinculos.js';
import { azar } from './azar.js';

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
const SUAVES_SIEMPRE = new Set(['opacidad', 'trazo']);

// Dos sonidos iguales más juntos que esto suenan como uno solo (y feo): con
// diez piezas que aparecen a la vez, un "pop", no diez encimados.
const SONIDO_JUNTOS = 0.03;

// Si un subtítulo no dice cuánto dura, dura lo que se tarda en leerlo: unos 15
// caracteres por segundo, que es lo que se usa en subtitulado, y nunca menos
// de un segundo y medio. Cada escena puede pedir otro ritmo con `lectura`:
// en una pantalla que se mira de pasada, conviene más lento.
export function duracionLectura(texto, caracteresPorSegundo = 15) {
    return Math.max(1.5, String(texto).length / caracteresPorSegundo);
}

/**
 * @typedef {{ tipo: { nombre: string, colores?: string[], formas?: string[] }, props: Record<string, any>, propias?: string[] }} Pieza
 * @typedef {{
 *     titulo?: string, descripcion?: string,
 *     ancho: number, alto: number,
 *     duracion?: number, pausaFinal?: number, lectura?: number,
 *     musica?: { archivo: string, volumen?: number } | null,
 *     lupa?: Record<string, any> | null,
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
 * @param {{ movimiento?: 'completo' | 'reducido', disposicion?: Disposicion, estilo?: Record<string, any> | null }} [opciones]
 *     `estilo`: el arte de la escena (ver src/estilos/). Acá importa lo que
 *     cambia el tiempo y las piezas: las curvas, el escalonado, los sonidos
 *     automáticos y los predeterminados de cada pieza. Los colores, las
 *     fuentes y los efectos son del dibujo, no de la línea.
 */
export function compilar(definicion, opciones = {}) {
    const movimiento = opciones.movimiento ?? 'completo';
    const disposicion = opciones.disposicion ?? { nombre: 'ancha' };
    const estilo = opciones.estilo ?? {};
    const mov = estilo.movimiento ?? {};
    const def = typeof definicion === 'function' ? definicion(disposicion) : definicion;

    if (!def || typeof def !== 'object') throw new Error('La escena tiene que ser un objeto.');
    for (const medida of ['ancho', 'alto']) {
        if (!(def[medida] > 0)) {
            throw new Error(`A la escena le falta el ${medida}: es el tamaño del dibujo, por ejemplo 1600 × 900.`);
        }
    }

    // ---- Las piezas: de qué propiedades parte cada una ----
    /** @type {Record<string, any>} */
    const piezas = {};
    for (const [id, pieza] of Object.entries(def.piezas ?? {})) {
        if (!pieza || !pieza.tipo || !pieza.props) {
            throw new Error(`"${id}" no es una pieza: armala con caja({...}), texto({...}), etc.`);
        }
        piezas[id] = {
            id,
            tipo: pieza.tipo,
            base: conPredeterminadosDelEstilo(pieza, estilo.piezas?.[pieza.tipo.nombre]),
            colores: new Set(pieza.tipo.colores ?? []),
            formas: new Set(pieza.tipo.formas ?? []),
            segmentos: {},
        };
    }
    for (const p of Object.values(piezas)) {
        const padre = p.base.dentro;
        if (padre != null && !piezas[padre]) {
            throw new Error(`"${p.id}" va dentro de "${padre}", pero no hay ninguna pieza que se llame así.`);
        }
    }

    const enFila = revisarVinculos(piezas);
    const conVinculos = hayVinculos(piezas);
    const tiposPorId = Object.fromEntries(Object.values(piezas).map((p) => [p.id, p.tipo]));

    // ---- La línea: cuándo empieza y termina cada cosa ----
    const capitulos = [];
    const subtitulos = [];
    const marcas = [];
    const sonidos = [];
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
        } else if ('sonido' in item && !('pieza' in item)) {
            // Los sonidos van por su pista, como los subtítulos: no corren el
            // "después de todo lo anterior".
            sonidos.push(unSonido(item.sonido, inicio, item, donde));
            return;
        } else if ('marca' in item) {
            // Una marca es un punto (o un tramo) con nombre y datos, que el
            // núcleo no interpreta: lo usan las capas de arriba. La capa
            // pedagógica, por ejemplo, marca dónde frenar a preguntar. Ocupa
            // su `dur` en la línea, como una espera.
            finItem = inicio + (item.dur ?? 0);
            marcas.push({ tipo: String(item.marca), t: inicio, hasta: finItem, datos: item.datos ?? null });
        } else if ('espera' in item) {
            // espera: 'subtitulo' es "hasta que se termine de leer el último
            // subtítulo". Así lo que sigue no arranca mientras alguien todavía
            // está leyendo, sin tener que calcular a mano cuánto falta.
            finItem = item.espera === 'subtitulo' ? Math.max(inicio, finUltimoSubtitulo) : inicio + item.espera;
        } else if ('pieza' in item) {
            const ids = Array.isArray(item.pieza) ? item.pieza : [item.pieza];
            const dur = item.dur ?? mov.dur ?? 0.6;
            const demoras = escalonado(item.escalonar ?? (ids.length > 1 ? mov.escalonar : 0) ?? 0, ids.length, i);
            // La curva: la que pide la animación; si no, la que el estilo
            // quiere para esa propiedad (un resorte para moverse, un fundido
            // suave para aparecer); si no, la del estilo; si no, "suave".
            const fCurva = item.curva != null ? curva(item.curva) : null;
            const curvaDe = (prop) => fCurva ?? curvaDelEstilo(mov, prop);
            if (!item.a || typeof item.a !== 'object') {
                throw new Error(`En ${donde} falta "a": a qué valores va la pieza, por ejemplo a: { opacidad: 1 }.`);
            }
            ids.forEach((id, j) => {
                const p = piezas[id];
                if (!p) throw new Error(`En ${donde} se anima "${id}", pero no hay ninguna pieza que se llame así.`);
                const t0 = inicio + demoras[j];
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
                        curva: curvaDe(prop),
                        orden: orden++,
                    });
                }
            });
            finItem = inicio + Math.max(0, ...demoras) + dur;
            // Un sonido pegado a la animación: suena cuando arranca (o cuando
            // termina), una vez o una por pieza si va escalonada.
            if (item.sonido != null) {
                const s = typeof item.sonido === 'string' ? { nombre: item.sonido } : item.sonido;
                const instantes = s.cadaPieza ? demoras.map((d) => inicio + d) : [inicio];
                for (const t of instantes) sonidos.push(unSonido(s, s.al === 'fin' ? t + dur : t, s, donde));
            }
        } else {
            throw new Error(`No entiendo ${donde}: tiene que ser una animación (pieza), un capitulo, un subtitulo, un sonido, una marca o una espera.`);
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
            const clase = claseDe(prop, p.base[prop], p.colores, p.formas);
            segs.forEach((seg, k) => {
                if (clase === 'numero' && typeof seg.hasta !== 'number') {
                    throw new Error(`"${p.id}.${prop}" es un número y se la quiere llevar a ${JSON.stringify(seg.hasta)}.`);
                }
                seg.clase = clase;
                if (clase === 'forma' && typeof seg.hasta !== 'string') {
                    throw new Error(`"${p.id}.${prop}" es una forma (un camino de SVG, como figuras.circulo(60)), no ${JSON.stringify(seg.hasta)}.`);
                }
                if (seg.desde === undefined) seg.desde = valorEn(segs.slice(0, k), p.base[prop], seg.t0);
                if (movimiento === 'reducido' && clase === 'numero' && !SUAVES_SIEMPRE.has(prop)) {
                    seg.curva = curva('salto');
                }
            });
        }
    }

    if (estilo.sonidos) sonidos.push(...sonidosAutomaticos(piezas, estilo.sonidos));
    capitulos.sort((a, b) => a.t - b.t);
    marcas.sort((a, b) => a.t - b.t);
    const pista = sinEncimar(sonidos);
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
        /** Las marcas, en orden: { tipo, t, hasta, datos }. */
        marcas,
        /** Los sonidos, en orden: { nombre, t, volumen, tono }. */
        sonidos: pista.filter((s) => s.t <= duracion),
        /** La música de fondo, si la escena (o su estilo) la pide. */
        musica: def.musica ?? estilo.musica ?? null,
        /** Cómo arranca la lupa de quien mira, si la escena lo dice. */
        lupa: def.lupa ?? null,
        /** Cómo está todo en el instante t. */
        estado(t) {
            const tt = limitar(Number(t) || 0, 0, duracion);
            /** @type {Record<string, Record<string, any>>} */
            const props = {};
            for (const id of ids) {
                const p = piezas[id];
                const actual = { ...p.base };
                for (const [prop, segs] of Object.entries(p.segmentos)) {
                    actual[prop] = valorEn(segs, p.base[prop], tt);
                }
                props[id] = actual;
            }
            // Las pegadas y las acomodadas en filas, a partir de lo anterior.
            if (conVinculos) resolverVinculos(props, tiposPorId, enFila);
            const sub = subtituloEn(subtitulos, tt);
            return {
                t: tt,
                piezas: props,
                capitulo: capituloEn(capitulos, tt),
                subtitulo: sub < 0 ? '' : subtitulos[sub].texto,
                /** Cuál de los subtítulos se ve (−1: ninguno). Para resaltar palabra por palabra. */
                subtituloIndice: sub,
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
    let indice = -1;
    let desde = -Infinity;
    subtitulos.forEach((s, k) => {
        if (s.desde <= t && t < s.hasta && s.desde >= desde) {
            indice = k;
            desde = s.desde;
        }
    });
    return indice;
}

// Lo que el estilo cambia de una pieza, salvo lo que la escena le puso a
// mano: si una caja dice radio: 4, es porque la quiere así en cualquier estilo.
function conPredeterminadosDelEstilo(pieza, ajustes) {
    const base = { ...pieza.props };
    if (!ajustes || !pieza.propias) return base;
    const propias = new Set(pieza.propias);
    for (const [k, v] of Object.entries(ajustes)) if (k in base && !propias.has(k)) base[k] = v;
    return base;
}

// La curva que el estilo quiere para una propiedad. Se elige por propiedad
// porque no todo queda bien con resorte: un fundido con resorte pasaría de
// opaco a más que opaco, y un rango de ejes con resorte marea.
function curvaDelEstilo(mov, prop) {
    return curva(mov.curvas?.[prop] ?? mov.curva ?? 'suave');
}

/**
 * Cuánto se demora cada pieza de una animación escalonada.
 * @param {number | { cada?: number, orden?: 'inicio' | 'fin' | 'centro' | 'bordes' | 'azar', semilla?: number | string }} e
 *     un número (segundos entre una y otra, en orden) o cómo repartirlas:
 *     desde el final, desde el centro hacia afuera, desde los bordes hacia
 *     adentro, o al azar (con semilla: siempre el mismo azar).
 * @param {number} n cuántas piezas
 * @param {number} i el paso de la línea, para que dos escalonados al azar no sean iguales
 */
function escalonado(e, n, i) {
    const cada = typeof e === 'number' ? e : (e?.cada ?? 0.05);
    const orden = typeof e === 'number' ? 'inicio' : (e?.orden ?? 'inicio');
    const medio = (n - 1) / 2;
    let turno;
    if (orden === 'inicio') turno = (j) => j;
    else if (orden === 'fin') turno = (j) => n - 1 - j;
    else if (orden === 'centro') turno = (j) => Math.abs(j - medio);
    else if (orden === 'bordes') turno = (j) => medio - Math.abs(j - medio);
    else if (orden === 'azar') {
        const r = azar(typeof e === 'object' && e.semilla != null ? e.semilla : i + 1);
        const mezcla = Array.from({ length: n }, (_, j) => j);
        for (let j = n - 1; j > 0; j--) {
            const k = Math.floor(r.siguiente() * (j + 1));
            [mezcla[j], mezcla[k]] = [mezcla[k], mezcla[j]];
        }
        turno = (j) => mezcla.indexOf(j);
    } else {
        throw new Error(`El orden de un escalonado es 'inicio', 'fin', 'centro', 'bordes' o 'azar', no "${orden}".`);
    }
    return Array.from({ length: n }, (_, j) => Math.round(turno(j) * cada * 1e6) / 1e6);
}

function unSonido(s, t, item, donde) {
    const datos = typeof s === 'string' ? { nombre: s } : s;
    if (!datos || typeof datos.nombre !== 'string' || !datos.nombre) {
        throw new Error(`En ${donde}, el sonido tiene que tener un nombre: sonido: 'pop', o sonido: { nombre: 'pop', volumen: 0.5 }.`);
    }
    return {
        nombre: datos.nombre,
        t: Math.max(0, t),
        volumen: datos.volumen ?? item.volumen ?? 1,
        // Semitonos para arriba o para abajo: el mismo "pop" un poco más agudo
        // para el segundo, más todavía para el tercero.
        tono: datos.tono ?? item.tono ?? 0,
    };
}

// Lo que el estilo hace sonar solo, mirando la línea ya armada: cuando algo
// aparece, cuando se va, cuando se mueve lejos. Así la misma escena suena con
// un estilo y queda en silencio con otro, sin tocarla.
function sonidosAutomaticos(piezas, reglas) {
    const salida = [];
    const volumen = reglas.volumen ?? 1;
    const lejos = reglas.distancia ?? 150;
    for (const p of Object.values(piezas)) {
        for (const seg of p.segmentos.opacidad ?? []) {
            if (reglas.aparecer && seg.desde < 0.5 && seg.hasta >= 0.5) {
                salida.push({ nombre: reglas.aparecer, t: seg.t0, volumen, tono: 0 });
            } else if (reglas.desaparecer && seg.desde >= 0.5 && seg.hasta < 0.5) {
                salida.push({ nombre: reglas.desaparecer, t: seg.t0, volumen, tono: 0 });
            }
        }
        if (reglas.mover) {
            const vistos = new Set();
            for (const prop of ['x', 'y']) {
                for (const seg of p.segmentos[prop] ?? []) {
                    if (typeof seg.desde !== 'number' || Math.abs(seg.hasta - seg.desde) < lejos) continue;
                    if (vistos.has(seg.t0)) continue;
                    vistos.add(seg.t0);
                    salida.push({ nombre: reglas.mover, t: seg.t0, volumen, tono: 0 });
                }
            }
        }
    }
    return salida;
}

function sinEncimar(sonidos) {
    const orden = [...sonidos].sort((a, b) => a.t - b.t || a.nombre.localeCompare(b.nombre));
    const ultimo = new Map();
    return orden.filter((s) => {
        const antes = ultimo.get(s.nombre);
        if (antes != null && s.t - antes < SONIDO_JUNTOS) return false;
        ultimo.set(s.nombre, s.t);
        return true;
    });
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
