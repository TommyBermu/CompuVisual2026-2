import { WIDTH, HEIGHT } from '../constants.js';
import { aplicarZoomCamara, nitidarTextos } from '../escala.js';

// convierte el tinte numérico de la nave (0xRRGGBB) a string CSS para el texto
const colorCss = (tinte) => `#${tinte.toString(16).padStart(6, '0')}`;

export default class UIScene extends Phaser.Scene {
  constructor() {
    super('UIScene');
  }

  create() {
    // alinea la UI con el zoom del juego (misma cámara lógica de 800x600)
    aplicarZoomCamara(this);
    this.gameScene = this.scene.get('GameScene');

    // un HUD (vidas + puntos) por jugador, indexado por id
    this.huds = {};
    const jugadores = this.gameScene.jugadores;
    const dosJugadores = jugadores.length === 2;

    jugadores.forEach((jugador) => {
      // con 2 jugadores: P1 a la izquierda, P2 a la derecha. Con 1: todo a la izquierda.
      const derecha = dosJugadores && jugador.id === 2;
      const x = derecha ? WIDTH - 16 : 16;
      const origenX = derecha ? 1 : 0;
      const color = colorCss(jugador.color ?? 0xffffff);

      const etiqueta = dosJugadores ? `P${jugador.id} ` : '';

      const textoVidas = this.add.text(x, 14, `${etiqueta}VIDAS: ${jugador.vidas}`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color: '#ff0000',
        backgroundColor: '#000000',
        padding: { x: 5, y: 3 },
      }).setOrigin(origenX, 0).setDepth(10);

      const textoPuntos = this.add.text(x, 44, `${etiqueta}PUNTOS: ${jugador.puntuacion}`, {
        fontFamily: 'monospace',
        fontSize: '20px',
        color,
        backgroundColor: '#000000',
        padding: { x: 5, y: 3 },
      }).setOrigin(origenX, 0).setDepth(10);

      this.huds[jugador.id] = { textoVidas, textoPuntos, etiqueta };
    });

    // indicador de oleada centrado arriba; solo visible en modo oleadas
    this.textoOleada = this.add.text(WIDTH / 2, 14, '', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#000000',
      padding: { x: 5, y: 3 },
    }).setOrigin(0.5, 0).setDepth(10).setVisible(false);
    // estado inicial (el primer waveChanged puede emitirse antes de registrar el listener)
    this.actualizarOleada(this.gameScene.oleada, this.gameScene.modo);

    this.gameScene.events.on('livesChanged', this.actualizarVidas, this);
    this.gameScene.events.on('scoreChanged', this.actualizarPuntuacion, this);
    this.gameScene.events.on('waveChanged', this.actualizarOleada, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.eliminarEventos, this);

    nitidarTextos(this); // textos de la UI nítidos pese al zoom de cámara
  }

  actualizarVidas(id, vidas) {
    const hud = this.huds[id];
    hud.textoVidas.setText(`${hud.etiqueta}VIDAS: ${vidas}`);
  }

  actualizarPuntuacion(id, puntuacion) {
    const hud = this.huds[id];
    hud.textoPuntos.setText(`${hud.etiqueta}PUNTOS: ${puntuacion}`);
  }

  actualizarOleada(oleada, modo) {
    if (modo === 'oleadas') {
      this.textoOleada.setText(`OLEADA: ${oleada}`).setVisible(true);
    } else {
      this.textoOleada.setVisible(false);
    }
  }

  // el mensaje de "FIN DEL JUEGO" ahora lo muestra PauseScene
  eliminarEventos() {
    this.gameScene.events.off('livesChanged', this.actualizarVidas, this);
    this.gameScene.events.off('scoreChanged', this.actualizarPuntuacion, this);
    this.gameScene.events.off('waveChanged', this.actualizarOleada, this);
  }
}
