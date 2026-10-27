/*
    entities/Obstacle.js
    --------------------
    Base de los OBSTÁCULOS del recorrido (ver src/obstacles/). Un obstáculo es
    una estructura con dos tipos de partes:

        - panels: vidrio rompible (GlassPanel). Bolas y cámara los rompen; el
          Spawner procesa sus golpes, da el premio y comprueba el choque.
        - solids: partes SÓLIDAS (metal o piedra: barras, ejes, puertas,
          bloques, columnas). No se rompen; las bolas y los bloques de vidrio
          rebotan en ellas. Son cuerpos cinemáticos: el obstáculo las mueve por
          código cada frame (o las deja quietas).

    Cada obstáculo vive en un punto `s` del recorrido y se DISEÑA EN LOCAL, en
    el marco del recorrido en ese punto (Track.frameAt): x a la derecha, y hacia
    arriba desde el suelo, -z hacia delante. placeSolid / panel.setPose reciben
    coords locales; utils/frame.js las pasa a mundo. Así el mismo obstáculo
    funciona en una recta, en una curva o en una rampa.

    La cámara pasa SIEMPRE por x = 0, y = CAMERA_HEIGHT (local). Las partes
    sólidas que pueden cerrarle el paso (puertas) se marcan `blocking`: la base
    comprueba la esfera de la cámara contra sus cajas (cameraHit). El resto de
    partes sólidas se colocan para no tocar nunca ese "tubo".

    Encaja en Entity con mesh = THREE.Group (las partes sólidas, en coords de
    mundo) y body = null; los paneles son entidades aparte.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { LEVELS } from '../levels.js';
import { GROUP_WORLD, GROUP_BALL, GROUP_CHUNK } from '../constants.js';
import { pointToWorld, quatToWorld, pointToLocal } from '../utils/frame.js';

// Material metálico por nivel (color del arco del nivel), reutilizado.
const metalByLevel = new Map();
// Material "piedra" para el relleno (bloques, columnas): tono de la pared, más oscuro.
const stoneByLevel = new Map();

export function metalMaterial(levelIndex) {
    if (!metalByLevel.has(levelIndex)) {
        const c = LEVELS[levelIndex].colors;
        metalByLevel.set(levelIndex, new THREE.MeshStandardMaterial({
            color: c.arch, metalness: 0.6, roughness: 0.35, envMapIntensity: 0.6,
        }));
    }
    return metalByLevel.get(levelIndex);
}

export function stoneMaterial(levelIndex) {
    if (!stoneByLevel.has(levelIndex)) {
        const c = LEVELS[levelIndex].colors;
        const color = new THREE.Color(c.wall).lerp(new THREE.Color(c.floorB), 0.5).multiplyScalar(0.82);
        stoneByLevel.set(levelIndex, new THREE.MeshStandardMaterial({
            color, roughness: 0.75, metalness: 0.05, envMapIntensity: 0.35,
        }));
    }
    return stoneByLevel.get(levelIndex);
}

const tmpP = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

export default class Obstacle extends Entity {
    // frame: Track.frameAt(s) del punto donde va el obstáculo
    constructor(frame, levelIndex = 0) {
        super(new THREE.Group(), null);
        this.frame = frame;
        this.s = frame.s;
        this.levelIndex = levelIndex;
        this.metal = metalMaterial(levelIndex);
        this.stone = stoneMaterial(levelIndex);
        this.panels = [];  // GlassPanel
        this.solids = [];  // { mesh, body, blocking, box }
        this.time = 0;
        this.renderer = null;
        this.physics = null;
    }

    // Registra un panel de vidrio (sus poses serán locales a este obstáculo)
    addPanel(panel) {
        panel.frame = this.frame;
        if (panel.placeInFrame) panel.placeInFrame();
        this.panels.push(panel);
        if (this.renderer) panel.addTo(this.renderer, this.physics);
        return panel;
    }

    // Parte sólida: mesh + body cinemático con la misma forma.
    // options: { material, blocking }
    addSolid(geometry, shape, { material = this.metal, blocking = false } = {}) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
        body.addShape(shape);
        body.collisionFilterGroup = GROUP_WORLD;
        body.collisionFilterMask = GROUP_BALL | GROUP_CHUNK;
        const solid = { mesh, body, blocking, box: null };
        this.mesh.add(mesh);
        this.solids.push(solid);
        if (this.physics) this.physics.add(body);
        return solid;
    }

    // Caja de tamaño (w, h, d). Guarda sus medias medidas para el choque con la cámara.
    addBox(w, h, d, options = {}) {
        const solid = this.addSolid(
            new THREE.BoxGeometry(w, h, d),
            new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2)),
            options,
        );
        solid.half = { x: w / 2, y: h / 2, z: d / 2 };
        return solid;
    }

    // Cilindro de radio r y largo len (a lo largo de su Y local)
    addCylinder(r, len, options = {}) {
        return this.addSolid(
            new THREE.CylinderGeometry(r, r, len, 18),
            new CANNON.Cylinder(r, r, len, 10),
            options,
        );
    }

    // Caja colocada de una vez por sus límites locales (relleno, bloques)
    addStaticBox(minX, maxX, minY, maxY, z, depth, options = {}) {
        const solid = this.addBox(maxX - minX, maxY - minY, depth, { material: this.stone, ...options });
        this.placeSolid(solid, (minX + maxX) / 2, (minY + maxY) / 2, z);
        return solid;
    }

    // Coloca una parte sólida en coords LOCALES (quaternion local, THREE u omitido)
    placeSolid(solid, x, y, z, quaternion = null) {
        const p = pointToWorld(this.frame, x, y, z, tmpP);
        const q = quatToWorld(this.frame, quaternion, tmpQ);
        solid.body.position.set(p.x, p.y, p.z);
        solid.body.quaternion.set(q.x, q.y, q.z, q.w);
        solid.body.aabbNeedsUpdate = true;
        solid.mesh.position.copy(p);
        solid.mesh.quaternion.copy(q);
        // Caja local para el choque con la cámara (solo cajas sin girar)
        if (solid.half && !quaternion) solid.box = { x, y, z };
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

    // Punto de mundo -> coords locales del obstáculo
    toLocal(worldPos) {
        return pointToLocal(this.frame, worldPos);
    }

    // ¿Una parte sólida BLOQUEANTE toca la esfera de la cámara? (pos en mundo)
    cameraHit(worldPos, radius) {
        const blocking = this.solids.filter((s) => s.blocking && s.box);
        if (!blocking.length) return false;
        const l = this.toLocal(worldPos);
        return blocking.some(({ box, half }) => {
            const dx = Math.max(Math.abs(l.x - box.x) - half.x, 0);
            const dy = Math.max(Math.abs(l.y - box.y) - half.y, 0);
            const dz = Math.max(Math.abs(l.z - box.z) - half.z, 0);
            return Math.hypot(dx, dy, dz) <= radius;
        });
    }

    // --- Para las subclases -------------------------------------------------

    // Mover/animar
    update(delta) {
        this.time += delta;
    }

    // Un panel de este obstáculo recibió su primer golpe de bola
    onPanelBroken() {}

    // La cámara chocó con una parte bloqueante: abrirse paso (romper/abrir).
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
