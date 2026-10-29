// Curvas de aceleración: cómo se reparte el cambio a lo largo de una animación.
//
// Todas reciben p (el avance, de 0 a 1) y devuelven cuánto del cambio ya pasó.
// Son funciones puras a propósito: la misma p da siempre lo mismo, y eso es lo
// que permite saltar a cualquier instante y que se vea igual.
//
// Los nombres dicen qué se ve, no la fórmula: "salir" es lo que hace algo que
// sale disparado y frena; "entrar", algo que arranca despacio y acelera.

const C1 = 1.70158;
const C3 = C1 + 1;

/**
 * Un resorte: llega, se pasa, vuelve y se acomoda. Es lo que hace que algo
 * "aterrice" con peso, como en los videos de animación.
 *
 * No se simula paso a paso (eso dependería de cuántos cuadros hubo antes): es
 * la fórmula cerrada de un resorte amortiguado que parte quieto, estirada para
 * que termine justo en p = 1.
 *
 * @param {{ rebote?: number, oscilaciones?: number }} [opciones]
 *     rebote: cuánto se pasa la primera vez (0,3 = un 30 % del recorrido; 0 no se pasa).
 *     oscilaciones: cuántas idas y vueltas entran en la animación.
 * @returns {(p: number) => number}
 */
export function resorte({ rebote = 0.3, oscilaciones = 1.5 } = {}) {
    if (!(rebote > 0)) {
        // Sin rebote: el resorte justo, el que llega lo más rápido posible sin pasarse.
        const k = 8;
        const fin = 1 - (1 + k) * Math.exp(-k);
        return (p) => (1 - (1 + k * p) * Math.exp(-k * p)) / fin;
    }
    const w = 2 * Math.PI * Math.max(oscilaciones, 0.25);
    // El primer pico cae en p = π/w y se pasa e^(−d·π/w): de ahí sale d.
    const d = (-Math.log(Math.min(rebote, 0.95)) * w) / Math.PI;
    const crudo = (p) => 1 - Math.exp(-d * p) * (Math.cos(w * p) + (d / w) * Math.sin(w * p));
    // Lo que le falta para quedar quieto en p = 1 se reparte de a poco, para
    // que no haya un saltito al final.
    const resto = 1 - crudo(1);
    return (p) => crudo(p) + resto * p * p;
}

/**
 * Rebota contra el piso, como una pelota que cae.
 * @param {{ botes?: number }} [opciones] botes: cuántas veces rebota (de 1 a 4)
 */
export function rebotar({ botes = 3 } = {}) {
    const n = Math.min(Math.max(Math.round(botes), 1), 4);
    // Cada bote dura la mitad del anterior y sube la cuarta parte.
    const tramos = [1];
    for (let i = 1; i <= n; i++) tramos.push(tramos[i - 1] / 2);
    const total = tramos[0] + 2 * tramos.slice(1).reduce((a, b) => a + b, 0);
    return (p) => {
        let t = p * total;
        if (t < tramos[0]) return (t / tramos[0]) ** 2;
        t -= tramos[0];
        for (let i = 1; i <= n; i++) {
            const ancho = 2 * tramos[i];
            if (t < ancho) {
                const u = t / ancho * 2 - 1; // de −1 a 1
                return 1 - (tramos[i] / tramos[0]) ** 2 * (1 - u * u);
            }
            t -= ancho;
        }
        return 1;
    };
}

/**
 * Se estira como un elástico: más idas y vueltas que el resorte, y más rápidas.
 * @param {{ amplitud?: number, oscilaciones?: number }} [opciones]
 */
export function elastico({ amplitud = 1, oscilaciones = 3 } = {}) {
    const w = 2 * Math.PI * oscilaciones;
    const crudo = (p) => 1 + amplitud * 2 ** (-10 * p) * Math.sin((p - 0.075) * w);
    // La fórmula de siempre no arranca en 0 ni termina en 1 exactos: se corrige
    // de a poco a lo largo del camino, para que no salte en las puntas.
    const a = crudo(0);
    const b = crudo(1) - 1;
    return (p) => crudo(p) - a * (1 - p) - b * p;
}

/**
 * Se echa para atrás antes de salir, como quien toma envión. Con `llegada`,
 * además se pasa al llegar.
 * @param {{ cuanto?: number, llegada?: boolean }} [opciones] cuanto: qué tan para atrás (1 es lo clásico)
 */
export function anticipar({ cuanto = 1, llegada = false } = {}) {
    const c1 = C1 * cuanto;
    const c2 = c1 * 1.525;
    if (!llegada) return (p) => (c1 + 1) * p ** 3 - c1 * p * p;
    return (p) => (p < 0.5
        ? ((2 * p) ** 2 * ((c2 + 1) * 2 * p - c2)) / 2
        : ((2 * p - 2) ** 2 * ((c2 + 1) * (p * 2 - 2) + c2) + 2) / 2);
}

export const curvas = {
    lineal: (p) => p,
    entrar: (p) => p * p * p,
    salir: (p) => 1 - (1 - p) ** 3,
    // La de todos los días: arranca y frena suave. Es la predeterminada porque
    // es la que menos llama la atención sobre sí misma.
    suave: (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2),
    // Se pasa un poquito y vuelve: para que algo "aterrice" con gracia.
    pasarse: (p) => 1 + C3 * (p - 1) ** 3 + C1 * (p - 1) ** 2,
    // Cambia de golpe apenas empieza. Es la que usa el movimiento reducido.
    salto: (p) => (p > 0 ? 1 : 0),
    resorte: resorte(),
    // Un resorte flojo: se pasa más y tarda más en acomodarse.
    gelatina: resorte({ rebote: 0.45, oscilaciones: 2.5 }),
    rebote: rebotar(),
    elastico: elastico(),
    anticipar: anticipar(),
    envion: anticipar({ llegada: true }),
};

const FABRICAS = { resorte, rebotar, rebote: rebotar, elastico, anticipar };

/**
 * Devuelve la función de una curva: por nombre ('resorte'), tal cual si ya es
 * función, o descripta con datos ({ tipo: 'resorte', rebote: 0.4 }), que es
 * como viene en un estilo guardado en un archivo .json.
 * @param {string | ((p: number) => number) | { tipo: string, [k: string]: any }} cual
 * @returns {(p: number) => number}
 */
export function curva(cual) {
    let f;
    if (typeof cual === 'function') f = cual;
    else if (cual && typeof cual === 'object') {
        const { tipo, ...opciones } = cual;
        if (!FABRICAS[tipo]) {
            throw new Error(`No conozco la curva { tipo: "${tipo}" }. Las que se arman con datos son: ${Object.keys(FABRICAS).join(', ')}.`);
        }
        f = FABRICAS[tipo](opciones);
    } else f = curvas[cual];
    if (!f) {
        throw new Error(
            `No conozco la curva "${cual}". Las que hay son: ${Object.keys(curvas).join(', ')}.`,
        );
    }
    // Las puntas, exactas. Por la coma flotante, "pasarse" da 0,0000000000000002
    // en p = 0: invisible, pero suficiente para que una pieza "quieta" cambie y
    // dos instantes que deberían verse iguales no lo sean. Lo encontró un test.
    return (p) => (p <= 0 ? 0 : p >= 1 ? 1 : f(p));
}
