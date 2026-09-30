/*
  =========================================================
  Player.js  —  La nave del jugador
  =========================================================
  Responsabilidad: encapsular todo lo de la nave: su cuerpo
  físico, cómo rota, cómo acelera y cómo dispara.

  Sugerencia: extiende Phaser.Physics.Arcade.Sprite (o .Image
  si dibujas con gráficos). Así la nave tiene body físico
  (velocidad, aceleración) gratis.

  Ideas de qué implementar:
  - constructor(scene, x, y): añadirse a la escena y al mundo físico
        scene.add.existing(this)
        scene.physics.add.existing(this)
    Activar drag/rozamiento y velocidad máxima para que se sienta
    como Asteroids (la nave "deriva").

  - rotarIzquierda() / rotarDerecha(): cambiar angularVelocity o angle
  - acelerar(): aplicar aceleración EN LA DIRECCIÓN a la que apunta
        (mira this.scene.physics.velocityFromRotation(...) )
  - disparar(): crear una bala en la punta de la nave con velocidad
        en la dirección actual (o pide al GameScene que la cree)

  Piensa el wrap-around: puede vivir aquí o gestionarlo la escena.

  export default class Player ...
*/

// export default class Player extends Phaser.Physics.Arcade.Sprite {
//   constructor(scene, x, y) { super(scene, x, y, 'nave'); }
// }
