/*
  entities/Entity.js
  ------------------
  Clase base de todos los objetos del juego.

  Cada entidad junta sus dos representaciones:
    - this.mesh  -> lo que se ve (Three.js)
    - this.body  -> lo que choca (Cannon-es)

  sync()    copia la posición/rotación del body al mesh (cada frame).
  destroy() se quita a la vez de la escena visual y del mundo físico.
*/

import { syncMeshToBody } from '../utils/sync.js';

export default class Entity {
  constructor(mesh, body) {
    this.mesh = mesh;
    this.body = body;
  }

  sync() {
    if (this.mesh && this.body) {
      syncMeshToBody(this.mesh, this.body);
    }
  }

  // Añadirse al renderer (Three) y a la física (Cannon) de una sola llamada.
  addTo(renderer, physics) {
    if (this.mesh) renderer.add(this.mesh);
    if (this.body) physics.add(this.body);
    return this;
  }

  destroy(renderer, physics) {
    if (this.mesh) renderer.remove(this.mesh);
    if (this.body) physics.remove(this.body);
  }
}
