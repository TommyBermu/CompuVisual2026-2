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

    Las astillas rebotan contra el suelo y las paredes del MARCO del recorrido
    donde se soltaron (`ground`, ver utils/frame.js): así funcionan igual en
    una curva o en una rampa. Duran poco, no se alejan lo bastante como para
    que importe que el pasillo siga girando.

    update(delta, view) recibe la vista de la cámara { position, forward,
    floorY } para borrar lo que quedó DETRÁS (o se cayó muy abajo).

    SONIDO (ganchos opcionales, los asigna el Game):
        onBreak({ position, size, intensity }) -> una rotura. Todas las roturas
            de un mismo frame que caen cerca (< BREAK_MERGE m) se juntan en UN
            evento (un panel suelta astillas + varios bloques a la vez).
        onShardHit({ position, intensity }) -> una astilla golpeó el suelo
            con fuerza (como mucho uno por frame, el más fuerte).
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { shatterPolygon, polygonCentroid } from '../utils/fracture.js';
import { prismGeometry, ensureShape, distanceToPrism, centerPolygon } from '../utils/glass.js';
import { pointToLocal, pointToWorld, dirToLocal, dirToWorld } from '../utils/frame.js';
import {
    GRAVITY, TUNNEL_WIDTH, DESPAWN_BEHIND, CRYSTAL_THICKNESS,
    DEBRIS_LIFETIME, MAX_DEBRIS, CHUNK_LIFETIME, CHUNK_HARMFUL_AREA, GLASS_CHUNK_DENSITY,
    GROUP_WORLD, GROUP_BALL, GROUP_CHUNK,
} from '../constants.js';

const CT = CRYSTAL_THICKNESS;
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
const tmpQ = new THREE.Quaternion();
const tmpAxis = new THREE.Vector3();
const tmpL = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const WALL_X = TUNNEL_WIDTH / 2 - 0.05;
const BREAK_MERGE = 2.5;     // m: roturas más cercanas que esto (mismo frame) = un solo sonido
const SHARD_HIT_SPEED = 2.5; // m/s: velocidad mínima de una astilla contra el suelo para sonar

// Un bloque de vidrio cayéndose (cuerpo dinámico compuesto)
class GlassChunk {
    constructor(mesh, body, parts, area, ground) {
        this.mesh = mesh;
        this.ground = ground;    // marco del recorrido (para sus astillas)
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
        this.onBreak = null;     // callback de sonido (ver cabecera)
        this.onShardHit = null;
        this._breaks = [];       // roturas de este frame (se agrupan antes de avisar)
    }

    // Anota una rotura para el sonido: área de vidrio suelta + rapidez del golpe
    _noteBreak(pos, area, speed) {
        if (!this.onBreak) return;
        for (const b of this._breaks) {
            if (Math.hypot(b.x - pos.x, b.y - pos.y, b.z - pos.z) < BREAK_MERGE) {
                b.area += area;
                b.speed = Math.max(b.speed, speed);
                return;
            }
        }
        this._breaks.push({ x: pos.x, y: pos.y, z: pos.z, area, speed });
    }

    _flushBreaks() {
        for (const b of this._breaks) {
            this.onBreak({
                position: { x: b.x, y: b.y, z: b.z },
                size: Math.min(1, Math.sqrt(b.area / 6)),     // ~0.4 un agujero de bola, ~0.8 un panel entero
                intensity: Math.min(1, 0.25 + b.speed / 20),  // ~0.65 un disparo, 1 un choque rápido
            });
        }
        this._breaks.length = 0;
    }

    // Astillas del agujero. pieces: trozos del panel (coords del panel),
    // frame: body del panel (posición + orientación en mundo),
    // impact: { x, y } punto de impacto en coords del panel,
    // launch: { push: Vec3, spread: m/s hacia fuera del impacto }
    // ground: marco del recorrido para rebotar (o null = suelo plano y=0)
    spawnDebris(pieces, frame, impact, launch, ground = null) {
        const q = frame.quaternion;
        const impactW = frame.pointToWorldFrame(new CANNON.Vec3(impact.x, impact.y, 0));
        this._noteBreak(impactW, pieces.reduce((a, p) => a + p.area, 0), launch.push.length());
        for (const p of pieces) {
            const mesh = p.mesh;
            const w = frame.pointToWorldFrame(new CANNON.Vec3(p.cx, p.cy, 0));
            mesh.position.set(w.x, w.y, w.z);
            mesh.quaternion.set(q.x, q.y, q.z, q.w);
            // hacia fuera del punto de impacto (en el plano del panel)
            const rx = w.x - impactW.x;
            const ry = w.y - impactW.y;
            const rz = w.z - impactW.z;
            const r = Math.hypot(rx, ry, rz) || 1;
            const out = launch.spread * (0.4 + Math.random() * 0.8);
            const vel = new THREE.Vector3(
                launch.push.x + (rx / r) * out + rnd(0.6),
                launch.push.y + (ry / r) * out + rnd(0.6) + 1,
                launch.push.z + (rz / r) * out + rnd(1),
            );
            this._addDebris(mesh, vel, ground);
        }
    }

