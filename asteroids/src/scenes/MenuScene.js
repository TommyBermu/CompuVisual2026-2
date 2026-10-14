import { WIDTH, HEIGHT, SHIP_LIVES, ASTEROID_COUNT } from '../constants.js';

/*
  Menú inicial: se elige la cantidad de vidas y de asteroides y se pasa a GameScene.
  Controles: ↑ ↓ para elegir opción, ← → para cambiar el valor, ENTER para jugar.
*/
export default class MenuScene extends Phaser.Scene {
	constructor() {
		super('MenuScene');
	}

	create() {
		this.opciones = [
			{ nombre: 'VIDAS', valor: SHIP_LIVES, min: 1, max: 10 },
			{ nombre: 'ASTEROIDES', valor: ASTEROID_COUNT, min: 1, max: 20 },
		];
		this.seleccion = 0;

		this.add.text(WIDTH / 2, 120, 'ASTEROIDS', {
			fontFamily: 'monospace',
			fontSize: '56px',
			color: '#ffffff',
		}).setOrigin(0.5);

		this.textosOpciones = this.opciones.map((opcion, indice) => (
			this.add.text(WIDTH / 2, 260 + indice * 50, '', {
				fontFamily: 'monospace',
				fontSize: '24px',
			}).setOrigin(0.5)
		));

		this.add.text(WIDTH / 2, 420, '[ JUGAR ]', {
			fontFamily: 'monospace',
			fontSize: '32px',
			color: '#72f00b',
		}).setOrigin(0.5).setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.iniciarJuego());

		this.add.text(WIDTH / 2, HEIGHT - 40, '↑ ↓ elegir     ← → cambiar     ENTER jugar', {
			fontFamily: 'monospace',
			fontSize: '14px',
			color: '#888888',
		}).setOrigin(0.5);

		const teclado = this.input.keyboard;
		teclado.on('keydown-UP', () => this.moverSeleccion(-1));
		teclado.on('keydown-DOWN', () => this.moverSeleccion(1));
		teclado.on('keydown-LEFT', () => this.cambiarValor(-1));
		teclado.on('keydown-RIGHT', () => this.cambiarValor(1));
		teclado.on('keydown-ENTER', () => this.iniciarJuego());

		this.actualizarTextos();
	}

	moverSeleccion(delta) {
		const total = this.opciones.length;
		this.seleccion = (this.seleccion + delta + total) % total;
		this.actualizarTextos();
	}

	cambiarValor(delta) {
		const opcion = this.opciones[this.seleccion];
		opcion.valor = Phaser.Math.Clamp(opcion.valor + delta, opcion.min, opcion.max);
		this.actualizarTextos();
	}

	actualizarTextos() {
		this.opciones.forEach((opcion, indice) => {
			const elegida = indice === this.seleccion;
			this.textosOpciones[indice]
				.setText(`${elegida ? '> ' : '  '}${opcion.nombre}: ${opcion.valor}`)
				.setColor(elegida ? '#72f00b' : '#aaaaaa');
		});
	}

	iniciarJuego() {
		this.scene.start('GameScene', {
			vidas: this.opciones[0].valor,
			asteroides: this.opciones[1].valor,
		});
	}
}
