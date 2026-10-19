/*
    systems/Shooter.js
    ------------------
    Recibe la dirección de disparo del InputManager, crea una Ball delante de la
    cámara y le da su velocidad inicial. Lleva la cuenta de bolas disponibles.

    Física del disparo:
        velocidad bola = dirección * BALL_SPEED + velocidad de la cámara
    La bola "hereda" el movimiento del jugador (momentum), igual que una pelota
    lanzada desde un tren en marcha. Después solo actúa la gravedad -> parábola.

    También elimina las bolas que ya no sirven (quedaron atrás o vivieron
    demasiado), para no acumular cuerpos en la física.
*/

import Ball from '../entities/Ball.js';
import {
    BALL_SPEED, BALL_LIFETIME, BALL_SPAWN_OFFSET, BALLS_AVAILABLE, DESPAWN_BEHIND,
} from '../constants.js';

export default class Shooter {
    constructor(renderer, physics, rail) {
        this.renderer = renderer;
        this.physics = physics;
        this.rail = rail;
        this.balls = [];
        this.ammo = BALLS_AVAILABLE;
        this.onAmmoChange = null; // callback para el HUD
    }

    shoot(direction) {
        if (this.ammo <= 0) return false;

        const camera = this.renderer.camera;
        // Nace un poco delante de la cámara (y algo abajo) para no "salir del ojo"
        const origin = camera.position.clone().addScaledVector(direction, BALL_SPAWN_OFFSET);
        origin.y -= 0.3;

        const ball = new Ball(this.physics, origin);
        const v = direction.clone().multiplyScalar(BALL_SPEED).add(this.rail.velocity);
        ball.body.velocity.set(v.x, v.y, v.z);
        ball.age = 0;
        ball.addTo(this.renderer, this.physics);
        this.balls.push(ball);

        this.setAmmo(this.ammo - 1);
        return true;
    }

    setAmmo(n) {
        this.ammo = Math.max(0, n);
        if (this.onAmmoChange) this.onAmmoChange(this.ammo);
    }

    // Llamar después de physics.step(): sincroniza y limpia bolas viejas
    update(delta) {
        const cameraZ = this.renderer.camera.position.z;
        this.balls = this.balls.filter((ball) => {
            ball.age += delta;
            const p = ball.body.position;
            const dead = ball.age > BALL_LIFETIME || p.z > cameraZ + DESPAWN_BEHIND || p.y < -20;
            if (dead) {
                ball.destroy(this.renderer, this.physics);
                return false;
            }
            ball.sync();
            return true;
        });
    }

    // Para reiniciar partida
    clear() {
        this.balls.forEach((b) => b.destroy(this.renderer, this.physics));
        this.balls = [];
        this.setAmmo(BALLS_AVAILABLE);
    }
}
