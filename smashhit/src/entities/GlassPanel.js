/*
    entities/GlassPanel.js
    ----------------------
    Un panel de vidrio ROMPIBLE de cualquier forma convexa (rectángulo,
    triángulo, rombo...). Es la base de todos los cristales del juego: los
    paneles que salen del suelo (Crystal) y las partes de vidrio de los
    obstáculos (péndulos, aspas giratorias, botones de compuertas).

    El panel es una lista de TROZOS convexos (this.pieces). Al principio es un
    solo polígono (outline). Cada impacto (bola o cámara) lo subdivide alrededor
    del punto golpeado (utils/fracture.js):
        - las celdas cercanas al impacto salen volando (el agujero),
        - los trozos que quedan sin apoyo (no unidos al SOPORTE) se caen como un
          bloque (systems/Shatter.js los convierte en cuerpos dinámicos),
        - el resto se queda en su sitio y SIGUE SIENDO SÓLIDO para bolas y cámara.

    El soporte depende del obstáculo: 'bottom' (sale del suelo, aspa pegada al
    eje por su extremo interior) o 'top' (cuelga de un péndulo). Un panel
    `fragile` (botón) revienta entero al primer golpe.

    El panel puede MOVERSE y GIRAR (setPose): todo se calcula en coordenadas
    locales del panel (body.pointToLocalFrame), así la rotura, el choque con la
    cámara y los trozos que salen funcionan igual en un péndulo que en un panel
    quieto. `velocity` (la pone el obstáculo) se suma a los trozos que se sueltan.

    Física: UN body cinemático con una forma (ConvexPolyhedron) por trozo, con
    collisionResponse = false: Cannon detecta el contacto con la bola (evento
    'collide') pero NO la hace rebotar; la bola atraviesa el vidrio rompiéndolo.
    Los golpes se encolan (registerBallHit) y se procesan fuera del step de
    física (processHits), porque modificar formas dentro del callback es arriesgado.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import {
    CRYSTAL_THICKNESS, BALL_SPEED, BALL_RADIUS,
    GLASS_HOLE_RADIUS, GLASS_HEIGHT_WEAKNESS, GLASS_EDGE_WEAKNESS, GLASS_BALL_SLOWDOWN,
    GROUP_CRYSTAL, GROUP_BALL,
} from '../constants.js';
import { polygonCentroid, polygonArea, fracturePanel, bbox } from '../utils/fracture.js';
import { glassMaterial, prismGeometry, ensureShape, distanceToPrism, centerPolygon } from '../utils/glass.js';

const CT = CRYSTAL_THICKNESS;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const EPS = 1e-3;

export default class GlassPanel extends Entity {
    /*
        outline:    polígono convexo CCW en coords del panel
        levelIndex: paleta del nivel (color del vidrio)
        options:
            anchor:  'bottom' | 'top'  borde que sostiene el panel
            fragile: true -> cualquier golpe lo rompe entero
            material: material propio (si no, el vidrio del nivel)
    */
    constructor(outline, levelIndex = 0, { anchor = 'bottom', fragile = false, material = null } = {}) {
        // --- Visual: un grupo con un mesh por trozo ---
        const group = new THREE.Group();

        // --- Física: body cinemático (se mueve por código), una forma por trozo, sin rebote ---
        const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC, collisionResponse: false });
        // Solo le interesan las bolas normales. Las inertes (animación de muerte)
        // lo atraviesan porque su máscara no incluye CRYSTAL.
        body.collisionFilterGroup = GROUP_CRYSTAL;
        body.collisionFilterMask = GROUP_BALL;

        super(group, body);
        body.userData = { type: 'crystal', entity: this };

        const box = bbox(outline);
        this.box = box;
        this.width = box.maxX - box.minX;
        this.height = box.maxY - box.minY;
        this.halfWidth = this.width / 2;
        this.centerX = (box.minX + box.maxX) / 2;
        this.anchor = anchor;
        this.fragile = fragile;
        // ¿Un trozo (su bbox) toca el soporte?
        this.anchorFn = anchor === 'top'
            ? (b) => b.maxY >= box.maxY - EPS
            : (b) => b.minY <= box.minY + EPS;

        this.material = material || glassMaterial(levelIndex);
        this.velocity = new CANNON.Vec3(); // velocidad del panel (la fija el obstáculo que lo mueve)
        this.broken = false;               // ya lo rompió una bola (el premio se da una vez)
        this.pieces = [];                  // trozos que siguen en el panel
        this.pendingHits = [];             // golpes de bola aún sin procesar

        this._setPieces([outline]);
    }

    // Coloca el panel en el mundo. quaternion (opcional): orientación (CANNON o THREE).
    setPose(x, y, z, quaternion = null) {
        this.body.position.set(x, y, z);
        if (quaternion) this.body.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
        this.body.aabbNeedsUpdate = true;
        this.sync();
    }

    // Como setPose, pero además calcula la velocidad del panel a partir de
    // dónde estaba (los trozos que se suelten la heredan).
    moveTo(x, y, z, quaternion, delta) {
        if (delta > 0) {
            const p = this.body.position;
            this.velocity.set((x - p.x) / delta, (y - p.y) / delta, (z - p.z) / delta);
        }
        this.setPose(x, y, z, quaternion);
    }

    // ¿Queda algo del panel?
    get empty() {
        return this.pieces.length === 0;
    }

    // Punto de mundo -> coords locales del panel (CANNON.Vec3)
    toLocal(p) {
        return this.body.pointToLocalFrame(new CANNON.Vec3(p.x, p.y, p.z));
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
            const local = this.toLocal(h.position);
            const speed = h.velocity.length();
            const dir = speed > 1e-6 ? h.velocity.scale(1 / speed) : new CANNON.Vec3(0, 0, -1);
            const launch = {
                // Los trozos del agujero salen en la dirección de la bola
                push: dir.scale(speed * 0.25),
                spread: 3,
                fallPush: dir.scale(1.2),
            };
            if (this.fragile) {
                this.shatterAll(local.x, local.y, shatter, launch);
            } else {
                const R = this._breakRadius(local.x, local.y, speed);
                this.breakAt(local.x, local.y, R, BALL_RADIUS * 1.6, shatter, launch);
            }
            // La bola atraviesa el vidrio perdiendo algo de velocidad
            h.ball.body.velocity.scale(GLASS_BALL_SLOWDOWN, h.ball.body.velocity);
            count++;
        }
        return count;
    }

    // Radio de rotura según dónde y con qué fuerza se golpea:
    //   - más velocidad -> más grande,
    //   - más lejos del soporte -> mucho más grande (más "palanca"),
    //   - cerca de un borde lateral -> más grande (menos material que lo sujete).
    _breakRadius(lx, ly, speed) {
        const speedFactor = Math.max(0.7, Math.min(1.3, speed / BALL_SPEED));
        const R0 = GLASS_HOLE_RADIUS * speedFactor;
        const fromSupport = this.anchor === 'top' ? this.box.maxY - ly : ly - this.box.minY;
        const h = clamp01(fromSupport / this.height);                       // 0 en el soporte, 1 en el otro extremo
        const side = this.halfWidth - Math.abs(lx - this.centerX);          // distancia al borde lateral
        const heightFactor = 1 + GLASS_HEIGHT_WEAKNESS * h * h;
        const edgeFactor = 1 + GLASS_EDGE_WEAKNESS * clamp01(1 - side / (1.5 * R0));
        return R0 * heightFactor * edgeFactor;
    }

    // Revienta TODO el panel en astillas (botones, o un golpe de cámara a un botón)
    // R del tamaño del panel (así los anillos de Voronoi caen dentro y salen
    // varias astillas) y holeRadius enorme (todo se suelta).
    shatterAll(lx, ly, shatter, launch) {
        const R = 0.6 * Math.max(this.width, this.height);
        this.breakAt(lx, ly, R, 2 * (this.width + this.height), shatter, launch);
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
            anchor: this.anchorFn,
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

        // Entregar los trozos sueltos al Shatter. Heredan la velocidad del
        // panel (un péndulo los lanza en la dirección en que se movía).
        const push = launch.push.vadd(this.velocity);
        const fallPush = launch.fallPush.vadd(this.velocity);
        if (debris.length) shatter.spawnDebris(debris, this.body, { x: lx, y: ly }, { ...launch, push });
        for (const group of fallingGroups) shatter.spawnChunk(group, this.body, fallPush);
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

    _setPieces(polys) {
        this.pieces.forEach((p) => { this._detachPiece(p); p.mesh.geometry.dispose(); });
        this.pieces = polys.map((poly) => this._makePiece(poly));
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
        const l = this.toLocal(worldPos);
        let best = null;
        for (const p of this.pieces) {
            const d = distanceToPrism(p.poly, CT, l.x - p.cx, l.y - p.cy, l.z);
            if (!best || d < best.dist) best = { dist: d, x: l.x, y: l.y };
        }
        return best;
    }

    destroy(renderer, physics) {
        super.destroy(renderer, physics);
        this.pieces.forEach((p) => p.mesh.geometry.dispose());
        this.pieces = [];
    }
}
