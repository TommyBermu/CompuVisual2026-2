/*
  core/Renderer.js
  ----------------
  Capa VISUAL (Three.js). No sabe nada de física.
  Responsabilidad: crear la escena, la cámara, las luces y el WebGLRenderer,
  y dibujar un frame cuando se le pide.

  En la demo (bola que rebota) ya está funcional. Más adelante aquí se añaden
  niebla, skybox, sombras de más calidad, etc.
*/

import * as THREE from 'three';
import { CAMERA_FOV } from '../constants.js';

export default class Renderer {
    constructor(container) {
        // Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x101018);

        // Cámara
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 1000);
        this.camera.position.set(0, 6, 12);
        this.camera.lookAt(0, 1, 0);

        // Renderer WebGL
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        container.appendChild(this.renderer.domElement);

        // Luces
        const ambient = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambient);

        const dir = new THREE.DirectionalLight(0xffffff, 1);
        dir.position.set(5, 10, 7);
        dir.castShadow = true;
        this.scene.add(dir);

        // Redimensionado
        window.addEventListener('resize', () => this.onResize());
    }

    add(mesh) {
        this.scene.add(mesh);
    }

    remove(mesh) {
        this.scene.remove(mesh);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
