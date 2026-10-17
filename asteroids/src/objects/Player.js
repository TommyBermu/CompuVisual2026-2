import {
	WIDTH,
	HEIGHT,
	SHIP_THRUST,
	SHIP_ROTATION_SPEED,
	SHIP_MAX_SPEED,
	SHIP_DRAG,
	SHIP_LIVES,
	SHIP_INVULNERABILITY_MS,
} from '../constants.js';
import Bullet from './Bullet.js';

const DISPARO_COOLDOWN = 250; // ms entre disparos

/*
  Cada nave gestiona su propio input, disparo, balas, vidas, color y puntuación.
  Esto permite tener 1 o 2 jugadores sin que GameScene tenga que diferenciarlos:
  solo recorre la lista de jugadores y llama a update().

  config:
    id        -> 1 o 2 (para los eventos de la UI)
    color     -> tinte de la nave
    teclas    -> { izquierda, derecha, acelerar, disparar } (objetos Key de Phaser)
*/
export default class Player extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y, config = {}) {
		super(scene, x, y, 'nave');

		// añadirse a la escena (para que se dibuje) y al mundo físico
		scene.add.existing(this);
		scene.physics.add.existing(this);

		this.setDrag(SHIP_DRAG);
		this.setMaxVelocity(SHIP_MAX_SPEED);
		this.setDamping(false);

		this.id = config.id ?? 1;
		this.vidas = config.vidas ?? SHIP_LIVES;
		this.puntuacion = 0;
		this.invulnerable = false;
		this.teclas = config.teclas ?? {};
		this.ultimoDisparo = -DISPARO_COOLDOWN;

		this.setTint(config.color ?? 0xffffff); // la textura es blanca, el tinte le da el color

		// cada jugador tiene su propio grupo de balas (así se sabe de quién es cada impacto)
		this.bullets = scene.physics.add.group({ classType: Bullet, maxSize: 30 });
	}

	// la llama GameScene cada frame: lee las teclas de este jugador y actúa
	actualizar(time) {
		if (!this.active) {
			return;
		}

		if (this.teclas.izquierda?.isDown) {
			this.rotarIzquierda();
		} else if (this.teclas.derecha?.isDown) {
			this.rotarDerecha();
		} else {
			this.dejarDeRotar();
		}

		if (this.teclas.acelerar?.isDown) {
			this.acelerar();
		} else {
			this.dejarDeAcelerar();
		}

		if (this.teclas.disparar?.isDown && time - this.ultimoDisparo >= DISPARO_COOLDOWN) {
			this.disparar();
			this.ultimoDisparo = time;
		}

		// las balas se desactivan al salir del canvas
		this.bullets.children.iterate((bala) => {
			if (bala?.active && (bala.x < 0 || bala.x > WIDTH || bala.y < 0 || bala.y > HEIGHT)) {
				bala.desactivar();
			}
		});
	}

	disparar() {
		const angulo = this.rotation;
		const distancia = this.width / 2 + 8;
		const x = this.x + Math.cos(angulo) * distancia;
		const y = this.y + Math.sin(angulo) * distancia;
		const bala = this.bullets.get();
		if (bala) {
			bala.disparar(x, y, angulo);
		}
	}

	recibirDano() {
		if (this.invulnerable || !this.active) {
			return false;
		}

		this.vidas -= 1;
		if (this.vidas > 0) {
			this.scene.sonido('loseLife', { volume: 0.6 });
		} else {
			this.scene.sonido('gameOver', { volume: 0.7 });
		}

		this.invulnerable = true;
		this.setPosition(WIDTH / 2, HEIGHT / 2);
		this.setVelocity(0, 0);
		this.setAcceleration(0, 0);

		this.scene.tweens.add({
			targets: this,
			alpha: 0.25,
			duration: 100,
			yoyo: true,
			repeat: Math.floor(SHIP_INVULNERABILITY_MS / 200),
			onComplete: () => this.setAlpha(1),
		});

		this.scene.time.delayedCall(SHIP_INVULNERABILITY_MS, () => {
			this.invulnerable = false;
		});

		return true;
	}

	// desactiva la nave al perder (deja de verse y de colisionar), pero conserva sus balas en vuelo
	eliminar() {
		this.setActive(false).setVisible(false);
		this.body.enable = false;
	}

	rotarIzquierda() {
		this.setAngularVelocity(-SHIP_ROTATION_SPEED);
	}

	rotarDerecha() {
		this.setAngularVelocity(SHIP_ROTATION_SPEED);
	}

	dejarDeRotar() {
		this.setAngularVelocity(0);
	}

	acelerar() {
		this.scene.physics.velocityFromRotation(
			this.rotation, // acá, si no se inicia la nave a la derecha, no empujaría hacia al frente
			SHIP_THRUST,
			this.body.acceleration,
		);
	}

	dejarDeAcelerar() {
		this.setAcceleration(0, 0);
	}
}
