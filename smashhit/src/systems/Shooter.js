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
import { getSettings } from '../settings.js';
import {
    BALL_SPEED, BALL_LIFETIME, BALL_SPAWN_OFFSET, BALLS_AVAILABLE, DESPAWN_BEHIND,
} from '../constants.js';

export default class Shooter {
    constructor(renderer, physics, rail, audio = null) {
        this.renderer = renderer;
        this.physics = physics;
        this.rail = rail;
        this.audio = audio;
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
        // La sensibilidad (ajuste del jugador) escala la fuerza del lanzamiento
        const speed = BALL_SPEED * (getSettings().sensitivity || 1);
        const v = direction.clone().multiplyScalar(speed).add(this.rail.velocity);
        ball.body.velocity.set(v.x, v.y, v.z);
        ball.age = 0;
        ball.addTo(this.renderer, this.physics);
        this.balls.push(ball);

        if (this.audio) this.audio.playSfx('shoot');
        this.setAmmo(this.ammo - 1);
        return true;
    }

    setAmmo(n) {
        this.ammo = Math.max(0, n);
        if (this.onAmmoChange) this.onAmmoChange(this.ammo);
    }

    // Sumar (o restar con delta negativo) bolas. Devuelve el ammo resultante.
    addAmmo(delta) {
        this.setAmmo(this.ammo + delta);
        return this.ammo;
    }

    // Explosión de bolas estilo Sonic (animación de muerte): suelta un puñado
    // de bolas delante de la cámara que se "desparraman" suave y caen por gravedad.
    scatter(count = 14) {
        const camera = this.renderer.camera;
        for (let i = 0; i < count; i++) {
            const origin = camera.position.clone();
            origin.y -= 0.5;
            origin.z -= 1; // justo delante
            // pequeña dispersión en la posición para que no nazcan todas en el mismo punto
            origin.x += (Math.random() - 0.5) * 1.2;
            origin.y += (Math.random() - 0.5) * 0.6;
            const ball = new Ball(this.physics, origin);
            ball.setInert(); // decorativa: atraviesa cristales, choca con suelo/paredes
            // velocidades suaves: se desparraman, no salen disparadas
            ball.body.velocity.set(
                (Math.random() - 0.5) * 3,       // lateral suave
                1 + Math.random() * 2,           // un saltito hacia arriba
                (Math.random() - 0.5) * 2.5,     // adelante/atrás leve
            );
            ball.age = 0;
            ball.addTo(this.renderer, this.physics);
            this.balls.push(ball);
        }
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
