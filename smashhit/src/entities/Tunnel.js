/*
    entities/Tunnel.js
    ------------------
    UN tramo del pasillo (largo SEGMENT_LENGTH) desde s0 hasta s0 + L del
    recorrido (systems/Track.js): suelo + dos paredes + un arco decorativo a la
    entrada. Se pinta con los colores del nivel al que pertenece. El Spawner
    pone muchos tramos seguidos y borra los que quedan atrás.

    Como el recorrido gira y sube, el tramo NO es una caja: se "barre" la
    sección del pasillo (suelo + paredes con grosor) a lo largo de la curva,
    en rebanadas de SLICE metros:
        - Visual: una malla por pieza (suelo, paredes) con un par de vértices
          por rebanada en cada franja (cara interior, borde de arriba, cara
          exterior). Las normales se promedian: las curvas se ven suaves.
        - Física: UN body estático con 3 cajas (suelo + 2 paredes) por rebanada,
          orientadas con el marco del recorrido en el centro de la rebanada.
          Son un poco más largas que la rebanada para que en el lado exterior
          de las curvas no queden rendijas por las que se cuele una bola.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { LEVELS } from '../levels.js';
import {
    TUNNEL_WIDTH, TUNNEL_HEIGHT, WALL_THICKNESS, SEGMENT_LENGTH,
    GROUP_WORLD, GROUP_CRYSTAL, GROUP_BALL, GROUP_CHUNK,
} from '../constants.js';

const L = SEGMENT_LENGTH;
const W = TUNNEL_WIDTH;
const H = TUNNEL_HEIGHT;
const T = WALL_THICKNESS;
const SLICE = 2;                       // metros por rebanada
const SLICES = Math.round(L / SLICE);
const BOX_HALF_LEN = SLICE * 0.68;     // solape entre cajas de rebanadas vecinas

// Geometrías del arco (iguales en todos los tramos)
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
        const side = THREE.DoubleSide; // las franjas barridas se ven desde dentro y desde fuera
        materialsByLevel.set(levelIndex, {
            floorA: new THREE.MeshStandardMaterial({ color: c.floorA, roughness: 0.8, envMapIntensity: env, side }),
            floorB: new THREE.MeshStandardMaterial({ color: c.floorB, roughness: 0.8, envMapIntensity: env, side }),
            wall: new THREE.MeshStandardMaterial({ color: c.wall, roughness: 0.6, envMapIntensity: env, side }),
            arch: new THREE.MeshStandardMaterial({ color: c.arch, roughness: 0.4, metalness: 0.2, envMapIntensity: env }),
        });
    }
    return materialsByLevel.get(levelIndex);
}

// Malla barrida: `strips` es una lista de franjas; cada franja es una función
// (frame) -> [a, b] (dos puntos de la sección). Une cada par con el de la
// rebanada siguiente.
function sweepGeometry(frames, strips) {
    const pos = [];
    const index = [];
    for (const strip of strips) {
        const base = pos.length / 3;
        frames.forEach((f) => {
            const [a, b] = strip(f);
            pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
        });
        for (let i = 0; i < frames.length - 1; i++) {
            const a0 = base + 2 * i, b0 = a0 + 1, a1 = a0 + 2, b1 = a0 + 3;
            index.push(a0, b0, b1, a0, b1, a1);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
}

// Punto de la sección: x a la derecha, y hacia arriba (coords del marco)
const at = (f, x, y) => f.position.clone().addScaledVector(f.right, x).addScaledVector(f.up, y);

export default class Tunnel extends Entity {
    constructor(physics, track, s0, levelIndex = 0, index = 0) {
        const mats = materialsFor(levelIndex);
        const frames = [];
        for (let i = 0; i <= SLICES; i++) frames.push(track.frameAt(s0 + i * SLICE));

        // --- Visual ---
        const group = new THREE.Group();
        const floorGeo = sweepGeometry(frames, [
            (f) => [at(f, -W / 2 - T, 0), at(f, W / 2 + T, 0)],
        ]);
        const wallStrips = [];
        for (const side of [-1, 1]) {
            const inner = side * W / 2;
            const outer = side * (W / 2 + T);
            wallStrips.push(
                (f) => [at(f, inner, 0), at(f, inner, H)],     // cara interior
                (f) => [at(f, inner, H), at(f, outer, H)],     // borde de arriba
                (f) => [at(f, outer, H), at(f, outer, -T)],    // cara exterior
            );
        }
        const wallGeo = sweepGeometry(frames, wallStrips);

        // Suelo (alternando tono para que se note el avance)
        const floor = new THREE.Mesh(floorGeo, index % 2 ? mats.floorA : mats.floorB);
        floor.receiveShadow = true;
        const walls = new THREE.Mesh(wallGeo, mats.wall);
        walls.receiveShadow = true;

        // Arco a la entrada del tramo: dos pilares + viga, en el marco de s0
        const arch = new THREE.Group();
        const pl = new THREE.Mesh(pillarGeo, mats.arch);
        pl.position.set(-W / 2 - T / 2, (H + 1) / 2, 0);
        const pr = pl.clone();
        pr.position.x = W / 2 + T / 2;
        const beam = new THREE.Mesh(beamGeo, mats.arch);
        beam.position.set(0, H + 0.6, 0);
        [pl, pr, beam].forEach((m) => { m.castShadow = true; });
        arch.add(pl, pr, beam);
        arch.position.copy(frames[0].position);
        arch.quaternion.copy(frames[0].quaternion);

        group.add(floor, walls, arch);

        // --- Física: un body estático con 3 cajas por rebanada ---
        const body = new CANNON.Body({ mass: 0, material: physics.defaultMaterial });
        const floorShape = new CANNON.Box(new CANNON.Vec3(W / 2 + T, T / 2, BOX_HALF_LEN));
        const wallShape = new CANNON.Box(new CANNON.Vec3(T / 2, H / 2, BOX_HALF_LEN));
        for (let i = 0; i < SLICES; i++) {
            const f = track.frameAt(s0 + (i + 0.5) * SLICE);
            const q = new CANNON.Quaternion(f.quaternion.x, f.quaternion.y, f.quaternion.z, f.quaternion.w);
            const v = (p) => new CANNON.Vec3(p.x, p.y, p.z);
            body.addShape(floorShape, v(at(f, 0, -T / 2)), q);
            body.addShape(wallShape, v(at(f, -W / 2 - T / 2, H / 2)), q);
            body.addShape(wallShape, v(at(f, W / 2 + T / 2, H / 2)), q);
        }
        // Mundo: choca con las bolas (normales e inertes) y los bloques de vidrio que caen.
        body.collisionFilterGroup = GROUP_WORLD;
        body.collisionFilterMask = GROUP_WORLD | GROUP_CRYSTAL | GROUP_BALL | GROUP_CHUNK;

        super(group, body);
        this.s0 = s0;
        this.s1 = s0 + L;
        this.floorGeo = floorGeo;
        this.wallGeo = wallGeo;
    }

    // El body está en el origen con las formas en coords de mundo: nada que sincronizar
    sync() {}

    destroy(renderer, physics) {
        super.destroy(renderer, physics);
        this.floorGeo.dispose();
        this.wallGeo.dispose();
    }
}
