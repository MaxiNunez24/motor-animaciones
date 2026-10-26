// Todo el motor. Al importarlo se registra <motor-escena>, para que en una
// página alcance con incluir el script.
import { definirComponente } from './controles/componente.js';

export * from './nucleo/index.js';
export * from './piezas/index.js';
export { crearPintor } from './pintor/pintor.js';
export { TEMAS } from './pintor/tema.js';
export { registrar, MotorEscena, definirComponente } from './controles/componente.js';

export const version = '0.1.0';

definirComponente();
