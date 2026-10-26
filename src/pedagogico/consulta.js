import { duracionLectura } from '../nucleo/linea.js';
import { texto, tabla } from '../piezas/index.js';
import { codigo, caracteresPorLinea } from './piezas/codigo.js';

// Una consulta SQL, animada: cómo la base recorre la tabla y arma el resultado.
//
// Muestra lo que más cuesta entender de SQL: que se ESCRIBE en un orden
// (SELECT, FROM, WHERE, ORDER BY) y se EJECUTA en otro (FROM, WHERE, SELECT,
// ORDER BY, LIMIT). Cada parte se ilumina en el código cuando le toca.
//
// Entiende el SQL de las consultas del curso, no todo SQL:
//     SELECT col, col | *   FROM tabla
//     [WHERE col op valor [AND|OR col op valor ...]]     op: = != <> < <= > >=
//     [ORDER BY col [ASC|DESC]]   [LIMIT n]
// Si la consulta tiene algo más, avisa en vez de mostrar algo equivocado.

const PATRON = /^\s*SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?\s*;?\s*$/is;

/**
 * Corre una consulta sobre una tabla en memoria, y anota cada paso.
 * @param {string} sql
 * @param {{ nombre: string, columnas: string[], filas: any[][] }} t
 */
export function ejecutarConsulta(sql, t) {
    const m = sql.replace(/\s+/g, ' ').match(PATRON);
    if (!m) throw new Error('No entiendo esa consulta. Uso SELECT ... FROM ... [WHERE ...] [ORDER BY ...] [LIMIT n].');
    const [, columnasTexto, nombreTabla, dondeTexto, ordenCol, ordenDir, limite] = m;
    if (nombreTabla.toLowerCase() !== t.nombre.toLowerCase()) {
        throw new Error(`La consulta lee de "${nombreTabla}", pero la tabla se llama "${t.nombre}".`);
    }
    const indice = (col) => {
        const i = t.columnas.findIndex((c) => c.toLowerCase() === col.toLowerCase());
        if (i === -1) throw new Error(`La tabla ${t.nombre} no tiene la columna "${col}". Tiene: ${t.columnas.join(', ')}.`);
        return i;
    };
    const seleccion = columnasTexto.trim() === '*' ? [...t.columnas] : columnasTexto.split(',').map((c) => t.columnas[indice(c.trim())]);
    const condicion = dondeTexto ? condicionDesde(dondeTexto, indice) : null;

    const recorrido = t.filas.map((fila) => ({ fila, cumple: condicion ? condicion(fila) : true }));
    let resultado = recorrido.filter((r) => r.cumple).map((r) => r.fila);
    const filtradas = resultado;
    const conColumnas = resultado.map((f) => seleccion.map((c) => f[indice(c)]));
    let ordenadas = conColumnas;
    if (ordenCol) {
        const i = seleccion.findIndex((c) => c.toLowerCase() === ordenCol.toLowerCase());
        if (i === -1) throw new Error(`Para ordenar por "${ordenCol}", esa columna tiene que estar en el SELECT.`);
        const signo = (ordenDir ?? 'ASC').toUpperCase() === 'DESC' ? -1 : 1;
        // Orden estable, como SQLite con filas que empatan: quedan como estaban.
        /** @type {[any[], number][]} */
        const conPosicion = conColumnas.map((f, k) => [f, k]);
        ordenadas = conPosicion.sort((a, b) => comparar(a[0][i], b[0][i]) * signo || a[1] - b[1]).map(([f]) => f);
    }
    resultado = limite ? ordenadas.slice(0, Number(limite)) : ordenadas;
    return {
        seleccion,
        donde: dondeTexto?.trim() ?? '',
        orden: ordenCol ? { columna: ordenCol, descendente: (ordenDir ?? '').toUpperCase() === 'DESC' } : null,
        limite: limite ? Number(limite) : null,
        recorrido,
        filtradas,
        conColumnas,
        ordenadas,
        resultado,
    };
}

function comparar(a, b) {
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'es');
}

