// Cómo se define una pieza. Las que trae el motor (caja, texto, flecha...) se
// definen exactamente así, de modo que cualquiera puede agregar las suyas.
//
//     const estrella = definirPieza({
//         nombre: 'estrella',
//         predeterminados: { puntas: 5, radio: 60, relleno: 'acento' },
//         colores: ['relleno'],
//         crear(grupo, props) { return { forma: el('path', {}, grupo) }; },
//         actualizar(partes, props) { poner(partes.forma, { d: ..., fill: aCss(props.relleno) }); },
//     });
//
// `crear` arma los nodos una sola vez; `actualizar` los cambia en cada cuadro.
// La posición, la escala, el giro y la opacidad los maneja el motor, no hace
// falta tocarlos.

/** Lo que tienen todas las piezas. */
export const COMUNES = {
    x: 0,
    y: 0,
    escala: 1,
    rotacion: 0,
    opacidad: 1,
    // El id de otra pieza (un celular, por ejemplo) para dibujarse adentro,
    // con las coordenadas de esa pieza.
    dentro: null,
    // Pegarse a un costado de otra pieza y seguirla si se mueve o crece:
    // { a: 'id', lado: 'derecha' | 'izquierda' | 'arriba' | 'abajo' | 'centro',
    //   separacion, alinear: 'centro' | 'inicio' | 'fin', dx, dy }.
    pegar: null,
    // Cuánto manda el pegar sobre x e y (de 0 a 1): animándolo, se despega
    // (o se pega) de a poco.
    pegado: 1,
};

/**
 * @param {{
 *     nombre: string,
 *     predeterminados: Record<string, any>,
 *     colores?: string[],
 *     crear: (grupo: SVGGElement, props: any, ctx: any) => any,
 *     actualizar: (partes: any, props: any, ctx: any) => void,
 *     tamano?: (props: any) => { ancho: number, alto: number },
 *     centro?: (props: any) => { x: number, y: number },
 *     contenedor?: (partes: any) => SVGGElement,
 *     origenContenedor?: (props: any) => { x: number, y: number, escala: number },
 *     dependeDeOtras?: boolean,
 *     validar?: (props: any) => void,
 * }} definicion
 */
export function definirPieza(definicion) {
    if (!definicion.nombre) throw new Error('Una pieza necesita un nombre.');
    const tipo = { colores: [], ...definicion };
    const validas = new Set([...Object.keys(COMUNES), ...Object.keys(definicion.predeterminados)]);

    /** @param {Record<string, any>} [props] */
    function fabrica(props = {}) {
        for (const prop of Object.keys(props)) {
            if (!validas.has(prop)) {
                throw new Error(
                    `Una ${tipo.nombre} no tiene "${prop}". Lo que se le puede poner es: ${[...validas].join(', ')}.`,
                );
            }
        }
        const completas = { ...COMUNES, ...definicion.predeterminados, ...props };
        definicion.validar?.(completas);
        return { tipo, props: completas };
    }
    fabrica.tipo = tipo;
    return fabrica;
}
