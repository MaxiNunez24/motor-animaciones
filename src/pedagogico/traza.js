import { duracionLectura } from '../nucleo/linea.js';
import { caja, texto, tabla, flecha } from '../piezas/index.js';
import { codigo, caracteresPorLinea, ANCHO_MONO } from './piezas/codigo.js';
import { camara } from '../piezas/camara.js';
import { variable } from './piezas/variable.js';
import { lista } from './piezas/lista.js';
import { consola } from './piezas/consola.js';
import { pila } from './piezas/pila.js';
import { explicarPaso, detectarPunteros } from './explicar.js';

/** De qué clase es una variable, para elegir con qué pieza se muestra. */
function claseDeVariable(v) {
    if (v.atributos) return 'objeto';
    if (v.tipo === 'dict') return 'dict';
    if (v.items) return 'lista';
    return 'valor';
}

/** Cómo se dice "la misma ..." según lo que sea. */
function queEs(v) {
    if (v.atributos) return 'el mismo objeto';
    if (v.tipo === 'dict') return 'el mismo diccionario';
    if (v.tipo === 'set') return 'el mismo conjunto';
    return 'la misma lista';
}

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
 *     punteros?: Record<string, string> | 'auto',
 *     explicar?: boolean,
 *     capitulos?: Record<number, string>,
 *     piezas?: (d: any, lugar: any) => Record<string, any>,
 *     lupa?: boolean | number | { zoom?: number, forma?: 'rect' | 'circulo', radio?: number, aro?: number },
 *     lupaDebajoDe?: number,
 *     contexto?: number,
 * }} opciones
 *     `explicaciones`, `preguntas` y `capitulos` van por número de paso (desde 0).
 *     Una pregunta frena ANTES de mostrar lo que hace la línea marcada.
 *     `punteros` dice qué variable recorre qué lista: { numeros: 'n' } pone la
 *     flechita de `numeros` en el elemento que vale lo mismo que `n`.
 *     Con 'auto', se deduce de la traza.
 *     `explicar`: los pasos sin explicación escrita se explican solos.
 *     `piezas` agrega piezas propias (un botón, una página) para los `animar`.
 *     `lupa` (true, o cuánto acercar: 1.8 si es true): para cuando la escena
 *     se ve chica. Un programa largo se achica hasta entrar entero, y en la
 *     columna de una clase queda ilegible; con la lupa, el código va dentro
 *     de una cámara que lo agranda y sigue a la línea marcada, como un editor:
 *     baja suave cuando la marca se acerca al borde, dejando `contexto` líneas
 *     (3) arriba y abajo. El zoom nunca es tanto que corte una línea a lo ancho.
 *     Con un objeto se elige también cómo se ve la ventana: { zoom, forma,
 *     radio, aro } (por defecto, esquinas redondeadas como la caja del código
 *     y un aro fino que la enmarca).
 *     `lupaDebajoDe` (en píxeles): la lupa se usa solo si el lugar donde se ve
 *     la escena es más angosto que eso (por ejemplo, 900).
 */
