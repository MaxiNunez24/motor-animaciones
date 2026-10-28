// El motor sin la capa pedagógica: para una página que solo anima y quiere
// el archivo más chico posible. Es lo mismo que index.js, menos src/pedagogico/.
import { definirComponente } from './controles/componente.js';

export * from './nucleo/index.js';
export * from './piezas/index.js';
export { crearPintor } from './pintor/pintor.js';
export { TEMAS } from './pintor/tema.js';
export { registrar, MotorEscena, definirComponente } from './controles/componente.js';

export const version = '0.8.0';

definirComponente();
