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
*/

import * as THREE from 'three';
import { CAMERA_HEIGHT } from '../constants.js';

const LOOK_AHEAD = 4;

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
        this.place(0);
    }

    update(delta) {
        if (this.paused) return;
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