export function desdeTraza(opciones) {
    const {
        traza, lenguaje = 'python', titulo = '', descripcion = '', archivo = '',
        ritmo = 1.4, lectura = 13, explicaciones = {}, preguntas = {}, capitulos = {}, explicar = false,
        lupa = false, lupaDebajoDe = null, contexto = 3,
    } = opciones;
    const punteros = opciones.punteros === 'auto' ? detectarPunteros(opciones.traza ?? []) : opciones.punteros ?? {};
    const programa = String(opciones.codigo).replace(/\s+$/, '');
    if (!Array.isArray(traza) || traza.length === 0) throw new Error('La traza tiene que ser una lista de pasos, y no puede estar vacía.');

    // Qué variables aparecen, en orden, y de qué clase es cada una.
    const variables = [];
    const vistas = new Set();
    const maxFilas = {};
    let maxItems = 0;
    for (const paso of traza) {
        for (const [nombre, v] of Object.entries(paso.variables ?? {})) {
            const filas = v.atributos ?? (v.tipo === 'dict' ? v.pares : null);
            if (filas) maxFilas[nombre] = Math.max(maxFilas[nombre] ?? 0, filas.length);
            if (v.items) maxItems = Math.max(maxItems, v.items.length);
            if (vistas.has(nombre)) continue;
            vistas.add(nombre);
            variables.push({ nombre, clase: claseDeVariable(v), primera: v });
        }
    }
    const conSalida = traza.some((p) => p.salida);
    const conError = traza.some((p) => p.excepcion);
    const conPila = traza.some((p) => p.pila?.length);

    // Las referencias compartidas: dos nombres (o un nombre y un `self`) que
    // son LA MISMA lista u objeto. Solo esas llevan su número a la vista; en
    // un programa sin nada compartido, el número sería ruido.
    const compartidas = new Set();
    // Los pares de variables que en algún momento son lo mismo: cada uno lleva
    // una flecha "la misma lista" que aparece cuando empiezan a compartir.
    const pares = new Map();
    for (const paso of traza) {
        const porRef = new Map();
        const anotar = (nombre, v, global) => {
            if (v.ref === undefined) return;
            if (!porRef.has(v.ref)) porRef.set(v.ref, []);
            porRef.get(v.ref).push({ nombre, global, v });
        };
        for (const [n, v] of Object.entries(paso.variables ?? {})) anotar(n, v, true);
        for (const m of paso.pila ?? []) for (const [n, v] of Object.entries(m.variables)) anotar(n, v, false);
        for (const [ref, nombres] of porRef) {
            if (nombres.length < 2) continue;
            compartidas.add(ref);
            const globales = nombres.filter((x) => x.global);
            for (let k = 1; k < globales.length; k++) {
                const clave = `${globales[0].nombre}|${globales[k].nombre}`;
                if (!pares.has(clave)) pares.set(clave, { a: globales[0].nombre, b: globales[k].nombre, que: queEs(globales[0].v) });
            }
        }
    }
    const conRef = (nombre, v) => (v?.ref !== undefined && compartidas.has(v.ref) ? `${nombre} · #${v.ref}` : nombre);

    return function (disposicion) {
        const angosta = disposicion.nombre === 'angosta';
        // La media (de 600 a 900 px) es una ancha más angosta: con 1200 de
        // ancho en vez de 1600, todo se ve un tercio más grande.
        const media = disposicion.nombre === 'media';
        const W = angosta ? 640 : media ? 1200 : 1600;
        const H = angosta ? 1140 : 900;
        const arriba = titulo ? (angosta ? 100 : 100) : 30;

        // ---- Dónde va cada cosa ----
        const cod = angosta
            ? { x: 320, ancho: 610, tamano: 22 }
            : media ? { x: 345, ancho: 650, tamano: 36 } : { x: 440, ancho: 820, tamano: 36 };
        const necesario = Math.max(...programa.split('\n').map((l) => l.length));
        // Si una línea no entra, se achica la letra: cortar código es peor.
        cod.tamano = Math.min(cod.tamano, cod.tamano * caracteresPorLinea(cod) / necesario);
        const tamanoPorAncho = cod.tamano;
        // Y si el programa es largo, también por alto: que entre entero, con la
        // consola abajo en ancho. Un código cortado no se puede seguir.
        const lineasCodigo = programa.split('\n').length;
        const disponible = angosta ? H * 0.42 : H - arriba - 30 - (conSalida ? 230 : 0);
        cod.tamano = Math.min(cod.tamano, disponible / (lineasCodigo * 1.6 + (archivo ? 2.6 : 1)));
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
            : { x: cod.x, ancho: cod.ancho, renglones: 3, tamano: 30 };
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
            : media ? { x: 925, ancho: 500, y: arriba + 50 } : { x: 1250, ancho: 620, y: arriba + 50 };
        let y = col.y;
        const lugarVariable = {};
        for (const v of variables) {
            const id = 'var_' + v.nombre;
            lugarVariable[v.nombre] = id;
            if (v.clase === 'lista') {
                const celda = Math.min(angosta ? 84 : 120, col.ancho / Math.max(maxItems, 1));
                const alto = angosta ? 68 : 96;
                piezas[id] = lista({
                    x: col.x, y: y + alto / 2, nombre: conRef(v.nombre, v.primera), celda, alto, tamano: angosta ? 26 : 36,
                    puntero: Object.entries(punteros).find(([l]) => l === v.nombre)?.[1] ?? '', opacidad: 0,
                });
                y += alto + (angosta ? 115 : 160);
            } else if (v.clase === 'dict' || v.clase === 'objeto') {
                // Un objeto se muestra como un diccionario: cada atributo con su valor.
                const altoFila = angosta ? 44 : 56;
                const filas = maxFilas[v.nombre] ?? 0;
                const columnas = v.clase === 'objeto'
                    ? [v.nombre, conRef(v.primera.tipo, v.primera).replace(' · ', ' ')]
                    : [`${v.nombre}: clave`, conRef('valor', v.primera)];
                piezas[id] = tabla({
                    x: col.x, y: y + ((filas + 1) * altoFila) / 2, ancho: Math.min(col.ancho, 480),
                    columnas, filas: [], altoFila, tamano: angosta ? 24 : 30, opacidad: 0,
                    encabezado: v.clase === 'objeto' ? 'acento2' : 'acento',
                });
                y += (filas + 1) * altoFila + 80;
            } else {
                const alto = angosta ? 68 : 96;
                piezas[id] = variable({
                    x: col.x, y: y + alto / 2, nombre: v.nombre, ancho: Math.min(col.ancho, angosta ? 320 : 420), alto,
                    tamano: angosta ? 28 : 38, opacidad: 0,
                });
                y += alto + (angosta ? 72 : 100);
            }
        }
        // La pila de llamadas, debajo de las variables. Crece para abajo.
        if (conPila) {
            piezas.pila = pila({ x: col.x, y: y - (angosta ? 10 : 20), ancho: Math.min(col.ancho, angosta ? 560 : 600), tamano: angosta ? 22 : media ? 25 : 32 });
        }
        // Las flechas entre dos variables que son lo mismo. Van por afuera, por
        // el costado izquierdo de las dos: entre una y otra no hay lugar, y una
        // flecha recta cruzaría por encima de la segunda. Enganchadas al
        // costado (y no a un punto fijo), quedan pegadas a las listas y se
        // corren cuando crecen.
        const costado = (id) => ({ pieza: id, lado: 'izquierda', dx: -12 });
        for (const [clave, par] of pares) {
            piezas['alias_' + clave.replace('|', '_')] = flecha({
                desde: costado(lugarVariable[par.a]), hasta: costado(lugarVariable[par.b]), progreso: 0, curvatura: 0.45,
                separacion: 0, color: 'acento2', etiqueta: par.que, tamanoEtiqueta: angosta ? 18 : 22,
                colorEtiqueta: 'acento2', ladoEtiqueta: -1, girarEtiqueta: true,
            });
        }
        Object.assign(piezas, opciones.piezas?.(disposicion, { W, H, col, y }) ?? {});

        // En ancho, un programa corto deja la mitad de abajo vacía: se baja
        // todo para que quede centrado debajo del título. En angosto no, porque
        // la consola va pegada abajo a propósito. Con pila tampoco: la pila
        // crece, y centrada se iría por abajo.
        if (!angosta && !conPila) {
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

        // ---- La lupa ----
        // Cuánto se puede acercar sin cortar la línea más larga: lo que mide
        // de ancho lo escrito (con los números de línea), contra la ventana.
        const comoSeVe = typeof lupa === 'object' && lupa ? lupa : {};
        const pedida = lupa === true ? 1.8 : typeof lupa === 'object' && lupa ? (lupa.zoom ?? 1.8) : Number(lupa) || 0;
        const conLupa = pedida > 1 && (lupaDebajoDe == null || (disposicion.ancho ?? Infinity) < lupaDebajoDe);
        const geo = /** @type {any} */ (piezaCodigo.props);
        const altoLinea = geo.tamano * geo.interlineado;
        const izqCodigo = geo.x - geo.ancho / 2;
        const usado = 16 + 2 * geo.tamano * ANCHO_MONO + geo.tamano * 0.9 + necesario * geo.tamano * ANCHO_MONO + 16;
        const zoom = conLupa ? Math.min(pedida, geo.ancho / usado, (tamanoPorAncho / geo.tamano) * 1.15) : 1;
        // La y (en la escena) del centro de la línea k, contando desde 1.
        const arribaCodigo = geo.y - altoCodigo / 2;
        const yLinea = (k) => arribaCodigo + (archivo ? geo.tamano * 1.6 : 0) + geo.tamano * 0.5 + (k - 0.5) * altoLinea;
        const medioVisible = altoCodigo / (2 * zoom);
        const encuadrar = (y) => Math.min(Math.max(y, arribaCodigo + medioVisible), arribaCodigo + altoCodigo - medioVisible);
        let mirarY = encuadrar(arribaCodigo);
        if (zoom > 1.05) {
            // La cámara va antes que el código en `piezas`: el pintor arma
            // primero el contenedor y después lo de adentro.
            const ordenadas = {};
            for (const [id, pieza] of Object.entries(piezas)) {
                if (id === 'codigo') {
                    ordenadas.lupa = camara({
                        x: geo.x, y: geo.y, ancho: geo.ancho + 6, alto: altoCodigo + 6, zoom,
                        // A lo ancho, pegada al borde izquierdo del código: el zoom ya
                        // está limitado para que lo escrito entre; lo que se pierde es
                        // lo que sobraba a la derecha de la línea más larga.
                        mirarX: izqCodigo + geo.ancho / (2 * zoom),
                        mirarY,
                        // Las esquinas, como las de la caja del código (que con
                        // el zoom quedan afuera de la ventana).
                        forma: comoSeVe.forma ?? 'rect',
                        radio: comoSeVe.radio ?? 16,
                        aro: comoSeVe.aro ?? 2,
                        colorAro: 'borde',
                        fondo: 'superficie',
                    });
                    pieza.props.dentro = 'lupa';
                }
                ordenadas[id] = pieza;
            }
            for (const id of Object.keys(piezas)) delete piezas[id];
            Object.assign(piezas, ordenadas);
        }
        /** Si la línea k quedó cerca del borde de lo que se ve, la cámara baja (o sube) hasta dejarle `contexto` líneas. */
        const seguir = (k) => {
            if (zoom <= 1.05 || !(k > 0)) return null;
            const margen = (contexto + 0.5) * altoLinea;
            let nuevo = mirarY;
            if (yLinea(k) - margen < mirarY - medioVisible) nuevo = yLinea(k) - margen + medioVisible;
            if (yLinea(k) + margen > mirarY + medioVisible) nuevo = yLinea(k) + margen - medioVisible;
            nuevo = encuadrar(nuevo);
            if (Math.abs(nuevo - mirarY) < 0.5) return null;
            mirarY = nuevo;
            return nuevo;
        };

        // ---- La línea de tiempo: un paso atrás del otro ----
        /** @type {any[]} */
        const linea = [{ pieza: 'codigo', a: { marca: 1 }, dur: 0.4, en: 0.2 }];
        const anterior = {};
        const indiceSenalado = {};
        let t = 0.7;
        let salidaAnterior = '';
        let respuesta = '';
        let pilaAnterior = '[]';
        let estabaDentro = false;
        const aliasActivos = {};
        const lineasDelPrograma = programa.split('\n');
        traza.forEach((paso, i) => {
            if (capitulos[i]) linea.push({ capitulo: capitulos[i], en: t });
            const vars = paso.variables ?? {};

            // Lo que hizo la línea anterior: lo que cambió desde el paso de antes.
            for (const [nombre, v] of Object.entries(vars)) {
                const id = lugarVariable[nombre];
                const antes = anterior[nombre];
                // Se compara también los atributos: un objeto se escribe "Alumno #1"
                // antes y después de cambiarle uno, y igual hay que redibujarlo.
                if (antes && antes.repr === v.repr && JSON.stringify(antes.atributos) === JSON.stringify(v.atributos)) continue;
                if (!antes) linea.push({ pieza: id, a: { opacidad: 1 }, dur: 0.4, en: t });
                const clase = variables.find((x) => x.nombre === nombre).clase;
                if (clase === 'lista') {
                    linea.push({ pieza: id, a: { items: v.items }, dur: 0, en: t });
                } else if (clase === 'dict') {
                    linea.push({ pieza: id, a: { filas: v.pares ?? [] }, dur: 0, en: t });
                } else if (clase === 'objeto') {
                    linea.push({ pieza: id, a: { filas: v.atributos ?? [] }, dur: 0, en: t });
                } else {
                    linea.push({ pieza: id, a: { valor: v.repr, tipoDato: v.tipo ?? '' }, dur: 0, en: t });
                }
                // Las tablas (diccionarios y objetos) no tienen destello: cambian sus filas.
                if (antes && (clase === 'lista' || clase === 'valor')) {
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

            // La pila de llamadas: si cambió, se redibuja y la de arriba se ilumina.
            if (conPila) {
                const marcos = (paso.pila ?? []).map((m) => ({
                    funcion: m.funcion,
                    filas: Object.entries(m.variables).map(([k, v]) => [k, v.repr]),
                }));
                if (paso.retorno && marcos.length) marcos[marcos.length - 1].retorno = paso.retorno.valor;
                const clave = JSON.stringify(marcos);
                if (clave !== pilaAnterior) {
                    linea.push({ pieza: 'pila', a: { marcos }, dur: 0, en: t });
                    linea.push({ pieza: 'pila', a: { destello: 1 }, dur: 0.12, en: t, curva: 'lineal' });
                    linea.push({ pieza: 'pila', a: { destello: 0 }, dur: 0.8, en: t + 0.12, curva: 'salir' });
                    pilaAnterior = clave;
                }
                // Adentro de una función, la marca del código cambia de color.
                const dentro = marcos.length > 0;
                if (dentro !== estabaDentro && !paso.excepcion) {
                    linea.push({ pieza: 'codigo', a: { colorMarca: dentro ? 'acento2' : 'acento' }, dur: 0.3, en: t + 0.45 });
                    estabaDentro = dentro;
                }
            }

            // Las flechas de "la misma lista": aparecen cuando dos nombres
            // empiezan a ser lo mismo, y se van cuando dejan de serlo.
            for (const [clave, par] of pares) {
                const a = vars[par.a];
                const b = vars[par.b];
                const juntas = a?.ref !== undefined && a.ref === b?.ref;
                if (juntas !== Boolean(aliasActivos[clave])) {
                    linea.push({ pieza: 'alias_' + clave.replace('|', '_'), a: { progreso: juntas ? 1 : 0 }, dur: 0.6, en: t + 0.2 });
                    aliasActivos[clave] = juntas;
                }
            }

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
                const y = seguir(paso.linea);
                if (y != null) linea.push({ pieza: 'lupa', a: { mirarY: y }, dur: i === 0 ? 0 : 0.6, en: t + 0.4 });
            } else if (!paso.excepcion) {
                linea.push({ pieza: 'codigo', a: { marca: 0 }, dur: 0.4, en: t + 0.45 });
            }

            let largo = Math.max(ritmo, 0.9);
            const propia = explicaciones[i] ?? (explicar ? explicarPaso(traza, i, lineasDelPrograma) : undefined);
            // Después de una pregunta, el paso que muestra lo que pasó también
            // dice la respuesta: en un video nadie pudo tocar un botón.
            const explicacion = [respuesta, propia].filter(Boolean).join(' ');
            respuesta = '';
            if (explicacion) {
                const dur = Math.max(ritmo, duracionLectura(explicacion, lectura));
                linea.push({ subtitulo: explicacion, en: t, dur });
                largo = Math.max(largo, dur + 0.3);
            }
            const pregunta = preguntas[i];
            if (pregunta) {
                // La pregunta también va como subtítulo: así la lee la voz del
                // video. Dura, al menos, lo que se tarda en leerla y pensar un poco.
                const enunciado = `${pregunta.pregunta} Pausá y pensalo.`;
                const dur = Math.max(pregunta.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
                linea.push({ marca: 'pregunta', datos: pregunta, en: t + largo, dur });
                linea.push({ subtitulo: enunciado, en: t + largo, dur });
                largo += dur;
                if (pregunta.opciones && pregunta.correcta !== undefined) {
                    respuesta = `Respuesta: ${pregunta.opciones[pregunta.correcta]}. ${pregunta.explicacion ?? ''}`.trim();
                }
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
