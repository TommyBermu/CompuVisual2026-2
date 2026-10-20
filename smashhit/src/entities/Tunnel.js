/*
    entities/Tunnel.js
    ------------------
    UN tramo del pasillo (largo SEGMENT_LENGTH): suelo + dos paredes + un arco
    decorativo a la entrada. Se pinta con los colores del nivel al que pertenece.
    El Spawner pone muchos tramos seguidos para que el pasillo parezca infinito
    y borra los que quedan atrás.

    Truco para encajar en Entity (un mesh + un body):
        - mesh = THREE.Group con todas las piezas visuales.
        - body = UN solo CANNON.Body estático (mass 0) con varias formas Box
            desplazadas (addShape con offset). Las bolas rebotarán en suelo y paredes.
    El origen del tramo está en el suelo, centrado en X, al INICIO del tramo (z),
    y el tramo se extiende hacia -Z.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { LEVELS } from '../levels.js';
import {
    TUNNEL_WIDTH, TUNNEL_HEIGHT, WALL_THICKNESS, SEGMENT_LENGTH,
    GROUP_WORLD, GROUP_CRYSTAL, GROUP_BALL,
} from '../constants.js';

// Geometrías y materiales compartidos por todos los tramos (no recrearlos cada vez).
const L = SEGMENT_LENGTH;
const W = TUNNEL_WIDTH;
const H = TUNNEL_HEIGHT;
const T = WALL_THICKNESS;

const floorGeo = new THREE.BoxGeometry(W + 2 * T, T, L);
const wallGeo = new THREE.BoxGeometry(T, H, L);
const pillarGeo = new THREE.BoxGeometry(0.8, H + 1, 0.8);
const beamGeo = new THREE.BoxGeometry(W + 2 * T + 0.8, 0.8, 0.8);

// Materiales de cada nivel: se crean la primera vez que se piden y se reutilizan.
const materialsByLevel = new Map();

function materialsFor(levelIndex) {
    if (!materialsByLevel.has(levelIndex)) {
        const c = LEVELS[levelIndex].colors;
        // envMapIntensity bajo: el cielo (scene.environment) aclara poco el pasillo,
        // así los colores del nivel no se ven "lavados". Las bolas sí lo reflejan completo.
        const env = 0.35;
        materialsByLevel.set(levelIndex, {
            floorA: new THREE.MeshStandardMaterial({ color: c.floorA, roughness: 0.8, envMapIntensity: env }),
            floorB: new THREE.MeshStandardMaterial({ color: c.floorB, roughness: 0.8, envMapIntensity: env }),
            wall: new THREE.MeshStandardMaterial({ color: c.wall, roughness: 0.6, envMapIntensity: env }),
            arch: new THREE.MeshStandardMaterial({ color: c.arch, roughness: 0.4, metalness: 0.2, envMapIntensity: env }),
        });
    }
    return materialsByLevel.get(levelIndex);
}

export default class Tunnel extends Entity {
    constructor(physics, startZ, levelIndex = 0, index = 0) {
        const mats = materialsFor(levelIndex);

        // --- Visual ---
        const group = new THREE.Group();

        // Suelo (alternando tono para que se note el avance)
        const floor = new THREE.Mesh(floorGeo, index % 2 ? mats.floorA : mats.floorB);
        floor.position.set(0, -T / 2, -L / 2);
        floor.receiveShadow = true;

        // Paredes
        const left = new THREE.Mesh(wallGeo, mats.wall);
        left.position.set(-W / 2 - T / 2, H / 2, -L / 2);
        const right = left.clone();
        right.position.x = W / 2 + T / 2;
        left.receiveShadow = right.receiveShadow = true;

        // Arco a la entrada del tramo: dos pilares + viga
        const pl = new THREE.Mesh(pillarGeo, mats.arch);
        pl.position.set(-W / 2 - T / 2, (H + 1) / 2, 0);
        const pr = pl.clone();
        pr.position.x = W / 2 + T / 2;
        const beam = new THREE.Mesh(beamGeo, mats.arch);
        beam.position.set(0, H + 0.6, 0);
        [pl, pr, beam].forEach((m) => { m.castShadow = true; });

        group.add(floor, left, right, pl, pr, beam);

        // --- Física: un body estático con 3 cajas ---
        const body = new CANNON.Body({ mass: 0, material: physics.defaultMaterial });
        body.addShape(
            new CANNON.Box(new CANNON.Vec3((W + 2 * T) / 2, T / 2, L / 2)),
            new CANNON.Vec3(0, -T / 2, -L / 2)
        );
        const wallShape = new CANNON.Box(new CANNON.Vec3(T / 2, H / 2, L / 2));
        body.addShape(wallShape, new CANNON.Vec3(-W / 2 - T / 2, H / 2, -L / 2));
        body.addShape(wallShape, new CANNON.Vec3(W / 2 + T / 2, H / 2, -L / 2));
        body.position.set(0, 0, startZ);
        // Mundo: choca con todas las bolas (normales e inertes) y todo lo demás.
        body.collisionFilterGroup = GROUP_WORLD;
        body.collisionFilterMask = GROUP_WORLD | GROUP_CRYSTAL | GROUP_BALL;

        super(group, body);
        this.startZ = startZ;
        this.endZ = startZ - L;
        this.sync(); // colocar el grupo donde está el body
    }
}
