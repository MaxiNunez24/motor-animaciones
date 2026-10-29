import { azar } from '../nucleo/azar.js';
import { normal, normalAcumulada } from '../mate/estadistica.js';

// Las cuentas de finanzas que hay detrás de las escenas: el interés compuesto
// y el valor presente, el camino de un precio, sus rendimientos y su
// volatilidad, lo que paga una opción al vencer, Black-Scholes y las griegas.
//
// Son las mismas cuentas que se hacen en Python con numpy y scipy (las
// escenas dicen cuáles), escritas a mano para que se vea qué hace cada una.
// Las tasas y la volatilidad son anuales y el tiempo va en años: un mes es
// T = 1/12, un día de bolsa es 1/252.

/** Los días de bolsa de un año: la convención para anualizar. */
export const DIAS_HABILES = 252;

// ---------------- El valor del dinero en el tiempo ----------------

/**
 * Cuánto se tiene después de T años, con una tasa anual r que se capitaliza
 * `veces` por año. Con veces = Infinity, capitalización continua: e^(rT).
 */
export function valorFuturo(monto, r, T, veces = Infinity) {
    if (veces === Infinity) return monto * Math.exp(r * T);
    return monto * (1 + r / veces) ** (veces * T);
}

/** Cuánto vale hoy un monto que se cobra dentro de T años: monto · e^(−rT). */
export function valorPresente(monto, r, T) {
    return monto * Math.exp(-r * T);
}

// ---------------- El precio de una acción ----------------

/**
 * Un camino posible del precio, día por día, con el modelo que usa
 * Black-Scholes (el movimiento browniano geométrico): cada día el precio se
 * multiplica por e^((μ − σ²/2)·dt + σ·√dt·z), con z una normal estándar.
 *
 * Con la misma semilla, los mismos z: dos caminos con distinto σ tienen las
 * mismas "sorpresas", una más grande que la otra. Así se compara sin que el
 * azar meta ruido.
 *
 * @param {{ S0: number, mu?: number, sigma: number, dias: number, semilla?: number }} opciones
 * @returns {number[]} dias + 1 precios (el primero es S0)
 */
export function caminoPrecio({ S0, mu = 0.08, sigma, dias, semilla = 1 }) {
    const z = normalesConSemilla(dias, semilla);
    const dt = 1 / DIAS_HABILES;
    const precios = [S0];
    for (let i = 0; i < dias; i++) {
        precios.push(precios[i] * Math.exp((mu - (sigma * sigma) / 2) * dt + sigma * Math.sqrt(dt) * z[i]));
    }
    return precios;
}

/**
 * `n` normales estándar con semilla (Box-Muller: dos uniformes dan una normal).
 * @returns {number[]}
 */
export function normalesConSemilla(n, semilla = 1) {
    const r = azar(semilla);
    return Array.from({ length: n }, () => {
        const u = 1 - r.siguiente();
        const v = r.siguiente();
        return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    });
}

/**
 * Los rendimientos de un día al otro. El simple es (P₁ − P₀) / P₀; el
 * logarítmico, ln(P₁ / P₀), que es el que se suma bien de un día al otro
 * (y el que usa el modelo).
 */
export function rendimientos(precios, { logaritmicos = true } = {}) {
    return precios.slice(1).map((p, i) => (logaritmicos ? Math.log(p / precios[i]) : (p - precios[i]) / precios[i]));
}

/**
 * La volatilidad anual que se ve en unos precios diarios: el desvío de los
 * rendimientos logarítmicos por √252. Es lo que en Python se escribe
 * np.log(p).diff().std() * np.sqrt(252).
 */
export function volatilidad(precios, porAnio = DIAS_HABILES) {
    const r = rendimientos(precios);
    const m = r.reduce((a, b) => a + b, 0) / r.length;
    const varianza = r.reduce((a, b) => a + (b - m) ** 2, 0) / (r.length - 1);
    return Math.sqrt(varianza * porAnio);
}

// ---------------- Las opciones ----------------

/**
 * Lo que paga una opción el día que vence, si el precio terminó en S:
 * un call (derecho a comprar a K) paga S − K si conviene, y si no, nada.
 * Un put (derecho a vender a K), K − S.
 * @param {'call' | 'put'} tipo
 */
export function pagoAlVencer(tipo, S, K) {
    return tipo === 'put' ? Math.max(K - S, 0) : Math.max(S - K, 0);
}

/**
 * Black-Scholes para una opción europea sobre una acción que no paga
 * dividendos.
 *
 *     d1 = [ln(S/K) + (r + σ²/2)·T] / (σ·√T)
 *     d2 = d1 − σ·√T
 *     call = S·N(d1) − K·e^(−rT)·N(d2)
 *     put  = K·e^(−rT)·N(−d2) − S·N(−d1)
 *
 * Al vencer (T = 0), o sin volatilidad, no hay incertidumbre: vale lo que
 * paga (con σ = 0, lo que pagaría el precio que crece a la tasa r, traído a hoy).
 *
 * @param {{ S: number, K: number, T: number, r: number, sigma: number, tipo?: 'call' | 'put' }} o
 */
