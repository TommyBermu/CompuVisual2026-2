import { WIDTH, HEIGHT, SHIP_LIVES, ASTEROID_COUNT } from '../constants.js';
import Asteroid from '../objects/Asteroid.js';
import { aplicarEscala, setFactorEscala, nitidarTextos } from '../escala.js';

/*
  Menú inicial: se eligen las opciones y se pasan a GameScene.
  Controles: ↑ ↓ para elegir opción, ← → para cambiar el valor, ENTER para jugar.

  Cada opción tiene una lista de valores posibles y el índice del valor elegido.
  "textos" es opcional: es lo que se muestra en pantalla si el valor no es un número.
*/
const rango = (min, max) => Array.from({ length: max - min + 1 }, (_, i) => min + i);

export default class MenuScene extends Phaser.Scene {
	constructor() {
		super('MenuScene');
	}

	create() {
		// "??" conserva lo elegido al volver al menú desde la partida (la escena se reutiliza)
		this.opciones = this.opciones ?? [
			{
				clave: 'modo',
				nombre: 'MODO',
				valores: ['clasico', 'oleadas'],
				textos: ['CLÁSICO', 'OLEADAS'],
				indice: 0,
			},
			{
				clave: 'jugadores',
				nombre: 'JUGADORES',
				valores: [1, 2],
				textos: ['1', '2'],
				indice: 0,
			},
			{ clave: 'vidas', nombre: 'VIDAS', valores: rango(1, 10), indice: SHIP_LIVES - 1 },
			{ clave: 'asteroides', nombre: 'ASTEROIDES', valores: rango(1, 20), indice: ASTEROID_COUNT - 1 },
			{
				clave: 'velocidad',
				nombre: 'VELOCIDAD ASTEROIDES',
				valores: [0.5, 1, 1.5, 2],
				textos: ['x0.5', 'x1', 'x1.5', 'x2'],
				indice: 1,
			},
			{
				clave: 'color',
				nombre: 'COLOR NAVE P1',
				valores: [0xffffff, 0x72f00b, 0x00ffff, 0xffff00, 0xff66cc],
				textos: ['BLANCO', 'VERDE', 'CIAN', 'AMARILLO', 'ROSA'],
				indice: 0,
			},
			{
				clave: 'color2',
				nombre: 'COLOR NAVE P2',
				valores: [0xffffff, 0x72f00b, 0x00ffff, 0xffff00, 0xff66cc],
				textos: ['BLANCO', 'VERDE', 'CIAN', 'AMARILLO', 'ROSA'],
				indice: 2,
			},
			{ clave: 'musica', nombre: 'MÚSICA', valores: [true, false], textos: ['SÍ', 'NO'], indice: 0 },
			{ clave: 'efectos', nombre: 'EFECTOS', valores: [true, false], textos: ['SÍ', 'NO'], indice: 0 },
			{
				clave: 'zoom',
				nombre: 'TAMAÑO PANTALLA',
				valores: [1, 1.25, 1.5, 1.75, 2],
				textos: ['x1', 'x1.25', 'x1.5', 'x1.75', 'x2'],
				indice: 0,
			},
		];
		this.seleccion = 0;

		// aplica el tamaño real del canvas guardado (al volver de una partida se conserva)
		const opcionZoom = this.opciones.find((o) => o.clave === 'zoom');
		setFactorEscala(opcionZoom.valores[opcionZoom.indice]);
		aplicarEscala(this);

		// la música se detiene al perder; si venimos de ahí, vuelve a sonar
		const musica = this.sound.get('musica');
		if (musica && !musica.isPlaying && !this.sound.locked) {
			musica.play();
		}

		this.crearFondo();

		this.add.text(WIDTH / 2, 56, 'ASTEROIDS', {
			fontFamily: 'monospace',
			fontSize: '48px',
			color: '#ffffff',
		}).setOrigin(0.5);

		this.textosOpciones = this.opciones.map((opcion, indice) => (
			this.add.text(WIDTH / 2, 128 + indice * 32, '', {
				fontFamily: 'monospace',
				fontSize: '20px',
			}).setOrigin(0.5)
		));

		this.add.text(WIDTH / 2, 500, '[ JUGAR ]', {
			fontFamily: 'monospace',
			fontSize: '32px',
			color: '#72f00b',
		}).setOrigin(0.5).setInteractive({ useHandCursor: true })
			.on('pointerdown', () => this.iniciarJuego());

		this.add.text(WIDTH / 2, HEIGHT - 56, 'P1: ← → ↑  disparar ESPACIO      P2: A D W  disparar MAYÚS', {
			fontFamily: 'monospace',
			fontSize: '13px',
			color: '#aaaaaa',
		}).setOrigin(0.5);

		this.add.text(WIDTH / 2, HEIGHT - 32, '↑ ↓ elegir     ← → cambiar     ENTER jugar', {
			fontFamily: 'monospace',
			fontSize: '13px',
			color: '#888888',
		}).setOrigin(0.5);

		const teclado = this.input.keyboard;
		teclado.on('keydown-UP', () => this.moverSeleccion(-1));
		teclado.on('keydown-DOWN', () => this.moverSeleccion(1));
		teclado.on('keydown-LEFT', () => this.cambiarValor(-1));
		teclado.on('keydown-RIGHT', () => this.cambiarValor(1));
		teclado.on('keydown-ENTER', () => this.iniciarJuego());

		this.actualizarTextos();
		nitidarTextos(this); // textos del menú nítidos pese al zoom de cámara
	}

