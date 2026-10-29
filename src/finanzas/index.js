// La capa de finanzas: el camino de un precio, su rendimiento y su
// volatilidad, el interés compuesto y el valor presente, lo que paga una
// opción, Black-Scholes, las griegas y las estrategias con opciones; y
// escenas que se arman solas para cada cosa. Usa los planos de la capa de
// matemática (vienen adentro).
//
// Va aparte del motor: dist/motor-finanzas.js para importar
// ('motor-animaciones/finanzas') y dist/motor-finanzas.min.js (global
// MotorFinanzas) para una página, junto con motor.min.js.
export {
    DIAS_HABILES, valorFuturo, valorPresente, caminoPrecio, normalesConSemilla, rendimientos, volatilidad,
    pagoAlVencer, blackScholes, griegas, densidadFinal, montecarlo, plata, fijo,
} from './calculo.js';
export { desdeAccion, desdeInteres, desdePago, desdeBlackScholes, desdeGriegas, desdeEstrategias } from './escenas.js';
