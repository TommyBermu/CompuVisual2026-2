import { WIDTH, HEIGHT } from '../constants.js';
import { aplicarZoomCamara, nitidarTextos } from '../escala.js';

/*
  Se dibuja encima de GameScene en dos casos:
  - pausa (ESC):     CONTINUAR / REINICIAR / MENÚ
  - fin de partida:  REINTENTAR / MENÚ
  Controles: ↑ ↓ elegir, ENTER confirmar, ESC continuar (solo en pausa). También con clic.
*/
export default class PauseScene extends Phaser.Scene {
	constructor() {
		super('PauseScene');
	}

	create(datos) {
		// alinea esta capa con el zoom del juego
		aplicarZoomCamara(this);
		this.gameScene = this.scene.get('GameScene');
		this.finPartida = datos?.finPartida ?? false;
		this.victoria = datos?.victoria ?? false;
		this.seleccion = 0;

		// la victoria y el fin de partida comparten el mismo menú (REINTENTAR / MENÚ)
		const esFinal = this.finPartida || this.victoria;

		this.opciones = esFinal
			? [
				{ texto: 'REINTENTAR', accion: () => this.reiniciar() },
				{ texto: 'MENÚ', accion: () => this.irAlMenu() },
			]
			: [
				{ texto: 'CONTINUAR', accion: () => this.continuar() },
				{ texto: 'REINICIAR', accion: () => this.reiniciar() },
				{ texto: 'MENÚ', accion: () => this.irAlMenu() },
			];

		// fondo semitransparente para oscurecer el juego
		this.add.rectangle(0, 0, WIDTH, HEIGHT, 0x000000, 0.6).setOrigin(0);

		const titulo = this.victoria
			? '¡FELICITACIONES!'
			: this.finPartida ? 'FIN DEL JUEGO' : 'PAUSA';

		this.add.text(WIDTH / 2, 200, titulo, {
			fontFamily: 'monospace',
			fontSize: '48px',
			color: this.victoria ? '#72f00b' : '#ffffff',
		}).setOrigin(0.5);

		if (this.victoria) {
			this.add.text(WIDTH / 2, 250, `Destruiste todos los asteroides\n${this.textoPuntuaciones()}`, {
				fontFamily: 'monospace',
				fontSize: '20px',
				color: '#ffffff',
				align: 'center',
			}).setOrigin(0.5);
		}

		// en modo oleadas no hay victoria: al perder, se muestra hasta dónde llegó
		const modoOleadas = this.gameScene.modo === 'oleadas';
		if (this.finPartida && modoOleadas) {
			this.add.text(WIDTH / 2, 250, `Llegaste a la oleada ${this.gameScene.oleada}\n${this.textoPuntuaciones()}`, {
				fontFamily: 'monospace',
				fontSize: '20px',
				color: '#ffffff',
				align: 'center',
			}).setOrigin(0.5);
		}

		const haySubtitulo = this.victoria || (this.finPartida && modoOleadas);
		const yOpciones = haySubtitulo ? 340 : 300;
		this.textosOpciones = this.opciones.map((opcion, indice) => (
			this.add.text(WIDTH / 2, yOpciones + indice * 50, '', {
				fontFamily: 'monospace',
				fontSize: '28px',
			}).setOrigin(0.5).setInteractive({ useHandCursor: true })
				.on('pointerdown', () => opcion.accion())
		));

		const teclado = this.input.keyboard;
		teclado.on('keydown-UP', () => this.moverSeleccion(-1));
		teclado.on('keydown-DOWN', () => this.moverSeleccion(1));
		teclado.on('keydown-ENTER', () => this.opciones[this.seleccion].accion());
		teclado.on('keydown-ESC', () => {
			if (!esFinal) {
				this.continuar();
			}
		});

		this.actualizarTextos();
		nitidarTextos(this); // menú de pausa/fin nítido pese al zoom de cámara
	}

	// línea(s) de puntuación: "Puntuación: N" con 1 jugador, "P1: N   P2: M" con 2
	textoPuntuaciones() {
		const jugadores = this.gameScene.jugadores;
		if (jugadores.length === 1) {
			return `Puntuación: ${jugadores[0].puntuacion}`;
		}
		return jugadores.map((j) => `P${j.id}: ${j.puntuacion}`).join('     ');
	}

	moverSeleccion(delta) {
		const total = this.opciones.length;
		this.seleccion = (this.seleccion + delta + total) % total;
		this.actualizarTextos();
	}

	actualizarTextos() {
		this.opciones.forEach((opcion, indice) => {
			const elegida = indice === this.seleccion;
			this.textosOpciones[indice]
				.setText(elegida ? `> ${opcion.texto} <` : opcion.texto)
				.setColor(elegida ? '#72f00b' : '#aaaaaa');
		});
	}

	continuar() {
		this.scene.resume('GameScene');
		this.scene.stop();
	}

	reiniciar() {
		this.scene.stop();
		this.gameScene.reiniciar();
	}

	irAlMenu() {
		this.scene.stop();
		this.gameScene.irAlMenu();
	}
}
