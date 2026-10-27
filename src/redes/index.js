// La capa de redes: un diagrama de secuencia, una dirección IP en bits, la
// ventana de un protocolo, las simulaciones que hay detrás, y escenas que se
// arman solas (un intercambio de mensajes, Go-Back-N y compañía, el control
// de congestión de TCP, una subred).
//
// Va aparte del motor: dist/motor-redes.js para importar
// ('motor-animaciones/redes') y dist/motor-redes.min.js (global MotorRedes)
// para una página, junto con motor.min.js.
export { secuencia, direccionIp, ventanaDeslizante, geometriaSecuencia } from './piezas.js';
export { analizarIp, dividirEnSubredes, aBits, simularArq, simularCongestion } from './calculo.js';
export { desdeIntercambio, desdeVentana, desdeCongestion, desdeSubred } from './escenas.js';
