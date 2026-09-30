/*
  =========================================================
  GameScene.js  —  El corazón del juego
  =========================================================
  Responsabilidad: contener el bucle principal de juego:
  crear la nave y los asteroides, leer input, disparar,
  detectar colisiones y gestionar el estado de la partida.

  Métodos de Phaser que implementarás:

  - create():
      * instanciar la nave (Player)
      * crear el grupo de asteroides iniciales
      * crear el grupo de balas
      * configurar el input del teclado
          this.cursors = this.input.keyboard.createCursorKeys()
      * registrar colisiones con this.physics.add.overlap(...)
          - bala  vs asteroide  -> destruir/partir asteroide, sumar puntos
          - nave  vs asteroide  -> perder vida / reiniciar
      * emitir eventos hacia la UIScene (puntos, vidas)

  - update(time, delta):
      * actualizar la nave según las teclas (rotar, acelerar, disparar)
      * aplicar wrap-around: si algo sale por un borde, aparece
        por el opuesto (Phaser tiene helpers de "wrap")
      * comprobar condición de fin de partida / nueva oleada

  Ideas de organización:
  - La lógica de la nave, balas y asteroides puede vivir en clases
    dentro de src/objects/ para no llenar esta escena.
  - Mantén aquí la orquestación; delega el comportamiento a los objetos.

  Recuerda: clase que extiende Phaser.Scene, super('GameScene'),
  y export default.
*/

// export default class GameScene extends Phaser.Scene {
//   constructor() { super('GameScene'); }
//   create() { }
//   update(time, delta) { }
// }
