import {
SHIP_THRUST,
SHIP_ROTATION_SPEED,
SHIP_MAX_SPEED,
SHIP_DRAG,
	SHIP_LIVES,
	SHIP_INVULNERABILITY_MS,
} from '../constants.js';

export default class Player extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y) {
		super(scene, x, y, 'nave');

		// añadirse a la escena (para que se dibuje) y al mundo físico
		scene.add.existing(this);
		scene.physics.add.existing(this);

		this.setDrag(SHIP_DRAG);
		this.setMaxVelocity(SHIP_MAX_SPEED);
		this.setDamping(false);
		this.vidas = SHIP_LIVES;
		this.invulnerable = false;
	}

	recibirDano() {
		if (this.invulnerable || !this.active) {
			return false;
		}

		this.vidas -= 1;
		this.invulnerable = true;
		this.setPosition(this.scene.scale.width / 2, this.scene.scale.height / 2);
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
		this.body.acceleration
		);
	}

	dejarDeAcelerar() {
		this.setAcceleration(0, 0);
	}
}
