/*
  =========================================================
  UIScene.js  —  Interfaz (HUD)
  =========================================================
  Responsabilidad: mostrar puntuación, vidas y mensajes
  (p.ej. "GAME OVER"). Corre EN PARALELO sobre la GameScene,
  por eso conviene tenerla separada.

  Cómo se suele lanzar: desde GameScene con
      this.scene.launch('UIScene')
  (launch = correr otra escena a la vez, sin parar la actual).

  Qué va aquí:
  - create():
      * textos con this.add.text(...) para score y vidas
      * escuchar eventos que emite GameScene para actualizar
        esos textos (p.ej. cuando cambian puntos o vidas)

  Comunicación entre escenas (una forma común):
      // en GameScene:
      this.events.emit('updateScore', nuevoValor)
      // en UIScene, obteniendo la GameScene:
      const game = this.scene.get('GameScene')
      game.events.on('updateScore', (v) => { ... })

  Clase que extiende Phaser.Scene, super('UIScene'), export default.
*/

// export default class UIScene extends Phaser.Scene {
//   constructor() { super('UIScene'); }
//   create() { }
// }
