/*
    entities/Pyramid.js
    -------------------
    BONUS de bolas: los ÚNICOS cristales que dan bolas (los paneles normales no).
    Dos tipos según dónde estén:

        pyramid  APOYADA sobre algo que no es cristal (suelo, base, pedestal,
                 bloque): pirámide 3D de base cuadrada, quieta.          +3 bolas
        diamond  FLOTANDO en el aire: rombo (octaedro alargado) que gira y
                 sube y baja. Mucho más raro que la pirámide.           +5 bolas

    El color es el COMPLEMENTARIO (opuesto en el círculo cromático) del tono
    del nivel, para que destaque siempre.

    Física: body cinemático con su forma convexa y collisionResponse = false:
    detecta a la bola (evento 'collide' en Ball) pero no la desvía; la bola
    sigue y el bonus revienta en esquirlas. No hace daño a la cámara.
    El golpe se encola (registerBallHit, dentro del step) y se procesa fuera
    (processHits), como con los paneles.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { LEVELS } from '../levels.js';
import { pointToWorld } from '../utils/frame.js';
import { GROUP_CRYSTAL, GROUP_BALL, CRYSTAL_BREAK_REWARD, DIAMOND_REWARD } from '../constants.js';

const P_HALF = 0.85;   // media base de la pirámide
const P_H = 1.4;       // alto de la pirámide
const D_W = 0.7;       // semiancho del rombo
const D_H = 1.25;      // semialto del rombo
const SPIN = 0.9;      // rad/s

const pyramidGeo = new THREE.ConeGeometry(P_HALF * Math.SQRT2, P_H, 4, 1).rotateY(Math.PI / 4);
const diamondGeo = new THREE.OctahedronGeometry(1).scale(D_W, D_H, D_W);
const shardGeo = new THREE.TetrahedronGeometry(0.22);

// Color COMPLEMENTARIO (opuesto en el círculo cromático) del tono del nivel.
// El tono del nivel se toma del cielo (skyMid), que es lo que domina la
// pantalla junto con la niebla (tienen casi el mismo tono).
// Para que el color se vea de verdad y no se "contamine" con el del nivel:
//   - opaco (sin transmisión: no deja ver el cielo a través),
//   - casi sin reflejos del entorno (el reflejo del cielo lo teñiría),
//   - sin niebla (la niebla lo volvería del color del nivel a distancia),
//   - sin tone mapping (ACES desatura los colores muy vivos).
const materials = new Map();
export function bonusColor(levelIndex) {
    const hsl = {};
    // en sRGB (el espacio de los colores que vemos), no en el lineal interno de Three
    new THREE.Color(LEVELS[levelIndex].colors.skyMid).getHSL(hsl, THREE.SRGBColorSpace);
    return new THREE.Color().setHSL((hsl.h + 0.5) % 1, 1, 0.5, THREE.SRGBColorSpace);
}
function materialFor(levelIndex) {
    if (!materials.has(levelIndex)) {
        const comp = bonusColor(levelIndex);
        materials.set(levelIndex, new THREE.MeshStandardMaterial({
            color: comp,
            emissive: comp,
            emissiveIntensity: 0.45, // brilla un poco; las caras siguen sombreadas (facetas)
            roughness: 0.35,
            metalness: 0,
            envMapIntensity: 0.15,
            flatShading: true,
            fog: false,
            toneMapped: false,
        }));
    }
    return materials.get(levelIndex);
}

const V = (x, y, z) => new CANNON.Vec3(x, y, z);

function pyramidShape() {
    const h = P_H / 2, s = P_HALF;
    return new CANNON.ConvexPolyhedron({
        vertices: [V(-s, -h, -s), V(s, -h, -s), V(s, -h, s), V(-s, -h, s), V(0, h, 0)],
        faces: [[0, 1, 2, 3], [0, 4, 1], [1, 4, 2], [2, 4, 3], [3, 4, 0]], // CCW vistas desde fuera
    });
}

function diamondShape() {
    return new CANNON.ConvexPolyhedron({
        vertices: [V(D_W, 0, 0), V(-D_W, 0, 0), V(0, D_H, 0), V(0, -D_H, 0), V(0, 0, D_W), V(0, 0, -D_W)],
        faces: [[0, 2, 4], [4, 2, 1], [1, 2, 5], [5, 2, 0], [4, 3, 0], [1, 3, 4], [5, 3, 1], [0, 3, 5]],
    });
}

export default class Pyramid extends Entity {
    /*
        frame: Track.frameAt(s) (o el marco de un obstáculo)
        (x, y, z): posición local. Para 'pyramid', y = la SUPERFICIE donde se apoya.
        kind: 'pyramid' (apoyada, +3) | 'diamond' (flotando, +5)
    */
    constructor(frame, levelIndex, x, y, { z = 0, kind = 'diamond' } = {}) {
        const sitting = kind === 'pyramid';
        const mesh = new THREE.Mesh(sitting ? pyramidGeo : diamondGeo, materialFor(levelIndex));
        const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionResponse: false });
        body.addShape(sitting ? pyramidShape() : diamondShape());
        body.collisionFilterGroup = GROUP_CRYSTAL;
        body.collisionFilterMask = GROUP_BALL;
        super(mesh, body);
        body.userData = { type: 'pyramid', entity: this };

        this.kind = kind;
        this.reward = sitting ? CRYSTAL_BREAK_REWARD : DIAMOND_REWARD;
        this.frame = frame;
        this.s = frame.s;
        this.up = frame.up ? frame.up.clone() : new THREE.Vector3(0, 1, 0);
        this.base = pointToWorld(frame, x, sitting ? y + P_H / 2 : y, z, new THREE.Vector3());
        this.baseQ = new THREE.Quaternion().copy(frame.quaternion);
        this.time = Math.random() * 10;
        this.spin0 = Math.random() * Math.PI / 2; // orientación fija de la pirámide
        this.hitBy = null;    // velocidad de la bola que la tocó (pendiente de procesar)
        this.broken = false;
        this._pose();
    }

    // Desde el 'collide' de la bola (dentro del step): solo marca
    registerBallHit(ball) {
        if (!this.broken && !this.hitBy) this.hitBy = ball.body.velocity.clone();
    }

    _pose() {
        const p = this.base;
        const bob = this.kind === 'diamond' ? Math.sin(this.time * 1.6) * 0.18 : 0;
        this.body.position.set(p.x + this.up.x * bob, p.y + this.up.y * bob, p.z + this.up.z * bob);
        // Solo el rombo gira; la pirámide se queda quieta, apoyada (en una rampa,
        // inclinada con ella)
        const angle = this.kind === 'diamond' ? this.time * SPIN : this.spin0;
        const spin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        const q = this.baseQ.clone().multiply(spin);
        this.body.quaternion.set(q.x, q.y, q.z, q.w);
        this.body.aabbNeedsUpdate = true;
        this.sync();
    }

    update(delta) {
        this.time += delta;
        if (!this.broken) this._pose();
    }

    // Procesa el golpe (FUERA del step). true = se rompió ahora (dar el premio).
    processHits(shatter) {
        if (!this.hitBy || this.broken) return false;
        this.broken = true;
        const push = this.hitBy.scale(0.25);
        const p = this.body.position;
        const n = this.kind === 'diamond' ? 18 : 14;
        for (let k = 0; k < n; k++) {
            const shard = new THREE.Mesh(shardGeo.clone(), this.mesh.material);
            shard.position.set(p.x + (Math.random() - 0.5), p.y + (Math.random() - 0.5) * 1.4, p.z + (Math.random() - 0.5));
            const out = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5)
                .normalize().multiplyScalar(3 + Math.random() * 4);
            shatter.addShard(shard, new THREE.Vector3(push.x + out.x, push.y + out.y, push.z + out.z), this.frame);
        }
        return true;
    }
}
