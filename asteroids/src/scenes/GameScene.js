import Player from '../objects/Player.js';
import Bullet from '../objects/Bullet.js';
import Asteroid from '../objects/Asteroid.js';
import { WIDTH, HEIGHT, ASTEROID_MIN_SPEED, ASTEROID_MAX_SPEED } from '../constants.js';

export default class GameScene extends Phaser.Scene {
	constructor() {
		super('GameScene');
	}

	create() {
		// marco para delimitar visualmente el canvas
		this.dibujarMarco();

		this.player = new Player(this, WIDTH / 2, HEIGHT / 2);
		this.puntuacion = 0;
		this.cursors = this.input.keyboard.createCursorKeys();
		this.teclaDisparo = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
		this.ultimoDisparo = -250;

		this.bullets = this.physics.add.group({
			classType: Bullet,
			maxSize: 30,
		});
		this.asteroids = this.physics.add.group();

		this.physics.add.overlap(this.bullets, this.asteroids, (bala, asteroide) => {
			bala.desactivar();
			this.puntuacion += asteroide.puntuacion;
			this.events.emit('scoreChanged', this.puntuacion);
			asteroide.partir();
		});
		this.physics.add.overlap(this.player, this.asteroids, () => {
			if (this.player.recibirDano()) {
				this.events.emit('livesChanged', this.player.vidas);
				if (this.player.vidas <= 0) {
					this.terminarPartida();
				}
			}
		});
		this.physics.add.collider(
			this.asteroids,
			this.asteroids,
			(asteroideA, asteroideB) => this.recuperarMovimiento(asteroideA, asteroideB),
			(asteroideA, asteroideB) => (
				this.time.now >= asteroideA.collisionReadyAt
				&& this.time.now >= asteroideB.collisionReadyAt
			),
		);

		for (let indice = 0; indice < 6; indice += 1) {
			const lado = Phaser.Math.Between(0, 3);
			const x = lado < 2
				? (lado === 0 ? 24 : WIDTH - 24)
				: Phaser.Math.Between(24, WIDTH - 24);
			const y = lado < 2
				? Phaser.Math.Between(24, HEIGHT - 24)
				: (lado === 2 ? 24 : HEIGHT - 24);
			const sorteoTamano = Phaser.Math.Between(1, 100);
			const tipot = sorteoTamano <= 5 ? 1 : sorteoTamano <= 45 ? 2 : 3;

			this.crearAsteroide(x, y, tipot, { enMovimiento: true });
		}

		this.scene.launch('UIScene');
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
		this.actualizarDisparos();
		this.wrapAround();
	}


	crearAsteroide(x, y, tamano = 3, opciones = {}) {
		const asteroide = new Asteroid(this, x, y, tamano, opciones);
		this.asteroids.add(asteroide);
		asteroide.spawn(opciones);
		return asteroide;
	}

	recuperarMovimiento(asteroideA, asteroideB) {
		const anguloChoque = Math.atan2(asteroideB.y - asteroideA.y, asteroideB.x - asteroideA.x);
		const asteroides = [asteroideA, asteroideB];

		asteroides.forEach((asteroide, indice) => {
			const rapidezActual = Math.hypot(asteroide.body.velocity.x, asteroide.body.velocity.y);
			if (rapidezActual >= 25) {
				return;
			}

			const direccion = anguloChoque + (indice === 0 ? Math.PI : 0)
				+ Phaser.Math.FloatBetween(-0.35, 0.35);
			const rapidez = Phaser.Math.FloatBetween(
				ASTEROID_MIN_SPEED,
				ASTEROID_MAX_SPEED,
			);
			this.physics.velocityFromRotation(direccion, rapidez, asteroide.body.velocity);
		});
	}

	terminarPartida() {
		this.physics.pause();
		this.player.setActive(false).setVisible(false);
		this.events.emit('gameOver');
	}

	actualizarDisparos() {
		if (this.teclaDisparo.isDown && this.time.now - this.ultimoDisparo >= 250) {
			this.disparar();
		}

		this.bullets.children.iterate((bala) => {
			if (bala?.active && (bala.x < 0 || bala.x > WIDTH || bala.y < 0 || bala.y > HEIGHT)) {
				bala.desactivar();			// rango y eliminacion al tocar bordes
			}
		});
	}

	disparar() {
		const angulo = this.player.rotation;
		const distancia = this.player.width / 2 + 8;
		const x = this.player.x + Math.cos(angulo) * distancia;
		const y = this.player.y + Math.sin(angulo) * distancia;
		const bala = this.bullets.get();

		if (bala) {
			bala.disparar(x, y, angulo);
			this.ultimoDisparo = this.time.now;
		}
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
		this.asteroids.children.iterate((asteroide) => {
			if (asteroide?.active) {
				this.physics.world.wrap(asteroide, asteroide.displayWidth / 2);
			}
		});
	}
}
