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
import { BALL_RADIUS, BALL_MASS } from '../constants.js';

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

        super(mesh, body);
        this.sync();
    }
}
