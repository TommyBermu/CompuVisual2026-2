/*
  core/Game.js
  ------------
  El ORQUESTADOR. Equivale a la GameScene de Phaser, pero como Three.js no tiene
  escenas, este archivo cumple ese rol central: une render + física + entidades
  y contiene el bucle principal (requestAnimationFrame + delta time).

  --- ESTADO DEMO ---
  Ahora mismo monta la verificación mínima: un suelo fijo y una bola que cae y
  rebota. Sirve para comprobar que Three.js + Cannon-es cargan y que despliega
  bien en Vercel. Cuando esto se vea, se van enchufando los systems
  (Shooter, Spawner, Shatter, CameraRail) y las demás entidades.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';

import Renderer from './Renderer.js';
import Physics from './Physics.js';
import Entity from '../entities/Entity.js';
import Ball from '../entities/Ball.js';
import { GROUND_SIZE } from '../constants.js';

export default class Game {
    constructor(container) {
        this.renderer = new Renderer(container);
        this.physics = new Physics();
        this.entities = [];
        this.lastTime = 0;
        this._loop = this._loop.bind(this);
    }

    start() {
        this._createGround();
        this._dropBall();
        requestAnimationFrame(this._loop);
    }

    // Suelo: plano visual + plano físico estático (mass 0). No se mueve.
    _createGround() {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(GROUND_SIZE, GROUND_SIZE),
            new THREE.MeshStandardMaterial({ color: 0x222233 })
        );
        mesh.rotation.x = -Math.PI / 2; // tumbar el plano para que sea el suelo
        mesh.receiveShadow = true;

        const body = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane(),
            material: this.physics.defaultMaterial,
        });
        body.quaternion.setFromEuler(-Math.PI / 2, 0, 0);

        const ground = new Entity(mesh, body).addTo(this.renderer, this.physics);
        this.entities.push(ground);
    }

    _dropBall() {
        const ball = new Ball(this.physics, { x: 0, y: 10, z: 0 });
        ball.addTo(this.renderer, this.physics);
        this.entities.push(ball);
    }

    _loop(time) {
        const delta = this.lastTime ? (time - this.lastTime) / 1000 : 0;
        this.lastTime = time;

        this.physics.step(delta);                 // 1. avanza la física
        this.entities.forEach((e) => e.sync());   // 2. body -> mesh
        this.renderer.render();                    // 3. dibuja

        requestAnimationFrame(this._loop);
    }
}
