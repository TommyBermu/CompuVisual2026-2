import Player from '../objects/Player.js';
import { WIDTH, HEIGHT } from '../constants.js';

export default class GameScene extends Phaser.Scene {
	constructor() {
		super('GameScene');
	}

	create() {
		// marco para delimitar visualmente el canvas
		this.dibujarMarco();

		this.player = new Player(this, WIDTH / 2, HEIGHT / 2);
		this.cursors = this.input.keyboard.createCursorKeys();
	}

	dibujarMarco() {
		const grosor = 2;
		const g = this.add.graphics();
		g.lineStyle(grosor, 0x44ff88, 0.8);
		g.strokeRect(
		grosor / 2,
		grosor / 2,
		WIDTH - grosor,
		HEIGHT - grosor
		);
	}

	update() {
		this.actualizarNave();
		this.wrapAround();
	}

	actualizarNave() {
		if (this.cursors.left.isDown)
			this.player.rotarIzquierda();
		else if (this.cursors.right.isDown) 
			this.player.rotarDerecha();
		else
			this.player.dejarDeRotar();

		if (this.cursors.up.isDown)
			this.player.acelerar();
		else
			this.player.dejarDeAcelerar();

		//no sé si hacer también que se pueda usar el mouse, tipo que la navecita mire hacia el mouse
		//y que con click derecho acelere y con izquierdo dispare....
	}

	// para que la nave salga por el otro lado cuando salga del canvas
	wrapAround() {
		this.physics.world.wrap(this.player, this.player.width / 2);
	}
}