	// asteroides decorativos moviéndose detrás del menú (se crean antes que los textos para quedar atrás)
	crearFondo() {
		this.fondo = [];
		for (let indice = 0; indice < 10; indice += 1) {
			const x = Phaser.Math.Between(0, WIDTH);
			const y = Phaser.Math.Between(0, HEIGHT);
			const tamano = Phaser.Math.Between(1, 3);
			const asteroide = new Asteroid(this, x, y, tamano, { enMovimiento: true });
			asteroide.spawn(); // dirección, velocidad y giro al azar, como en el juego
			asteroide.setAlpha(0.3); // más opacos para que no distraigan del menú
			this.fondo.push(asteroide);
		}
	}

	// igual que en GameScene: lo que sale por un borde entra por el otro
	update() {
		this.physics.world.wrap(this.fondo, 32);
	}

	// devuelve el valor elegido de una opción, p. ej. this.valor('vidas')
	valor(clave) {
		const opcion = this.opciones.find((o) => o.clave === clave);
		return opcion.valores[opcion.indice];
	}

	moverSeleccion(delta) {
		const total = this.opciones.length;
		this.seleccion = (this.seleccion + delta + total) % total;
		this.actualizarTextos();
	}

	cambiarValor(delta) {
		const opcion = this.opciones[this.seleccion];
		opcion.indice = Phaser.Math.Clamp(opcion.indice + delta, 0, opcion.valores.length - 1);

		// la música ya suena en el menú, así que se silencia/activa al instante
		if (opcion.clave === 'musica') {
			this.sound.get('musica')?.setMute(!this.valor('musica'));
		}
		// cambia el TAMAÑO REAL del canvas (nítido), no un zoom CSS borroso.
		// el juego sigue siendo de 800x600 por dentro.
		if (opcion.clave === 'zoom') {
			setFactorEscala(this.valor('zoom'));
			aplicarEscala(this); // reaplica tamaño de canvas + zoom de cámara al menú
			nitidarTextos(this); // mantiene los textos nítidos con el nuevo factor
		}
		this.actualizarTextos();
	}

	actualizarTextos() {
		this.opciones.forEach((opcion, indice) => {
			const elegida = indice === this.seleccion;
			const texto = opcion.textos ? opcion.textos[opcion.indice] : opcion.valores[opcion.indice];
			this.textosOpciones[indice]
				.setText(`${elegida ? '> ' : '  '}${opcion.nombre}: ${texto}`)
				.setColor(elegida ? '#72f00b' : '#aaaaaa');
		});
	}

	iniciarJuego() {
		const datos = {};
		this.opciones.forEach((opcion) => {
			datos[opcion.clave] = this.valor(opcion.clave);
		});
		this.scene.start('GameScene', datos);
	}
}
