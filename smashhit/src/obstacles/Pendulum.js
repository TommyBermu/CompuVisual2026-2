/*
    obstacles/Pendulum.js
    ---------------------
    Una placa de vidrio colgada de una barra metálica que OSCILA de lado a lado
    (gira alrededor del eje Z, en el plano del pasillo). Solo tapa el camino en
    parte del vaivén: o se rompe de un disparo o se cronometra el paso.

    El eje está en una viga de pared a pared, muy por encima de la cámara: la
    barra nunca la toca, solo la placa. La placa se SOSTIENE POR ARRIBA (anchor
    'top'): lo que quede sin unir a la barra se cae, y los trozos salen
    disparados con la velocidad del vaivén.

        θ(t) = A · sin(ω·t + φ)
        punto a distancia d del eje: (x0 + d·sin θ, y0 - d·cos θ)
*/

import * as THREE from 'three';
import Obstacle from '../entities/Obstacle.js';
import GlassPanel from '../entities/GlassPanel.js';
import { rectPolygon } from '../utils/fracture.js';
import {
    TUNNEL_WIDTH, CRYSTAL_THICKNESS,
    PENDULUM_PIVOT_Y, PENDULUM_ROD_LENGTH, PENDULUM_AMPLITUDE, PENDULUM_PERIOD,
} from '../constants.js';

const rand = (min, max) => min + Math.random() * (max - min);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const L = PENDULUM_ROD_LENGTH;

export default class Pendulum extends Obstacle {
    constructor(z, levelIndex) {
        super(z, levelIndex);
        this.pivotX = rand(-0.8, 0.8);
        this.amplitude = rand(...PENDULUM_AMPLITUDE) * (Math.random() < 0.5 ? -1 : 1);
        this.omega = (2 * Math.PI) / rand(...PENDULUM_PERIOD);
        this.phase = Math.random() * 2 * Math.PI;

        const w = rand(2.2, 2.8);
        const h = rand(2.4, 2.8);
        this.plateHalfH = h / 2;

        // Viga fija de la que cuelga (no se mueve: se coloca una vez)
        const beam = this.addBox(TUNNEL_WIDTH, 0.35, 0.35);
        this.placeSolid(beam, 0, PENDULUM_PIVOT_Y + 0.2, z);

        this.rod = this.addBox(0.14, L, 0.14);                              // barra
        this.clamp = this.addBox(w + 0.1, 0.18, CRYSTAL_THICKNESS + 0.12);  // pinza que sujeta la placa
        this.plate = this.addPanel(new GlassPanel(rectPolygon(w / 2, h / 2), levelIndex, { anchor: 'top' }));

        this.q = new THREE.Quaternion();
        this._pose(0);
    }

    // Punto a distancia d del eje con el péndulo en el ángulo theta
    _armPoint(theta, d) {
        return { x: this.pivotX + d * Math.sin(theta), y: PENDULUM_PIVOT_Y - d * Math.cos(theta) };
    }

    _pose(delta) {
        const theta = this.amplitude * Math.sin(this.omega * this.time + this.phase);
        this.q.setFromAxisAngle(Z_AXIS, theta);

        const r = this._armPoint(theta, L / 2);
        this.placeSolid(this.rod, r.x, r.y, this.z, this.q);
        const c = this._armPoint(theta, L);
        this.placeSolid(this.clamp, c.x, c.y, this.z, this.q);
        if (!this.plate.empty) {
            const p = this._armPoint(theta, L + this.plateHalfH);
            this.plate.moveTo(p.x, p.y, this.z, this.q, delta);
        }
    }

    update(delta) {
        super.update(delta);
        this._pose(delta);
    }
}
