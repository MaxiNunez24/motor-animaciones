import { azar } from '../nucleo/azar.js';
import { regresionLineal } from './calculo.js';

// Las cuentas de estadística inferencial: la normal y la t de Student (sus
// densidades, sus áreas y sus valores críticos), los intervalos de confianza,
// los tests de hipótesis y lo que se le pregunta a una recta de regresión.
//
// Nada de tablas: los valores críticos se calculan. Las aproximaciones están
// elegidas para que las primeras cuatro cifras coincidan con las de cualquier
// tabla (y con scipy), que es lo que se muestra.

// ---------------- La normal ----------------

/**
 * La densidad de la normal.
 * @param {number} x
 * @param {number} [media]
 * @param {number} [desvio]
 */
export function normal(x, media = 0, desvio = 1) {
    const z = (x - media) / desvio;
    return Math.exp(-0.5 * z * z) / (desvio * Math.sqrt(2 * Math.PI));
}

/**
 * P(X ≤ x) para una normal. Usa la función error con la serie de Taylor
 * cerca del 0 y una fracción continua en las colas: así las colas chiquitas
 * (los p-valores) no se redondean a cero antes de tiempo.
 * @param {number} x
 * @param {number} [media]
 * @param {number} [desvio]
 */
export function normalAcumulada(x, media = 0, desvio = 1) {
    const z = (x - media) / desvio;
    if (z < 0) return 0.5 * erfc(-z / Math.SQRT2);
    return 1 - 0.5 * erfc(z / Math.SQRT2);
}

function erfc(x) {
    // Para x chico, 1 − erf(x) con la serie; para x grande, la fracción continua de Lentz.
    if (x < 2) {
        let termino = x;
        let suma = x;
        for (let n = 1; n < 100; n++) {
            termino *= (-x * x) / n;
            const s = termino / (2 * n + 1);
            suma += s;
            if (Math.abs(s) < 1e-17 * Math.abs(suma)) break;
        }
        return 1 - (2 / Math.sqrt(Math.PI)) * suma;
    }
    // erfc(x) = exp(−x²)/√π · 1/(x + 1/2/(x + 1/(x + 3/2/(x + ...))))
    let f = x;
    let C = x;
    let D = 0;
    for (let n = 1; n < 300; n++) {
        const a = n / 2;
        D = x + a * D;
        D = D === 0 ? 1e-300 : 1 / D;
        C = x + a / C;
        if (C === 0) C = 1e-300;
        const delta = C * D;
        f *= delta;
        if (Math.abs(delta - 1) < 1e-16) break;
    }
    return Math.exp(-x * x) / Math.sqrt(Math.PI) / f;
}

/**
 * El valor z que deja un área p a su izquierda (la inversa de la acumulada),
 * con el método de Acklam y un paso de Newton para pulirlo.
 * @param {number} p entre 0 y 1
 */
