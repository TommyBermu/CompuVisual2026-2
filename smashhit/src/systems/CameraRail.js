/*
    systems/CameraRail.js
    ---------------------
    Mueve la cámara a lo largo del RECORRIDO (systems/Track.js) a velocidad
    constante: el "avanzas por el pasillo". La velocidad la fija el Game según
    el nivel (setSpeed). `s` = metros recorridos desde el inicio del recorrido.

    La cámara va a CAMERA_HEIGHT sobre el suelo (en la normal del suelo, así en
    las rampas sigue a la misma altura) y mira hacia donde estará el pasillo
    LOOK_AHEAD metros más adelante: en las curvas gira un poco antes, como
    haría alguien que va mirando el camino.

    Expone `velocity` (vector) para que el Shooter sume la velocidad de la
    cámara a la de la bola: herencia de momentum. Y `forward` (hacia dónde va).

    Efectos de cámara por nivel (environments.js -> camera), girando alrededor
    del eje de la mirada (alabeo / roll):
        { roll: PI }  boca abajo: el suelo queda arriba y las bolas "caen hacia
                      arriba" (la gravedad no cambia, pero eso es lo que parece)
        { spin: w }   da vueltas despacio a w rad/s
    Los cambios entre niveles son suaves (ROLL_EASE), nada de saltos bruscos.
*/

import * as THREE from 'three';
import { CAMERA_HEIGHT } from '../constants.js';

const LOOK_AHEAD = 4;
const ROLL_EASE = 1.4; // rapidez (1/s) con la que la cámara llega a su giro objetivo
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const tmpQ = new THREE.Quaternion();

// Ángulo en (-PI, PI]
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export default class CameraRail {
    constructor(camera, track, speed = 0) {
        this.camera = camera;
        this.track = track;
        this.speed = speed;
        this.s = 0;
        this.paused = false;
        this.velocity = new THREE.Vector3();
        this.forward = new THREE.Vector3(0, 0, -1);
        this.frame = null;
        this.roll = 0;         // giro actual alrededor de la mirada (rad)
        this.targetRoll = 0;   // giro al que se va acercando
        this.spin = 0;         // rad/s (0 = no da vueltas)
        this.up = new THREE.Vector3(0, 1, 0); // "arriba" de la pantalla, en mundo
        this.place(0);
    }

    // Efecto de cámara del nivel (o null). instant = sin transición (al empezar).
    setFx(fx, instant = false) {
        this.spin = fx?.spin || 0;
        this.targetRoll = fx?.roll || 0;
        if (!this.spin) this.roll = wrap(this.roll); // al dejar de girar, volver por el camino corto
        if (instant) this.roll = this.targetRoll;
        this.place(this.s);
    }

    _updateRoll(delta) {
        if (this.spin) {
            this.roll += this.spin * delta;
        } else {
            const diff = wrap(this.targetRoll - this.roll);
            this.roll += diff * Math.min(1, delta * ROLL_EASE);
        }
    }

    update(delta) {
        if (this.paused) return;
        this._updateRoll(delta);
        this.place(this.s + this.speed * delta);
        this.velocity.copy(this.forward).multiplyScalar(this.speed);
    }

    // Pone la cámara en el punto s del recorrido
    place(s) {
        this.s = s;
        this.frame = this.track.frameAt(s);
        const ahead = this.track.frameAt(s + LOOK_AHEAD);
        this.camera.position.copy(this.frame.position).addScaledVector(this.frame.up, CAMERA_HEIGHT);
        this.camera.quaternion.copy(this.frame.quaternion).slerp(ahead.quaternion, 0.6);
        if (this.roll) this.camera.quaternion.multiply(tmpQ.setFromAxisAngle(Z_AXIS, this.roll));
        this.up.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
        this.forward.copy(this.frame.forward);
    }

    // Metros recorridos desde el inicio del recorrido
    get distance() {
        return this.s;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    pause() {
        this.paused = true;
        this.velocity.set(0, 0, 0);
    }

    resume() {
        this.paused = false;
    }
}
