import { duracionLectura } from '../nucleo/linea.js';
import { caja, texto, tabla } from '../piezas/index.js';
import { codigo, caracteresPorLinea } from './piezas/codigo.js';
import { variable } from './piezas/variable.js';
import { lista } from './piezas/lista.js';
import { consola } from './piezas/consola.js';

// Una escena armada sola a partir de la TRAZA de un programa: la lista de
// pasos que dio, con la línea que estaba por correr y cuánto valía cada
// variable en ese momento.
//
// Una traza se puede escribir a mano, o sacarla de un programa de verdad con
// herramientas/trazar.py (y, en la plataforma del curso, con el Python que ya
// corre en el navegador). Cada paso es:
//
//     {
//         linea: 3,                                   // la que está por correr (0: terminó)
//         variables: {
//             total: { tipo: 'int', repr: '0' },
//             numeros: { tipo: 'list', repr: '[4, 8]', items: ['4', '8'] },
//             edades: { tipo: 'dict', repr: '{...}', pares: [["'Ana'", '30']] },
//         },
//         salida: 'Total: 27\n',                      // todo lo que se mostró hasta ahí
//         excepcion: { tipo: 'KeyError', mensaje: "'Lucía'" },   // si se cortó con un error
//         animar: [{ pieza: 'boton', a: { escala: 0.9 }, en: 0, dur: 0.2 }],  // extras, a mano
//     }
//
// Las variables se muestran como el valor que tenían ANTES de correr esa
// línea: lo que hizo una línea se ve recién en el paso siguiente, mientras la
// marca todavía está sobre ella. Es lo que hace un depurador.

/**
 * @param {{
 *     codigo: string,
 *     traza: any[],
 *     lenguaje?: 'python' | 'js',
 *     titulo?: string,
 *     descripcion?: string,
 *     archivo?: string,
 *     ritmo?: number,
 *     lectura?: number,
 *     explicaciones?: Record<number, string>,
 *     preguntas?: Record<number, { pregunta: string, opciones?: string[], correcta?: number, explicacion?: string, dur?: number }>,
 *     punteros?: Record<string, string>,
 *     capitulos?: Record<number, string>,
 *     piezas?: (d: any, lugar: any) => Record<string, any>,
 * }} opciones
 *     `explicaciones`, `preguntas` y `capitulos` van por número de paso (desde 0).
 *     Una pregunta frena ANTES de mostrar lo que hace la línea marcada.
 *     `punteros` dice qué variable recorre qué lista: { numeros: 'n' } pone la
 *     flechita de `numeros` en el elemento que vale lo mismo que `n`.
 *     `piezas` agrega piezas propias (un botón, una página) para los `animar`.
 */