export function blackScholes({ S, K, T, r, sigma, tipo = 'call' }) {
    const descuento = Math.exp(-r * Math.max(T, 0));
    if (!(T > 0) || !(sigma > 0)) {
        const adelante = S / descuento;
        return {
            precio: descuento * pagoAlVencer(tipo, adelante, K),
            d1: adelante > K ? Infinity : -Infinity, d2: adelante > K ? Infinity : -Infinity,
            Nd1: adelante > K ? 1 : 0, Nd2: adelante > K ? 1 : 0, descuento,
        };
    }
    const raiz = sigma * Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / raiz;
    const d2 = d1 - raiz;
    const Nd1 = normalAcumulada(d1);
    const Nd2 = normalAcumulada(d2);
    const precio = tipo === 'put'
        ? K * descuento * normalAcumulada(-d2) - S * normalAcumulada(-d1)
        : S * Nd1 - K * descuento * Nd2;
    return { precio, d1, d2, Nd1, Nd2, descuento };
}

/**
 * Las griegas: cuánto cambia el precio de la opción cuando se mueve una sola
 * de las cosas de las que depende, con las demás quietas (una derivada parcial).
 *
 *   Δ delta: por cada $1 que sube la acción.
 *   Γ gamma: cuánto cambia delta por cada $1 (la curvatura).
 *   Θ theta: por cada día que pasa (casi siempre negativa: el tiempo cuesta).
 *   ν vega:  por cada punto (1 %) que sube la volatilidad.
 *   ρ rho:   por cada punto (1 %) que sube la tasa.
 *
 * `theta` y `vega` y `rho` vienen ya en esas unidades (por día y por punto),
 * que son las que se leen en una pantalla de opciones; `thetaAnual`,
 * `vegaEntera` y `rhoEntera` son las derivadas tal cual.
 *
 * @param {{ S: number, K: number, T: number, r: number, sigma: number, tipo?: 'call' | 'put' }} o
 */
export function griegas({ S, K, T, r, sigma, tipo = 'call' }) {
    if (!(T > 0) || !(sigma > 0)) {
        const enDinero = tipo === 'put' ? S < K : S > K;
        return { delta: enDinero ? (tipo === 'put' ? -1 : 1) : 0, gamma: 0, theta: 0, thetaAnual: 0, vega: 0, vegaEntera: 0, rho: 0, rhoEntera: 0 };
    }
    const { d1, d2, descuento } = blackScholes({ S, K, T, r, sigma, tipo });
    const raizT = Math.sqrt(T);
    const densidad = normal(d1);
    const gamma = densidad / (S * sigma * raizT);
    const vegaEntera = S * densidad * raizT;
    const comun = (-S * densidad * sigma) / (2 * raizT);
    let delta;
    let thetaAnual;
    let rhoEntera;
    if (tipo === 'put') {
        delta = normalAcumulada(d1) - 1;
        thetaAnual = comun + r * K * descuento * normalAcumulada(-d2);
        rhoEntera = -K * T * descuento * normalAcumulada(-d2);
    } else {
        delta = normalAcumulada(d1);
        thetaAnual = comun - r * K * descuento * normalAcumulada(d2);
        rhoEntera = K * T * descuento * normalAcumulada(d2);
    }
    return {
        delta, gamma,
        theta: thetaAnual / 365, thetaAnual,
        vega: vegaEntera / 100, vegaEntera,
        rho: rhoEntera / 100, rhoEntera,
    };
}

/**
 * La densidad del precio dentro de T años, en el mundo "neutral al riesgo"
 * de Black-Scholes: ln(S_T) es normal con media ln(S) + (r − σ²/2)·T y
 * desvío σ·√T (una lognormal). Lo más probable es que termine cerca de S, y
 * puede subir mucho más de lo que puede bajar (nunca baja de 0).
 */
export function densidadFinal(x, { S, T, r, sigma }) {
    if (!(x > 0)) return 0;
    const m = Math.log(S) + (r - (sigma * sigma) / 2) * T;
    const s = sigma * Math.sqrt(T);
    return normal(Math.log(x), m, s) / x;
}

/**
 * El precio de una opción por simulación (Monte Carlo): se inventan `n`
 * precios finales posibles, se promedia lo que pagaría la opción en cada uno
 * y se trae ese promedio a hoy. Con muchos, da lo mismo que la fórmula: es la
 * misma idea, contada de otra forma.
 *
 * @param {{ S: number, K: number, T: number, r: number, sigma: number, tipo?: 'call' | 'put', n?: number, semilla?: number }} o
 */
export function montecarlo({ S, K, T, r, sigma, tipo = 'call', n = 20000, semilla = 1 }) {
    const z = normalesConSemilla(n, semilla);
    let suma = 0;
    let enDinero = 0;
    const finales = z.map((zi) => S * Math.exp((r - (sigma * sigma) / 2) * T + sigma * Math.sqrt(T) * zi));
    for (const ST of finales) {
        const pago = pagoAlVencer(tipo, ST, K);
        suma += pago;
        if (pago > 0) enDinero++;
    }
    return { precio: Math.exp(-r * T) * (suma / n), pagoPromedio: suma / n, probEnDinero: enDinero / n, finales };
}

/** Un precio con signo y siempre con sus decimales: $ 12,30 (no $ 12,3). */
export function plata(v, decimales = 2) {
    const s = Math.abs(v).toFixed(decimales).replace('.', ',');
    return `${v < 0 && Number(s.replace(',', '.')) !== 0 ? '−' : ''}$ ${s}`;
}

/** Un número con sus decimales fijos y coma: 0,640 (para las griegas y las probabilidades). */
export function fijo(v, decimales = 3) {
    const s = Math.abs(v).toFixed(decimales).replace('.', ',');
    return `${v < 0 && Number(s.replace(',', '.')) !== 0 ? '−' : ''}${s}`;
}
