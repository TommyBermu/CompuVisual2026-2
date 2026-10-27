/*
    obstacles/Spinner.js
    --------------------
    ASPAS GIRATORIAS: hojas de vidrio alrededor de un eje metálico que gira.
    Hay que romper la hoja que viene o pasar por el hueco entre dos. Variantes
    según el EJE de giro (en coords locales):

        windmill   molino: eje Z (en el plano del pasillo), 2-4 hojas
        twin       dos molinos pequeños lado a lado, girando al revés
        propeller  hélice larga de 2 hojas, descentrada y lenta
        turnstile  torniquete: eje VERTICAL a un lado, hojas como puertas giratorias
        roller     rodillo: eje HORIZONTAL de pared a pared, las hojas bajan
                   hacia la cámara como las paletas de un molino de agua

    Cada hoja es un GlassPanel que se sostiene por su extremo INTERIOR (el
    pegado al eje): lo que se separa sale despedido girando. Los ejes siempre
    quedan fuera del tubo de la cámara (solo las hojas la tocan).
*/

import * as THREE from 'three';
import Obstacle from '../entities/Obstacle.js';
import GlassPanel from '../entities/GlassPanel.js';
import { rectPolygon } from '../utils/fracture.js';
import { SPINNER_HUB_Y, SPINNER_SPEED } from '../constants.js';
import { HALF_W, rand, pick, sign, pickVariant } from './shared.js';

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const HUB_RADIUS = 0.42;
const HUB_DEPTH = 0.6;
const tmp = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();

export default class Spinner extends Obstacle {
    constructor(frame, levelIndex) {
        super(frame, levelIndex);
        this.rotors = [];

        const variants = {
            windmill: () => this._windmill(rand(-1.2, 1.2), rand(...SPINNER_HUB_Y), pick([2, 3, 4])),
            twin: () => {
                const speed = rand(...SPINNER_SPEED);
                this._windmill(-1.9, 4.2, pick([2, 3]), speed);
                this._windmill(1.9, 4.2, pick([2, 3]), -speed);
            },
            propeller: () => this._windmill(rand(-1, 1), rand(4.6, 5), 2, rand(0.8, 1.1) * sign(), 1.6),
            turnstile: () => this._turnstile(),
            roller: () => this._roller(),
        };
        pickVariant(variants)();
        this._pose(0);
    }

    // Rotor genérico: eje (local), centro, velocidad, hojas con su vector "hacia fuera"
    // en reposo (radial) y la orientación base de la hoja.
    _addRotor(rotor) {
        rotor.angle0 = Math.random() * 2 * Math.PI;
        rotor.q = new THREE.Quaternion();
        this.rotors.push(rotor);
        return rotor;
    }

    // Hojas de largo `len` desde el radio r0, en `n` ángulos iguales
    _blades(levelIndex, n, width, len, anchor) {
        const blades = [];
        for (let k = 0; k < n; k++) {
            const outline = anchor === 'left' ? rectPolygon(len / 2, width / 2) : rectPolygon(width / 2, len / 2);
            const panel = this.addPanel(new GlassPanel(outline, this.levelIndex, { anchor }));
            blades.push({ panel, offset: (k * 2 * Math.PI) / n });
        }
        return blades;
    }

    // Molino: eje Z por encima de la cámara, hojas radiales en el plano del pasillo
    _windmill(hubX, hubY, n, speed = rand(...SPINNER_SPEED) * sign(), widthScale = 1) {
        const r0 = HUB_RADIUS + 0.05;
        const r1 = Math.min(hubY - 0.35, HALF_W - Math.abs(hubX) - 0.5); // sin tocar suelo ni paredes
        const len = r1 - r0;
        const width = (n === 4 ? rand(0.9, 1.1) : rand(1.1, 1.4)) * widthScale;

        // Viga fija detrás, a la altura del eje (por encima de la cámara); una sola si hay dos molinos
        if (!this.beam) {
            this.beam = this.addBox(HALF_W * 2, 0.3, 0.3);
            this.placeSolid(this.beam, 0, hubY, -HUB_DEPTH / 2 - 0.15);
        }
        const hub = this.addCylinder(HUB_RADIUS, HUB_DEPTH);

        this._addRotor({
            axis: Z_AXIS,
            center: new THREE.Vector3(hubX, hubY, 0),
            speed,
            radial: new THREE.Vector3(0, 1, 0),         // la hoja apunta a +Y local en reposo
            bladeCenter: r0 + len / 2,
            blades: this._blades(this.levelIndex, n, width, len, 'bottom'),
            hub,
            hubTilt: new THREE.Quaternion().setFromAxisAngle(X_AXIS, Math.PI / 2), // cilindro a lo largo de Z
        });
    }

    // Torniquete: poste vertical a un lado, hojas verticales que barren el centro
    _turnstile() {
        const side = sign();
        const axisX = side * 1.9;
        const r0 = 0.25;
        const len = 2.9;
        const h = rand(3.6, 4.2);
        const n = pick([3, 4]);

        const pole = this.addCylinder(0.2, 6.5);
        this.placeSolid(pole, axisX, 3.25, 0);
        const cap = this.addBox(0.8, 0.3, 0.8);
        this.placeSolid(cap, axisX, 6.6, 0);

        this._addRotor({
            axis: Y_AXIS,
            center: new THREE.Vector3(axisX, 0.3 + h / 2, 0),
            speed: rand(1.1, 1.6) * sign(),
            radial: new THREE.Vector3(1, 0, 0),         // la hoja apunta a +X local en reposo
            bladeCenter: r0 + len / 2,
            blades: this._blades(this.levelIndex, n, h, len, 'left'),
        });
    }

    // Rodillo: eje X de pared a pared, hojas anchas que bajan hacia la cámara
    _roller() {
        const hubY = rand(4.5, 4.9);
        const r0 = 0.3;
        const len = hubY - 0.35 - r0;
        const n = pick([2, 3]);
        const width = rand(3, 4.4);

        const bar = this.addCylinder(0.22, HALF_W * 2);
        this.placeSolid(bar, 0, hubY, 0, new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.PI / 2));

        this._addRotor({
            axis: X_AXIS,
            center: new THREE.Vector3(rand(-1, 1), hubY, 0),
            speed: rand(0.9, 1.4) * sign(),
            radial: new THREE.Vector3(0, 1, 0),
            bladeCenter: r0 + len / 2,
            blades: this._blades(this.levelIndex, n, width, len, 'bottom'),
        });
    }

    _pose(delta) {
        for (const r of this.rotors) {
            const a0 = r.angle0 + r.speed * this.time;
            if (r.hub) {
                r.q.setFromAxisAngle(r.axis, a0).multiply(r.hubTilt);
                this.placeSolid(r.hub, r.center.x, r.center.y, r.center.z, r.q);
            }
            for (const { panel, offset } of r.blades) {
                if (panel.empty) continue;
                tmpQ.setFromAxisAngle(r.axis, a0 + offset);
                const p = tmp.copy(r.radial).multiplyScalar(r.bladeCenter).applyQuaternion(tmpQ).add(r.center);
                panel.moveTo(p.x, p.y, p.z, tmpQ, delta);
            }
        }
    }

    update(delta) {
        super.update(delta);
        this._pose(delta);
    }
}
