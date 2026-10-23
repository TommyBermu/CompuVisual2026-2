/*
    entities/Crystal.js
    -------------------
    Un panel de vidrio que SALE DEL SUELO como un "topo" de feria: no ocupa todo
    el pasillo, tiene ancho/alto aleatorios y aparece en una X aleatoria. Nace
    hundido bajo el suelo y sube hasta su altura final (animación de subida).

    ROMPIBLE (estilo Smash Hit): el panel es una lista de TROZOS convexos
    (this.pieces). Al principio es un solo rectángulo. Cada impacto (bola o
    cámara) lo subdivide alrededor del punto golpeado (utils/fracture.js):
        - las celdas cercanas al impacto salen volando (el agujero),
        - los trozos que quedan sin apoyo (no unidos al borde de abajo) se caen
          como un bloque (systems/Shatter.js los convierte en cuerpos dinámicos),
        - el resto se queda en su sitio y SIGUE SIENDO SÓLIDO para bolas y cámara.

    Cuánto se rompe depende de DÓNDE se golpea (ver _breakRadius): el panel se
    sostiene desde el suelo, así que un golpe alto (más "palanca") o cerca de un
    borde lateral rompe mucho más que uno abajo en el centro.

    Física: UN body estático con una forma (ConvexPolyhedron) por trozo, con
    collisionResponse = false: Cannon detecta el contacto con la bola (evento
    'collide') pero NO la hace rebotar; la bola atraviesa el vidrio rompiéndolo,
    como en el juego original. Los golpes se encolan (registerBallHit) y se
    procesan fuera del step de física (processHits), porque modificar formas
    dentro del callback de colisión es arriesgado.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import {
    CRYSTAL_THICKNESS,
    CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH, CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT,
    CRYSTAL_RISE_TIME, TUNNEL_WIDTH, BALL_SPEED, BALL_RADIUS,
    GLASS_HOLE_RADIUS, GLASS_HEIGHT_WEAKNESS, GLASS_EDGE_WEAKNESS, GLASS_BALL_SLOWDOWN,
    GROUP_CRYSTAL, GROUP_BALL,
} from '../constants.js';
import { rectPolygon, polygonCentroid, polygonArea, fracturePanel } from '../utils/fracture.js';
import { glassMaterial, prismGeometry, ensureShape, distanceToPrism, centerPolygon } from '../utils/glass.js';

const CT = CRYSTAL_THICKNESS;
const rand = (min, max) => min + Math.random() * (max - min);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default class Crystal extends Entity {
    constructor(physics, z, levelIndex = 0) {
        // Tamaño y posición X aleatorios dentro del pasillo
        const width = rand(CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH);
        const height = rand(CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT);
        const maxX = (TUNNEL_WIDTH - width) / 2 - 0.2; // que no atraviese las paredes
        const x = rand(-maxX, maxX);

        // --- Visual: un grupo con un mesh por trozo ---
        const group = new THREE.Group();

        // --- Física: body estático, una forma por trozo, sin rebote ---
        const body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC, collisionResponse: false });
        // Solo le interesan las bolas normales. Las inertes (animación de muerte)
        // lo atraviesan porque su máscara no incluye CRYSTAL.
        body.collisionFilterGroup = GROUP_CRYSTAL;
        body.collisionFilterMask = GROUP_BALL;

        super(group, body);
        body.userData = { type: 'crystal', entity: this };

        this.material = glassMaterial(levelIndex);
        this.x = x;
        this.z = z;
        this.width = width;
        this.height = height;
        this.halfWidth = width / 2;
        this.targetY = height / 2;      // centro del panel cuando está fuera del todo
        this.rise = 0;                  // 0 = hundido, 1 = fuera del todo
        this.rising = false;            // lo activa el Spawner cuando la cámara se acerca
        this.broken = false;            // ya lo rompió una bola (el premio se da una vez)
        this.pieces = [];               // trozos que siguen en el panel
        this.pendingHits = [];          // golpes de bola aún sin procesar

        this._setPieces([{ poly: rectPolygon(width / 2, height / 2), src: -1 }]);
        this._place();
    }

    // Coloca grupo+body según el progreso de subida (rise 0..1)
    _place() {
        // Cuando rise=0 el centro está una altura entera bajo el suelo (invisible)
        const y = this.targetY - (1 - this.rise) * this.height;
        this.body.position.set(this.x, y, this.z);
        this.body.aabbNeedsUpdate = true;
        this.mesh.position.set(this.x, y, this.z);
    }

    startRising() {
        this.rising = true;
    }

    update(delta) {
        if (this.rising && this.rise < 1) {
            this.rise = Math.min(1, this.rise + delta / CRYSTAL_RISE_TIME);
            this._place();
        }
    }

    // ¿Queda algo del panel?
    get empty() {
        return this.pieces.length === 0;
    }

    // --- Golpes ---------------------------------------------------------------

    // La llama la bola desde su evento 'collide' (DENTRO del step): solo encola.
    // Cada bola rompe un mismo panel una sola vez (el contacto dura varios substeps).
    registerBallHit(ball) {
        if (ball.hitCrystals.has(this)) return;
        ball.hitCrystals.add(this);
        this.pendingHits.push({
            ball,
            position: ball.body.position.clone(),
            velocity: ball.body.velocity.clone(),
        });
    }

    // Procesa los golpes encolados (FUERA del step). Devuelve cuántos fueron de bola.
    processHits(shatter) {
        if (!this.pendingHits.length) return 0;
        const hits = this.pendingHits;
        this.pendingHits = [];
        let count = 0;
        for (const h of hits) {
            if (this.empty) break;
            const lx = h.position.x - this.body.position.x;
            const ly = h.position.y - this.body.position.y;
            const speed = h.velocity.length();
            const R = this._breakRadius(lx, ly, speed);
            const dir = speed > 1e-6 ? h.velocity.scale(1 / speed) : new CANNON.Vec3(0, 0, -1);

            this.breakAt(lx, ly, R, BALL_RADIUS * 1.6, shatter, {
                // Los trozos del agujero salen en la dirección de la bola
                push: dir.scale(speed * 0.25),
                spread: 3,
                fallPush: dir.scale(1.2),
            });
            // La bola atraviesa el vidrio perdiendo algo de velocidad
            h.ball.body.velocity.scale(GLASS_BALL_SLOWDOWN, h.ball.body.velocity);
            count++;
        }
        return count;
    }

    // Radio de rotura según dónde y con qué fuerza se golpea:
    //   - más velocidad -> más grande,
    //   - más alto en el panel -> mucho más grande (el panel se sostiene desde abajo),
    //   - cerca de un borde lateral -> más grande (menos material que lo sujete).
    _breakRadius(lx, ly, speed) {
        const speedFactor = Math.max(0.7, Math.min(1.3, speed / BALL_SPEED));
        const R0 = GLASS_HOLE_RADIUS * speedFactor;
        const h = clamp01((ly + this.height / 2) / this.height);           // 0 abajo, 1 arriba
        const side = this.halfWidth - Math.abs(lx);                        // distancia al borde lateral
        const heightFactor = 1 + GLASS_HEIGHT_WEAKNESS * h * h;
        const edgeFactor = 1 + GLASS_EDGE_WEAKNESS * clamp01(1 - side / (1.5 * R0));
        return R0 * heightFactor * edgeFactor;
    }

    /*
        Rompe el panel alrededor de (lx, ly) (coords locales del panel).
            R:          radio de rotura
            holeRadius: lo que esté a menos de esto se rompe seguro
            shatter:    sistema que recibe los trozos que se sueltan
            launch:     { push, spread, fallPush } velocidades para los trozos
    */
    breakAt(lx, ly, R, holeRadius, shatter, launch) {
        if (this.empty) return;
        const polys = this.pieces.map((p) => p.panelPoly);
        const result = fracturePanel(polys, { x: lx, y: ly }, R, {
            bottomY: -this.height / 2,
            holeRadius,
        });

        const old = this.pieces;
        const toPiece = (it) => (it.src >= 0 ? old[it.src] : this._makePiece(it.poly));
        const keep = result.staticItems.map(toPiece);
        const debris = result.detached.map(toPiece);
        const fallingGroups = result.falling.map((group) => group.map(toPiece));

        // Quitar del panel lo que ya no le pertenece (meshes viejos sin reutilizar se liberan)
        const kept = new Set(keep);
        const moved = new Set([...debris, ...fallingGroups.flat()]);
        for (const p of old) {
            if (kept.has(p)) continue;
            this._detachPiece(p);
            if (!moved.has(p)) p.mesh.geometry.dispose();
        }
        // Añadir al panel las nuevas que se quedan
        for (const p of keep) {
            if (!old.includes(p)) this._attachPiece(p);
        }
        this.pieces = keep;

        // Entregar los trozos sueltos al Shatter (en coordenadas de mundo)
        const origin = this.body.position;
        const impactWorld = new CANNON.Vec3(origin.x + lx, origin.y + ly, origin.z);
        if (debris.length) shatter.spawnDebris(debris, origin, impactWorld, launch);
        for (const group of fallingGroups) shatter.spawnChunk(group, origin, launch.fallPush);
    }

    // --- Trozos -----------------------------------------------------------------

    // Un trozo nuevo a partir de un polígono en coords del panel
    _makePiece(panelPoly) {
        const [cx, cy] = polygonCentroid(panelPoly);
        const poly = centerPolygon(panelPoly, cx, cy);
        const mesh = new THREE.Mesh(prismGeometry(poly, CT), this.material);
        mesh.castShadow = true;
        mesh.position.set(cx, cy, 0);
        return {
            panelPoly, poly, cx, cy, mesh,
            shape: null, // la forma de Cannon se crea solo si hace falta (ensureShape)
            area: polygonArea(panelPoly),
            material: this.material,
        };
    }

    _setPieces(items) {
        this.pieces.forEach((p) => { this._detachPiece(p); p.mesh.geometry.dispose(); });
        this.pieces = items.map((it) => this._makePiece(it.poly));
        this.pieces.forEach((p) => this._attachPiece(p));
    }

    _attachPiece(p) {
        p.mesh.position.set(p.cx, p.cy, 0);
        p.mesh.quaternion.identity();
        this.mesh.add(p.mesh);
        this.body.addShape(ensureShape(p), new CANNON.Vec3(p.cx, p.cy, 0));
    }

    _detachPiece(p) {
        this.mesh.remove(p.mesh);
        if (p.shape && p.shape.body === this.body) this.body.removeShape(p.shape);
    }

    // --- Choque con la cámara -----------------------------------------------------

    // Trozo del panel más cercano a un punto de mundo: { dist, x, y } (x, y en
    // coords del panel).
    closestSolid(worldPos) {
        if (this.empty) return null;
        const lx = worldPos.x - this.body.position.x;
        const ly = worldPos.y - this.body.position.y;
        const lz = worldPos.z - this.body.position.z;
        let best = null;
        for (const p of this.pieces) {
            const d = distanceToPrism(p.poly, CT, lx - p.cx, ly - p.cy, lz);
            if (!best || d < best.dist) best = { dist: d, x: lx, y: ly };
        }
        return best;
    }

    destroy(renderer, physics) {
        super.destroy(renderer, physics);
        this.pieces.forEach((p) => p.mesh.geometry.dispose());
        this.pieces = [];
    }
}
