/*
    obstacles/GlassWall.js
    ----------------------
    Paneles de vidrio que SALEN DEL SUELO (Crystal) al acercarse la cámara.
    Dos variantes:
        - panels():    1-2 rectángulos de tamaño y posición aleatorios (el clásico).
        - triangles(): pirámides planas en distintas formaciones (una grande,
                       una pareja o una fila de tres).
*/

import Obstacle from '../entities/Obstacle.js';
import Crystal from '../entities/Crystal.js';
import { CRYSTAL_RISE_AHEAD } from '../constants.js';

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export default class GlassWall extends Obstacle {
    // layout: [{ shape, width, height, x, dz }] (lo que falte se elige al azar;
    // dz desplaza ese panel en Z respecto al centro del obstáculo)
    constructor(z, levelIndex, layout) {
        super(z, levelIndex);
        layout.forEach((o) => this.addPanel(new Crystal(z + (o.dz || 0), levelIndex, o)));
        this.rising = false;
    }

    update(delta, cameraZ) {
        super.update(delta);
        // Empiezan a subir cuando la cámara está a CRYSTAL_RISE_AHEAD metros
        if (!this.rising && this.z > cameraZ - CRYSTAL_RISE_AHEAD) {
            this.rising = true;
            this.panels.forEach((p) => p.startRising());
        }
        this.panels.forEach((p) => p.update(delta));
    }

    // 1 o 2 paneles rectangulares al azar
    static panels(z, levelIndex) {
        const layout = Math.random() < 0.4 ? [{}, {}] : [{}];
        return new GlassWall(z, levelIndex, layout);
    }

    // Formaciones de triángulos
    static triangles(z, levelIndex) {
        const tri = (o) => ({ shape: 'triangle', ...o });
        const formations = {
            big: () => [tri({ width: rand(3.8, 5), height: rand(3.8, 4.8), x: rand(-1.5, 1.5) })],
            // Dos triángulos cruzados, uno detrás del otro (en Z) para no atravesarse
            pair: () => {
                const w = rand(2.8, 3.4);
                const x = rand(0.5, 1.0);
                return [
                    tri({ width: w, height: rand(3.4, 4.4), x: -x, dz: 1.5 }),
                    tri({ width: w, height: rand(3.4, 4.4), x, dz: -1.5 }),
                ];
            },
            row: () => {
                const h = rand(2.6, 3.4);
                return [-3.4, 0, 3.4].map((x) => tri({ width: rand(2.1, 2.6), height: h, x }));
            },
        };
        const name = pick(Object.keys(formations));
        return new GlassWall(z, levelIndex, formations[name]());
    }
}
