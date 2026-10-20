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
    BALL_RADIUS, BALL_MASS, GROUP_BALL, GROUP_WORLD, GROUP_CRYSTAL,
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
        // Por defecto (bola disparada): choca con el mundo y con los cristales.
        body.collisionFilterGroup = GROUP_BALL;
        body.collisionFilterMask = GROUP_WORLD | GROUP_CRYSTAL;

        super(mesh, body);

        // Etiqueta + detección de choque contra un cristal.
        // Solo marcamos una bandera (crystal.hit); el borrado/caída lo hace el
        // Spawner fuera del step de física (modificar el mundo dentro del
        // callback de colisión es arriesgado).
        body.userData = { type: 'ball', entity: this };
        body.addEventListener('collide', (e) => {
            if (this.inert) return; // las bolas de la animación de muerte no rompen nada
            const other = e.body.userData;
            if (other && other.type === 'crystal' && !other.entity.hit) {
                other.entity.hit = true;
                other.entity._impact = body.velocity.clone();
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
