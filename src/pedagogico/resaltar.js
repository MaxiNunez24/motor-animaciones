// Resaltado de código, mínimo y propio: palabras clave, textos, números,
// comentarios y funciones de fábrica, en Python y en JavaScript.
//
// No usa una librería (Prism, highlight.js) porque solo hace falta distinguir
// lo que un alumno que recién empieza necesita ver de un vistazo, y porque así
// el resultado es el mismo en todos lados: la misma línea da siempre los mismos
// pedazos.

const PALABRAS = {
    python: new Set([
        'and', 'as', 'assert', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except',
        'finally', 'for', 'from', 'if', 'import', 'in', 'is', 'lambda', 'not', 'or', 'pass', 'raise',
        'return', 'try', 'while', 'with', 'yield',
    ]),
    js: new Set([
        'break', 'case', 'catch', 'class', 'const', 'continue', 'default', 'do', 'else', 'export',
        'for', 'function', 'if', 'import', 'in', 'let', 'new', 'of', 'return', 'switch', 'this',
        'throw', 'try', 'typeof', 'var', 'while',
    ]),
};

const PROPIAS = {
    python: new Set([
        'print', 'input', 'len', 'range', 'int', 'str', 'float', 'list', 'dict', 'set', 'tuple',
        'sum', 'max', 'min', 'sorted', 'enumerate', 'zip', 'abs', 'round', 'True', 'False', 'None',
    ]),
    js: new Set(['console', 'document', 'window', 'true', 'false', 'null', 'undefined', 'Math', 'JSON']),
    sql: new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'NULL', 'TRUE', 'FALSE']),
};

// SQL no distingue mayúsculas: sus palabras se comparan siempre en mayúscula.
PALABRAS.sql = new Set([
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'ORDER', 'BY', 'ASC', 'DESC', 'LIMIT', 'INSERT', 'INTO',
    'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'JOIN', 'ON', 'AS', 'GROUP', 'HAVING', 'DISTINCT',
    'LIKE', 'IN', 'IS', 'BETWEEN', 'PRIMARY', 'KEY', 'INTEGER', 'TEXT', 'REAL',
]);

const COMENTARIO = { python: '#', js: '//', sql: '--' };
const LETRA = /[A-Za-z_ÁÉÍÓÚáéíóúÑñÜü]/;
const PALABRA = /[A-Za-z0-9_ÁÉÍÓÚáéíóúÑñÜü]/;

/**
 * Parte una línea de código en pedazos con su clase.
 * @param {string} linea
 * @param {'python' | 'js' | 'sql'} lenguaje
 * @returns {{ texto: string, clase: 'normal' | 'palabra' | 'texto' | 'numero' | 'comentario' | 'propia' | 'funcion' }[]}
 */
export function tokenizar(linea, lenguaje = 'python') {
    const palabras = PALABRAS[lenguaje] ?? PALABRAS.python;
    const propias = PROPIAS[lenguaje] ?? PROPIAS.python;
    const comentario = COMENTARIO[lenguaje] ?? '#';
    const pedazos = [];
    const agregar = (texto, clase) => {
        const ultimo = pedazos[pedazos.length - 1];
        if (ultimo && ultimo.clase === clase && clase === 'normal') ultimo.texto += texto;
        else pedazos.push({ texto, clase });
    };

    let i = 0;
    while (i < linea.length) {
        const c = linea[i];
        if (linea.startsWith(comentario, i)) {
            agregar(linea.slice(i), 'comentario');
            break;
        }
        // Un texto, con su prefijo de f-string si lo tiene: f"Hola {nombre}".
        const prefijo = lenguaje === 'python' && /[fFrRbB]/.test(c) && /["']/.test(linea[i + 1] ?? '') ? 1 : 0;
        const comilla = linea[i + prefijo];
        if (comilla === '"' || comilla === "'" || (lenguaje === 'js' && comilla === '`')) {
            let j = i + prefijo + 1;
            while (j < linea.length && linea[j] !== comilla) j += linea[j] === '\\' ? 2 : 1;
            agregar(linea.slice(i, j + 1), 'texto');
            i = j + 1;
            continue;
        }
        if (/[0-9]/.test(c) && !PALABRA.test(linea[i - 1] ?? ' ')) {
            const m = linea.slice(i).match(/^\d+(\.\d+)?/);
            agregar(m[0], 'numero');
            i += m[0].length;
            continue;
        }
        if (LETRA.test(c)) {
            let j = i;
            while (j < linea.length && PALABRA.test(linea[j])) j++;
            const palabra = linea.slice(i, j);
            const sigue = linea.slice(j).trimStart()[0];
            const clave = lenguaje === 'sql' ? palabra.toUpperCase() : palabra;
            const clase = palabras.has(clave) ? 'palabra'
                : propias.has(clave) ? 'propia'
                    : sigue === '(' ? 'funcion'
                        : 'normal';
            agregar(palabra, clase);
            i = j;
            continue;
        }
        agregar(c, 'normal');
        i += 1;
    }
    return pedazos;
}

/** El color (un token del tema) de cada clase de pedazo. */
export const COLORES_CODIGO = {
    normal: 'texto',
    palabra: 'acento',
    texto: 'exito',
    numero: 'acento2',
    comentario: 'suave',
    propia: 'alerta',
    funcion: 'texto',
};
