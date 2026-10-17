import Player from '../objects/Player.js';
import Asteroid from '../objects/Asteroid.js';
import { WIDTH, HEIGHT, ASTEROID_MIN_SPEED, ASTEROID_MAX_SPEED, SHIP_LIVES, ASTEROID_COUNT, WAVE_ASTEROID_INCREMENT } from '../constants.js';
import { aplicarEscala, nitidarTexto } from '../escala.js';

export default class GameScene extends Phaser.Scene {
	constructor() {
		super('GameScene');
	}

	// datos llega desde el menú: { modo, jugadores, vidas, asteroides, velocidad, color, color2, musica, efectos, zoom }
	create(datos) {
		this.datos = datos; // se guardan para poder reiniciar con la misma configuración
		this.terminada = false;
		this.huboAsteroides = false; // evita falsa victoria antes de poblar el campo
		this.physics.resume(); // por si venimos de una partida perdida (terminarPartida pausa la física)

		// tamaño real del canvas + zoom de cámara (nítido, no CSS). El mundo sigue siendo 800x600.
		aplicarEscala(this);

		const vidas = datos?.vidas ?? SHIP_LIVES;
		const cantidadAsteroides = datos?.asteroides ?? ASTEROID_COUNT;
		// modo 'oleadas' = arcade infinito; 'clasico' = termina al limpiar la pantalla
		this.modo = datos?.modo ?? 'clasico';
		this.cantidadBase = cantidadAsteroides; // asteroides de la primera oleada
		this.oleada = 1;
		this.numJugadores = datos?.jugadores ?? 1;
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

		this.asteroids = this.physics.add.group();

		this.crearJugadores(datos, vidas);

		// ESC abre el menú de pausa (solo mientras se juega)
		this.input.keyboard.on('keydown-ESC', () => {
			if (!this.terminada) {
				this.scene.pause();
				this.scene.launch('PauseScene', { finPartida: false });
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

		this.generarOleada(cantidadAsteroides);

		this.huboAsteroides = this.asteroids.countActive(true) > 0;

		this.scene.launch('UIScene');
		// la UI muestra el número de oleada solo en modo oleadas
		this.events.emit('waveChanged', this.oleada, this.modo);
	}

	// crea 1 o 2 naves con sus controles, colores y colisiones propias
	crearJugadores(datos, vidas) {
		const K = Phaser.Input.Keyboard.KeyCodes;
		const teclado = this.input.keyboard;

		// P1: flechas + ESPACIO. P2: WASD + SHIFT izquierdo.
		const configs = [
			{
				id: 1,
				color: datos?.color ?? 0xffffff,
				teclas: {
					izquierda: teclado.addKey(K.LEFT),
					derecha: teclado.addKey(K.RIGHT),
					acelerar: teclado.addKey(K.UP),
					disparar: teclado.addKey(K.SPACE),
				},
			},
			{
				id: 2,
				color: datos?.color2 ?? 0x00ffff,
				teclas: {
					izquierda: teclado.addKey(K.A),
					derecha: teclado.addKey(K.D),
					acelerar: teclado.addKey(K.W),
					disparar: teclado.addKey(K.SHIFT),
				},
			},
		].slice(0, this.numJugadores);

		// con 2 jugadores los separamos un poco para que no aparezcan encima
		const posiciones = this.numJugadores === 2
			? [{ x: WIDTH / 2 - 80, y: HEIGHT / 2 }, { x: WIDTH / 2 + 80, y: HEIGHT / 2 }]
			: [{ x: WIDTH / 2, y: HEIGHT / 2 }];

		this.jugadores = configs.map((config, i) => {
			const jugador = new Player(this, posiciones[i].x, posiciones[i].y, { ...config, vidas });

			// balas de este jugador contra asteroides: suman a SU puntuación
			this.physics.add.overlap(jugador.bullets, this.asteroids, (bala, asteroide) => {
				bala.desactivar();
				jugador.puntuacion += asteroide.puntuacion;
				this.events.emit('scoreChanged', jugador.id, jugador.puntuacion);
				asteroide.partir();
			});

			// esta nave contra asteroides: pierde vida; si todas las naves mueren, fin
			this.physics.add.overlap(jugador, this.asteroids, () => {
				if (jugador.recibirDano()) {
					this.events.emit('livesChanged', jugador.id, jugador.vidas);
					if (jugador.vidas <= 0) {
						jugador.eliminar();
						this.comprobarFinJuego();
					}
				}
			});

			return jugador;
		});
	}

	// la partida termina cuando TODAS las naves se han quedado sin vidas
	comprobarFinJuego() {
		const quedanVivos = this.jugadores.some((j) => j.vidas > 0);
		if (!quedanVivos) {
			this.terminarPartida();
		}
	}

	// crea `cantidad` asteroides en los bordes del canvas (usado al iniciar y en cada oleada)
	generarOleada(cantidad) {
		for (let indice = 0; indice < cantidad; indice += 1) {
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

	update(time) {
		if (this.terminada) {
			return;
		}
		this.jugadores.forEach((jugador) => jugador.actualizar(time));
		this.wrapAround();
		this.comprobarVictoria();
	}

	// clásico: se gana al limpiar la pantalla. oleadas: se genera la siguiente oleada
	comprobarVictoria() {
		if (!(this.huboAsteroides && this.asteroids.countActive(true) === 0)) {
			return;
		}

		if (this.modo === 'oleadas') {
			this.siguienteOleada();
		} else {
			this.ganarPartida();
		}
	}

	// avanza a la siguiente oleada: más asteroides, conservando puntos y vidas
	siguienteOleada() {
		this.oleada += 1;
		const cantidad = this.cantidadBase + (this.oleada - 1) * WAVE_ASTEROID_INCREMENT;

		// mensaje breve de "OLEADA N" antes de poblar el campo
		const aviso = this.add.text(WIDTH / 2, HEIGHT / 2, `OLEADA ${this.oleada}`, {
			fontFamily: 'monospace',
			fontSize: '48px',
			color: '#72f00b',
		}).setOrigin(0.5).setDepth(20);
		nitidarTexto(aviso); // nítido pese al zoom de cámara

		this.events.emit('waveChanged', this.oleada, this.modo);

		// pausa breve para que el jugador se reubique antes de que lleguen los asteroides
		this.time.delayedCall(900, () => {
			aviso.destroy();
			if (this.terminada) {
				return;
			}
			this.generarOleada(cantidad);
			this.huboAsteroides = this.asteroids.countActive(true) > 0;
		});

		// evita que comprobarVictoria dispare otra oleada mientras el campo está vacío
		this.huboAsteroides = false;
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
		this.jugadores.forEach((jugador) => jugador.eliminar());
		this.sound.get('musica')?.stop();
		this.events.emit('gameOver');
		this.scene.launch('PauseScene', { finPartida: true });
	}

	ganarPartida() {
		this.terminada = true;
		this.physics.pause();
		this.sound.get('musica')?.stop();
		this.events.emit('gameOver');
		this.scene.launch('PauseScene', { victoria: true });
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

	// para que la nave salga por el otro lado cuando salga del canvas
	wrapAround() {
		// naves, balas de cada jugador y asteroides salen por el lado opuesto
		this.jugadores.forEach((jugador) => {
			if (jugador.active) {
				this.physics.world.wrap(jugador, jugador.width / 2);
			}
			this.physics.world.wrap(jugador.bullets, 0);
		});
		this.asteroids.children.iterate((asteroide) => {
			if (asteroide?.active) {
				this.physics.world.wrap(asteroide, asteroide.displayWidth / 2);
			}
		});
	}
}
