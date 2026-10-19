/*
    core/InputManager.js
    --------------------
    Traduce input crudo (mouse / touch) en "intenciones" del juego, sin saber
    nada de bolas ni física. Desacopla el input del resto.

    Clic/toque -> coordenadas normalizadas de pantalla (NDC, de -1 a 1) ->
    Raycaster.setFromCamera -> dirección 3D desde la cámara hacia ese punto.
    Esa dirección se entrega en el callback onShoot(direction).
*/

import * as THREE from 'three';

export default class InputManager {
    constructor(canvas, camera) {
        this.canvas = canvas;
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.onShoot = null; // lo asigna el Game

        // pointerdown sirve tanto para mouse como para pantallas táctiles
        canvas.addEventListener('pointerdown', (e) => this._handlePointer(e));
    }

    _handlePointer(event) {
        if (!this.onShoot) return;

        // Pixel de pantalla -> NDC (-1..1, con Y hacia arriba)
        const rect = this.canvas.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        this.onShoot(this.raycaster.ray.direction.clone()); // vector unitario
    }
}
