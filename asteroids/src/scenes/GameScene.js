import Player from '../objects/Player.js';
import Bullet from '../objects/Bullet.js';
import Asteroid from '../objects/Asteroid.js';
import { WIDTH, HEIGHT, ASTEROID_MIN_SPEED, ASTEROID_MAX_SPEED, SHIP_LIVES, ASTEROID_COUNT } from '../constants.js';

export default class GameScene extends Phaser.Scene {
	constructor() {
		super('GameScene');
	}

	// datos llega desde el menú: { vidas, asteroides, velocidad, color, musica, efectos }
	create(datos) {
		this.datos = datos; // se guardan para poder reiniciar con la misma configuración
		this.terminada = false;
		this.physics.resume(); // por si venimos de una partida perdida (terminarPartida pausa la física)

		const vidas = datos?.vidas ?? SHIP_LIVES;
		const cantidadAsteroides = datos?.asteroides ?? ASTEROID_COUNT;
		// Asteroid.js lee estos dos valores de la escena
		this.velocidadMaxima = ASTEROID_MAX_SPEED * (datos?.velocidad ?? 1);
		this.efectos = datos?.efectos ?? true;

		const musica = this.sound.get('musica');
		musica?.setMute(!(datos?.musica ?? true));
		if (musica && !musica.isPlaying && !this.sound.locked) {
			musica.play(); // vuelve a sonar si se detuvo al perder
		}

		// marco para delimitar visualmente el canvas
		this.dibujarMarco();

		this.player = new Player(this, WIDTH / 2, HEIGHT / 2);
		this.player.vidas = vidas;
		this.player.setTint(datos?.color ?? 0xffffff); // la textura es blanca, el tinte le da el color
		this.puntuacion = 0;
		this.cursors = this.input.keyboard.createCursorKeys();
		this.teclaDisparo = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
		this.ultimoDisparo = -250;

		// ESC abre el menú de pausa (solo mientras se juega)
		this.input.keyboard.on('keydown-ESC', () => {
			if (!this.terminada) {
				this.scene.pause();
				this.scene.launch('PauseScene', { finPartida: false });
			}
		});

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

		for (let indice = 0; indice < cantidadAsteroides; indice += 1) {
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
				this.velocidadMaxima,
			);
			this.physics.velocityFromRotation(direccion, rapidez, asteroide.body.velocity);
		});
	}

	// todos los efectos pasan por aquí para poder apagarlos desde el menú
	sonido(clave, config) {
		if (this.efectos) {
			this.sound.play(clave, config);
		}
	}

	terminarPartida() {
		this.terminada = true;
		this.physics.pause();
		this.player.setActive(false).setVisible(false);
		this.sound.get('musica')?.stop();
		this.events.emit('gameOver');
		this.scene.launch('PauseScene', { finPartida: true });
	}

	// los usa PauseScene
	reiniciar() {
		this.scene.stop('UIScene');
		this.scene.restart(this.datos);
	}

	irAlMenu() {
		this.scene.stop('UIScene');
		this.scene.start('MenuScene');
	}

	actualizarDisparos() {
		if (!this.terminada && this.teclaDisparo.isDown && this.time.now - this.ultimoDisparo >= 250) {
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