    _addDebris(mesh, vel, ground) {
        this.renderer.add(mesh);
        this.debris.push({
            mesh,
            vel,
            angVel: new THREE.Vector3(rnd(8), rnd(8), rnd(8)),
            ground,
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
    // frame: body del panel del que se suelta (posición + orientación en mundo).
    spawnChunk(pieces, frame, push, ground = null) {
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
        body.position.copy(frame.pointToWorldFrame(new CANNON.Vec3(cx, cy, 0)));
        body.quaternion.copy(frame.quaternion);
        // Empujoncito en la dirección del golpe + giro para que se tumbe
        body.velocity.set(push.x + rnd(0.3), push.y, push.z + rnd(0.3));
        body.angularVelocity.set(rnd(1.5), rnd(0.8), rnd(1.5));

        this._noteBreak(body.position, area, push.length());
        const chunk = new GlassChunk(group, body, parts, area, ground);
        this.renderer.add(group);
        this.physics.add(body);
        group.position.copy(body.position);
        group.quaternion.copy(body.quaternion);
        this.chunks.push(chunk);
        return chunk;
    }

    // Revienta un bloque en astillas (golpe de bola o de cámara)
    shatterChunk(chunk, push = new CANNON.Vec3()) {
        const body = chunk.body;
        this._noteBreak(body.position, chunk.area, body.velocity.length() + push.length());
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
                this._addDebris(mesh, vel, chunk.ground);
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
    // ¿El punto p quedó detrás de la cámara (o se cayó del recorrido)?
    static gone(p, view) {
        const back = (p.x - view.position.x) * view.forward.x
            + (p.y - view.position.y) * view.forward.y
            + (p.z - view.position.z) * view.forward.z;
        return back < -DESPAWN_BEHIND || p.y < view.floorY - 15;
    }

    update(delta, view) {
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
            if (c.age > CHUNK_LIFETIME || Shatter.gone(p, view)) {
                this._removeChunk(c);
                this.chunks = this.chunks.filter((x) => x !== c);
            }
        }

        // Astillas: física mínima propia
        let shard = null; // la astilla que golpeó el suelo más fuerte este frame (sonido)
        this.debris = this.debris.filter((d) => {
            d.age += delta;
            const m = d.mesh;
            if (d.age > d.life || Shatter.gone(m.position, view)) {
                this._removeDebris(d);
                return false;
            }
            d.vel.y += GRAVITY * delta;
            m.position.addScaledVector(d.vel, delta);
            // Suelo y paredes en coords del marco del recorrido (x lateral, y normal al suelo)
            const g = d.ground;
            const l = g ? pointToLocal(g, m.position, tmpL) : tmpL.copy(m.position);
            const v = g ? dirToLocal(g, d.vel, tmpV) : tmpV.copy(d.vel);
            let hit = false;
            // suelo: rebote amortiguado + rozamiento
            if (l.y < 0.04) {
                l.y = 0.04;
                if (-v.y > SHARD_HIT_SPEED && (!shard || -v.y > shard.speed)) shard = { mesh: m, speed: -v.y };
                if (v.y < 0) v.y *= -0.3;
                v.x *= 0.7; v.z *= 0.7;
                d.angVel.multiplyScalar(0.6);
                hit = true;
            }
            // paredes del pasillo
            if (Math.abs(l.x) > WALL_X) {
                l.x = Math.sign(l.x) * WALL_X;
                v.x *= -0.4;
                hit = true;
            }
            if (hit) {
                if (g) {
                    pointToWorld(g, l.x, l.y, l.z, m.position);
                    dirToWorld(g, v, d.vel);
                } else {
                    m.position.copy(l);
                    d.vel.copy(v);
                }
            }
            const speed = d.angVel.length();
            if (speed > 1e-3) {
                tmpQ.setFromAxisAngle(tmpAxis.copy(d.angVel).divideScalar(speed), speed * delta);
                m.quaternion.premultiply(tmpQ);
            }
            return true;
        });

        if (shard && this.onShardHit) {
            this.onShardHit({ position: shard.mesh.position, intensity: Math.min(1, shard.speed / 8) });
        }
        if (this._breaks.length) this._flushBreaks();
    }

    clear() {
        this.debris.forEach((d) => this._removeDebris(d));
        this.chunks.forEach((c) => this._removeChunk(c));
        this.debris = [];
        this.chunks = [];
        this._breaks.length = 0;
    }
}
