/*
    obstacles/Pendulum.js
    ---------------------
    PÉNDULOS: placas de vidrio colgadas de barras metálicas que oscilan. Solo
    tapan el camino en parte del vaivén: o se rompen de un disparo o se
    cronometra el paso. Cada "brazo" gira alrededor de un EJE (en coords
    locales) que pasa por su pivote, así salen en muchas direcciones:

        lateral       de lado a lado (eje Z)
        frontal       hacia la cámara y hacia atrás (eje X)
        diagonal      en diagonal (eje entre X y Z)
        wave          tres laterales seguidos, desfasados (una "ola")
        pair          dos laterales lado a lado, a contratiempo
        frontalPair   dos frontales lado a lado, a contratiempo

    Los pivotes están en vigas de pared a pared muy por encima de la cámara:
    las barras nunca la tocan, solo las placas. La placa se SOSTIENE POR ARRIBA
    (anchor 'top'): lo que quede sin unir a la barra se cae, y los trozos salen
    con la velocidad del vaivén.

        θ(t) = A · sin(ω·t + φ)
        un punto del brazo a distancia d: pivote + giro(eje, θ) · (0, -d, 0)
*/

import * as THREE from 'three';
import Obstacle from '../entities/Obstacle.js';
import GlassPanel from '../entities/GlassPanel.js';
import { rectPolygon } from '../utils/fracture.js';
import {
    CRYSTAL_THICKNESS,
    PENDULUM_PIVOT_Y, PENDULUM_ROD_LENGTH, PENDULUM_AMPLITUDE, PENDULUM_PERIOD,
} from '../constants.js';
import { HALF_W, rand, sign, pickVariant } from './shared.js';

const L = PENDULUM_ROD_LENGTH;
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const tmp = new THREE.Vector3();

export default class Pendulum extends Obstacle {
    constructor(frame, levelIndex) {
        super(frame, levelIndex);
        const omega = (2 * Math.PI) / rand(...PENDULUM_PERIOD);
        const amp = () => rand(...PENDULUM_AMPLITUDE) * sign();
        const phase = Math.random() * 2 * Math.PI;

        const variants = {
            lateral: () => [{ x: rand(-0.8, 0.8), axis: Z_AXIS, amp: amp() }],
            frontal: () => [{ x: rand(-0.6, 0.6), axis: X_AXIS, amp: amp(), w: rand(2.6, 3.2) }],
            diagonal: () => [{ x: rand(-0.6, 0.6), axis: new THREE.Vector3(sign(), 0, 1).normalize(), amp: amp() }],
            wave: () => [4, 0, -4].map((z, i) => ({
                x: 0, z, axis: Z_AXIS, amp: PENDULUM_AMPLITUDE[1], phase: phase + i * 0.9, w: rand(2, 2.4),
            })),
            pair: () => [-2.2, 2.2].map((x, i) => ({
                x, axis: Z_AXIS, amp: 0.45, phase: phase + i * Math.PI, w: rand(1.8, 2.2),
            })),
            frontalPair: () => [-1.4, 1.4].map((x, i) => ({
                x, axis: X_AXIS, amp: 0.65, phase: phase + i * Math.PI, w: 2.4,
            })),
        };

        // Brazos con sus valores por defecto
        this.arms = pickVariant(variants)().map((a) => {
            const w = a.w ?? rand(2.2, 2.8);
            const h = rand(2.4, 2.8);
            return {
                pivot: new THREE.Vector3(a.x, PENDULUM_PIVOT_Y, a.z ?? 0),
                axis: a.axis,
                amp: a.amp,
                omega,
                phase: a.phase ?? phase,
                halfH: h / 2,
                rod: this.addBox(0.14, L, 0.14),
                clamp: this.addBox(w + 0.1, 0.18, CRYSTAL_THICKNESS + 0.12),
                plate: this.addPanel(new GlassPanel(rectPolygon(w / 2, h / 2), levelIndex, { anchor: 'top' })),
                q: new THREE.Quaternion(),
            };
        });

        // Una viga de pared a pared por cada profundidad de pivote
        for (const z of new Set(this.arms.map((a) => a.pivot.z))) {
            const beam = this.addBox(HALF_W * 2, 0.35, 0.35);
            this.placeSolid(beam, 0, PENDULUM_PIVOT_Y + 0.2, z);
        }

        this._pose(0);
    }

    // Punto del brazo a distancia d del pivote (en local)
    _armPoint(arm, d) {
        return tmp.set(0, -d, 0).applyQuaternion(arm.q).add(arm.pivot);
    }

    _pose(delta) {
        for (const arm of this.arms) {
            const theta = arm.amp * Math.sin(arm.omega * this.time + arm.phase);
            arm.q.setFromAxisAngle(arm.axis, theta);

            let p = this._armPoint(arm, L / 2);
            this.placeSolid(arm.rod, p.x, p.y, p.z, arm.q);
            p = this._armPoint(arm, L);
            this.placeSolid(arm.clamp, p.x, p.y, p.z, arm.q);
            if (!arm.plate.empty) {
                p = this._armPoint(arm, L + arm.halfH);
                arm.plate.moveTo(p.x, p.y, p.z, arm.q, delta);
            }
        }
    }

    update(delta) {
        super.update(delta);
        this._pose(delta);
    }
}
