// Todo el motor. Al importarlo se registran <motor-escena> y <motor-leccion>,
// para que en una página alcance con incluir el script.
//
// La capa pedagógica viaja en el mismo archivo para que una página de alumno
// necesite un solo <script>. Que esté separada es una cuestión del código: el
// núcleo y los controles no importan nada de src/pedagogico/.
import { definirComponente } from './controles/componente.js';
import { definirLeccion } from './pedagogico/leccion.js';

export * from './nucleo/index.js';
export * from './piezas/index.js';
export { crearPintor } from './pintor/pintor.js';
export { TEMAS } from './pintor/tema.js';
export { registrar, MotorEscena, definirComponente } from './controles/componente.js';
export * from './pedagogico/index.js';

export const version = '0.4.0';

definirComponente();
definirLeccion();
