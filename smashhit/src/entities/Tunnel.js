/*
  entities/Tunnel.js
  ------------------
  La geometría del corredor por el que se avanza (suelo + paredes laterales).
  Puede ser puramente visual o con colisión si se quiere que la bola rebote
  en las paredes.

  TODO (sin implementar):
    - Construir suelo y paredes (repetibles por segmentos para el avance).
    - (Opcional) cuerpos físicos estáticos para las paredes.
*/

import Entity from './Entity.js';

export default class Tunnel extends Entity {
  // constructor(physics, options) { ... super(mesh, body); }
}
