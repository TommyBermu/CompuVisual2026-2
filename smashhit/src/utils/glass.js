/*
    utils/glass.js
    --------------
    Piezas de vidrio: pasar un polígono convexo 2D (utils/fracture.js) a
        - una geometría de Three.js (prisma: el polígono extruido con el grosor), y
        - una forma de Cannon-es (ConvexPolyhedron) con la MISMA forma.
    Más el material de vidrio de cada nivel y la distancia punto-prisma que se
    usa para el choque cámara-vidrio.

    Todos los polígonos que llegan aquí están CENTRADOS en su centroide (el
    origen local de la pieza), así la pieza gira alrededor de su centro al caer.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { LEVELS } from '../levels.js';
import { CRYSTAL_OPACITY, CRYSTAL_THICKNESS } from '../constants.js';
import { closestPointOnPolygon } from './fracture.js';

// Separación visual entre trozos (las grietas). Solo visual: la física usa el
// polígono completo, así no quedan rendijas por las que se cuele la bola.
const CRACK_GAP = 0.012;

// Un material de cristal por nivel (color del arco del nivel), reutilizado.
const materialsByLevel = new Map();

export function glassMaterial(levelIndex) {
    if (!materialsByLevel.has(levelIndex)) {
        const c = LEVELS[levelIndex].colors;
        materialsByLevel.set(levelIndex, new THREE.MeshPhysicalMaterial({
            color: c.arch,
            transparent: true,
            opacity: CRYSTAL_OPACITY,
            roughness: 0.05,
            metalness: 0,
            transmission: 0.6,
            thickness: 0.5,
            envMapIntensity: 1,
            side: THREE.DoubleSide,
        }));
    }
    return materialsByLevel.get(levelIndex);
}

// Vidrio de los BOTONES (compuertas): brilla para que se vea que hay que darle.
let buttonMat = null;

export function buttonMaterial() {
    if (!buttonMat) {
        buttonMat = new THREE.MeshPhysicalMaterial({
            color: '#fff6c8',
            emissive: '#ffd84a',
            emissiveIntensity: 1.2,
            transparent: true,
            opacity: 0.9,
            roughness: 0.1,
            side: THREE.DoubleSide,
        });
    }
    return buttonMat;
}

// Encoge el polígono un poquito hacia su centro (0,0) para que se vean las grietas
function insetPolygon(poly, gap) {
    return poly.map(([x, y]) => {
        const r = Math.hypot(x, y);
        const k = r > 1e-6 ? Math.max(0.85, 1 - gap / r) : 1;
        return [x * k, y * k];
    });
}

// Prisma: cara delantera (+z), trasera (-z) y laterales. Sin índices -> normales planas.
export function prismGeometry(poly, thickness) {
    const p = insetPolygon(poly, CRACK_GAP);
    const h = thickness / 2;
    const n = p.length;
    const pos = [];
    const tri = (a, b, c) => pos.push(...a, ...b, ...c);

    for (let i = 1; i < n - 1; i++) {
        // delantera (CCW vista desde +z)
        tri([p[0][0], p[0][1], h], [p[i][0], p[i][1], h], [p[i + 1][0], p[i + 1][1], h]);
        // trasera (al revés)
        tri([p[0][0], p[0][1], -h], [p[i + 1][0], p[i + 1][1], -h], [p[i][0], p[i][1], -h]);
    }
    for (let i = 0; i < n; i++) {
        const a = p[i], b = p[(i + 1) % n];
        const a0 = [a[0], a[1], -h], b0 = [b[0], b[1], -h];
        const a1 = [a[0], a[1], h], b1 = [b[0], b[1], h];
        tri(a0, b0, b1);
        tri(a0, b1, a1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    return geo;
}

// Misma forma para Cannon. Caras en sentido antihorario vistas desde fuera.
export function prismShape(poly, thickness) {
    const h = thickness / 2;
    const n = poly.length;
    const vertices = [];
    poly.forEach(([x, y]) => vertices.push(new CANNON.Vec3(x, y, -h))); // 0..n-1  atrás
    poly.forEach(([x, y]) => vertices.push(new CANNON.Vec3(x, y, h)));  // n..2n-1 delante

    const faces = [];
    faces.push([...Array(n).keys()].reverse());              // trasera
    faces.push([...Array(n).keys()].map((i) => i + n));      // delantera
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        faces.push([i, j, j + n, i + n]);                    // laterales
    }
    return new CANNON.ConvexPolyhedron({ vertices, faces });
}

// Forma de Cannon de un trozo de Crystal (se crea la primera vez que se necesita:
// las astillas son solo visuales y nunca la usan).
export function ensureShape(piece) {
    if (!piece.shape) piece.shape = prismShape(piece.poly, CRYSTAL_THICKNESS);
    return piece.shape;
}

// Distancia de un punto (en coords locales de la pieza) al prisma.
export function distanceToPrism(poly, thickness, x, y, z) {
    const d2 = closestPointOnPolygon(poly, x, y).dist;
    const dz = Math.max(0, Math.abs(z) - thickness / 2);
    return Math.hypot(d2, dz);
}

// Mueve un polígono para que su origen sea (cx, cy)
export function centerPolygon(poly, cx, cy) {
    return poly.map(([x, y]) => [x - cx, y - cy]);
}
