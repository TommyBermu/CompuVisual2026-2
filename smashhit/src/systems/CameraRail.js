/*
    systems/CameraRail.js
    ---------------------
    Mueve la cámara hacia adelante (-Z) a velocidad constante: el "avanzas por el
    pasillo". La velocidad la fija el Game según el nivel (setSpeed).

    Expone `velocity` (vector) para que el Shooter (paso 2) sume la velocidad de
    la cámara a la de la bola: herencia de momentum.
*/

import * as THREE from 'three';

export default class CameraRail {
    constructor(camera, speed = 0) {
        this.camera = camera;
        this.startZ = camera.position.z;
        this.speed = speed;
        this.paused = false;
        this.velocity = new THREE.Vector3();
    }

    update(delta) {
        if (this.paused) return;
        this.camera.position.z -= this.speed * delta;
        this.velocity.set(0, 0, -this.speed);
    }

    // Metros recorridos desde el inicio
    get distance() {
        return this.startZ - this.camera.position.z;
    }

    setSpeed(speed) {
        this.speed = speed;
    }

    // Reiniciar el contador de distancia tomando la posición actual como origen.
    resetDistance() {
        this.startZ = this.camera.position.z;
    }

    pause() {
        this.paused = true;
        this.velocity.set(0, 0, 0);
    }

    resume() {
        this.paused = false;
    }
}