// WHERE a > 3 AND b = 'x' OR c < 2  →  una función que dice si una fila cumple.
// El AND se junta antes que el OR, como en SQL.
function condicionDesde(textoDonde, indice) {
    const alternativas = textoDonde.split(/\s+OR\s+/i).map((parte) => parte.split(/\s+AND\s+/i).map((c) => comparacion(c, indice)));
    return (fila) => alternativas.some((todas) => todas.every((f) => f(fila)));
}

function comparacion(textoComparacion, indice) {
    const m = textoComparacion.trim().match(/^(\w+)\s*(<=|>=|<>|!=|=|<|>)\s*('(?:[^']|'')*'|-?\d+(?:\.\d+)?)$/);
    if (!m) throw new Error(`No entiendo la condición "${textoComparacion.trim()}". Uso columna, un operador (= != < <= > >=) y un número o un 'texto'.`);
    const [, col, op, crudo] = m;
    const i = indice(col);
    const valor = crudo.startsWith("'") ? crudo.slice(1, -1).replace(/''/g, "'") : Number(crudo);
    const ops = {
        '=': (a, b) => a === b,
        '!=': (a, b) => a !== b,
        '<>': (a, b) => a !== b,
        '<': (a, b) => comparar(a, b) < 0,
        '<=': (a, b) => comparar(a, b) <= 0,
        '>': (a, b) => comparar(a, b) > 0,
        '>=': (a, b) => comparar(a, b) >= 0,
    };
    return (fila) => ops[op](fila[i], valor);
}

/** Cómo se ve un valor en la tabla: los textos sin comillas, como en una planilla. */
const celda = (v) => String(v);

/**
 * La escena de una consulta.
 * @param {{
 *     tabla: { nombre: string, columnas: string[], filas: any[][] },
 *     sql: string,
 *     titulo?: string, descripcion?: string, archivo?: string,
 *     ritmo?: number, lectura?: number,
 *     preguntas?: { donde?: any, seleccion?: any, orden?: any },
 * }} opciones
 *     `preguntas` frena antes de cada parte: antes de filtrar, antes de elegir
 *     las columnas, antes de ordenar. Cada una es { pregunta, opciones, correcta, explicacion }.
 */
