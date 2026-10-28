/*
    dreams.js
    ---------
    Decorado de los niveles "de sueño" (los que no tienen suelo, ver
    environments.js). Inspirado en el original y en juegos oníricos tipo
    LSD Dream Emulator: objetos imposibles flotando en el vacío, a escala
    rara, que giran y respiran despacio y se pierden en la niebla.

    Cada función recibe el contexto del tramo (entities/Tunnel.js):
        deco     piezas ESTÁTICAS fusionadas en una malla por material
        animate  añade una malla suelta que gira (spin) y/o sube y baja (bob)
        track    para colocar cosas en el marco del recorrido
    Todo se coloca a un lado del camino (|x| grande): nunca invade el paso de la
    cámara ni los obstáculos, pero tampoco tan lejos como para que la niebla lo
    borre del todo. Es solo visual (no tiene física, salvo los fragmentos de abajo).
*/

import * as THREE from 'three';
import { LEVELS } from './levels.js';
import { UNIT } from './utils/deco.js';
import { pointToWorld } from './utils/frame.js';

const rand = (a, b) => a + Math.random() * (b - a);
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const chance = (p) => Math.random() < p;
const L = 20; // largo del tramo
const tmpE = new THREE.Euler();
const randomQ = () => new THREE.Quaternion().setFromEuler(tmpE.set(rand(0, 6), rand(0, 6), rand(0, 6)));
const randomAxis = () => new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
const FLIP = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

// Geometrías compartidas por todos los tramos (no se liberan)
const GEO = {
    sphere: new THREE.SphereGeometry(1, 32, 20),
    box: new THREE.BoxGeometry(1, 1, 1),
    pyramid: UNIT.pyramid,
    cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
    torus: new THREE.TorusGeometry(1, 0.045, 10, 72),
    octa: new THREE.OctahedronGeometry(1),
    icosa: new THREE.IcosahedronGeometry(1),
    dodeca: new THREE.DodecahedronGeometry(1),
    tetra: new THREE.TetrahedronGeometry(1),
    knot: new THREE.TorusKnotGeometry(0.7, 0.18, 120, 14),
};

// Materiales de sueño por nivel (derivados de su paleta), reutilizados
const cache = new Map();
function dreamMats(levelIndex) {
    if (cache.has(levelIndex)) return cache.get(levelIndex);
    const c = LEVELS[levelIndex].colors;
    const base = new THREE.Color(c.arch);
    const hsl = {};
    base.getHSL(hsl);
    // Cuatro tonos pastel repartidos alrededor del tono del nivel
    const pastel = [0, 0.12, 0.5, 0.75].map((dh) => new THREE.MeshPhysicalMaterial({
        color: new THREE.Color().setHSL((hsl.h + dh) % 1, 0.65, 0.6), // pastel, pero con color de verdad
        roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 1,
    }));
    const m = {
        pastel,
        white: new THREE.MeshStandardMaterial({ color: 0xf4f2ff, roughness: 0.35, flatShading: true, envMapIntensity: 0.8 }),
        glow: new THREE.MeshStandardMaterial({ color: c.sun, emissive: c.sun, emissiveIntensity: 1.6 }),
        glowAlt: new THREE.MeshStandardMaterial({
            color: new THREE.Color(c.arch).lerp(new THREE.Color(c.skyHorizon), 0.5),
            emissive: new THREE.Color(c.arch).lerp(new THREE.Color(c.skyHorizon), 0.5),
            emissiveIntensity: 1.3,
        }),
        crystal: new THREE.MeshPhysicalMaterial({
            color: new THREE.Color(c.arch).lerp(new THREE.Color(0xffffff), 0.5),
            roughness: 0.05, transmission: 0.7, thickness: 1, transparent: true, opacity: 0.85,
            flatShading: true, envMapIntensity: 1.2,
        }),
        house: new THREE.MeshStandardMaterial({ color: new THREE.Color(c.wall).lerp(new THREE.Color(c.arch), 0.25), roughness: 0.7 }),
        roof: new THREE.MeshStandardMaterial({ color: c.arch, roughness: 0.6 }),
        checkA: new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.5 }),
        checkB: new THREE.MeshStandardMaterial({ color: new THREE.Color(c.arch).multiplyScalar(0.7), roughness: 0.5 }),
    };
    cache.set(levelIndex, m);
    return m;
}

