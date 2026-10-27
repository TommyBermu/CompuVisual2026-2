/*
    entities/Obstacle.js
    --------------------
    Base de los OBSTÁCULOS del recorrido (ver src/obstacles/). Un obstáculo es
    una estructura con dos tipos de partes:

        - panels: vidrio rompible (GlassPanel). Bolas y cámara los rompen; el
          Spawner procesa sus golpes, da el premio y comprueba el choque.
        - solids: partes METÁLICAS (barras, ejes, puertas). No se rompen; las
          bolas y los bloques de vidrio rebotan en ellas. Son cuerpos
          cinemáticos: el obstáculo las mueve por código cada frame.

    Cada subclase decide cómo se mueve todo en update(delta, cameraZ), y si sus
    partes sólidas pueden golpear a la cámara (cameraHit / smashByCamera, p.ej.
    una compuerta cerrada).

    Encaja en Entity con mesh = THREE.Group (las partes sólidas, en coords de
    mundo) y body = null; los paneles son entidades aparte.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { LEVELS } from '../levels.js';
import { GROUP_WORLD, GROUP_BALL, GROUP_CHUNK } from '../constants.js';

// Material metálico por nivel (color del arco del nivel), reutilizado.
const metalByLevel = new Map();

export function metalMaterial(levelIndex) {
    if (!metalByLevel.has(levelIndex)) {
        const c = LEVELS[levelIndex].colors;
        metalByLevel.set(levelIndex, new THREE.MeshStandardMaterial({
            color: c.arch, metalness: 0.6, roughness: 0.35, envMapIntensity: 0.6,
        }));
    }
    return metalByLevel.get(levelIndex);
}

export default class Obstacle extends Entity {
    constructor(z, levelIndex = 0) {
        super(new THREE.Group(), null);
        this.z = z;
        this.levelIndex = levelIndex;
        this.metal = metalMaterial(levelIndex);
        this.panels = [];  // GlassPanel
        this.solids = [];  // { mesh, body }
        this.time = 0;
        this.renderer = null;
        this.physics = null;
    }

    // Registra un panel de vidrio (se añade al mundo con el obstáculo)
    addPanel(panel) {
        this.panels.push(panel);
        if (this.renderer) panel.addTo(this.renderer, this.physics);
        return panel;
    }

    // Parte metálica: mesh + body cinemático con la misma forma (Box o Cylinder).
    addSolid(geometry, shape) {
        const mesh = new THREE.Mesh(geometry, this.metal);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
        body.addShape(shape);
        body.collisionFilterGroup = GROUP_WORLD;
        body.collisionFilterMask = GROUP_BALL | GROUP_CHUNK;
        const solid = { mesh, body };
        this.mesh.add(mesh);
        this.solids.push(solid);
        if (this.physics) this.physics.add(body);
        return solid;
    }

    // Caja metálica de tamaño (w, h, d)
    addBox(w, h, d) {
        return this.addSolid(
            new THREE.BoxGeometry(w, h, d),
            new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
        );
    }

    // Coloca una parte sólida (mesh + body) en el mundo
    placeSolid(solid, x, y, z, quaternion = null) {
        solid.body.position.set(x, y, z);
        if (quaternion) solid.body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        solid.body.aabbNeedsUpdate = true;
        solid.mesh.position.set(x, y, z);
        if (quaternion) solid.mesh.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }

    addTo(renderer, physics) {
        this.renderer = renderer;
        this.physics = physics;
        renderer.add(this.mesh);
        this.panels.forEach((p) => p.addTo(renderer, physics));
        this.solids.forEach((s) => physics.add(s.body));
        return this;
    }

    // Quita los paneles que ya se rompieron del todo
    prunePanels() {
        this.panels = this.panels.filter((p) => {
            if (!p.empty) return true;
            p.destroy(this.renderer, this.physics);
            return false;
        });
    }

    // --- Para las subclases -------------------------------------------------

    // Mover/animar. cameraZ sirve para activar cosas al acercarse.
    update(delta) {
        this.time += delta;
    }

    // Un panel de este obstáculo recibió su primer golpe de bola
    onPanelBroken() {}

    // ¿Una parte SÓLIDA toca la esfera de la cámara? (true/false)
    cameraHit() {
        return false;
    }

    // La cámara chocó con una parte sólida: abrirse paso (romper/abrir).
    smashByCamera() {}

    // Objetos contra los que se apunta (Shooter)
    aimMeshes() {
        return [this.mesh, ...this.panels.map((p) => p.mesh)];
    }

    destroy(renderer, physics) {
        renderer.remove(this.mesh);
        this.panels.forEach((p) => p.destroy(renderer, physics));
        this.solids.forEach((s) => {
            physics.remove(s.body);
            s.mesh.geometry.dispose();
        });
        this.panels = [];
        this.solids = [];
    }
}
