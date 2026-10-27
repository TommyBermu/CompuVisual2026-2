/*
    obstacles/PowerUp.js
    --------------------
    El "obstáculo" que lleva un CRISTAL DE PODER (entities/PowerCrystal.js):
    una gema que flota sola en el aire, sube y baja despacio y se balancea un
    poco (sin ponerse nunca de canto, para que siempre se pueda acertar).

    Va en uno de dos sitios, SIEMPRE fuera del tubo de la cámara (no se puede
    chocar con ella, hay que dispararle):

        high  por encima de la cámara, cerca del centro
        side  a un lado, entre el tubo y la pared

    El Spawner decide cuándo sale y en qué punto del recorrido (en un hueco
    entre obstáculos, ver Spawner._maybePower).
*/

import * as THREE from 'three';
import Obstacle from '../entities/Obstacle.js';
import PowerCrystal, { GEM_HALF_W, GEM_HALF_H, HALO_RADIUS } from '../entities/PowerCrystal.js';
import { randomPower } from '../systems/PowerUps.js';
import { HALF_W, TUBE_X, TUBE_Y1, rand, sign, chance, outsideTube } from './shared.js';

const BOB = 0.15;                                 // m que sube y baja
const GEM_R = Math.max(GEM_HALF_W, GEM_HALF_H) + BOB; // lo que puede ocupar desde su centro
const MARGIN = 0.2;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

export default class PowerUp extends Obstacle {
    constructor(frame, levelIndex, type = randomPower()) {
        super(frame, levelIndex);
        this.type = type;

        // Sitio: encima de la cámara o a un lado (el halo tampoco atraviesa la pared)
        let x, y;
        if (chance(0.45)) {
            x = rand(-2.2, 2.2);
            y = rand(TUBE_Y1 + GEM_R + MARGIN, 5.6);
        } else {
            x = sign() * rand(TUBE_X + GEM_R + MARGIN, HALF_W - HALO_RADIUS - 0.1);
            y = rand(1.4, 4.6);
        }
        // Por si alguien cambia las medidas: nunca dentro del tubo
        if (!outsideTube(x - GEM_R, x + GEM_R, y - GEM_R, y + GEM_R)) y = TUBE_Y1 + GEM_R + MARGIN;
        this.x = x;
        this.y = y;
        this.phase = Math.random() * 2 * Math.PI;
        this.q = new THREE.Quaternion();

        this.crystal = this.addPanel(new PowerCrystal(type, levelIndex));
        this._pose(0);
    }

    _pose(delta) {
        if (this.crystal.empty) return;
        const t = this.time + this.phase;
        this.q.setFromAxisAngle(Y_AXIS, 0.35 * Math.sin(t * 1.1));
        this.crystal.moveTo(this.x, this.y + BOB * Math.sin(t * 1.8), 0, this.q, delta);
        this.crystal.animate(t);
    }

    update(delta) {
        super.update(delta);
        this._pose(delta);
    }
}
