// Las cuentas de la capa de matemática, sin nada de dibujo: derivadas,
// gradientes, curvas de nivel, mínimos cuadrados, el algoritmo de Euclides.
//
// Están aparte para poder probarlas desde Node contra resultados conocidos, y
// para que una escena se pueda armar con los números ya calculados: la
// animación solo muestra lo que estas funciones dicen.

/** @typedef {(x: number, y: number) => number} Funcion2 */

// El paso de las derivadas numéricas. Con diferencias centradas, 1e-5 da unos
// diez decimales buenos para las funciones de una clase, sin que la coma
// flotante empiece a meter ruido.
const H = 1e-5;

/**
 * La derivada de f en x, con diferencias centradas.
 * @param {(x: number) => number} f
 * @param {number} x
 */
export function derivada(f, x) {
    return (f(x + H) - f(x - H)) / (2 * H);
}

/**
 * El gradiente de f en (x, y): las dos derivadas parciales.
 * @param {Funcion2} f
 * @param {number} x
 * @param {number} y
 * @returns {[number, number]}
 */
export function gradiente(f, x, y) {
    return [(f(x + H, y) - f(x - H, y)) / (2 * H), (f(x, y + H) - f(x, y - H)) / (2 * H)];
}

/**
 * La pendiente de la secante entre x y x + h: el cociente incremental.
 * @param {(x: number) => number} f
 * @param {number} x
 * @param {number} h
 */
export function cocienteIncremental(f, x, h) {
    return (f(x + h) - f(x)) / h;
}

/**
 * Los puntos que recorre el descenso del gradiente:
 * x(t+1) = x(t) − α · ∇f(x(t)).
 *
 * Corta antes si el gradiente ya es casi cero (llegó a un punto crítico) o si
 * los números se van al infinito (la tasa es demasiado grande: diverge).
 * @param {Funcion2} f
 * @param {{ inicio: [number, number], tasa: number, pasos?: number, gradiente?: (x: number, y: number) => [number, number], tolerancia?: number }} opciones
 */
export function descensoGradiente(f, opciones) {
    const pasos = opciones.pasos ?? 20;
    const grad = opciones.gradiente ?? ((x, y) => gradiente(f, x, y));
    const tolerancia = opciones.tolerancia ?? 1e-6;
    let [x, y] = opciones.inicio;
    const puntos = [{ x, y, z: f(x, y), gradiente: grad(x, y) }];
    let motivo = 'pasos';
    for (let i = 0; i < pasos; i++) {
        const [gx, gy] = puntos[puntos.length - 1].gradiente;
        if (Math.hypot(gx, gy) < tolerancia) {
            motivo = 'minimo';
            break;
        }
        x -= opciones.tasa * gx;
        y -= opciones.tasa * gy;
        const z = f(x, y);
        if (!Number.isFinite(z) || Math.abs(z) > 1e12) {
            motivo = 'diverge';
            break;
        }
        puntos.push({ x, y, z, gradiente: grad(x, y) });
    }
    return { puntos, motivo };
}

/**
 * La recta de mínimos cuadrados y = b0 + b1·x, con todo lo que se usa en la
 * clase para saber si el ajuste es bueno.
 *
 * Sxx, Syy y Sxy se calculan restando primero las medias, y no con la fórmula
 * Σx² − (Σx)²/n: dan lo mismo, pero así no se pierden decimales cuando los x
 * son grandes y parecidos entre sí.
 * @param {[number, number][]} datos
 */
export function regresionLineal(datos) {
    const n = datos.length;
    if (n < 2) throw new Error('Para ajustar una recta hacen falta al menos dos puntos.');
    const mediaX = datos.reduce((s, [x]) => s + x, 0) / n;
    const mediaY = datos.reduce((s, [, y]) => s + y, 0) / n;
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    for (const [x, y] of datos) {
        sxx += (x - mediaX) ** 2;
        syy += (y - mediaY) ** 2;
        sxy += (x - mediaX) * (y - mediaY);
    }
    if (sxx === 0) throw new Error('Todos los puntos tienen el mismo x: no hay una recta que los ajuste (sería vertical).');
    const b1 = sxy / sxx;
    const b0 = mediaY - b1 * mediaX;
    const residuos = datos.map(([x, y]) => y - (b0 + b1 * x));
    // SSR: la suma de los residuos al cuadrado, lo que la recta NO explica.
    const ssr = residuos.reduce((s, e) => s + e * e, 0);
    const r2 = syy === 0 ? 1 : 1 - ssr / syy;
    const r = syy === 0 ? 1 : sxy / Math.sqrt(sxx * syy);
    return { n, mediaX, mediaY, sxx, syy, sxy, b0, b1, residuos, ssr, r2, r, varianza: n > 2 ? ssr / (n - 2) : 0 };
}