export function desdeTraza(opciones) {
    const {
        traza, lenguaje = 'python', titulo = '', descripcion = '', archivo = '',
        ritmo = 1.4, lectura = 13, explicaciones = {}, preguntas = {}, punteros = {}, capitulos = {},
    } = opciones;
    const programa = String(opciones.codigo).replace(/\s+$/, '');
    if (!Array.isArray(traza) || traza.length === 0) throw new Error('La traza tiene que ser una lista de pasos, y no puede estar vacía.');

    // Qué variables aparecen, en orden, y de qué clase es cada una.
    const variables = [];
    const vistas = new Set();
    let maxPares = 0;
    let maxItems = 0;
    for (const paso of traza) {
        for (const [nombre, v] of Object.entries(paso.variables ?? {})) {
            if (v.tipo === 'dict') maxPares = Math.max(maxPares, v.pares?.length ?? 0);
            if (v.items) maxItems = Math.max(maxItems, v.items.length);
            if (vistas.has(nombre)) continue;
            vistas.add(nombre);
            variables.push({ nombre, clase: v.tipo === 'dict' ? 'dict' : v.items ? 'lista' : 'valor' });
        }
    }
    const conSalida = traza.some((p) => p.salida);
    const conError = traza.some((p) => p.excepcion);

    return function (disposicion) {
        const angosta = disposicion.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 1140 : 900;
        const arriba = titulo ? (angosta ? 100 : 100) : 30;

        // ---- Dónde va cada cosa ----
        const cod = angosta
            ? { x: 320, ancho: 610, tamano: 22 }
            : { x: 440, ancho: 820, tamano: 36 };
        const necesario = Math.max(...programa.split('\n').map((l) => l.length));
        // Si una línea no entra, se achica la letra: cortar código es peor.
        cod.tamano = Math.min(cod.tamano, cod.tamano * caracteresPorLinea(cod) / necesario);
        const piezaCodigo = codigo({
            x: cod.x, y: 0, ancho: cod.ancho, tamano: cod.tamano, codigo: programa, lenguaje,
            titulo: archivo, linea: traza[0].linea || 1, marca: 0,
        });
        const altoCodigo = piezaCodigo.tipo.tamano(piezaCodigo.props).alto;
        piezaCodigo.props.y = arriba + altoCodigo / 2;

        const piezas = {};
        if (titulo) {
            piezas.titulo = texto({ x: W / 2, y: angosta ? 50 : 52, texto: titulo, tamano: angosta ? 32 : 40, peso: 800, anchoMax: W - 40 });
        }
        piezas.codigo = piezaCodigo;

        const con = angosta
            ? { x: 320, ancho: 610, renglones: 3, tamano: 20 }
            : { x: 440, ancho: 820, renglones: 3, tamano: 30 };
        const piezaConsola = consola({ ...con, opacidad: 0 });
        const altoConsola = piezaConsola.tipo.tamano(piezaConsola.props).alto;
        piezaConsola.props.y = angosta ? H - 20 - altoConsola / 2 : arriba + altoCodigo + 40 + altoConsola / 2;
        if (conSalida) piezas.consola = piezaConsola;
        if (conError) {
            const yError = angosta
                ? piezaConsola.props.y - altoConsola / 2 - 70
                : piezaConsola.props.y + altoConsola / 2 + 70;
            piezas.error = caja({
                x: con.x, y: yError, ancho: con.ancho, alto: angosta ? 80 : 96, texto: '', tamano: angosta ? 24 : 34,
                relleno: 'superficie', borde: 'error', color: 'error', opacidad: 0,
            });
        }

        // Las variables, en columna: a la derecha en ancho, debajo del código en angosto.
        const col = angosta
            ? { x: 320, ancho: 560, y: arriba + altoCodigo + 70 }
            : { x: 1250, ancho: 620, y: arriba + 50 };
        let y = col.y;
        const lugarVariable = {};
        for (const v of variables) {
            const id = 'var_' + v.nombre;
            lugarVariable[v.nombre] = id;
            if (v.clase === 'lista') {
                const celda = Math.min(angosta ? 84 : 120, col.ancho / Math.max(maxItems, 1));
                const alto = angosta ? 68 : 96;
                piezas[id] = lista({
                    x: col.x, y: y + alto / 2, nombre: v.nombre, celda, alto, tamano: angosta ? 26 : 36,
                    puntero: Object.entries(punteros).find(([l]) => l === v.nombre)?.[1] ?? '', opacidad: 0,
                });
                y += alto + (angosta ? 115 : 160);
            } else if (v.clase === 'dict') {
                const altoFila = angosta ? 44 : 60;
                piezas[id] = tabla({
                    x: col.x, y: y + ((maxPares + 1) * altoFila) / 2, ancho: Math.min(col.ancho, 480),
                    columnas: [`${v.nombre}: clave`, 'valor'], filas: [], altoFila, tamano: angosta ? 24 : 32, opacidad: 0,
                });
                y += (maxPares + 1) * altoFila + 80;
            } else {
                const alto = angosta ? 68 : 96;
                piezas[id] = variable({
                    x: col.x, y: y + alto / 2, nombre: v.nombre, ancho: Math.min(col.ancho, angosta ? 320 : 420), alto,
                    tamano: angosta ? 28 : 38, opacidad: 0,
                });
                y += alto + (angosta ? 72 : 100);
            }
        }
        Object.assign(piezas, opciones.piezas?.(disposicion, { W, H, col, y }) ?? {});

        // En ancho, un programa corto deja la mitad de abajo vacía: se baja
        // todo para que quede centrado debajo del título. En angosto no, porque
        // la consola va pegada abajo a propósito.
        if (!angosta) {
            let minimo = Infinity;
            let maximo = -Infinity;
            for (const [id, pieza] of Object.entries(piezas)) {
                if (id === 'titulo') continue;
                const alto = pieza.tipo.tamano?.(pieza.props).alto ?? pieza.props.tamano ?? 0;
                // Las variables y las listas tienen el nombre arriba, y las
                // listas los índices y la flechita abajo.
                minimo = Math.min(minimo, pieza.props.y - alto / 2 - 40);
                maximo = Math.max(maximo, pieza.props.y + alto / 2 + 40);
            }
            const corrimiento = Math.max(0, (arriba + H) / 2 - (minimo + maximo) / 2);
            for (const [id, pieza] of Object.entries(piezas)) if (id !== 'titulo') pieza.props.y += corrimiento;
        }

        // ---- La línea de tiempo: un paso atrás del otro ----
        /** @type {any[]} */
        const linea = [{ pieza: 'codigo', a: { marca: 1 }, dur: 0.4, en: 0.2 }];
        const anterior = {};
        const indiceSenalado = {};
        let t = 0.7;
        let salidaAnterior = '';
        traza.forEach((paso, i) => {
            if (capitulos[i]) linea.push({ capitulo: capitulos[i], en: t });
            const vars = paso.variables ?? {};

            // Lo que hizo la línea anterior: lo que cambió desde el paso de antes.
            for (const [nombre, v] of Object.entries(vars)) {
                const id = lugarVariable[nombre];
                const antes = anterior[nombre];
                if (antes && antes.repr === v.repr) continue;
                if (!antes) linea.push({ pieza: id, a: { opacidad: 1 }, dur: 0.4, en: t });
                const clase = variables.find((x) => x.nombre === nombre).clase;
                if (clase === 'lista') {
                    linea.push({ pieza: id, a: { items: v.items }, dur: 0, en: t });
                } else if (clase === 'dict') {
                    linea.push({ pieza: id, a: { filas: v.pares ?? [] }, dur: 0, en: t });
                } else {
                    linea.push({ pieza: id, a: { valor: v.repr, tipoDato: v.tipo ?? '' }, dur: 0, en: t });
                }
                if (antes && clase !== 'dict') {
                    linea.push({ pieza: id, a: { destello: 1 }, dur: 0.12, en: t, curva: 'lineal' });
                    linea.push({ pieza: id, a: { destello: 0 }, dur: 0.8, en: t + 0.12, curva: 'salir' });
                }
            }
            // Las flechitas de las listas que se están recorriendo.
            for (const [nombreLista, nombreVar] of Object.entries(punteros)) {
                const l = vars[nombreLista];
                const v = vars[nombreVar];
                if (!l?.items || !v || anterior[nombreVar]?.repr === v.repr) continue;
                const desde = (indiceSenalado[nombreLista] ?? -1) + 1;
                let k = l.items.indexOf(v.repr, desde);
                if (k === -1) k = l.items.indexOf(v.repr);
                if (k === -1) continue;
                const primera = indiceSenalado[nombreLista] === undefined;
                linea.push({ pieza: lugarVariable[nombreLista], a: { senalar: k }, dur: primera ? 0 : 0.4, en: t });
                indiceSenalado[nombreLista] = k;
            }
            for (const nombre of Object.keys(anterior)) if (!(nombre in vars)) delete anterior[nombre];
            Object.assign(anterior, vars);

            if (conSalida && (paso.salida ?? '') !== salidaAnterior) {
                if (!salidaAnterior) linea.push({ pieza: 'consola', a: { opacidad: 1 }, dur: 0.3, en: t });
                linea.push({ pieza: 'consola', a: { salida: paso.salida ?? '' }, dur: 0, en: t });
                salidaAnterior = paso.salida ?? '';
            }
            if (paso.excepcion) {
                const { tipo, mensaje } = paso.excepcion;
                linea.push({ pieza: 'codigo', a: { colorMarca: 'error' }, dur: 0.3, en: t });
                linea.push({ pieza: 'error', a: { texto: `🚨 ${tipo}${mensaje ? `: ${mensaje}` : ''}` }, dur: 0, en: t });
                linea.push({ pieza: 'error', a: { opacidad: 1 }, dur: 0.4, en: t + 0.2 });
            }
            for (const extra of paso.animar ?? []) {
                linea.push({ ...extra, en: t + (typeof extra.en === 'number' ? extra.en : 0) });
            }

            // Después, la marca baja a la línea que sigue.
            if (paso.linea > 0) {
                linea.push({ pieza: 'codigo', a: { linea: paso.linea, marca: 1 }, dur: i === 0 ? 0 : 0.35, en: t + 0.45 });
            } else if (!paso.excepcion) {
                linea.push({ pieza: 'codigo', a: { marca: 0 }, dur: 0.4, en: t + 0.45 });
            }

            let largo = Math.max(ritmo, 0.9);
            const explicacion = explicaciones[i];
            if (explicacion) {
                const dur = Math.max(ritmo, duracionLectura(explicacion, lectura));
                linea.push({ subtitulo: explicacion, en: t, dur });
                largo = Math.max(largo, dur + 0.3);
            }
            const pregunta = preguntas[i];
            if (pregunta) {
                const dur = pregunta.dur ?? 4;
                linea.push({ marca: 'pregunta', datos: pregunta, en: t + largo, dur });
                largo += dur;
            }
            t += largo;
            // El fin de cada paso: ahí se frena el paso a paso. El paso que
            // sigue arranca un poquito después y no en el mismo instante: si
            // no, la parada mostraría ya lo que hace la línea siguiente.
            linea.push({ marca: 'paso', datos: { indice: i }, en: t });
            t += 0.1;
        });

        return {
            titulo: titulo || 'Un programa, paso a paso',
            descripcion,
            ancho: W,
            alto: H,
            lectura,
            pausaFinal: 1.5,
            piezas,
            linea,
        };
    };
}