export function desdeConsulta(opciones) {
    const { tabla: t, titulo = '', descripcion = '', archivo = 'consulta.sql', ritmo = 0.9, lectura = 13, preguntas = {} } = opciones;
    // El SQL tal cual se escribió, con cada parte en su renglón (para poder marcarla).
    const sql = String(opciones.sql).trim()
        .replace(/\s+(FROM|WHERE|ORDER BY|LIMIT)\s+/gi, (_, p) => `\n${p.toUpperCase()} `)
        .replace(/^select\s+/i, 'SELECT ');
    const r = ejecutarConsulta(sql, t);
    const lineas = sql.split('\n');
    const lineaDe = (palabra) => lineas.findIndex((l) => l.toUpperCase().startsWith(palabra)) + 1;

    return function (disposicion) {
        const angosta = disposicion.nombre === 'angosta';
        const W = angosta ? 640 : 1600;
        const H = angosta ? 1140 : 900;
        const arriba = titulo ? 100 : 30;

        const cod = angosta ? { x: 320, ancho: 610, tamano: 22 } : { x: 430, ancho: 800, tamano: 32 };
        const necesario = Math.max(...lineas.map((l) => l.length));
        cod.tamano = Math.min(cod.tamano, cod.tamano * caracteresPorLinea(cod) / necesario);
        const piezaCodigo = codigo({ x: cod.x, y: 0, ancho: cod.ancho, tamano: cod.tamano, codigo: sql, lenguaje: 'sql', titulo: archivo, marca: 0 });
        const altoCodigo = piezaCodigo.tipo.tamano(piezaCodigo.props).alto;
        piezaCodigo.props.y = arriba + altoCodigo / 2;

        const n = t.filas.length;
        const altoFila = angosta ? Math.min(36, 230 / (n + 1)) : Math.min(54, 400 / (n + 1));
        const tamTabla = angosta ? 18 : 27;
        const origen = angosta
            ? { x: 320, y: arriba + altoCodigo + 50, ancho: 610 }
            : { x: 430, y: arriba + altoCodigo + 60, ancho: 800 };
        const destino = angosta
            ? { x: 320, y: origen.y + (n + 1) * altoFila + 60, ancho: 610 }
            : { x: 1210, y: arriba + 40, ancho: 680 };

        const piezas = {};
        if (titulo) piezas.titulo = texto({ x: W / 2, y: angosta ? 50 : 52, texto: titulo, tamano: angosta ? 30 : 40, peso: 800, anchoMax: W - 40 });
        piezas.codigo = piezaCodigo;
        piezas.rotuloOrigen = texto({ x: origen.x - origen.ancho / 2, y: origen.y - 6, texto: `Tabla ${t.nombre}`, tamano: tamTabla, peso: 700, alineacion: 'inicio', color: 'suave', opacidad: 0 });
        piezas.origen = tabla({
            x: origen.x, y: origen.y + 14, ancho: origen.ancho, altoFila, tamano: tamTabla, anclaje: 'arriba',
            columnas: t.columnas, filas: t.filas.map((f) => f.map(celda)), opacidad: 0,
        });
        piezas.rotuloDestino = texto({ x: destino.x - destino.ancho / 2, y: destino.y - 6, texto: 'Resultado', tamano: tamTabla, peso: 700, alineacion: 'inicio', color: 'suave', opacidad: 0 });
        piezas.destino = tabla({
            // Anclada arriba: va creciendo fila por fila, y el encabezado no tiene que saltar.
            x: destino.x, y: destino.y + 14, ancho: destino.ancho, altoFila, tamano: tamTabla, anclaje: 'arriba',
            columnas: t.columnas, filas: [], filasVisibles: 0, encabezado: 'exito', opacidad: 0,
        });

        /** @type {any[]} */
        const linea = [];
        let tiempo = 0.3;
        const decir = (subtitulo, extra = 0.4) => {
            const dur = Math.max(ritmo * 2, duracionLectura(subtitulo, lectura));
            linea.push({ subtitulo, en: tiempo, dur });
            tiempo += dur + extra;
        };
        const marcar = (n, en = tiempo) => linea.push({ pieza: 'codigo', a: { linea: n, marca: 1 }, dur: 0.35, en });
        const preguntar = (clave) => {
            const p = preguntas[clave];
            if (!p) return '';
            const enunciado = `${p.pregunta} Pausá y pensalo.`;
            const dur = Math.max(p.dur ?? 4, duracionLectura(enunciado, lectura) + 1.5);
            linea.push({ marca: 'pregunta', datos: p, en: tiempo, dur }, { subtitulo: enunciado, en: tiempo, dur });
            tiempo += dur + 0.2;
            return p.opciones && p.correcta !== undefined ? `Respuesta: ${p.opciones[p.correcta]}. ${p.explicacion ?? ''} ` : '';
        };

        // ---- El orden de verdad ----
        linea.push({ capitulo: 'Se escribe en un orden...' , en: 0 });
        decir('SQL se escribe empezando por SELECT, pero la base lo ejecuta en otro orden. Mirá qué parte se ilumina en cada momento.');

        linea.push({ capitulo: `FROM ${t.nombre}`, en: tiempo });
        marcar(lineaDe('FROM'));
        linea.push({ pieza: ['rotuloOrigen', 'origen'], a: { opacidad: 1 }, dur: 0.5, en: tiempo });
        decir(`Primero FROM: la consulta toma la tabla ${t.nombre}, con sus ${n} filas.`);

        if (r.donde) {
            const respuesta = preguntar('donde');
            linea.push({ capitulo: `WHERE ${r.donde}`, en: tiempo });
            marcar(lineaDe('WHERE'));
            // Una columna más en la tabla de origen: si cada fila cumple o no.
            linea.push({ pieza: 'origen', a: { columnas: [...t.columnas, '¿cumple?'], filas: t.filas.map((f) => [...f.map(celda), '']) }, dur: 0, en: tiempo });
            linea.push({ pieza: ['rotuloDestino', 'destino'], a: { opacidad: 1 }, dur: 0.5, en: tiempo });
            decir(`${respuesta}Después WHERE ${r.donde}: revisa fila por fila, y se queda solo con las que cumplen.`, 0);
            const marcas = t.filas.map((f) => [...f.map(celda), '']);
            const elegidas = [];
            r.recorrido.forEach(({ fila, cumple }, i) => {
                marcas[i] = [...fila.map(celda), cumple ? '✓ sí' : '✗ no'];
                linea.push({ pieza: 'origen', a: { resaltarFila: i, filas: marcas.map((x) => [...x]) }, dur: 0, en: tiempo });
                if (cumple) {
                    elegidas.push(fila.map(celda));
                    linea.push({ pieza: 'destino', a: { filas: elegidas.map((x) => [...x]), filasVisibles: elegidas.length - 1 }, dur: 0, en: tiempo });
                    linea.push({ pieza: 'destino', a: { filasVisibles: elegidas.length }, dur: 0.45, en: tiempo + 0.1 });
                }
                tiempo += ritmo;
            });
            linea.push({ pieza: 'origen', a: { resaltarFila: -1 }, dur: 0, en: tiempo });
            decir(`Cumplen ${r.filtradas.length} de ${n}.`);
        } else {
            linea.push({ pieza: ['rotuloDestino', 'destino'], a: { opacidad: 1 }, dur: 0.5, en: tiempo });
            linea.push({ pieza: 'destino', a: { filas: t.filas.map((f) => f.map(celda)), filasVisibles: n }, dur: 0.8, en: tiempo });
            tiempo += 1;
        }

        const respuestaSeleccion = preguntar('seleccion');
        linea.push({ capitulo: `SELECT ${r.seleccion.join(', ')}`, en: tiempo });
        marcar(lineaDe('SELECT'));
        linea.push({ pieza: 'destino', a: { columnas: r.seleccion, filas: r.conColumnas.map((f) => f.map(celda)), filasVisibles: r.conColumnas.length }, dur: 0, en: tiempo + 0.5 });
        decir(`${respuestaSeleccion}Recién ahora SELECT: de cada fila quedan solo las columnas pedidas, ${r.seleccion.join(' y ')}.`);

        if (r.orden) {
            const respuestaOrden = preguntar('orden');
            linea.push({ capitulo: `ORDER BY ${r.orden.columna}`, en: tiempo });
            marcar(lineaDe('ORDER BY'));
            linea.push({ pieza: 'destino', a: { filas: r.ordenadas.map((f) => f.map(celda)) }, dur: 0, en: tiempo + 0.6 });
            decir(`${respuestaOrden}ORDER BY ${r.orden.columna}${r.orden.descendente ? ' DESC' : ''}: ordena el resultado ${r.orden.descendente ? 'de mayor a menor' : 'de menor a mayor'}.`);
        }
        if (r.limite !== null) {
            linea.push({ capitulo: `LIMIT ${r.limite}`, en: tiempo });
            marcar(lineaDe('LIMIT'));
            linea.push({ pieza: 'destino', a: { filas: r.resultado.map((f) => f.map(celda)), filasVisibles: r.resultado.length }, dur: 0, en: tiempo + 0.6 });
            decir(`Y LIMIT ${r.limite}: se queda con las primeras ${r.limite}.`);
        }
        linea.push({ pieza: 'codigo', a: { marca: 0 }, dur: 0.4, en: tiempo });
        decir(`Listo: el resultado tiene ${r.resultado.length} ${r.resultado.length === 1 ? 'fila' : 'filas'}.`);

        return {
            titulo: titulo || 'Una consulta, paso a paso',
            descripcion: descripcion || `La consulta ${sql.replace(/\n/g, ' ')} sobre la tabla ${t.nombre}, en el orden en que la ejecuta la base.`,
            ancho: W,
            alto: H,
            lectura,
            pausaFinal: 1.5,
            piezas,
            linea,
        };
    };
}
