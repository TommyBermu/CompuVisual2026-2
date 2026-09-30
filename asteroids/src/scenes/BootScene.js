/*
  =========================================================
  BootScene.js  —  Carga inicial
  =========================================================
  Responsabilidad: preparar los recursos antes de jugar y,
  al terminar, arrancar la GameScene.

  >>> DECISIÓN TOMADA: GRÁFICOS VECTORIALES <<<
  No cargamos imágenes (PNG). En su lugar, DIBUJAMOS las formas
  con un objeto Graphics y las convertimos en texturas una sola
  vez aquí. Luego Player/Bullet/Asteroid usan esas texturas como
  sprites físicos normales.

  Enfoque recomendado (generateTexture), a implementar en create():
    1. const g = this.add.graphics();
    2. Dibuja la forma con lineStyle / moveTo / lineTo / strokePath
       (o strokeTriangle, strokeCircle, fillCircle, etc.)
    3. g.generateTexture('nave', ancho, alto);
    4. g.clear();  // reutiliza el mismo graphics para la siguiente forma
    5. Repite para 'asteroide' y 'bala'.
    6. g.destroy();  // ya no lo necesitas
    7. this.scene.start('GameScene');

  Formas sugeridas:
    - 'nave'      -> triángulo apuntando hacia +X (ángulo 0 de Phaser)
    - 'bala'      -> círculo pequeño
    - 'asteroide' -> polígono irregular de ~8-10 vértices

  OJO con el ángulo: dibuja la nave apuntando a la DERECHA (+X)
  para que velocityFromRotation(this.rotation, ...) la empuje
  hacia la punta sin desfases.

  Como BootScene ya no carga archivos, puede que no necesites
  preload(); todo el trabajo va en create().

  Estructura: clase que extiende Phaser.Scene, super('BootScene'),
  y export default.
*/

// export default class BootScene extends Phaser.Scene {
//   constructor() { super('BootScene'); }
//   create() {
//     // dibujar formas -> generateTexture -> this.scene.start('GameScene')
//   }
// }
