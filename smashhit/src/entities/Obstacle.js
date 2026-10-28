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
import { GROUP_WORLD, GROUP_BALL, GROUP_CHUNK, TUNNEL_WIDTH } from '../constants.js';
import { pointToWorld, quatToWorld, pointToLocal } from '../utils/frame.js';

const HALF_LANE = TUNNEL_WIDTH / 2;
const WORLD_UP = new THREE.Vector3(0, 1, 0);

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
        this.needsSupport = false; // cuelga piezas de paredes/vigas (ver addPortal / addSupports)
        this.needsBase = false;    // se apoya en el suelo (ver addBase, niveles sin suelo)
        this.baseDepth = 3;
        // Sitios (coords locales, y = superficie) donde puede posarse una pirámide de bolas
        this.perches = [];
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

    // Pórtico de soporte: dos muros cortos a los lados del carril (y un dintel
    // si no hay techo). Lo pide el Spawner en los entornos sin paredes (o con
    // paredes bajas/rotas) para que las vigas, péndulos y triángulos "de pared"
    // de este obstáculo no queden flotando.
    addPortal(height, depth = 11.5, withLintel = true, bottom = 0) {
        const t = 0.7;
        for (const side of [-1, 1]) {
            const x0 = side * HALF_LANE;
            const x1 = side * (HALF_LANE + t);
            this.addStaticBox(Math.min(x0, x1), Math.max(x0, x1), Math.max(bottom, -1), height, 0, depth);
            // Sobre el vacío el poste sigue bajando, en VERTICAL de mundo (en una
            // rampa no se inclina), hasta perderse en la niebla
            if (bottom < -1) this._addHangingBox(side * (HALF_LANE + t / 2), -1, t, -1 - bottom, depth);
        }
        if (withLintel) {
            this.addStaticBox(-HALF_LANE - t, HALF_LANE + t, height, height + 0.6, 0, depth * 0.6, { material: this.metal });
        }
    }

    // Caja vertical (de mundo) que cuelga del punto local (x, top, z) y baja h metros.
    // yaw: giro extra alrededor de la vertical (pilares "en rombo").
    _addHangingBox(x, top, w, h, depth, { z = 0, yaw = 0, material = this.stone } = {}) {
        const solid = this.addBox(w, h, depth, { material });
        const p = pointToWorld(this.frame, x, top, z, tmpP);
        p.y -= h / 2;
        const q = tmpQ.setFromAxisAngle(WORLD_UP, (this.frame.yaw ?? 0) + yaw);
        solid.body.position.set(p.x, p.y, p.z);
        solid.body.quaternion.set(q.x, q.y, q.z, q.w);
        solid.body.aabbNeedsUpdate = true;
        solid.mesh.position.copy(p);
        solid.mesh.quaternion.copy(q);
        return solid;
    }

    /*
        Apoyo de las piezas colgadas en los niveles SIN SUELO (env.supports):
            pillars  pilares que salen del fondo (ver addPillars)
            sky      cables que suben hasta perderse en la niebla de arriba
            float    trozos de columna flotando a los lados (lógica de sueño)
        wide: paneles montados "en pared" -> el apoyo es una losa larga en z.
    */
    addSupports(style, beamTop, bottom, { wide = false } = {}) {
        const rand = (a, b) => a + Math.random() * (b - a);
        if (style === 'pillars') {
            this.addPillars(beamTop, bottom, { wide });
            return;
        }
        for (const side of [-1, 1]) {
            if (style === 'sky') {
                // Desde un poco por debajo de la viga más baja hasta 300 m hacia arriba
                const from = wide ? -0.5 : 3.2;
                const w = wide ? 0.7 : 0.22;
                this._addHangingBox(side * (HALF_LANE + w / 2), from + 300, w, 300, wide ? 11.5 : 0.22,
                    { material: wide ? this.stone : this.metal });
            } else {
                // float: un trozo de columna suspendido justo donde acaban las vigas
                const w = rand(1, 1.8);
                const from = wide ? -1 : rand(2.4, 3.2);
                const top = beamTop + rand(0.3, 2.5);
                this._addHangingBox(side * (HALF_LANE + w / 2), top, w, top - from, wide ? 11.5 : w);
            }
        }
    }

    /*
        BASE flotante bajo lo que se apoya en el suelo (paneles que salen del
        suelo, puertas, postes) en los niveles SIN SUELO. Las bolas rebotan en
        ella y luego caen al vacío.
            slab  losa de piedra gruesa
            disc  disco (dos discos apilados, el de abajo más pequeño)
            raft  balsa: tablones finos
    */
    addBase(style, depth = 3) {
        const rand = (a, b) => a + Math.random() * (b - a);
        // En los bordes de la base, fuera del paso de la cámara, cabe una pirámide
        for (const side of [-1, 1]) this.perches.push({ x: side * rand(3.6, 4.8), y: 0, z: rand(-depth / 2 + 0.6, depth / 2 - 0.6) * 0.5 });
        if (style === 'disc') {
            const r = Math.max(HALF_LANE + 0.6, depth / 2 + 0.5);
            const top = this.addCylinder(r, 1.2, { material: this.stone });
            this.placeSolid(top, 0, -0.6, 0);
            const under = this.addCylinder(r * 0.6, 1.4, { material: this.metal });
            this.placeSolid(under, 0, -1.9, 0);
        } else if (style === 'raft') {
            const n = Math.max(2, Math.round(depth / 1.1));
            for (let k = 0; k < n; k++) {
                const z = (k - (n - 1) / 2) * 1.1;
                this.addStaticBox(-HALF_LANE - rand(0, 0.6), HALF_LANE + rand(0, 0.6), -0.35, 0, z, 0.95);
            }
        } else {
            const h = rand(1.6, 3);
            this.addStaticBox(-HALF_LANE, HALF_LANE, -h, 0, 0, depth);
            this.addStaticBox(-HALF_LANE * 0.6, HALF_LANE * 0.7, -h - rand(1, 2.5), -h, rand(-0.5, 0.5), depth * 0.7);
        }
    }

    /*
        SOPORTES SIN PASILLO: en vez de paredes, a cada lado del carril sale del
        vacío un pilar (o una forma rara) que llega como mínimo a `beamTop` (la
        altura de las vigas) y baja hasta `bottom` (se pierde en la niebla). Su
        cara interior queda justo en el borde del carril, donde acaban las vigas.
        Estilos al azar por lado:
            tower    pilar cuadrado que sigue subiendo bastante por encima
            diamond  pilar girado 45° (de canto hacia el camino)
            stack    pilar con "collares": bloques más anchos a distintas alturas
            twin     dos pilares delgados juntos, uno más alto que el otro
        wide: los paneles montados "en pared" necesitan un apoyo largo en z.
    */
    addPillars(beamTop, bottom, { wide = false } = {}) {
        const rand = (a, b) => a + Math.random() * (b - a);
        const styles = wide ? ['tower', 'stack'] : ['tower', 'diamond', 'stack', 'twin'];
        for (const side of [-1, 1]) {
            const style = styles[Math.floor(Math.random() * styles.length)];
            const top = beamTop + (Math.random() < 0.3 ? rand(0.3, 1.5) : rand(4, 45));
            const h = top - bottom;
            const d = wide ? 11.5 : rand(1.4, 3.2);
            if (style === 'diamond') {
                const w = rand(1.6, 3);
                this._addHangingBox(side * (HALF_LANE + w * Math.SQRT1_2), top, w, h, w, { yaw: Math.PI / 4 });
            } else if (style === 'twin') {
                const w = rand(0.9, 1.4);
                this._addHangingBox(side * (HALF_LANE + w / 2), top, w, h, w);
                this._addHangingBox(side * (HALF_LANE + w * 1.6), top + rand(-6, 10), w, h + 10, w, { z: rand(-1.2, 1.2) });
            } else {
                const w = rand(1.4, 3.6);
                const x = side * (HALF_LANE + w / 2);
                this._addHangingBox(x, top, w, h, d);
                if (style === 'stack') {
                    for (let k = 0; k < 2; k++) {
                        const cw = w + rand(0.8, 2);
                        const ch = rand(1, 3);
                        const cy = Math.min(top, rand(-30, beamTop + 4));
                        const cx = side * (HALF_LANE + cw / 2 + 0.05); // sin invadir el carril
                        this._addHangingBox(cx, cy, cw, ch, d + rand(0.5, 2));
                    }
                }
            }
        }
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
