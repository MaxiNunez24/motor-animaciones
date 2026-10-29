// El núcleo: todo lo que no necesita una página para funcionar. Se puede usar
// (y probar) desde Node, sin navegador.
export { compilar, duracionLectura } from './linea.js';
export { Reloj } from './reloj.js';
export { curvas, curva, resorte, rebotar, elastico, anticipar } from './curvas.js';
export { figuras, mezclarFormas, leerCamino } from './formas.js';
export { palabrasDe } from './palabras.js';
export { aparecer, desaparecer, dibujar, borrar, mover, transformar, decir, sonar } from './atajos.js';
export { interpolar, limitar } from './interpolar.js';
export { azar } from './azar.js';
export { TOKENS, aCss, mezclarColores } from './colores.js';
