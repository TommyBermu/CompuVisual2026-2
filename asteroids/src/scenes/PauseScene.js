import { WIDTH, HEIGHT } from '../constants.js';

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
		this.gameScene = this.scene.get('GameScene');
		this.finPartida = datos?.finPartida ?? false;
		this.seleccion = 0;

		this.opciones = this.finPartida
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

		this.add.text(WIDTH / 2, 200, this.finPartida ? 'FIN DEL JUEGO' : 'PAUSA', {
			fontFamily: 'monospace',
			fontSize: '48px',
			color: '#ffffff',
		}).setOrigin(0.5);

		this.textosOpciones = this.opciones.map((opcion, indice) => (
			this.add.text(WIDTH / 2, 300 + indice * 50, '', {
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
			if (!this.finPartida) {
				this.continuar();
			}
		});

		this.actualizarTextos();
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
