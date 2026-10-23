/*
    systems/Shatter.js
    ------------------
    El efecto estrella de Smash Hit: gestiona los trozos de vidrio que se
    SUELTAN de un panel (Crystal.breakAt). Hay dos tipos:

    1. ASTILLAS (debris): las celdas pequeñas del agujero. Son muchas y solo
       decorativas, así que NO usan Cannon: se mueven con una física mínima
       propia (gravedad + rebote con suelo/paredes + giro). Mucho más barato
       que cientos de cuerpos convexos. No hacen daño.

    2. BLOQUES (chunks): partes del panel que quedaron SIN APOYO y se caen
       enteras. Son cuerpos dinámicos reales de Cannon (una forma convexa por
       trozo) que ruedan por el suelo. Si un bloque grande (>= CHUNK_HARMFUL_AREA)
       acaba atravesado en el camino, la cámara choca con él (Spawner ->
       cameraCollision). Si una bola o la cámara lo golpean, revienta en astillas.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { shatterPolygon, polygonCentroid } from '../utils/fracture.js';
import { prismGeometry, ensureShape, distanceToPrism, centerPolygon } from '../utils/glass.js';
import {
    GRAVITY, TUNNEL_WIDTH, DESPAWN_BEHIND, CRYSTAL_THICKNESS,
    DEBRIS_LIFETIME, MAX_DEBRIS, CHUNK_LIFETIME, CHUNK_HARMFUL_AREA, GLASS_CHUNK_DENSITY,
    GROUP_WORLD, GROUP_BALL, GROUP_CHUNK,
} from '../constants.js';

const CT = CRYSTAL_THICKNESS;
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const tmpQ = new THREE.Quaternion();
const tmpAxis = new THREE.Vector3();
const WALL_X = TUNNEL_WIDTH / 2 - 0.05;

// Un bloque de vidrio cayéndose (cuerpo dinámico compuesto)
class GlassChunk {
    constructor(mesh, body, parts, area) {
        this.mesh = mesh;
        this.body = body;
        this.parts = parts;      // [{ poly, ox, oy, material }] poly centrado en (ox, oy) del body
        this.area = area;
        this.harmful = area >= CHUNK_HARMFUL_AREA;
        this.age = 0;
        this.pendingShatter = null; // velocidad de la bola que lo golpeó
        body.userData = { type: 'chunk', entity: this };
    }

    // Desde el 'collide' de la bola (dentro del step): solo marca
    registerBallHit(ball) {
        if (!this.pendingShatter) this.pendingShatter = ball.body.velocity.clone();
    }

    // Distancia de un punto de mundo al bloque
    distanceTo(worldPos) {
        const local = this.body.pointToLocalFrame(new CANNON.Vec3(worldPos.x, worldPos.y, worldPos.z));
        let best = Infinity;
        for (const part of this.parts) {
            const d = distanceToPrism(part.poly, CT, local.x - part.ox, local.y - part.oy, local.z);
            if (d < best) best = d;
        }
        return best;
    }
}

export default class Shatter {
    constructor(renderer, physics) {
        this.renderer = renderer;
        this.physics = physics;
        this.debris = [];
        this.chunks = [];
    }

    // Astillas del agujero. pieces: trozos del Crystal (coords del panel),
    // origin: centro del panel en mundo, impact: punto de impacto en mundo,
    // launch: { push: Vec3, spread: m/s hacia fuera del impacto }
    spawnDebris(pieces, origin, impact, launch) {
        for (const p of pieces) {
            const mesh = p.mesh;
            mesh.position.set(origin.x + p.cx, origin.y + p.cy, origin.z);
            mesh.quaternion.identity();
            // hacia fuera del punto de impacto (en el plano del panel)
            const rx = mesh.position.x - impact.x;
            const ry = mesh.position.y - impact.y;
            const r = Math.hypot(rx, ry) || 1;
            const out = launch.spread * (0.4 + Math.random() * 0.8);
            const vel = new THREE.Vector3(
                launch.push.x + (rx / r) * out + rnd(0.6),
                launch.push.y + (ry / r) * out + rnd(0.6) + 1,
                launch.push.z + rnd(1),
            );
            this._addDebris(mesh, vel);
        }
    }

    _addDebris(mesh, vel) {
        this.renderer.add(mesh);
        this.debris.push({
            mesh,
            vel,
            angVel: new THREE.Vector3(rnd(8), rnd(8), rnd(8)),
            age: 0,
            life: DEBRIS_LIFETIME * (0.7 + Math.random() * 0.6),
        });
        // Tope de astillas: borrar las más viejas
        while (this.debris.length > MAX_DEBRIS) this._removeDebris(this.debris.shift());
    }

    _removeDebris(d) {
        this.renderer.remove(d.mesh);
        d.mesh.geometry.dispose();
    }

    // Bloque sin apoyo: un cuerpo dinámico con todos sus trozos.
    spawnChunk(pieces, origin, push) {
        // Centro de masas (ponderado por área) en coords del panel
        let area = 0, cx = 0, cy = 0;
        pieces.forEach((p) => { area += p.area; cx += p.cx * p.area; cy += p.cy * p.area; });
        cx /= area; cy /= area;

        const body = new CANNON.Body({
            mass: Math.max(0.3, area * GLASS_CHUNK_DENSITY),
            material: this.physics.defaultMaterial,
        });
        body.collisionFilterGroup = GROUP_CHUNK;
        body.collisionFilterMask = GROUP_WORLD | GROUP_BALL;
        const group = new THREE.Group();
        const parts = [];
        for (const p of pieces) {
            const ox = p.cx - cx, oy = p.cy - cy;
            body.addShape(ensureShape(p), new CANNON.Vec3(ox, oy, 0));
            p.mesh.position.set(ox, oy, 0);
            p.mesh.quaternion.identity();
            group.add(p.mesh);
            parts.push({ poly: p.poly, ox, oy, material: p.material, mesh: p.mesh });
        }
        body.position.set(origin.x + cx, origin.y + cy, origin.z);
        // Empujoncito en la dirección del golpe + giro para que se tumbe
        body.velocity.set(push.x + rnd(0.3), push.y, push.z + rnd(0.3));
        body.angularVelocity.set(rnd(1.5), rnd(0.8), rnd(1.5));

        const chunk = new GlassChunk(group, body, parts, area);
        this.renderer.add(group);
        this.physics.add(body);
        group.position.copy(body.position);
        this.chunks.push(chunk);
        return chunk;
    }

    // Revienta un bloque en astillas (golpe de bola o de cámara)
    shatterChunk(chunk, push = new CANNON.Vec3()) {
        const body = chunk.body;
        for (const part of chunk.parts) {
            for (const cell of shatterPolygon(part.poly)) {
                const [ccx, ccy] = polygonCentroid(cell);
                const mesh = new THREE.Mesh(prismGeometry(centerPolygon(cell, ccx, ccy), CT), part.material);
                const w = body.pointToWorldFrame(new CANNON.Vec3(part.ox + ccx, part.oy + ccy, 0));
                mesh.position.set(w.x, w.y, w.z);
                mesh.quaternion.set(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
                const vel = new THREE.Vector3(
                    body.velocity.x + push.x + rnd(2),
                    body.velocity.y + push.y + rnd(1) + 1.5,
                    body.velocity.z + push.z + rnd(2),
                );
                this._addDebris(mesh, vel);
            }
        }
        this._removeChunk(chunk);
        this.chunks = this.chunks.filter((c) => c !== chunk);
    }

    _removeChunk(chunk) {
        this.renderer.remove(chunk.mesh);
        this.physics.remove(chunk.body);
        chunk.parts.forEach((p) => p.mesh.geometry.dispose());
    }

    // Bloque dañino más cercano que toca una esfera (cámara) o null
    chunkTouching(worldPos, radius) {
        for (const c of this.chunks) {
            if (!c.harmful) continue;
            // descarte rápido por distancia al centro
            const b = c.body.position;
            const far = Math.hypot(b.x - worldPos.x, b.y - worldPos.y, b.z - worldPos.z);
            if (far > c.body.boundingRadius + radius) continue;
            if (c.distanceTo(worldPos) <= radius) return c;
        }
        return null;
    }

    // Llamar DESPUÉS de physics.step()
    update(delta, cameraZ) {
        // Bloques: golpes de bola pendientes, sync, limpieza
        for (const c of [...this.chunks]) {
            if (c.pendingShatter) {
                this.shatterChunk(c, c.pendingShatter.scale(0.2));
                continue;
            }
            c.age += delta;
            c.mesh.position.copy(c.body.position);
            c.mesh.quaternion.copy(c.body.quaternion);
            const p = c.body.position;
            if (c.age > CHUNK_LIFETIME || p.z > cameraZ + DESPAWN_BEHIND || p.y < -10) {
                this._removeChunk(c);
                this.chunks = this.chunks.filter((x) => x !== c);
            }
        }

        // Astillas: física mínima propia
        this.debris = this.debris.filter((d) => {
            d.age += delta;
            const m = d.mesh;
            if (d.age > d.life || m.position.z > cameraZ + DESPAWN_BEHIND) {
                this._removeDebris(d);
                return false;
            }
            d.vel.y += GRAVITY * delta;
            m.position.addScaledVector(d.vel, delta);
            // suelo: rebote amortiguado + rozamiento
            if (m.position.y < 0.04) {
                m.position.y = 0.04;
                if (d.vel.y < 0) d.vel.y *= -0.3;
                d.vel.x *= 0.7; d.vel.z *= 0.7;
                d.angVel.multiplyScalar(0.6);
            }
            // paredes del pasillo
            if (Math.abs(m.position.x) > WALL_X) {
                m.position.x = Math.sign(m.position.x) * WALL_X;
                d.vel.x *= -0.4;
            }
            const speed = d.angVel.length();
            if (speed > 1e-3) {
                tmpQ.setFromAxisAngle(tmpAxis.copy(d.angVel).divideScalar(speed), speed * delta);
                m.quaternion.premultiply(tmpQ);
            }
            return true;
        });
    }

    clear() {
        this.debris.forEach((d) => this._removeDebris(d));
        this.chunks.forEach((c) => this._removeChunk(c));
        this.debris = [];
        this.chunks = [];
    }
}
