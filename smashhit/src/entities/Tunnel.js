/*
    entities/Tunnel.js
    ------------------
    UN tramo del recorrido (largo SEGMENT_LENGTH) desde s0 hasta s0 + L
    (systems/Track.js). Su GEOMETRÍA depende del entorno del nivel
    (environments.js): galería con techo, pasillo abierto, salón sin paredes
    con techo bajo, cañón, puente sobre el vacío, muelle, catedral, ruinas...

    Como el recorrido gira y sube, nada es una caja fija: las piezas largas
    (suelo, paredes, techo, agua, franjas de luz) se "barren" a lo largo de la
    curva en rebanadas de SLICE metros (sweepGeometry). Las piezas sueltas
    (costillas, columnas, lámparas, monolitos...) se colocan en el marco del
    recorrido y se FUSIONAN en una malla por material (utils/deco.js).

    Física: UN body estático por tramo con cajas por rebanada (suelo, paredes,
    techo) y las piezas de decorado que están al alcance de las bolas. Las
    cajas son un poco más largas que la rebanada para que en el lado exterior
    de las curvas no queden rendijas por las que se cuele una bola.

    Las alturas irregulares (cañón, ruinas) salen de un ruido que depende de s
    (no del tramo), así el borde de un tramo encaja con el del siguiente.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { LEVELS } from '../levels.js';
import { environmentFor, bottomY } from '../environments.js';
import DecoBuilder, { UNIT } from '../utils/deco.js';
import DREAMS from '../dreams.js';
import {
    TUNNEL_WIDTH, TUNNEL_HEIGHT, WALL_THICKNESS, SEGMENT_LENGTH,
    GROUP_WORLD, GROUP_CRYSTAL, GROUP_BALL, GROUP_CHUNK,
} from '../constants.js';

const L = SEGMENT_LENGTH;
const W = TUNNEL_WIDTH;
const T = WALL_THICKNESS;
const HW = W / 2 + T;                  // media anchura del suelo del carril
const SLICE = 2;                       // metros por rebanada
const SLICES = Math.round(L / SLICE);
const BOX_HALF_LEN = SLICE * 0.68;     // solape entre cajas de rebanadas vecinas
const WATER_HALF = 160;                // media anchura del agua
const GROUND_HALF = 220;               // media anchura de la arena del desierto
// Islas: dentro de cada tramo el suelo va de ISLAND[0] a ISLAND[1] (m desde s0);
// el resto es VACÍO. Los obstáculos (centro del tramo) y el relleno (s0 + 3)
// quedan siempre sobre la isla.
const ISLAND = [0.5, 15.5];

const rand = (a, b) => a + Math.random() * (b - a);
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const tmpE = new THREE.Euler();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const randomQ = () => new THREE.Quaternion().setFromEuler(tmpE.set(rand(0, 6), rand(0, 6), rand(0, 6)));

// --- Ruido 1D determinista (para paredes irregulares que encajan entre tramos) ---
function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
}
function noise(x) {
    const i = Math.floor(x);
    const t = x - i;
    const k = t * t * (3 - 2 * t);
    return hash(i) * (1 - k) + hash(i + 1) * k;
}
// Altura de una pared irregular en s (side = -1 izquierda, 1 derecha)
function jaggedHeight(s, side, [min, max]) {
    const seed = side < 0 ? 0 : 1000;
    const v = 0.75 * noise(s / 7 + seed) + 0.25 * noise(s / 2.3 + seed + 50);
    return min + (max - min) * v;
}

// --- Materiales por nivel (se crean la primera vez y se reutilizan) ---
const materialsByLevel = new Map();

function std(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.75, envMapIntensity: 0.35, ...opts });
}
function glow(color, intensity = 1.6) {
    return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

function materialsFor(levelIndex) {
    if (!materialsByLevel.has(levelIndex)) {
        const c = LEVELS[levelIndex].colors;
        const side = THREE.DoubleSide; // las franjas barridas se ven desde dentro y desde fuera
        const col = (hex) => new THREE.Color(hex);
        const stone = col(c.wall).lerp(col(c.floorB), 0.5).multiplyScalar(0.82);
        materialsByLevel.set(levelIndex, {
            floorA: std(c.floorA, { roughness: 0.8, side }),
            floorB: std(c.floorB, { roughness: 0.8, side }),
            outer: std(col(c.floorB).multiplyScalar(0.88), { roughness: 0.85, side }),
            wall: std(c.wall, { roughness: 0.6, side }),
            ceiling: std(col(c.wall).multiplyScalar(0.7), { roughness: 0.7, side }),
            arch: std(c.arch, { roughness: 0.4, metalness: 0.2 }),
            stone: std(stone),
            metal: std(c.arch, { metalness: 0.7, roughness: 0.3, envMapIntensity: 0.7 }),
            lamp: glow(c.sun, 1.8),
            ring: glow(col(c.arch).lerp(col(c.skyHorizon), 0.4), 1.4),
            stained: glow(col(c.arch).lerp(col(c.sun), 0.35), 1.2),
            sand: std(col(c.floorA).lerp(col(c.fog), 0.25), { roughness: 0.95, side }),
            temple: std(col(c.wall).lerp(col(c.floorA), 0.3), { roughness: 0.8 }),
            float: std(col(c.wall).lerp(col(c.arch), 0.35), { roughness: 0.5, metalness: 0.1, envMapIntensity: 0.6 }),
            water: new THREE.MeshStandardMaterial({
                color: col(c.fog).lerp(col(c.skyTop), 0.5).multiplyScalar(0.55),
                metalness: 0.9, roughness: 0.12, envMapIntensity: 1, side,
            }),
        });
    }
    return materialsByLevel.get(levelIndex);
}

// Malla barrida: `strips` es una lista de franjas; cada franja es una función
// (frame, i) -> [a, b] (dos puntos de la sección en la rebanada i). Une cada
// par con el de la rebanada siguiente.
function sweepGeometry(frames, strips) {
    const pos = [];
    const index = [];
    for (const strip of strips) {
        const base = pos.length / 3;
        frames.forEach((f, i) => {
            const [a, b] = strip(f, i);
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

// Punto de la sección: x a la derecha, y hacia arriba (coords del marco).
// Lo que baja muy hondo (y < -20: paredes sobre el abismo) baja en VERTICAL de
// mundo, así en las rampas no se inclina decenas de metros.
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const at = (f, x, y) => f.position.clone().addScaledVector(f.right, x).addScaledVector(y < -20 ? WORLD_UP : f.up, y);

// Cara plana de 4 puntos (tapas de las islas). Guarda la geometría para liberarla.
function capMesh([a, b, c, d], material, geos) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([a, b, c, d].flatMap((p) => [p.x, p.y, p.z]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    return mesh;
}

export default class Tunnel extends Entity {
    // first: es el primer tramo de un entorno nuevo (lleva un gran portal de entrada)
    constructor(physics, track, s0, levelIndex = 0, index = 0, { first = false } = {}) {
        const env = environmentFor(LEVELS[levelIndex]);
        const mats = materialsFor(levelIndex);
        const frames = [];
        for (let i = 0; i <= SLICES; i++) frames.push(track.frameAt(s0 + i * SLICE));

        const group = new THREE.Group();
        const body = new CANNON.Body({ mass: 0, material: physics.defaultMaterial });
        const geos = [];
        const addSweep = (strips, material, { cast = false, receive = true, over = frames } = {}) => {
            const geo = sweepGeometry(over, strips);
            const mesh = new THREE.Mesh(geo, material);
            mesh.castShadow = cast;
            mesh.receiveShadow = receive;
            group.add(mesh);
            geos.push(geo);
            return mesh;
        };
        const v = (p) => new CANNON.Vec3(p.x, p.y, p.z);
        const sliceFrame = (i) => track.frameAt(s0 + (i + 0.5) * SLICE);
        const cq = (f) => new CANNON.Quaternion(f.quaternion.x, f.quaternion.y, f.quaternion.z, f.quaternion.w);

        // --- Islas: el suelo solo existe en una parte del tramo; el resto es vacío ---
        const islands = !!env.islands;
        const floorFrames = islands ? [] : frames;
        if (islands) {
            const n = ISLAND[1] - ISLAND[0];
            for (let k = 0; k <= n; k++) floorFrames.push(track.frameAt(s0 + ISLAND[0] + k));
        }
        const over = floorFrames;
        const bottom = bottomY(env);
        // Niveles de sueño: NO hay suelo bajo la cámara, solo vacío
        const noFloor = env.floor === false;

        // --- Suelo del carril (alternando tono para que se note el avance) ---
        if (!noFloor) addSweep([(f) => [at(f, -HW, 0), at(f, HW, 0)]], index % 2 ? mats.floorA : mats.floorB, { over });

        // --- Suelo exterior (salas anchas). Un poco más bajo: no pelea con el del carril ---
        const outer = env.outerFloor || 0;
        if (outer > HW) {
            addSweep([
                (f) => [at(f, -outer, -0.02), at(f, -HW, -0.02)],
                (f) => [at(f, HW, -0.02), at(f, outer, -0.02)],
            ], mats.outer, { over });
        }
        const floorHalf = Math.max(HW, outer);

        // --- Losa vista desde abajo (puentes, muelle, ruinas sobre el vacío) ---
        if (env.slab) {
            const d = -env.slab;
            const strips = [
                (f) => [at(f, -floorHalf, 0), at(f, -floorHalf, d)],
                (f) => [at(f, -floorHalf, d), at(f, floorHalf, d)],
                (f) => [at(f, floorHalf, d), at(f, floorHalf, 0)],
            ];
            // Caras delantera y trasera de la isla (se ven al llegar al vacío)
            if (islands) {
                const cap = (f) => [at(f, -floorHalf, 0), at(f, floorHalf, 0), at(f, floorHalf, d), at(f, -floorHalf, d)];
                group.add(capMesh(cap(floorFrames[0]), mats.stone, geos));
                group.add(capMesh(cap(floorFrames[floorFrames.length - 1]), mats.stone, geos));
            }
            addSweep(strips, mats.stone, { over });
        }

        // --- Arena lejana (desierto) ---
        if (env.ground) {
            const gy = env.ground.y;
            addSweep([(f) => [at(f, -GROUND_HALF, gy), at(f, GROUND_HALF, gy)]], mats.sand);
        }

        // --- Agua (muelle) ---
        if (env.water !== undefined) {
            addSweep([(f) => [at(f, -WATER_HALF, env.water), at(f, WATER_HALF, env.water)]], mats.water, { receive: false });
        }

        // --- Paredes ---
        const walls = env.walls;
        const wallT = walls?.thickness ?? T;
        const wallH = (side, s) => (walls.jagged ? jaggedHeight(s, side, walls.jagged) : walls.height);
        // Sobre islas, las paredes solo existen donde hay suelo, salvo que sean
        // continuas (catedral: muros que bajan al abismo)
        const wallsAlong = walls && (!islands || walls.continuous);
        if (walls) {
            const strips = [];
            for (const side of [-1, 1]) {
                const inner = side * W / 2;
                const outerX = side * (W / 2 + wallT);
                const wallBottom = islands && walls.continuous ? bottom : env.slab ? -env.slab : -T;
                strips.push(
                    (f) => [at(f, inner, wallsAlong && islands ? wallBottom : 0), at(f, inner, wallH(side, f.s))], // cara interior
                    (f) => [at(f, inner, wallH(side, f.s)), at(f, outerX, wallH(side, f.s))],    // borde de arriba
                    (f) => [at(f, outerX, wallH(side, f.s)), at(f, outerX, wallBottom)],             // cara exterior
                );
            }
            addSweep(strips, mats.wall, { cast: !!walls.shadow, over: wallsAlong ? frames : floorFrames });
        }

        // --- Techo ---
        const ceil = env.ceiling;
        const ceilHalf = ceil ? (ceil.halfWidth ?? HW) : 0;
        if (ceil && !ceil.slats) {
            addSweep([(f) => [at(f, -ceilHalf, ceil.y), at(f, ceilHalf, ceil.y)]], mats.ceiling, { cast: !!ceil.shadow });
        }

        // --- Física por rebanada: suelo, paredes, techo ---
        const floorShape = new CANNON.Box(new CANNON.Vec3(floorHalf, T / 2, BOX_HALF_LEN));
        const ceilShape = ceil && !ceil.slats ? new CANNON.Box(new CANNON.Vec3(ceilHalf, 0.25, BOX_HALF_LEN)) : null;
        if (islands) {
            const n = 8;
            const len = (ISLAND[1] - ISLAND[0]) / n;
            const islandShape = new CANNON.Box(new CANNON.Vec3(floorHalf, T / 2, len / 2 + 0.05));
            for (let k = 0; k < n; k++) {
                const f = track.frameAt(s0 + ISLAND[0] + (k + 0.5) * len);
                body.addShape(islandShape, v(at(f, 0, -T / 2)), cq(f));
            }
        }
        const groundShape = env.ground ? new CANNON.Box(new CANNON.Vec3(40, 0.5, BOX_HALF_LEN)) : null;
        for (let i = 0; i < SLICES; i++) {
            const f = sliceFrame(i);
            const q = cq(f);
            if (!islands && !noFloor) body.addShape(floorShape, v(at(f, 0, -T / 2)), q);
            if (groundShape) body.addShape(groundShape, v(at(f, 0, env.ground.y - 0.5)), q);
            const sliceMid = (i + 0.5) * SLICE;
            const onIsland = sliceMid > ISLAND[0] && sliceMid < ISLAND[1];
            if (walls && (wallsAlong || onIsland)) {
                for (const side of [-1, 1]) {
                    const h = Math.max(wallH(side, s0 + i * SLICE), wallH(side, s0 + (i + 1) * SLICE));
                    const shape = new CANNON.Box(new CANNON.Vec3(wallT / 2, h / 2, BOX_HALF_LEN));
                    body.addShape(shape, v(at(f, side * (W / 2 + wallT / 2), h / 2)), q);
                }
            }
            if (ceilShape) body.addShape(ceilShape, v(at(f, 0, ceil.y + 0.25)), q);
        }

        // --- Decorado ---
        const deco = new DecoBuilder(track, body);
        // Pedestal de la isla: baja hasta el fondo (niebla, arena o agua)
        if (islands && env.pedestal !== false) {
            const top = -(env.slab || T);
            const len = (ISLAND[1] - ISLAND[0]) * 0.85;
            deco.hanging('stone', s0 + (ISLAND[0] + ISLAND[1]) / 2, 0, top, 2 * floorHalf * 0.8, top - bottom, len);
        }
        // Objetos animados (giran, suben y bajan): mallas sueltas, no fusionadas
        const animated = [];
        const animate = (mesh, { spin = null, bob = 0, bobSpeed = 0.5 } = {}) => {
            mesh.userData.base = mesh.position.clone();
            mesh.userData.phase = Math.random() * Math.PI * 2;
            animated.push({ mesh, spin, bob, bobSpeed });
            group.add(mesh);
            return mesh;
        };
        const ctx = {
            s0, env, mats, deco, frames, floorFrames, addSweep, first, wallH, wallT, floorHalf, ceil, bottom, islands,
            track, animate, noFloor, levelIndex,
        };
        for (const name of env.deco || []) {
            const fn = DECO[name] || DREAMS[name];
            if (fn) fn(ctx);
        }
        const shadowKeys = new Set(['arch', 'stone', 'metal']);
        deco.build(mats, shadowKeys).forEach((m) => {
            group.add(m);
            geos.push(m.geometry);
        });

        // Mundo: choca con las bolas (normales e inertes) y los bloques de vidrio que caen.
        body.collisionFilterGroup = GROUP_WORLD;
        body.collisionFilterMask = GROUP_WORLD | GROUP_CRYSTAL | GROUP_BALL | GROUP_CHUNK;

        super(group, body);
        this.s0 = s0;
        this.s1 = s0 + L;
        this.geos = geos;
        this.animated = animated;
        this.time = 0;
    }

    // El body está en el origen con las formas en coords de mundo: nada que sincronizar
    sync() {}

    // Anima el decorado de sueño (girar, flotar arriba y abajo). Solo visual.
    update(delta) {
        this.time += delta;
        for (const a of this.animated) {
            const m = a.mesh;
            if (a.spin) {
                m.rotateOnAxis(a.spin.axis, a.spin.speed * delta);
            }
            if (a.bob) {
                m.position.y = m.userData.base.y + Math.sin(this.time * a.bobSpeed + m.userData.phase) * a.bob;
            }
        }
    }

    destroy(renderer, physics) {
        super.destroy(renderer, physics);
        this.geos.forEach((g) => g.dispose());
    }
}

/*
    DECORADO por entorno. Cada función recibe el contexto del tramo y añade
    piezas con deco.box(material, s, x, y, ancho, alto, fondo, opciones).
    Todo lo que tenga physics: true queda FUERA del tubo de la cámara.
*/
const DECO = {
    // Desierto: dunas suaves (esferas aplastadas medio enterradas en la arena)
    dunes({ s0, deco, env }) {
        const gy = env.ground.y;
        for (let n = 0; n < 3; n++) {
            const r = rand(15, 45);
            const yaw = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rand(0, Math.PI));
            deco.shape('sand', UNIT.sphere, s0 + rand(0, L), sign() * rand(16, 200), gy, r * rand(0.9, 1.5), r * rand(0.08, 0.2), r, { q: yaw, upright: true });
        }
        // Bloques de piedra caídos en la arena, cerca de la calzada
        for (let n = 0; n < 2; n++) {
            const size = rand(1.2, 3.5);
            deco.box('temple', s0 + rand(0, L), sign() * rand(8, 22), gy + size * 0.3, size, size * rand(0.6, 1.2), size * rand(1, 2.5), { q: randomQ() });
        }
    },

    // Desierto: ruinas de templos a lo lejos (columnatas, pirámides, obeliscos, zigurats, pilonos)
    temples({ s0, deco, env }) {
        if (Math.random() > 0.85) return;
        const gy = env.ground.y;
        const side = sign();
        const x = side * rand(24, 90);
        const s = s0 + rand(0, L);
        const yaw = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, rand(-0.4, 0.4));
        const kind = Math.floor(Math.random() * 5);
        if (kind === 0) {
            // Columnata: fila de columnas sobre un basamento, algunas rotas, con dinteles
            const n = 5 + Math.floor(Math.random() * 4);
            const gap = 4.5;
            const H = rand(9, 13);
            deco.box('temple', s, x, gy + 0.6, 4, 1.2, n * gap + 2, { upright: true });
            const heights = [];
            for (let k = 0; k < n; k++) {
                const z = (k - (n - 1) / 2) * gap;
                const h = Math.random() < 0.35 ? rand(2, H * 0.7) : H;
                heights.push(h);
                deco.shape('temple', UNIT.cylinder, s, x, gy + 1.2 + h / 2, 1.7, h, 1.7, { z, upright: true });
                deco.box('temple', s, x, gy + 1.2 + h + 0.3, 2.3, 0.6, 2.3, { z, upright: true });
            }
            for (let k = 0; k < n - 1; k++) {
                if (heights[k] === H && heights[k + 1] === H) {
                    deco.box('temple', s, x, gy + 1.2 + H + 1.2, 2.4, 1.2, gap + 2.2, { z: (k + 0.5 - (n - 1) / 2) * gap, upright: true });
                }
            }
        } else if (kind === 1) {
            // Pirámide
            const size = rand(30, 80);
            const h = size * 0.62;
            deco.shape('temple', UNIT.pyramid, s, x * 1.4, gy + h / 2, size, h, size, { q: yaw, upright: true });
        } else if (kind === 2) {
            // Obelisco sobre su base
            const h = rand(18, 32);
            deco.box('temple', s, x, gy + 0.8, 6, 1.6, 6, { q: yaw, upright: true });
            deco.box('temple', s, x, gy + 1.6 + h / 2, 2.4, h, 2.4, { q: yaw, upright: true });
            deco.shape('temple', UNIT.pyramid, s, x, gy + 1.6 + h + 1.2, 2.4, 2.4, 2.4, { q: yaw, upright: true });
        } else if (kind === 3) {
            // Zigurat escalonado
            const size = rand(30, 50);
            for (let k = 0; k < 4; k++) {
                const w = size * (1 - 0.22 * k);
                deco.box('temple', s, x * 1.3, gy + 2.5 + k * 5, w, 5, w, { q: yaw, upright: true });
            }
        } else {
            // Pilonos de un templo (dos torres trapezoidales y un dintel)
            const h = rand(14, 20);
            for (const dz of [-6, 6]) {
                deco.box('temple', s, x, gy + h / 2, 5, h, 8, { z: dz, upright: true });
                deco.box('temple', s, x, gy + h + 0.5, 5.6, 1, 8.6, { z: dz, upright: true });
            }
            deco.box('temple', s, x, gy + h * 0.75, 4, 2.5, 4.5, { upright: true });
        }
    },
    // Arco a la entrada de cada tramo (pasillo abierto)
    arch({ s0, deco }) {
        const H = TUNNEL_HEIGHT;
        for (const side of [-1, 1]) deco.box('arch', s0, side * (W / 2 + T / 2), (H + 1) / 2, 0.8, H + 1, 0.8);
        deco.box('arch', s0, 0, H + 0.6, W + 2 * T + 0.8, 0.8, 0.8);
    },

    // Gran portal de piedra al entrar en un entorno nuevo (marca el cambio de sala)
    threshold({ s0, deco, first, ceil, bottom: base }) {
        if (!first) return;
        const top = ceil && ceil.y < 12 ? ceil.y : 12;
        // Sobre el vacío los pilares bajan hasta perderse en la niebla
        const bottom = Math.min(base, 0);
        for (const side of [-1, 1]) {
            deco.hanging('arch', s0, side * (HW + 1.6), top, 3, top - bottom, 2.5);
        }
        const lintelH = ceil && ceil.y < 12 ? 1.2 : 1.6;
        deco.box('arch', s0, 0, top - lintelH / 2, 2 * HW + 6.2, lintelH, 2.5, { physics: true });
    },

    // Galería: pilastras en las paredes y una viga más gruesa cada 4 m
    ribs({ s0, deco, ceil }) {
        const H = TUNNEL_HEIGHT;
        for (let k = 0; k < L; k += 4) {
            const s = s0 + k;
            for (const side of [-1, 1]) {
                deco.box('arch', s, side * (W / 2 - 0.15), H / 2, 0.3, H, 0.7, { physics: true });
            }
            deco.box('arch', s, 0, (ceil?.y ?? H) - 0.45, W, 0.9, 0.8, { physics: true });
        }
        // Techo de vigas transversales: entre ellas entra el sol (franjas de luz)
        if (ceil?.slats) {
            for (let k = 0; k < L; k += SLICE) {
                deco.box('stone', s0 + k + 1, 0, ceil.y + 0.25, 2 * HW, 0.5, 1.1, { physics: true });
            }
        }
    },

    // Catedral: pilastras altísimas y arcos de techo cada 5 m
    tallRibs({ s0, deco, env }) {
        const H = env.walls.height;
        for (let k = 0; k < L; k += 5) {
            const s = s0 + k;
            for (const side of [-1, 1]) {
                deco.box('arch', s, side * (W / 2 - 0.2), H / 2, 0.8, H, 1.0, { physics: true });
                deco.box('arch', s, side * (W / 2 - 0.45), H - 1.2, 0.9, 2.4, 1.0); // ménsula
            }
            deco.box('arch', s, 0, H - 0.6, W, 1.2, 1.0, { physics: true });
        }
    },

    // Catedral: vitrales luminosos entre las pilastras
    stainedGlass({ s0, deco }) {
        // Vitrales que flotan entre las columnas gigantes de la nave
        for (const side of [-1, 1]) {
            deco.box('stained', s0 + 15, side * 13, rand(-2, 7), 0.15, rand(6, 10), 3.2, { upright: true });
        }
    },




    // Franja de luz a ras de suelo en las paredes
    baseLamps({ addSweep, mats, floorFrames }) {
        addSweep([
            (f) => [at(f, -W / 2 + 0.02, 0.15), at(f, -W / 2 + 0.02, 0.4)],
            (f) => [at(f, W / 2 - 0.02, 0.4), at(f, W / 2 - 0.02, 0.15)],
        ], mats.lamp, { receive: false, over: floorFrames });
    },

    // Almenas sobre los muros
    merlons({ s0, deco }) {
        const H = TUNNEL_HEIGHT;
        for (let k = 1; k < L; k += 2.5) {
            for (const side of [-1, 1]) deco.box('stone', s0 + k, side * (W / 2 + T / 2), H + 0.45, T + 0.25, 0.9, 1.1);
        }
    },

    // Contrafuertes por fuera de los muros
    buttresses({ s0, deco }) {
        const H = TUNNEL_HEIGHT;
        for (const k of [5, 15]) {
            for (const side of [-1, 1]) {
                deco.box('stone', s0 + k, side * (W / 2 + T + 0.8), H * 0.28, 1.6, H * 0.56, 1.2);
                deco.box('stone', s0 + k, side * (W / 2 + T + 0.4), H * 0.48, 0.8, H * 0.96, 0.9);
            }
        }
    },

    // Salón: bosque de columnas que se pierde en la niebla
    columnGrid({ s0, deco, ceil }) {
        const top = ceil?.y ?? TUNNEL_HEIGHT;
        for (const k of [5, 15]) {
            for (const ax of [8, 14, 20]) {
                for (const side of [-1, 1]) {
                    const x = side * ax;
                    const phys = ax === 8;
                    deco.box('stone', s0 + k, x, top / 2, 1.0, top, 1.0, { physics: phys });
                    deco.box('arch', s0 + k, x, 0.25, 1.7, 0.5, 1.7);
                    deco.box('arch', s0 + k, x, top - 0.3, 1.7, 0.6, 1.7);
                }
            }
        }
    },

    // Salón: paneles de luz en el techo
    ceilingLamps({ s0, deco, ceil }) {
        for (const k of [2.5, 7.5, 12.5, 17.5]) {
            for (const x of [-17, -10.5, -3.5, 3.5, 10.5, 17]) {
                deco.box('lamp', s0 + k, x, ceil.y - 0.05, 2.4, 0.08, 1.1);
            }
        }
    },

    // Cañón: rocas medio enterradas al pie de las paredes
    boulders({ s0, deco }) {
        for (const side of [-1, 1]) {
            for (let n = 0; n < 3; n++) {
                const size = rand(1.4, 3.4);
                deco.box('stone', s0 + rand(1, L - 1), side * (W / 2 + size * 0.3), size * 0.3, size, size * 0.8, size,
                    { q: randomQ(), physics: true });
            }
        }
    },

    // Bordes luminosos del camino (puentes)
    edgeGlow({ addSweep, mats, floorHalf, floorFrames }) {
        addSweep([
            (f) => [at(f, -floorHalf, 0.01), at(f, -floorHalf + 0.18, 0.01)],
            (f) => [at(f, floorHalf - 0.18, 0.01), at(f, floorHalf, 0.01)],
        ], mats.lamp, { receive: false, over: floorFrames });
    },

    // Cubos suspendidos lejos del camino
    floating({ s0, deco }) {
        for (let n = 0; n < 4; n++) {
            const size = rand(2, 9);
            deco.box('float', s0 + rand(0, L), sign() * rand(14, 60), rand(-35, 35), size, size, size, { q: randomQ() });
        }
    },

    // Grandes pórticos cuadrados alrededor del camino, girados al azar
    rings({ s0, deco }) {
        const R = 10;
        const t = 0.7;
        const cy = 3;
        const roll = rand(0, Math.PI / 2);
        const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), roll);
        const bars = [[0, R, 2 * R + t, t], [0, -R, 2 * R + t, t], [R, 0, t, 2 * R + t], [-R, 0, t, 2 * R + t]];
        for (const [x, y, w, h] of bars) {
            const p = new THREE.Vector3(x, y, 0).applyQuaternion(q);
            deco.box('ring', s0 + L / 2, p.x, cy + p.y, w, h, t, { q });
        }
    },

    // Monolitos gigantes flotando a lo lejos
    monoliths({ s0, deco }) {
        for (let n = 0; n < 2; n++) {
            const w = rand(3, 8);
            deco.box('float', s0 + rand(0, L), sign() * rand(25, 80), rand(-10, 25), w, rand(20, 60), rand(3, 8));
        }
    },

    // Muelle: farolas sobre las barandas
    lampPosts({ s0, deco }) {
        for (const k of [2, 12]) {
            for (const side of [-1, 1]) {
                const x = side * (HW - 0.25); // al borde del tablón
                deco.box('metal', s0 + k, x, 1.9, 0.16, 3.8, 0.16, { physics: true });
                deco.box('lamp', s0 + k, x - side * 0.25, 3.8, 0.7, 0.22, 0.45);
            }
        }
    },

    // Muelle: pilotes que bajan al agua
    pilings({ s0, deco, env }) {
        const top = -env.slab;
        const bottom = env.water - 1.5;
        for (let k = 0; k < L; k += 5) {
            for (const x of [-(HW - 0.4), 0, HW - 0.4]) {
                deco.box('stone', s0 + k, x, (top + bottom) / 2, 0.7, top - bottom, 0.7);
            }
        }
    },

};
