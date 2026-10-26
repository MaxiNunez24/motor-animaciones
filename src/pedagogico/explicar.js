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

function queEs(v) {
    if (v.atributos) return 'el mismo objeto';
    if (v.tipo === 'dict') return 'el mismo diccionario';
    return 'la misma lista';
}

function crear(nombre, v, otras) {
    // Si ya hay otra variable con la misma referencia, lo importante no es qué
    // tiene adentro sino que NO es una copia.
    const gemela = v.ref !== undefined && Object.entries(otras).find(([n, o]) => n !== nombre && o.ref === v.ref);
    if (gemela) return `${nombre} no es una copia: es ${queEs(v)} que ${gemela[0]}.`;
    // Y al revés: lo mismo adentro, pero otra referencia. Eso sí es una copia.
    const copia = v.ref !== undefined && Object.entries(otras).find(([n, o]) => n !== nombre && o.ref !== undefined && o.ref !== v.ref && o.repr === v.repr);
    if (copia) return `${nombre} es una copia: tiene lo mismo que ${copia[0]}, pero es otra ${v.atributos ? 'cosa' : 'lista'}.`;
    if (v.atributos) return `${nombre} es un objeto ${v.tipo}.`;
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
    if (ahora.atributos && antes.atributos) {
        const previos = Object.fromEntries(antes.atributos);
        const cambio = ahora.atributos.find(([k, val]) => previos[k] !== val);
        if (cambio) {
            return cambio[0] in previos
                ? `${nombre}.${cambio[0]} pasa de ${corto(previos[cambio[0]])} a ${corto(cambio[1])}.`
                : `${nombre} tiene un atributo nuevo: ${cambio[0]} vale ${corto(cambio[1])}.`;
        }
    }
    if (ahora.items && antes.items) {
        if (ahora.items.length === antes.items.length + 1) return `Se agregó ${corto(ahora.items.at(-1))} a la lista ${nombre}.`;
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

// Si cambió algo de una variable. No alcanza con comparar cómo se escribe: un
// objeto se escribe "Alumno #1" antes y después de cambiarle un atributo.
function cambio(a, b) {
    return a.repr !== b.repr || JSON.stringify(a.atributos) !== JSON.stringify(b.atributos);
}

// Lo que cambió entre dos grupos de variables, en frases.
function diferencias(varsAntes, vars, delFor) {
    const frases = [];
    const cambiadas = [];
    for (const [nombre, v] of Object.entries(vars)) {
        const previa = varsAntes[nombre];
        if (nombre === delFor && previa?.repr !== v.repr) {
            frases.push(previa
                ? `Otra vuelta del for: ${nombre} vale ${corto(v.repr)}.`
                : `El for toma el primer elemento: ${nombre} vale ${corto(v.repr)}.`);
        } else if (!previa) {
            frases.push(crear(nombre, v, vars));
        } else if (cambio(previa, v)) {
            cambiadas.push({ nombre, previa, v });
        }
    }
    // Dos nombres que cambian a la vez porque son lo mismo: se dice una vez,
    // y se dice por qué. Es justo lo que sorprende.
    const yaDichas = new Set();
    for (const c of cambiadas) {
        if (yaDichas.has(c.nombre)) continue;
        const juntas = cambiadas.filter((o) => o.v.ref !== undefined && o.v.ref === c.v.ref);
        if (juntas.length > 1) {
            juntas.forEach((o) => yaDichas.add(o.nombre));
            const nombres = juntas.map((o) => o.nombre);
            frases.push(`${cambiar(c.nombre, c.previa, c.v)} Y también ${nombres.slice(1).join(' y ')}: son ${queEs(c.v)}.`);
        } else {
            frases.push(cambiar(c.nombre, c.previa, c.v));
        }
    }
    return frases;
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

    if (paso.excepcion) {
        const { tipo, mensaje } = paso.excepcion;
        return `Se corta con un error en la línea ${paso.linea}: ${tipo}${mensaje ? ` (${mensaje})` : ''}.`;
    }

    // ---- Funciones: una llamada nueva, o una que termina ----
    const pila = paso.pila ?? [];
    const pilaAntes = antes.pila ?? [];
    if (paso.retorno) {
        const { funcion, valor } = paso.retorno;
        // Lo que hizo la última línea de la función, y después que termina.
        const hizo = pila.length && pila.length === pilaAntes.length
            ? diferencias(pilaAntes[pilaAntes.length - 1].variables, pila[pila.length - 1].variables, null).slice(0, 1)
            : [];
        const termina = funcion === '__init__'
            ? 'Termina __init__: el objeto queda armado.'
            : valor === 'None' ? `${funcion} termina (no devuelve nada).` : `${funcion} termina y devuelve ${corto(valor)}.`;
        return [...hizo, termina].join(' ');
    }
    if (pila.length > pilaAntes.length) {
        const actual = pila[pila.length - 1];
        const vars = Object.entries(actual.variables);
        const yo = vars.find(([k]) => k === 'self');
        const parametros = vars.filter(([k]) => k !== 'self');
        const adentro = parametros.length ? ` Adentro, ${parametros.map(([k, v]) => `${k} vale ${corto(v.repr)}`).join(' y ')}.` : '';
        if (actual.funcion === '__init__') return `Se crea un objeto nuevo y se ejecuta __init__.${adentro}`;
        const llamada = `${actual.funcion}(${parametros.map(([, v]) => corto(v.repr)).join(', ')})`;
        const otraVez = pilaAntes.length && pilaAntes[pilaAntes.length - 1].funcion === actual.funcion ? ': la función se llama a sí misma' : '';
        const sobre = yo ? ` sobre ${corto(yo[1].repr)}` : '';
        return `Se llama a ${llamada}${sobre}${otraVez}.${adentro}`;
    }

    // Si la línea anterior era un `for`, la variable que cambió es la del
    // bucle: eso se dice así, que es lo que hay que entender.
    const delFor = (lineas[antes.linea - 1] ?? '').trim().match(/^for\s+([A-Za-z_]\w*)\s+in\b/)?.[1];
    const frases = [];
    // Adentro de la misma función: primero lo que cambió en ella.
    if (pila.length && pila.length === pilaAntes.length) {
        frases.push(...diferencias(pilaAntes[pilaAntes.length - 1].variables, pila[pila.length - 1].variables, delFor));
    }
    frases.push(...diferencias(antes.variables ?? {}, paso.variables ?? {}, delFor));

    const nueva = (paso.salida ?? '').slice((antes.salida ?? '').length).replace(/\n$/, '');
    // Lo que se muestra se corta más tarde que un valor: es una frase entera.
    if (nueva) frases.push(`Se muestra: ${corto(nueva.split('\n').at(-1), 60)}`);

    if (frases.length === 0) {
        // Nada cambió: fue una línea que decide a dónde seguir.
        const texto = (lineas[antes.linea - 1] ?? '').trim();
        // Un def o un class solo DEFINEN: el código de adentro no corre todavía.
        const def = texto.match(/^def\s+([A-Za-z_]\w*)/);
        if (def) return `Se define la función ${def[1]}: todavía no se ejecuta, queda guardada para cuando se la llame.`;
        const clase = texto.match(/^class\s+([A-Za-z_]\w*)/);
        if (clase) return `Se define la clase ${clase[1]}: es el molde, todavía no hay ningún objeto.`;
        if (pila.length < pilaAntes.length) return 'Vuelve a donde se había llamado a la función.';
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
