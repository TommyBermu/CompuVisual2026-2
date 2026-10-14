import { WIDTH, HEIGHT } from '../constants.js';

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    this.gameScene = this.scene.get('GameScene');
    this.textoVidas = this.add.text(16, 14, `VIDAS: ${this.gameScene.player.vidas}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ff0000',
      backgroundColor: '#000000',
      padding: { x: 5, y: 3 },
    }).setDepth(10);
    this.textoPuntuacion = this.add.text(WIDTH - 16, 14, `PUNTOS: ${this.gameScene.puntuacion}`, {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#72f00b',
      backgroundColor: '#000000',
      padding: { x: 5, y: 3 },
    }).setOrigin(1, 0).setDepth(10);

    this.gameScene.events.on('livesChanged', this.actualizarVidas, this);
    this.gameScene.events.on('scoreChanged', this.actualizarPuntuacion, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.eliminarEventos, this);
  }

  actualizarVidas(vidas) {
    this.textoVidas.setText(`VIDAS: ${vidas}`);
  }

  actualizarPuntuacion(puntuacion) {
    this.textoPuntuacion.setText(`PUNTOS: ${puntuacion}`);
  }

  // el mensaje de "FIN DEL JUEGO" ahora lo muestra PauseScene
  eliminarEventos() {
    this.gameScene.events.off('livesChanged', this.actualizarVidas, this);
    this.gameScene.events.off('scoreChanged', this.actualizarPuntuacion, this);
  }
}