export function normalInversa(p) {
    if (!(p > 0 && p < 1)) throw new Error('La inversa de la normal necesita un área entre 0 y 1 (sin incluirlos).');
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const bajo = 0.02425;
    let z;
    if (p < bajo) {
        const q = Math.sqrt(-2 * Math.log(p));
        z = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= 1 - bajo) {
        const q = p - 0.5;
        const r = q * q;
        z = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
        const q = Math.sqrt(-2 * Math.log(1 - p));
        z = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    const e = normalAcumulada(z) - p;
    return z - e / normal(z);
}

// ---------------- La t de Student ----------------

function logGamma(x) {
    // Lanczos (g = 7, 9 coeficientes): sobra para lo que se usa acá.
    const g = [0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
        12.507343278686905, -0.13857109526572012, 9.984369578019572e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - logGamma(1 - x);
    x -= 1;
    let s = g[0];
    for (let i = 1; i < 9; i++) s += g[i] / (x + i);
    const t = x + 7.5;
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}

/**
 * La beta incompleta regularizada I_x(a, b), con la fracción continua de
 * Numerical Recipes. Es lo que hay detrás del área bajo la t.
 */
function betaIncompleta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const frente = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    // La fracción converge rápido de un lado; del otro se usa la simetría.
    if (x > (a + 1) / (a + b + 2)) return 1 - betaIncompleta(1 - x, b, a);
    const chico = 1e-300;
    let c = 1;
    let d = 1 - ((a + b) * x) / (a + 1);
    d = Math.abs(d) < chico ? 1 / chico : 1 / d;
    let h = d;
    for (let m = 1; m <= 300; m++) {
        const m2 = 2 * m;
        let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
        d = 1 + aa * d;
        d = Math.abs(d) < chico ? 1 / chico : 1 / d;
        c = 1 + aa / c;
        if (Math.abs(c) < chico) c = chico;
        h *= d * c;
        aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
        d = 1 + aa * d;
        d = Math.abs(d) < chico ? 1 / chico : 1 / d;
        c = 1 + aa / c;
        if (Math.abs(c) < chico) c = chico;
        const delta = d * c;
        h *= delta;
        if (Math.abs(delta - 1) < 1e-15) break;
    }
    return (frente * h) / a;
}

/**
 * La densidad de la t de Student con `gl` grados de libertad.
 * @param {number} x
 * @param {number} gl
 */
export function student(x, gl) {
    if (gl > 1e6) return normal(x);
    return Math.exp(logGamma((gl + 1) / 2) - logGamma(gl / 2) - 0.5 * Math.log(gl * Math.PI) - ((gl + 1) / 2) * Math.log(1 + (x * x) / gl));
}

/**
 * P(T ≤ x) para una t con `gl` grados de libertad.
 * @param {number} x
 * @param {number} gl
 */
export function studentAcumulada(x, gl) {
    if (!(gl > 0)) throw new Error('La t de Student necesita grados de libertad positivos.');
    if (gl > 1e6) return normalAcumulada(x);
    const cola = 0.5 * betaIncompleta(gl / (gl + x * x), gl / 2, 0.5);
    return x >= 0 ? 1 - cola : cola;
}

/**
 * El valor t que deja un área p a su izquierda. Arranca de la normal y
 * ajusta con Newton (la t se parece a la normal, así que converge enseguida).
 * @param {number} p
 * @param {number} gl
 */
export function studentInversa(p, gl) {
    if (!(p > 0 && p < 1)) throw new Error('La inversa de la t necesita un área entre 0 y 1 (sin incluirlos).');
    if (gl > 1e6) return normalInversa(p);
    let t = normalInversa(p);
    for (let i = 0; i < 60; i++) {
        const e = studentAcumulada(t, gl) - p;
        const paso = e / Math.max(student(t, gl), 1e-300);
        // Con pocos grados de libertad las colas son pesadas: un paso de Newton
        // muy largo se pasa de largo. Se lo frena.
        t -= Math.max(-2, Math.min(2, paso));
        if (Math.abs(paso) < 1e-12 * Math.max(1, Math.abs(t))) break;
    }
    return t;
}

/**
 * El valor crítico de dos colas: el que deja α/2 a su derecha.
 * Con `gl` = Infinity es el z de la normal.
 * @param {number} alfa
 * @param {number} [gl]
 */
export function valorCritico(alfa, gl = Infinity) {
    return Number.isFinite(gl) ? studentInversa(1 - alfa / 2, gl) : normalInversa(1 - alfa / 2);
}

// ---------------- Muestras ----------------

/**
 * La media, el desvío y la varianza muestrales (dividiendo por n − 1).
 * @param {number[]} datos
 */
export function resumen(datos) {
    const n = datos.length;
    if (n < 2) throw new Error('Para estimar la varianza hacen falta al menos dos datos.');
    const media = datos.reduce((s, x) => s + x, 0) / n;
    const varianza = datos.reduce((s, x) => s + (x - media) ** 2, 0) / (n - 1);
    return { n, media, varianza, desvio: Math.sqrt(varianza) };
}

/**
 * Una muestra de una normal, con semilla: siempre la misma para la misma
 * semilla (Box-Muller sobre el azar del motor).
 * @param {{ n: number, media?: number, desvio?: number, semilla?: number | string }} opciones
 */
export function muestraNormal({ n, media = 0, desvio = 1, semilla = 1 }) {
    const r = azar(semilla);
    const datos = [];
    while (datos.length < n) {
        const u = 1 - r.siguiente();
        const v = r.siguiente();
        const radio = Math.sqrt(-2 * Math.log(u));
        datos.push(media + desvio * radio * Math.cos(2 * Math.PI * v));
        if (datos.length < n) datos.push(media + desvio * radio * Math.sin(2 * Math.PI * v));
    }
    return datos;
}

// ---------------- Intervalos y tests ----------------

/**
 * El intervalo de confianza para la media: x̄ ± crítico · error estándar.
 * Si se conoce el desvío de la población (`sigma`), el crítico es de la
 * normal; si no, se usa el desvío de la muestra y el crítico es de la t con
 * n − 1 grados de libertad.
 * @param {{ media: number, desvio?: number, sigma?: number, n: number, confianza?: number }} opciones
 */
export function intervaloMedia({ media, desvio, sigma, n, confianza = 0.95 }) {
    if (!(confianza > 0 && confianza < 1)) throw new Error('La confianza va entre 0 y 1: 0.95 es el 95 %.');
    const conocido = sigma != null;
    const s = conocido ? sigma : desvio;
    if (!(s >= 0)) throw new Error('Para el intervalo hace falta el desvío: desvio (de la muestra) o sigma (de la población).');
    const gl = conocido ? Infinity : n - 1;
    const alfa = 1 - confianza;
    const critico = valorCritico(alfa, gl);
    const error = s / Math.sqrt(n);
    const margen = critico * error;
    return { centro: media, error, critico, margen, desde: media - margen, hasta: media + margen, gl, alfa, distribucion: conocido ? 'normal' : 't' };
}

/**
 * La decisión de un test a partir del estadístico: el valor crítico, la
 * región de rechazo y el p-valor.
 *
 * cola: 'dos' (H₁: ≠), 'derecha' (H₁: >) o 'izquierda' (H₁: <).
 * @param {{ estadistico: number, gl?: number, alfa?: number, cola?: 'dos' | 'derecha' | 'izquierda' }} opciones
 */
export function decidir({ estadistico, gl = Infinity, alfa = 0.05, cola = 'dos' }) {
    if (!['dos', 'derecha', 'izquierda'].includes(cola)) throw new Error("La cola de un test es 'dos', 'derecha' o 'izquierda'.");
    const F = (x) => (Number.isFinite(gl) ? studentAcumulada(x, gl) : normalAcumulada(x));
    const inversa = (p) => (Number.isFinite(gl) ? studentInversa(p, gl) : normalInversa(p));
    let critico;
    let pValor;
    let rechaza;
    if (cola === 'dos') {
        critico = inversa(1 - alfa / 2);
        pValor = 2 * Math.min(F(estadistico), 1 - F(estadistico));
        rechaza = Math.abs(estadistico) > critico;
    } else if (cola === 'derecha') {
        critico = inversa(1 - alfa);
        pValor = 1 - F(estadistico);
        rechaza = estadistico > critico;
    } else {
        critico = inversa(alfa);
        pValor = F(estadistico);
        rechaza = estadistico < critico;
    }
    return { estadistico, gl, alfa, cola, critico, pValor: Math.min(1, Math.max(0, pValor)), rechaza };
}

/**
 * El test t para la media: H₀: μ = μ₀. El estadístico es
 * (x̄ − μ₀) / (s / √n), que bajo H₀ tiene distribución t con n − 1 grados de libertad.
 * @param {{ media: number, desvio: number, n: number, mu0: number, alfa?: number, cola?: 'dos' | 'derecha' | 'izquierda' }} opciones
 */
export function testMedia({ media, desvio, n, mu0, alfa = 0.05, cola = 'dos' }) {
    const error = desvio / Math.sqrt(n);
    const estadistico = (media - mu0) / error;
    return { ...decidir({ estadistico, gl: n - 1, alfa, cola }), error, media, mu0, n };
}

// ---------------- Regresión ----------------

/**
 * Todo lo que se le pregunta a una recta de regresión simple, más allá de la
 * recta misma: cómo se reparte la variabilidad, la varianza del error, el test
 * de la pendiente y los intervalos.
 *
 * Los nombres siguen la convención de la cursada: STC = SCR + SCE, donde SCR
 * es la parte explicada por la regresión y SCE la que queda en los errores.
 * (Ojo: en inglés, "SSR" suele ser la de los residuos. Por eso acá no se usa.)
 *
 * @param {[number, number][]} datos
 * @param {{ confianza?: number }} [opciones]
 */
export function inferenciaRegresion(datos, { confianza = 0.95 } = {}) {
    const r = regresionLineal(datos);
    if (r.n < 3) throw new Error('Para hacer inferencia sobre la recta hacen falta al menos tres puntos.');
    const gl = r.n - 2;
    const stc = r.syy;
    const sce = r.ssr;
    const scr = stc - sce;
    const sigma2 = sce / gl;
    const eeB1 = Math.sqrt(sigma2 / r.sxx);
    const eeB0 = Math.sqrt(sigma2 * (1 / r.n + r.mediaX ** 2 / r.sxx));
    const alfa = 1 - confianza;
    const critico = studentInversa(1 - alfa / 2, gl);
    const test = decidir({ estadistico: r.b1 / eeB1, gl, alfa });
    const intervalo = (centro, ee) => ({ centro, margen: critico * ee, desde: centro - critico * ee, hasta: centro + critico * ee });
    return {
        ...r,
        gl, stc, scr, sce, sigma2, sigma: Math.sqrt(sigma2), eeB1, eeB0, confianza, critico,
        t: test.estadistico, pValor: test.pValor, rechaza: test.rechaza,
        icB1: intervalo(r.b1, eeB1),
        icB0: intervalo(r.b0, eeB0),
        /** Lo que predice la recta en x. */
        prediccion: (x) => r.b0 + r.b1 * x,
        /** El intervalo de confianza para la respuesta media en x: dónde está la recta verdadera. */
        icm: (x) => intervalo(r.b0 + r.b1 * x, Math.sqrt(sigma2 * (1 / r.n + (x - r.mediaX) ** 2 / r.sxx))),
        /** El intervalo de predicción en x: dónde va a caer UNA observación nueva. */
        ip: (x) => intervalo(r.b0 + r.b1 * x, Math.sqrt(sigma2 * (1 + 1 / r.n + (x - r.mediaX) ** 2 / r.sxx))),
    };
}

/**
 * Mínimos cuadrados con varias variables, resolviendo las ecuaciones
 * normales (XᵀX) b = Xᵀy. X lleva una columna de unos adelante (la ordenada
 * al origen) que se agrega sola.
 *
 * El R² ajustado es 1 − (1 − R²)(n − 1)/(n − k − 1), con k variables: no
 * sube por agregar una variable que no aporta.
 *
 * @param {number[][]} filas cada fila, los valores de las k variables
 * @param {number[]} y
 */
export function minimosCuadrados(filas, y) {
    const n = filas.length;
    if (n !== y.length) throw new Error('Tiene que haber un y por cada fila de X.');
    const X = filas.map((f) => [1, ...f]);
    const p = X[0].length;
    if (n <= p) throw new Error(`Con ${p - 1} variables hacen falta más de ${p} filas.`);
    const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, f) => s + f[i] * f[j], 0)));
    const Xty = Array.from({ length: p }, (_, i) => X.reduce((s, f, k) => s + f[i] * y[k], 0));
    const coeficientes = resolverSistema(XtX, Xty);
    const ajustados = X.map((f) => f.reduce((s, v, i) => s + v * coeficientes[i], 0));
    const media = y.reduce((s, v) => s + v, 0) / n;
    const stc = y.reduce((s, v) => s + (v - media) ** 2, 0);
    const sce = y.reduce((s, v, i) => s + (v - ajustados[i]) ** 2, 0);
    const r2 = stc === 0 ? 1 : 1 - sce / stc;
    const k = p - 1;
    return { coeficientes, ajustados, stc, sce, scr: stc - sce, r2, r2Ajustado: 1 - ((1 - r2) * (n - 1)) / (n - k - 1), n, k };
}

/** Gauss-Jordan con pivoteo parcial. */
function resolverSistema(A, b) {
    const n = b.length;
    const M = A.map((fila, i) => [...fila, b[i]]);
    for (let col = 0; col < n; col++) {
        let mejor = col;
        for (let f = col + 1; f < n; f++) if (Math.abs(M[f][col]) > Math.abs(M[mejor][col])) mejor = f;
        if (Math.abs(M[mejor][col]) < 1e-12 * Math.max(1, Math.abs(M[col][col]))) {
            throw new Error('Las ecuaciones normales no tienen solución única: hay variables que son combinación de otras.');
        }
        [M[col], M[mejor]] = [M[mejor], M[col]];
        for (let f = 0; f < n; f++) {
            if (f === col) continue;
            const k = M[f][col] / M[col][col];
            for (let c = col; c <= n; c++) M[f][c] -= k * M[col][c];
        }
    }
    return M.map((fila, i) => fila[n] / fila[i]);
}
