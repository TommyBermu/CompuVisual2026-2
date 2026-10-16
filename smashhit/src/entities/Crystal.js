/*
  entities/Crystal.js
  -------------------
  El cristal rompible: caja/panel semitransparente (visual) + caja física.
  Guarda su estado (intacto / roto) pero NO calcula la rotura él mismo;
  de eso se encarga systems/Shatter.js cuando una bola lo golpea.

  TODO (sin implementar):
    - Crear mesh semitransparente (MeshStandardMaterial transparent/opacity).
    - Crear body tipo Box.
    - Marcar flag de impacto para que Shatter lo procese.
*/

import Entity from './Entity.js';

export default class Crystal extends Entity {
  // constructor(physics, position, size) { ... super(mesh, body); }
}
