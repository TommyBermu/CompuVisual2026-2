/*
    entities/Ball.js
    ----------------
    La bola de metal: esfera visual (Three) + cuerpo esférico con masa (Cannon).
    El Shooter la crea delante de la cámara y le da velocidad inicial; desde ahí
    solo la mueve la física (gravedad + rebotes).

    Material muy metálico y poco rugoso: refleja el cielo del nivel
    (scene.environment), por eso cambia de "color" según la paleta.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import {
    BALL_RADIUS, BALL_MASS, GROUP_BALL, GROUP_WORLD, GROUP_CRYSTAL, GROUP_CHUNK,
} from '../constants.js';

// Compartidos por todas las bolas (se dispara mucho, no recrearlos cada vez)
const geometry = new THREE.SphereGeometry(BALL_RADIUS, 24, 16);
const material = new THREE.MeshStandardMaterial({
    color: 0xdddddd,
    metalness: 0.95,
    roughness: 0.15,
});

export default class Ball extends Entity {
    constructor(physics, position = { x: 0, y: 8, z: 0 }) {
        // Visual
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        // Física
        const body = new CANNON.Body({
            mass: BALL_MASS,
            shape: new CANNON.Sphere(BALL_RADIUS),
            material: physics.defaultMaterial,
        });
        body.position.set(position.x, position.y, position.z);
        // Por defecto (bola disparada): choca con el mundo, los paneles y los bloques que caen.
        body.collisionFilterGroup = GROUP_BALL;
        body.collisionFilterMask = GROUP_WORLD | GROUP_CRYSTAL | GROUP_CHUNK;

        super(mesh, body);

        // Etiqueta + detección de choque contra el vidrio.
        // Solo se ENCOLA el golpe (registerBallHit); romper el panel lo hace el
        // Spawner fuera del step de física (modificar el mundo dentro del
        // callback de colisión es arriesgado). Los paneles tienen
        // collisionResponse = false: la bola no rebota, los atraviesa.
        body.userData = { type: 'ball', entity: this };
        this.hitCrystals = new Set(); // paneles que esta bola ya rompió (uno por pasada)
        body.addEventListener('collide', (e) => {
            if (this.inert) return; // las bolas de la animación de muerte no rompen nada
            const other = e.body.userData;
            if (other && (other.type === 'crystal' || other.type === 'chunk')) {
                other.entity.registerBallHit(this);
            }
        });

        this.inert = false; // true = decorativa (no rompe cristales)
        this.sync();
    }

    // Marca la bola como "inerte" (animación de muerte): no rompe cristales y
    // físicamente los ATRAVIESA, pero sigue chocando con suelo y paredes.
    setInert() {
        this.inert = true;
        this.body.collisionFilterMask = GROUP_WORLD; // quita CRYSTAL de la máscara
        return this;
    }
}
