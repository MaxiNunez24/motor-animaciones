// La extensión 3D del motor: piezas que se dibujan con Three.js.
//
// Va en un archivo aparte (dist/motor-3d.min.js) porque Three.js pesa más que
// todo el motor junto: solo lo carga la página que lo usa.
export { definirGlobo } from './globo.js';
export { aPixel, posicionEnEsfera, haciaElEste, giroParaMirar } from './esfera.js';
export { superficie } from './superficie.js';
