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
};

/**
 * Devuelve la función de una curva, por nombre o tal cual si ya es función.
 * @param {string | ((p: number) => number)} cual
 * @returns {(p: number) => number}
 */
export function curva(cual) {
    const f = typeof cual === 'function' ? cual : curvas[cual];
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
