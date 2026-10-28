/*
    obstacles/Props.js
    ------------------
    RELLENO del pasillo: estructuras SÓLIDAS que no se rompen (piedra y metal),
    para que el recorrido no sea solo vidrio. Las bolas rebotan en ellas, así
    que también sirven para hacer carambolas. Variantes:

        pillars     columnas a los lados
        sideBlocks  bloques apilados contra las paredes
        lowWall     murete bajo de pared a pared (la cámara pasa por encima)
        beams       vigas atravesadas por arriba
        fins        aletas: tabiques que salen de las paredes
        doorway     marco de puerta que estrecha el paso
        steps       escalones subiendo por las paredes
        cubes       cubos flotando girados, fuera del camino

    TODO queda fuera del tubo de la cámara (shared.outsideTube): son decorado
    con física, nunca un choque inevitable. Ocupan poco a lo largo del pasillo
    (|z| <= ~2.5) para no pisarse con el obstáculo de vidrio del tramo.
*/

import * as THREE from 'three';
import Obstacle from '../entities/Obstacle.js';
import {
    HALF_W, WALL_H, TUBE_X, TUBE_Y0, TUBE_Y1,
    rand, randInt, pick, sign, chance, outsideTube, pickVariant,
} from './shared.js';

const tmpE = new THREE.Euler();

export default class Props extends Obstacle {
    constructor(frame, levelIndex) {
        super(frame, levelIndex);
        const variants = {
            pillars: () => {
                const n = randInt(1, 2);
                for (let i = 0; i < n; i++) {
                    for (const s of chance(0.6) ? [-1, 1] : [sign()]) {
                        const size = rand(0.8, 1.3);
                        const x = s * rand(TUBE_X + size / 2 + 0.6, HALF_W - size / 2 - 0.3);
                        this.box(x - size / 2, x + size / 2, 0, WALL_H, (i - (n - 1) / 2) * 3.5, size);
                    }
                }
            },
            sideBlocks: () => {
                for (const s of chance(0.5) ? [-1, 1] : [sign()]) {
                    let y = 0;
                    const levels = randInt(1, 3);
                    for (let k = 0; k < levels; k++) {
                        const w = rand(1.2, 2.8) - k * 0.3;
                        const h = rand(0.8, 1.6);
                        const inner = HALF_W - w;
                        this.box(s > 0 ? inner : -HALF_W, s > 0 ? HALF_W : -inner, y, y + h, rand(-1, 1), rand(1.2, 2.2));
                        y += h;
                    }
                }
            },
            lowWall: () => {
                const h = rand(0.5, TUBE_Y0 - 0.2);
                this.box(-HALF_W, HALF_W, 0, h, 0, rand(0.5, 1.1));
                if (chance(0.5)) this.box(-HALF_W, HALF_W, 0, h * 0.6, rand(1.8, 2.4), rand(0.5, 0.8)); // escalón previo
            },
            beams: () => {
                this.needsSupport = true; // vigas de pared a pared
                const n = randInt(1, 3);
                for (let i = 0; i < n; i++) {
                    const y = rand(TUBE_Y1 + 0.3, 6.5);
                    const t = rand(0.4, 0.9);
                    this.box(-HALF_W, HALF_W, y, y + t, (i - (n - 1) / 2) * 2, t, { material: chance(0.5) ? this.metal : this.stone });
                }
            },
            fins: () => {
                const n = randInt(1, 3);
                let s = sign();
                for (let i = 0; i < n; i++) {
                    const reach = rand(TUBE_X + 0.2, 3.2);             // hasta dónde llega desde el centro
                    this.box(s > 0 ? reach : -HALF_W, s > 0 ? HALF_W : -reach, 0, WALL_H, (i - (n - 1) / 2) * 2.2, 0.4);
                    s = -s;
                }
            },
            doorway: () => {
                const open = rand(TUBE_X + 0.3, 2.6);                   // media anchura del hueco
                const top = rand(TUBE_Y1 + 0.4, 4.6);
                const d = rand(0.8, 1.6);
                this.box(-HALF_W, -open, 0, WALL_H, 0, d);
                this.box(open, HALF_W, 0, WALL_H, 0, d);
                this.box(-open, open, top, WALL_H, 0, d, { material: this.metal });
            },
            steps: () => {
                for (const s of [-1, 1]) {
                    for (let k = 0; k < 4; k++) {
                        const h = 0.6 + k * 0.6;
                        const w = rand(1.2, 1.8);
                        const z = 2.4 - k * 1.6;
                        this.box(s > 0 ? HALF_W - w : -HALF_W, s > 0 ? HALF_W : -HALF_W + w, 0, h, z, 1.6);
                    }
                }
            },
            cubes: () => {
                const n = randInt(2, 5);
                for (let i = 0; i < n; i++) {
                    const size = rand(0.6, 1.4);
                    const r = size * 0.87; // radio de la esfera que lo envuelve (girado)
                    let x, y;
                    for (let tries = 0; tries < 20; tries++) {
                        x = rand(-HALF_W + r, HALF_W - r);
                        y = rand(r, 6.5);
                        if (outsideTube(x - r, x + r, y - r, y + r)) break;
                        x = null;
                    }
                    if (x === null) continue;
                    const cube = this.addBox(size, size, size, { material: pick([this.stone, this.metal]) });
                    const q = new THREE.Quaternion().setFromEuler(tmpE.set(rand(0, 3), rand(0, 3), rand(0, 3)));
                    this.placeSolid(cube, x, y, rand(-2.5, 2.5), q);
                }
            },
        };
        pickVariant(variants)();
    }

    // Caja por límites locales. Comprueba que no invada el tubo de la cámara.
    box(minX, maxX, minY, maxY, z, depth, options = {}) {
        if (!outsideTube(minX, maxX, minY, maxY)) return null;
        return this.addStaticBox(minX, maxX, minY, maxY, z, depth, options);
    }
}
