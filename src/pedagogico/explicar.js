// Explicaciones automáticas: qué hizo cada paso de un programa, en castellano.
//
// Sirven para la animación que se arma sola con el programa de un alumno, que
// no trae explicaciones escritas a mano. Dicen lo que se VE (qué variable
// cambió, qué se mostró) y no por qué: el porqué lo pone el docente, o la
// pregunta del alumno.

const LIMITE = 28;

// Un valor largo se acorta: "[4, 8, 15, 16, 23, 42, …]".
function corto(repr, limite = LIMITE) {
    return repr.length > limite ? `${repr.slice(0, limite - 1)}…` : repr;
}

function crear(nombre, v) {
    if (v.items) {
        const cuantos = v.items.length;
        const que = v.tipo === 'tuple' ? 'una tupla' : 'una lista';
        return cuantos === 0 ? `${nombre} es ${que} vacía.` : `${nombre} es ${que} con ${cuantos} ${cuantos === 1 ? 'elemento' : 'elementos'}.`;
    }
    if (v.tipo === 'dict') {
        const cuantos = v.pares?.length ?? 0;
        return cuantos === 0 ? `${nombre} es un diccionario vacío.` : `${nombre} es un diccionario con ${cuantos} ${cuantos === 1 ? 'clave' : 'claves'}.`;
    }
    return `${nombre} vale ${corto(v.repr)}.`;
}

function cambiar(nombre, antes, ahora) {
    if (ahora.items && antes.items) {
        if (ahora.items.length === antes.items.length + 1) return `Se agregó ${corto(ahora.items.at(-1))} a ${nombre}.`;
        if (ahora.items.length === antes.items.length - 1) return `${nombre} ahora tiene un elemento menos.`;
        return `${nombre} cambió: ahora es ${corto(ahora.repr)}.`;
    }
    if (ahora.tipo === 'dict' && antes.tipo === 'dict') {
        const nuevas = (ahora.pares ?? []).filter(([k]) => !(antes.pares ?? []).some(([k2]) => k2 === k));
        if (nuevas.length === 1) return `Se agregó la clave ${corto(nuevas[0][0])} a ${nombre}.`;
        return `${nombre} cambió.`;
    }
    return `${nombre} pasa de ${corto(antes.repr)} a ${corto(ahora.repr)}.`;
}

/**
 * Qué pasó en el paso `i` de una traza: lo que hizo la línea anterior.
 * @param {any[]} traza
 * @param {number} i
 * @param {string[]} lineas el código, renglón por renglón
 * @returns {string}
 */
export function explicarPaso(traza, i, lineas) {
    const paso = traza[i];
    if (i === 0) return 'Arranca el programa, por la primera línea.';
    const antes = traza[i - 1];
    const frases = [];

    if (paso.excepcion) {
        const { tipo, mensaje } = paso.excepcion;
        return `Se corta con un error en la línea ${paso.linea}: ${tipo}${mensaje ? ` (${mensaje})` : ''}.`;
    }

    const varsAntes = antes.variables ?? {};
    // Si la línea anterior era un `for`, la variable que cambió es la del
    // bucle: eso se dice así, que es lo que hay que entender.
    const delFor = (lineas[antes.linea - 1] ?? '').trim().match(/^for\s+([A-Za-z_]\w*)\s+in\b/)?.[1];
    for (const [nombre, v] of Object.entries(paso.variables ?? {})) {
        const previa = varsAntes[nombre];
        if (nombre === delFor && previa?.repr !== v.repr) {
            frases.push(previa
                ? `Otra vuelta del for: ${nombre} vale ${corto(v.repr)}.`
                : `El for toma el primer elemento: ${nombre} vale ${corto(v.repr)}.`);
        } else if (!previa) {
            frases.push(crear(nombre, v));
        } else if (previa.repr !== v.repr) {
            frases.push(cambiar(nombre, previa, v));
        }
    }

    const nueva = (paso.salida ?? '').slice((antes.salida ?? '').length).replace(/\n$/, '');
    // Lo que se muestra se corta más tarde que un valor: es una frase entera.
    if (nueva) frases.push(`Se muestra: ${corto(nueva.split('\n').at(-1), 60)}`);

    if (frases.length === 0) {
        // Nada cambió: fue una línea que decide a dónde seguir.
        const texto = (lineas[antes.linea - 1] ?? '').trim();
        // Desde la línea de un bucle: a la de abajo es entrar; a cualquier otra, salir.
        if (/^(for|while)\b/.test(texto) && paso.linea === antes.linea + 1) return 'Entra al bucle.';
        if (/^for\b/.test(texto)) return 'No quedan elementos: termina el for.';
        if (/^while\b/.test(texto)) return 'La condición del while ya no se cumple: sale del bucle.';
        if (/^(if|elif)\b/.test(texto)) return paso.linea === antes.linea + 1 ? 'La condición se cumple: entra.' : 'La condición no se cumple: la saltea.';
        if (/^else\b/.test(texto)) return 'Entra por el else.';
        const vuelve = (lineas[paso.linea - 1] ?? '').trim();
        if (paso.linea > 0 && paso.linea < antes.linea && /^(for|while)\b/.test(vuelve)) return 'Vuelve al principio del bucle.';
    }
    if (paso.linea === 0) frases.push('Terminó el programa.');
    return frases.slice(0, 2).join(' ') || `Sigue en la línea ${paso.linea}.`;
}

/**
 * Qué variable recorre qué lista, mirando la traza: una variable cuyos valores
 * van siendo, en orden, los elementos de una lista (lo que hace un `for`).
 * @param {any[]} traza
 * @returns {Record<string, string>} { lista: variable }
 */
export function detectarPunteros(traza) {
    /** @type {Record<string, string>} */
    const encontrados = {};
    const nombres = new Set(traza.flatMap((p) => Object.keys(p.variables ?? {})));
    for (const lista of nombres) {
        for (const variable of nombres) {
            if (variable === lista || Object.values(encontrados).includes(variable)) continue;
            let indice = -1;
            let anterior = null;
            let aciertos = 0;
            let falla = false;
            for (const paso of traza) {
                const l = paso.variables?.[lista];
                const v = paso.variables?.[variable];
                if (!l?.items || !v || v.repr === anterior) continue;
                anterior = v.repr;
                const k = l.items.indexOf(v.repr, indice + 1);
                if (k === -1) {
                    falla = true;
                    break;
                }
                indice = k;
                aciertos += 1;
            }
            if (!falla && aciertos >= 2 && !encontrados[lista]) encontrados[lista] = variable;
        }
    }
    return encontrados;
}
