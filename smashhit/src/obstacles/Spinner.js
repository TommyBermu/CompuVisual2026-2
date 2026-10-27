/*
    obstacles/Spinner.js
    --------------------
    Aspas GIRATORIAS: 2-4 hojas de vidrio alrededor de un eje metálico que gira
    en el plano del pasillo (alrededor de Z), como un molino. El eje va por
    encima de la cámara (nunca la toca) y las hojas barren el camino: hay que
    romper la que viene o pasar por el hueco entre dos.

    Cada hoja es un GlassPanel cuyo eje local +Y apunta hacia fuera del eje de
    giro; se sostiene por su extremo INTERIOR (anchor 'bottom' en coords
    locales), así lo que se separa del eje sale despedido girando.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Obstacle from '../entities/Obstacle.js';
import GlassPanel from '../entities/GlassPanel.js';
import { rectPolygon } from '../utils/fracture.js';
import { TUNNEL_WIDTH, SPINNER_HUB_Y, SPINNER_SPEED } from '../constants.js';

const rand = (min, max) => min + Math.random() * (max - min);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const HUB_RADIUS = 0.42;
const HUB_DEPTH = 0.6;

export default class Spinner extends Obstacle {
    constructor(z, levelIndex) {
        super(z, levelIndex);
        this.hubX = rand(-1.2, 1.2);
        this.hubY = rand(...SPINNER_HUB_Y);
        this.speed = rand(...SPINNER_SPEED) * (Math.random() < 0.5 ? -1 : 1);
        this.angle0 = Math.random() * 2 * Math.PI;

        const n = [2, 3, 4][Math.floor(Math.random() * 3)];
        const r0 = HUB_RADIUS + 0.05;                                   // la hoja empieza en el borde del eje
        const r1 = Math.min(this.hubY - 0.35, TUNNEL_WIDTH / 2 - Math.abs(this.hubX) - 0.5); // sin tocar suelo ni paredes
        const len = r1 - r0;
        const bladeW = n === 4 ? rand(0.9, 1.1) : rand(1.1, 1.4);
        this.bladeCenter = r0 + len / 2;

        // Viga fija detrás de las aspas, a la altura del eje (por encima de la cámara)
        const beam = this.addBox(TUNNEL_WIDTH, 0.3, 0.3);
        this.placeSolid(beam, 0, this.hubY, z - HUB_DEPTH / 2 - 0.15);

        // Eje: cilindro con su eje a lo largo de Z (Three y Cannon-es lo crean a lo largo de Y)
        this.hub = this.addSolid(
            new THREE.CylinderGeometry(HUB_RADIUS, HUB_RADIUS, HUB_DEPTH, 20),
            new CANNON.Cylinder(HUB_RADIUS, HUB_RADIUS, HUB_DEPTH, 12),
        );
        this.hubTilt = new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2);

        // Hojas repartidas a ángulos iguales
        this.blades = [];
        for (let k = 0; k < n; k++) {
            const panel = this.addPanel(new GlassPanel(rectPolygon(bladeW / 2, len / 2), levelIndex, { anchor: 'bottom' }));
            this.blades.push({ panel, offset: (k * 2 * Math.PI) / n });
        }

        this.q = new THREE.Quaternion();
        this._pose(0);
    }

    _pose(delta) {
        const a0 = this.angle0 + this.speed * this.time;
        this.q.setFromAxisAngle(Z_AXIS, a0).multiply(this.hubTilt);
        this.placeSolid(this.hub, this.hubX, this.hubY, this.z, this.q);

        for (const { panel, offset } of this.blades) {
            if (panel.empty) continue;
            const a = a0 + offset;
            this.q.setFromAxisAngle(Z_AXIS, a);
            // +Y local girado un ángulo a: (-sin a, cos a)
            const x = this.hubX - this.bladeCenter * Math.sin(a);
            const y = this.hubY + this.bladeCenter * Math.cos(a);
            panel.moveTo(x, y, this.z, this.q, delta);
        }
    }

    update(delta) {
        super.update(delta);
        this._pose(delta);
    }
}
