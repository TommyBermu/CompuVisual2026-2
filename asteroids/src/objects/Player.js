import {
SHIP_THRUST,
SHIP_ROTATION_SPEED,
SHIP_MAX_SPEED,
SHIP_DRAG,
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
