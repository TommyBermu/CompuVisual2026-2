/*
    systems/Shooter.js
    ------------------
    Recibe la dirección de disparo del InputManager, crea una Ball delante de la
    cámara y le da su velocidad inicial. Lleva la cuenta de bolas disponibles.

    Física del disparo:
        la bola sale con la rapidez del lanzamiento + la de la cámara (hereda el
        momentum, como una pelota lanzada desde un tren) y su velocidad se
        calcula para que la parábola (gravedad) termine justo donde apunta la
        mira (ver _aimVelocity).

    También elimina las bolas que ya no sirven (quedaron atrás o vivieron
    demasiado), para no acumular cuerpos en la física.
*/

import * as THREE from 'three';
import Ball from '../entities/Ball.js';
import Shatter from './Shatter.js';
import { getSettings } from '../settings.js';
import {
    BALL_SPEED, BALL_LIFETIME, BALL_SPAWN_OFFSET, BALLS_AVAILABLE,
    AIM_MAX_DISTANCE, GRAVITY, BALL_SPAWN_DROP, BALL_RADIUS, BALL_MAX_FLIGHT_TIME, BALL_FLIGHT_GRAVITY,
} from '../constants.js';

export default class Shooter {
    constructor(renderer, physics, rail, audio = null) {
        this.renderer = renderer;
        this.physics = physics;
        this.rail = rail;
        this.audio = audio;
        this.balls = [];
        this.ammo = BALLS_AVAILABLE;
        this.onAmmoChange = null;   // callback para el HUD
        this.getAimTargets = null;  // () => objetos 3D contra los que apuntar (lo asigna el Game)
        this.raycaster = new THREE.Raycaster();
    }

    shoot(direction) {
        if (this.ammo <= 0) return false;

        const camera = this.renderer.camera;
        // Nace un poco delante de la cámara, SOBRE la línea de la mira
        // (antes nacía 0.3 m más abajo y además la gravedad la hacía caer:
        // por eso pegaba por debajo de la cruz).
        const origin = camera.position.clone().addScaledVector(direction, BALL_SPAWN_OFFSET);
        origin.y -= BALL_SPAWN_DROP; // un poco por debajo de la mira (el tiro igual llega al punto apuntado)

        const ball = new Ball(this.physics, origin);
        // La sensibilidad (ajuste del jugador) escala la fuerza del lanzamiento
        const speed = BALL_SPEED * (getSettings().sensitivity || 1);
        const { velocity: v, time } = this._aimVelocity(origin, direction, speed);
        ball.body.velocity.set(v.x, v.y, v.z);
        ball.setFlying(time);
        ball.age = 0;
        ball.addTo(this.renderer, this.physics);
        this.balls.push(ball);

        if (this.audio) this.audio.playSfx('shoot');
        this.setAmmo(this.ammo - 1);
        return true;
    }

    /*
        Velocidad para que la bola LLEGUE al punto bajo la mira (como en el Smash
        Hit original), aunque la gravedad la curve.
            1. Rayo en la dirección del clic -> primer objeto que toca (vidrio,
               suelo, pared). Si no toca nada, un punto a AIM_MAX_DISTANCE.
               El rayo sale de donde ESTARÁ la cámara cuando la bola llegue
               (posición + velocidad del riel · t), no de donde está ahora:
               la cámara sigue avanzando durante el vuelo y, con el rayo desde
               la posición actual, al momento del impacto el punto ya no
               quedaba bajo el cursor (se "abría" hacia arriba y a los lados,
               más cuanto más cerca y más lento el tiro). Como t depende del
               objetivo, se itera un par de veces (converge enseguida).
            2. Tiempo de vuelo t = distancia / rapidez, donde la rapidez es la del
               lanzamiento + la heredada de la cámara (momentum), con tope
               BALL_MAX_FLIGHT_TIME: los tiros lejanos salen más rápido y así
               la parábola no sube tanto por encima de la mira.
            3. Tiro parabólico: p(t) = p0 + v·t + ½·g·t²  =>  v = (p - p0)/t - ½·g·t
               con g = la gravedad reducida del vuelo (BALL_FLIGHT_GRAVITY).
    */
    _aimVelocity(origin, direction, speed) {
        const camera = this.renderer.camera;
        const launchSpeed = direction.clone().multiplyScalar(speed).add(this.rail.velocity).length();

        let t = 0;
        let target;
        for (let i = 0; i < 3; i++) {
            const eye = camera.position.clone().addScaledVector(this.rail.velocity, t);
            target = this._aimPoint(eye, direction);
            t = Math.min(Math.max(target.distanceTo(origin) / launchSpeed, 1e-3), BALL_MAX_FLIGHT_TIME);
        }

        const v = target.clone().sub(origin).divideScalar(t);
        v.y -= 0.5 * GRAVITY * BALL_FLIGHT_GRAVITY * t; // GRAVITY es negativa: compensa hacia arriba
        return { velocity: v, time: t };
    }

    /*
        Punto al que debe llegar el CENTRO de la bola mirando desde `eye`.
        Se separa BALL_RADIUS de la superficie (por su normal): la esfera toca
        la pared cuando su centro está a un radio de ella. Sin esto, en tiros
        rasantes a las paredes laterales la bola chocaba antes de llegar, en la
        parte alta de la parábola, y pegaba por encima de la mira.
    */
    _aimPoint(eye, direction) {
        const targets = this.getAimTargets ? this.getAimTargets() : [];
        this.raycaster.set(eye, direction);
        this.raycaster.far = AIM_MAX_DISTANCE;
        const hit = this.raycaster.intersectObjects(targets, true)[0];
        if (!hit) return eye.clone().addScaledVector(direction, AIM_MAX_DISTANCE);

        const target = hit.point.clone();
        if (hit.face) {
            // Normal de la cara en coordenadas de mundo, mirando hacia la cámara
            const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld);
            if (normal.dot(direction) > 0) normal.negate();
            target.addScaledVector(normal, BALL_RADIUS);
        }
        return target;
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
            origin.addScaledVector(this.rail.forward, 1); // justo delante
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
    // (las que vivieron mucho, quedaron detrás de la cámara o se cayeron).
    // view = { position, forward, floorY } de la cámara.
    update(delta, view) {
        this.balls = this.balls.filter((ball) => {
            ball.age += delta;
            const dead = ball.age > BALL_LIFETIME || Shatter.gone(ball.body.position, view);
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