/**
 * La suma de los residuos al cuadrado de una recta cualquiera: lo que el
 * método de mínimos cuadrados hace lo más chico posible.
 * @param {[number, number][]} datos
 * @param {number} b0
 * @param {number} b1
 */
export function sumaResiduos(datos, b0, b1) {
    return datos.reduce((s, [x, y]) => s + (y - (b0 + b1 * x)) ** 2, 0);
}

/**
 * Las curvas de nivel f(x, y) = nivel, como segmentos sueltos, con el método
 * de los cuadrados que marchan (marching squares): se parte el rango en una
 * grilla y, en cada cuadradito, se mira de qué lado del nivel cae cada esquina.
 *
 * Se devuelven segmentos y no caminos unidos porque para dibujarlos alcanza, y
 * la cuenta queda simple y fácil de probar.
 * @param {Funcion2} f
 * @param {{ xmin: number, xmax: number, ymin: number, ymax: number }} rango
 * @param {number} nivel
 * @param {number} [resolucion] cuántos cuadraditos por lado
 * @returns {[number, number, number, number][]} segmentos [x1, y1, x2, y2]
 */
export function curvaDeNivel(f, rango, nivel, resolucion = 48) {
    const { xmin, xmax, ymin, ymax } = rango;
    const dx = (xmax - xmin) / resolucion;
    const dy = (ymax - ymin) / resolucion;
    const valores = [];
    for (let j = 0; j <= resolucion; j++) {
        const fila = [];
        for (let i = 0; i <= resolucion; i++) fila.push(f(xmin + i * dx, ymin + j * dy) - nivel);
        valores.push(fila);
    }
    /** @type {[number, number, number, number][]} */
    const segmentos = [];
    // Dónde cruza el cero entre dos esquinas: interpolación lineal.
    const cruce = (a, b, va, vb) => {
        const t = va / (va - vb);
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    };
    for (let j = 0; j < resolucion; j++) {
        for (let i = 0; i < resolucion; i++) {
            const esquinas = [
                [xmin + i * dx, ymin + j * dy],
                [xmin + (i + 1) * dx, ymin + j * dy],
                [xmin + (i + 1) * dx, ymin + (j + 1) * dy],
                [xmin + i * dx, ymin + (j + 1) * dy],
            ];
            const v = [valores[j][i], valores[j][i + 1], valores[j + 1][i + 1], valores[j + 1][i]];
            if (v.some((n) => !Number.isFinite(n))) continue;
            const puntos = [];
            for (let k = 0; k < 4; k++) {
                const a = v[k];
                const b = v[(k + 1) % 4];
                if ((a < 0) !== (b < 0)) puntos.push(cruce(esquinas[k], esquinas[(k + 1) % 4], a, b));
            }
            if (puntos.length === 2) {
                segmentos.push([puntos[0][0], puntos[0][1], puntos[1][0], puntos[1][1]]);
            } else if (puntos.length === 4) {
                // Una silla: el centro decide cómo se unen los cuatro cruces.
                const centro = (v[0] + v[1] + v[2] + v[3]) / 4;
                const [a, b, c, d] = puntos;
                if ((centro < 0) === (v[0] < 0)) {
                    segmentos.push([a[0], a[1], d[0], d[1]], [b[0], b[1], c[0], c[1]]);
                } else {
                    segmentos.push([a[0], a[1], b[0], b[1]], [c[0], c[1], d[0], d[1]]);
                }
            }
        }
    }
    return segmentos;
}

/**
 * El algoritmo de Euclides, con cada división: a = q·b + r, hasta que el resto
 * da cero. El último resto que no es cero es el máximo común divisor.
 * @param {number} a
 * @param {number} b
 */
