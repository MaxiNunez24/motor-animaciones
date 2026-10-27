// La capa de matemática: un plano cartesiano con lo que va encima (gráficas,
// puntos, vectores, rectas, curvas de nivel, campos), las cuentas que hay
// detrás, y escenas que se arman solas (la derivada, el descenso del
// gradiente, la regresión lineal, Euclides, las relaciones, el reloj modular).
//
// Va aparte del motor, para que una página que no la usa no la cargue:
// dist/motor-mate.js para importar ('motor-animaciones/mate') y
// dist/motor-mate.min.js (global MotorMate) para una página, junto con motor.min.js.
export { plano, grafica, punto, vector, recta, segmento, curvasNivel, campo, aPixelPlano } from './plano.js';
export {
    derivada, gradiente, cocienteIncremental, descensoGradiente, regresionLineal, sumaResiduos,
    curvaDeNivel, euclides, modulo, propiedadesRelacion, matrizRelacion, pasoLindo, numero,
} from './calculo.js';
export { desdeDerivada, desdeDescenso, desdeRegresion, desdeEuclides, desdeRelacion, desdeModulo, analizarCuenta } from './escenas.js';
