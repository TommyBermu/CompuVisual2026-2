/*
  entities/Ball.js
  ----------------
  La bola de metal: esfera visual (Three) + cuerpo esférico con masa (Cannon).
  Es el único objeto dinámico de la demo (cae y rebota por la gravedad).

  Más adelante el sistema Shooter la creará en la cámara y le dará velocidad
  inicial hacia el punto objetivo. En la demo solo la soltamos desde arriba.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { BALL_RADIUS, BALL_MASS } from '../constants.js';

export default class Ball extends Entity {
    constructor(physics, position = { x: 0, y: 8, z: 0 }) {
        // Visual
        const geometry = new THREE.SphereGeometry(BALL_RADIUS, 32, 32);
        const material = new THREE.MeshStandardMaterial({
            color: 0x66ccff,
            metalness: 0.6,
            roughness: 0.2,
        });
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
    }
}
