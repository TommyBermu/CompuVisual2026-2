/*
  =========================================================
  Bullet.js  —  Los disparos
  =========================================================
  Responsabilidad: una bala que viaja en línea recta y
  desaparece tras un tiempo (o al salir de pantalla / impactar).

  Sugerencia: extiende Phaser.Physics.Arcade.Sprite/Image.

  Ideas de qué implementar:
  - constructor(scene, x, y)
  - disparar(x, y, angulo): posicionar la bala y darle velocidad
        en la dirección del ángulo recibido.
  - un "tiempo de vida" (lifespan): tras N ms, desactivarla.
        Piensa en reutilizar balas con un Group/Pool en vez de
        crear y destruir todo el rato (más eficiente).

  Consejo: para balas, un Phaser Group con "classType: Bullet"
  y get()/killAndHide() es el patrón clásico de pooling.

  export default class Bullet ...
*/

// export default class Bullet extends Phaser.Physics.Arcade.Image {
//   constructor(scene, x, y) { super(scene, x, y, 'bala'); }
// }