// Malla suelta colocada en el punto (x, y, z) local del recorrido en s
function meshAt(track, geo, material, s, x, y, scale, q = null) {
    const mesh = new THREE.Mesh(geo, material);
    const f = track.frameAt(s);
    pointToWorld(f, x, y, 0, mesh.position);
    if (typeof scale === 'number') mesh.scale.setScalar(scale);
    else mesh.scale.copy(scale);
    if (q) mesh.quaternion.copy(q);
    return mesh;
}

// Grupo (para objetos de varias piezas) colocado igual que meshAt
function groupAt(track, s, x, y, q = null) {
    const g = new THREE.Group();
    const f = track.frameAt(s);
    pointToWorld(f, x, y, 0, g.position);
    g.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), f.yaw);
    if (q) g.quaternion.multiply(q);
    return g;
}

const part = (group, geo, material, x, y, z, sx, sy, sz, q = null) => {
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    if (q) m.quaternion.copy(q);
    group.add(m);
    return m;
};

const DREAMS = {
    // Fragmentos de suelo sueltos flotando POR DEBAJO del camino (y algo a los
    // lados): dan "suelo" a la parte de abajo del vacío. Tienen física: las
    // bolas que caen rebotan en ellos (muy por debajo de los cristales).
    underFragments({ s0, deco }) {
        const n = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < n; k++) {
            const s = s0 + rand(1, L - 1);
            const x = rand(-10, 10);
            const y = rand(-11, -3.5);
            const w = rand(2, 6);
            const d = rand(2, 6);
            const t = rand(0.5, 1.4);
            deco.box(k % 2 ? 'outer' : 'stone', s, x, y, w, t, d, { physics: true });
            deco.box('stone', s, x + rand(-0.5, 0.5), y - t / 2 - 0.6, w * 0.6, 1.2, d * 0.55);
        }
    },

    // Desierto: pirámides boca abajo flotando en el cielo, girando despacio
    invertedPyramids({ s0, track, animate, mats }) {
        if (!chance(0.55)) return;
        const size = rand(8, 22);
        const m = meshAt(track, GEO.pyramid, mats.temple, s0 + rand(0, L),
            sign() * rand(18 + size / 2, 41.5), rand(8, 30), new THREE.Vector3(size, size * 0.8, size), FLIP);
        animate(m, { spin: { axis: new THREE.Vector3(0, 1, 0), speed: rand(0.08, 0.2) }, bob: rand(0.8, 2), bobSpeed: 0.25 });
    },

    // Burbujas: esferas pastel gigantes que suben y bajan
    bubbles({ s0, track, animate, levelIndex }) {
        const m = dreamMats(levelIndex);
        for (let n = 0; n < 2; n++) {
            const r = rand(2, 13);
            const mesh = meshAt(track, GEO.sphere, m.pastel[Math.floor(Math.random() * 4)], s0 + rand(0, L),
                sign() * rand(9 + r, 32), rand(-35, 8), r);
            animate(mesh, { bob: rand(1, 4), bobSpeed: rand(0.25, 0.6) });
        }
    },

    // Escaleras que no llevan a ningún sitio, girando lentísimo
    floatingStairs({ s0, track, animate, levelIndex }) {
        if (!chance(0.45)) return;
        const m = dreamMats(levelIndex);
        const g = groupAt(track, s0 + rand(0, L), sign() * rand(14, 27), rand(-18, 6), randomQ());
        const steps = 8 + Math.floor(Math.random() * 7);
        for (let i = 0; i < steps; i++) {
            part(g, GEO.box, i % 2 ? m.checkA : m.house, 0, i * 0.45, -i * 0.9, 2.4, 0.45, 0.9);
        }
        animate(g, { spin: { axis: randomAxis(), speed: rand(0.03, 0.08) }, bob: 1, bobSpeed: 0.2 });
    },

    // Baldosas de ajedrez sueltas, flotando inclinadas
    checkerTiles({ s0, track, animate, levelIndex }) {
        const m = dreamMats(levelIndex);
        for (let n = 0; n < 2; n++) {
            const tile = rand(1.5, 3.5);
            const g = groupAt(track, s0 + rand(0, L), sign() * rand(10, 22.5), rand(-15, 3),
                new THREE.Quaternion().setFromEuler(tmpE.set(rand(-0.5, 0.5), rand(0, 6), rand(-0.5, 0.5))));
            for (let i = 0; i < 2; i++) {
                for (let j = 0; j < 2; j++) {
                    part(g, GEO.box, (i + j) % 2 ? m.checkA : m.checkB, (i - 0.5) * tile, 0, (j - 0.5) * tile, tile, 0.3, tile);
                }
            }
            animate(g, { bob: rand(0.5, 1.5), bobSpeed: rand(0.3, 0.6) });
        }
    },

    // Mar: marcos de puerta plantados en el agua, con una luz dentro (¿a dónde llevan?)
    doorsOnWater({ s0, deco, env }) {
        if (!chance(0.7)) return;
        const s = s0 + rand(0, L);
        const x = sign() * rand(10, 30);
        const wy = env.water;
        const h = rand(5, 8);
        for (const dx of [-1.6, 1.6]) deco.box('arch', s, x + dx, wy + h / 2, 0.4, h, 0.4, { upright: true });
        deco.box('arch', s, x, wy + h + 0.2, 3.6, 0.4, 0.4, { upright: true });
        deco.box('lamp', s, x, wy + h / 2, 2.8, h, 0.05, { upright: true });
    },

    // Mar: faros altísimos que salen del agua
    lighthouses({ s0, deco, env }) {
        if (!chance(0.3)) return;
        const s = s0 + rand(0, L);
        const x = sign() * rand(30, 50);
        const h = rand(16, 28);
        deco.hanging('temple', s, x, env.water, 3, h, 3, { geo: UNIT.cylinder, rise: true });
        deco.hanging('lamp', s, x, env.water + h, 2.2, 2, 2.2, { geo: UNIT.cylinder, rise: true });
        deco.hanging('arch', s, x, env.water + h + 2, 3.4, 1.6, 3.4, { geo: UNIT.pyramid, rise: true });
    },

    // Mar: casitas boca abajo flotando en el cielo
    flyingHouses({ s0, track, animate, levelIndex }) {
        if (!chance(0.5)) return;
        const m = dreamMats(levelIndex);
        const g = groupAt(track, s0 + rand(0, L), sign() * rand(12, 28.5), rand(-2, 20), FLIP.clone());
        const w = rand(3, 5);
        part(g, GEO.box, m.house, 0, 0, 0, w, w * 0.75, w);
        part(g, GEO.pyramid, m.roof, 0, w * 0.375 + w * 0.3, 0, w * 1.15, w * 0.6, w * 1.15);
        part(g, GEO.box, m.glow, 0, 0, w / 2 + 0.01, w * 0.25, w * 0.25, 0.05); // ventana encendida
        animate(g, { spin: { axis: new THREE.Vector3(0, 1, 0), speed: rand(0.1, 0.25) }, bob: 1.2, bobSpeed: 0.3 });
    },

    // Noche: giroscopios, anillos gigantes girando unos dentro de otros
    gyroscopes({ s0, track, animate, levelIndex }) {
        if (!chance(0.5)) return;
        const m = dreamMats(levelIndex);
        const R = rand(8, 14);
        const s = s0 + rand(0, L);
        const x = sign() * rand(R + 12, 36);
        const y = rand(-15, 8);
        [1, 0.78, 0.58].forEach((k, i) => {
            const ring = meshAt(track, GEO.torus, i === 1 ? m.glowAlt : m.glow, s, x, y, R * k, randomQ());
            animate(ring, { spin: { axis: randomAxis(), speed: rand(0.15, 0.4) * sign() } });
        });
        animate(meshAt(track, GEO.icosa, m.white, s, x, y, R * 0.18), { spin: { axis: randomAxis(), speed: 0.3 } });
    },

    // Noche: estrellas (puntitos de luz muy lejos)
    stars({ s0, deco }) {
        for (let n = 0; n < 18; n++) {
            const k = rand(0.15, 0.45);
            deco.box('lamp', s0 + rand(0, L), sign() * rand(15, 52.5), rand(-50, 30), k, k, k);
        }
    },

    // Aurora (cámara boca abajo): estalactitas de cristal colgando del cielo.
    // Con la cámara girada se ven como agujas que suben desde abajo.
    stalactites({ s0, deco }) {
        for (let n = 0; n < 3; n++) {
            const w = rand(2, 5);
            const h = rand(8, 26);
            const top = rand(14, 30);
            deco.shape('ring', UNIT.pyramid, s0 + rand(0, L), sign() * rand(7 + w, 23.5), top - h / 2, w, h, w,
                { upright: true, q: FLIP });
        }
    },

    // Aurora: esquirlas (octaedros luminosos) girando
    shards({ s0, track, animate, levelIndex }) {
        const m = dreamMats(levelIndex);
        for (let n = 0; n < 3; n++) {
            const mesh = meshAt(track, GEO.octa, n % 2 ? m.glowAlt : m.crystal, s0 + rand(0, L),
                sign() * rand(8, 19), rand(-10, 6), new THREE.Vector3(rand(0.6, 1.6), rand(1.2, 3), rand(0.6, 1.6)), randomQ());
            animate(mesh, { spin: { axis: randomAxis(), speed: rand(0.4, 0.9) }, bob: rand(0.5, 1.5), bobSpeed: 0.5 });
        }
    },

    // Escher: arcos sueltos flotando en cualquier orientación
    floatingArches({ s0, track, animate, levelIndex, mats }) {
        if (!chance(0.45)) return;
        const m = dreamMats(levelIndex);
        const g = groupAt(track, s0 + rand(0, L), sign() * rand(14, 29.5), rand(-16, 6), randomQ());
        const h = rand(5, 8);
        part(g, GEO.box, mats.stone, -3, 0, 0, 1, h, 1);
        part(g, GEO.box, mats.stone, 3, 0, 0, 1, h, 1);
        part(g, GEO.box, m.house, 0, h / 2 + 0.5, 0, 8, 1, 1.2);
        animate(g, { spin: { axis: randomAxis(), speed: rand(0.02, 0.06) } });
    },

    // Escher: trozos de columna dando vueltas
    columnChunks({ s0, track, animate, mats }) {
        for (let n = 0; n < 2; n++) {
            const r = rand(1.2, 2);
            const mesh = meshAt(track, GEO.cylinder, mats.stone, s0 + rand(0, L), sign() * rand(8 + r, 21.5), rand(-14, 5),
                new THREE.Vector3(r, rand(3, 8), r), randomQ());
            animate(mesh, { spin: { axis: randomAxis(), speed: rand(0.1, 0.3) }, bob: 0.8, bobSpeed: 0.3 });
        }
    },

    // Cénit: sólidos platónicos blancos gigantes girando
    platonic({ s0, track, animate, levelIndex }) {
        const m = dreamMats(levelIndex);
        const shapes = [GEO.icosa, GEO.octa, GEO.dodeca, GEO.tetra, GEO.knot];
        const n = chance(0.5) ? 2 : 1;
        for (let k = 0; k < n; k++) {
            const size = rand(5, 16);
            const mesh = meshAt(track, shapes[Math.floor(Math.random() * shapes.length)], m.white, s0 + rand(0, L),
                sign() * rand(15 + size, 40), rand(-25, 10), size, randomQ());
            animate(mesh, { spin: { axis: randomAxis(), speed: rand(0.08, 0.2) }, bob: 2, bobSpeed: 0.2 });
        }
    },
};

export default DREAMS;
