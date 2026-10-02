export default class BootScene extends Phaser.Scene {
	constructor() {
		super('BootScene');
	}

	create() {
		this.crearTexturaNave();
		this.scene.start('GameScene');
	}

	// triángulo apuntando a la derecha (+X) pq es el angulo 0 de phaser, mejor explicado en player.js xd
	crearTexturaNave() {
		// no lo puse la 
		const ancho = 32;
		const alto = 24;
		const grps = this.add.graphics();

		grps.lineStyle(2, 0xffffff, 1);
		grps.beginPath();
		grps.moveTo(ancho, alto / 2); // es la punta
		grps.lineTo(0, 0);
		grps.lineTo(0, alto);
		grps.closePath();
		grps.strokePath();

		grps.generateTexture('nave', ancho, alto);
		grps.destroy();
	}
}