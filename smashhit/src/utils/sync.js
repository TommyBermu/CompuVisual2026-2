/*
  utils/sync.js
  --------------
  Puente entre la física (Cannon-es) y lo visual (Three.js).

  Cada objeto del juego tiene DOS representaciones:
    - body (Cannon): invisible, es quien calcula posición/rotación según la física.
    - mesh (Three):  lo que realmente se ve en pantalla.

  En cada frame Cannon actualiza el body; esta función copia esa posición y
  rotación al mesh para que lo visual coincida con lo simulado.
  Centralizar esto evita bugs sutiles con los cuaterniones.
*/

export function syncMeshToBody(mesh, body) {
    mesh.position.copy(body.position);
    mesh.quaternion.copy(body.quaternion);
}
