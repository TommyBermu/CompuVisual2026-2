/*
    entities/PowerCrystal.js
    ------------------------
    CRISTAL DE PODER: una gema de vidrio de color que flota fuera del camino.
    Romperla con una bola activa un poder (systems/PowerUps.js). Cada poder
    tiene su color y un ICONO blanco delante de la gema:

        triple    rosa    tres bolitas
        infinite  cian    un "∞" (dos aros)
        slowmo    violeta un reloj de arena (dos conos)
        bonus     verde   una cruz "+"

    Es un GlassPanel FRÁGIL (como los botones de las compuertas): el primer
    golpe la revienta entera en astillas de su color. Así la rotura, el choque
    y el apuntado funcionan igual que con el resto del vidrio. Alrededor lleva
    un halo (aro de su color) que late, solo visual: no se apunta contra él.

    El icono y el halo son hijos del grupo del panel: desaparecen con él
    cuando el Spawner lo borra al quedarse sin trozos.
*/

import * as THREE from 'three';
import GlassPanel from './GlassPanel.js';
import { POWERS } from '../systems/PowerUps.js';
import { CRYSTAL_THICKNESS } from '../constants.js';

// Medidas de la gema (medio ancho / medio alto) y del halo
export const GEM_HALF_W = 0.6;
export const GEM_HALF_H = 0.85;
export const HALO_RADIUS = 1.25;

// Contorno de la gema: hexágono alargado con punta arriba y abajo (CCW)
const W = GEM_HALF_W, H = GEM_HALF_H;
const GEM_OUTLINE = [[0, -H], [W, -0.35 * H], [W, 0.35 * H], [0, H], [-W, 0.35 * H], [-W, -0.35 * H]];

// Geometrías compartidas (iconos y halo): nunca se liberan
const geo = {
    halo: new THREE.RingGeometry(1.0, HALO_RADIUS, 40),
    ball: new THREE.SphereGeometry(0.13, 14, 10),
    ring: new THREE.TorusGeometry(0.15, 0.05, 8, 24),
    cone: new THREE.ConeGeometry(0.2, 0.28, 16),
    bar: new THREE.BoxGeometry(0.5, 0.14, 0.06),
};
const iconMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff' });

// Materiales por poder (se crean la primera vez)
const gemMaterials = new Map();
const haloMaterials = new Map();

function gemMaterial(type) {
    if (!gemMaterials.has(type)) {
        const color = POWERS[type].color;
        gemMaterials.set(type, new THREE.MeshPhysicalMaterial({
            color,
            emissive: color,
            emissiveIntensity: 1.1,
            transparent: true,
            opacity: 0.9,
            roughness: 0.08,
            metalness: 0,
            side: THREE.DoubleSide,
        }));
    }
    return gemMaterials.get(type);
}

function haloMaterial(type) {
    if (!haloMaterials.has(type)) {
        haloMaterials.set(type, new THREE.MeshBasicMaterial({
            color: POWERS[type].color,
            transparent: true,
            opacity: 0.65,
            depthWrite: false,
            side: THREE.DoubleSide,
        }));
    }
    return haloMaterials.get(type);
}

// Icono de cada poder (en el plano de la gema, centrado)
function buildIcon(type) {
    const icon = new THREE.Group();
    const add = (g, x = 0, y = 0, rz = 0) => {
        const m = new THREE.Mesh(g, iconMaterial);
        m.position.set(x, y, 0);
        m.rotation.z = rz;
        icon.add(m);
        return m;
    };
    if (type === 'triple') {
        for (let i = 0; i < 3; i++) {
            const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
            add(geo.ball, 0.22 * Math.cos(a), 0.22 * Math.sin(a));
        }
    } else if (type === 'infinite') {
        add(geo.ring, -0.16, 0);
        add(geo.ring, 0.16, 0);
    } else if (type === 'slowmo') {
        add(geo.cone, 0, 0.14, Math.PI);  // arriba, punta hacia abajo
        add(geo.cone, 0, -0.14);          // abajo, punta hacia arriba
    } else {
        add(geo.bar);
        add(geo.bar, 0, 0, Math.PI / 2);
    }
    return icon;
}

const noRaycast = () => {};

export default class PowerCrystal extends GlassPanel {
    constructor(type, levelIndex = 0) {
        super(GEM_OUTLINE, levelIndex, { fragile: true, material: gemMaterial(type) });
        this.power = type; // el Spawner lo usa para avisar del poder en vez del premio de bolas

        // Icono delante (+z mira a la cámara) y detrás, para que se lea desde los dos lados
        this.icons = [1, -1].map((side) => {
            const icon = buildIcon(type);
            icon.position.z = side * (CRYSTAL_THICKNESS / 2 + 0.04);
            icon.traverse((o) => { o.raycast = noRaycast; });
            this.mesh.add(icon);
            return icon;
        });

        // Halo que late (no cuenta para apuntar)
        this.halo = new THREE.Mesh(geo.halo, haloMaterial(type));
        this.halo.raycast = noRaycast;
        this.mesh.add(this.halo);
    }

    // Animación solo visual (t = tiempo del obstáculo)
    animate(t) {
        const pulse = 1 + 0.08 * Math.sin(t * 4);
        this.halo.scale.setScalar(pulse);
        this.halo.rotation.z = t * 0.6;
        this.icons.forEach((icon) => { icon.rotation.z = 0.25 * Math.sin(t * 2.2); });
    }
}