export function euclides(a, b) {
    if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error('El algoritmo de Euclides es para números enteros.');
    if (a === 0 && b === 0) throw new Error('mcd(0, 0) no está definido: cualquier número divide a 0.');
    let x = Math.abs(a);
    let y = Math.abs(b);
    // Siempre se divide el más grande por el más chico.
    if (y > x) [x, y] = [y, x];
    const pasos = [];
    while (y !== 0) {
        const q = Math.floor(x / y);
        const r = x - q * y;
        pasos.push({ a: x, b: y, q, r });
        [x, y] = [y, r];
    }
    return { mcd: x, pasos };
}

/**
 * El resto de dividir a por n, siempre entre 0 y n − 1 (también para a
 * negativo, que es lo que se usa en aritmética modular: −1 ≡ 4 (mod 5)).
 * @param {number} a
 * @param {number} n
 */
export function modulo(a, n) {
    return ((a % n) + n) % n;
}

/**
 * Las propiedades de una relación sobre un conjunto finito, con el ejemplo que
 * lo muestra cuando NO se cumple: es lo que hay que escribir en un parcial.
 * @param {(string | number)[]} conjunto
 * @param {[any, any][]} pares
 */
export function propiedadesRelacion(conjunto, pares) {
    const clave = (a, b) => JSON.stringify([a, b]);
    const R = new Set(pares.map(([a, b]) => clave(a, b)));
    for (const [a, b] of pares) {
        if (!conjunto.includes(a) || !conjunto.includes(b)) {
            throw new Error(`El par (${a}, ${b}) tiene un elemento que no está en el conjunto.`);
        }
    }
    const esta = (a, b) => R.has(clave(a, b));

    const sinLazo = conjunto.find((a) => !esta(a, a));
    const reflexiva = { cumple: sinLazo === undefined, contraejemplo: sinLazo === undefined ? null : [sinLazo, sinLazo] };

    const sinVuelta = pares.find(([a, b]) => !esta(b, a));
    const simetrica = { cumple: !sinVuelta, contraejemplo: sinVuelta ?? null };

    const ida = pares.find(([a, b]) => a !== b && esta(b, a));
    const antisimetrica = { cumple: !ida, contraejemplo: ida ?? null };

    let falla = null;
    for (const [a, b] of pares) {
        for (const [c, d] of pares) {
            if (b === c && !esta(a, d)) {
                falla = { pares: [[a, b], [c, d]], falta: [a, d] };
                break;
            }
        }
        if (falla) break;
    }
    const transitiva = { cumple: !falla, contraejemplo: falla };

    return { reflexiva, simetrica, antisimetrica, transitiva, equivalencia: reflexiva.cumple && simetrica.cumple && transitiva.cumple };
}

/**
 * La matriz de una relación: 1 si (fila, columna) está en R.
 * @param {(string | number)[]} conjunto
 * @param {[any, any][]} pares
 */
export function matrizRelacion(conjunto, pares) {
    return conjunto.map((a) => conjunto.map((b) => (pares.some(([x, y]) => x === a && y === b) ? 1 : 0)));
}

/**
 * Un número lindo para las marcas de un eje: 1, 2 o 5 por una potencia de 10,
 * de modo que entren más o menos `cuantas` marcas en el rango.
 * @param {number} rango
 * @param {number} [cuantas]
 */
export function pasoLindo(rango, cuantas = 8) {
    const crudo = rango / cuantas;
    const potencia = 10 ** Math.floor(Math.log10(crudo));
    const fraccion = crudo / potencia;
    const lindo = fraccion < 1.5 ? 1 : fraccion < 3.5 ? 2 : fraccion < 7.5 ? 5 : 10;
    return lindo * potencia;
}

/**
 * Un número para mostrar: sin decimales de más ni "-0", con coma decimal como
 * se escribe acá.
 * @param {number} n
 * @param {number} [decimales]
 */
export function numero(n, decimales = 2) {
    if (!Number.isFinite(n)) return String(n);
    const r = Math.round(n * 10 ** decimales) / 10 ** decimales;
    const texto = String(Object.is(r, -0) ? 0 : r);
    return texto.replace('.', ',');
}
