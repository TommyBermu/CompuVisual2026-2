export default class BootScene extends Phaser.Scene {
	constructor() {
		super('BootScene');
	}

	preload(){
		this.load.audio('shoot', 'assets/audio/laserShoot.wav');
		this.load.audio('explosion1', 'assets/audio/explosion1.wav');
		this.load.audio('explosion2', 'assets/audio/explosion2.wav');
		this.load.audio('explosion3', 'assets/audio/explosion3.wav');
		this.load.audio('loseLife', 'assets/audio/hitHurt1.wav');
		this.load.audio('gameOver', 'assets/audio/hitHurt2.wav');
		this.load.audio('musica', 'assets/audio/sPACE.wav');
	}

	create() {
		this.crearTexturaNave();
		this.crearTexturaBala();
		this.crearTexturaAsteroide();
		this.musica = this.sound.add('musica', { loop: true, volume: 0.15 });
		if (this.sound.locked) {
			this.sound.once('unlocked', () => this.musica.play());
		} else {
			this.musica.play();
		}
		this.scene.get('GameScene').events.once('gameOver', () => this.musica.stop());
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

	crearTexturaBala() {
		const graphics = this.add.graphics();
		graphics.fillStyle(0xffffff, 1);
		graphics.fillRect(0, 0, 10, 4);
		graphics.generateTexture('bala', 10, 4);
		graphics.destroy();
	}

	crearTexturaAsteroide() {
		const puntos = [
			[32, 2], [46, 7], [59, 20], [55, 34], [61, 47],
			[47, 59], [31, 55], [18, 62], [5, 48], [9, 34],
			[2, 20], [17, 8],
		];
		const graphics = this.add.graphics();

		graphics.fillStyle(0x333333, 1);
		graphics.lineStyle(2, 0xffffff, 1);
		graphics.beginPath();
		graphics.moveTo(puntos[0][0], puntos[0][1]);
		for (const [x, y] of puntos.slice(1)) {
			graphics.lineTo(x, y);
		}
		graphics.closePath();
		graphics.fillPath();
		graphics.strokePath();
		graphics.generateTexture('asteroide', 64, 64);
		graphics.destroy();
	}
}