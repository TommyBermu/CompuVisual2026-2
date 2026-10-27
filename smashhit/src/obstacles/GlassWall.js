/*
    obstacles/GlassWall.js
    ----------------------
    Paneles de vidrio MONTADOS en el pasillo (Crystal) que salen de su soporte
    al acercarse la cámara. Dos familias, cada una con muchas formaciones:

    panels() — rectángulos:
        classic   1-2 paneles al azar (el de siempre)
        row       fila de tres paneles estrechos
        wall      muro de vidrio de pared a pared (tres paneles juntos)
        stagger   tres paneles escalonados en profundidad
        onBlocks  bloques de piedra con paneles encima (y uno en el centro)
        hanging   paneles colgando de una viga

    triangles() — triángulos:
        big       uno grande en el suelo
        pair      dos cruzados, uno detrás del otro
        row       fila de tres
        walls     dos triángulos que salen de las paredes hacia el centro
        zigzag    cuatro de pared alternando lado, uno tras otro
        ceiling   triángulos colgando de una viga, con la punta hacia abajo
        onBlocks  bloques laterales con triángulos encima + uno central
        star      suelo, paredes y techo a la vez (hay que abrir hueco)
*/

import Obstacle from '../entities/Obstacle.js';
import Crystal from '../entities/Crystal.js';
import { CRYSTAL_RISE_AHEAD } from '../constants.js';
import { HALF_W, rand, pick, sign, pickVariant } from './shared.js';

export default class GlassWall extends Obstacle {
    // layout: [opciones de Crystal] (shape, mount, width, height, x, y, z...)
    constructor(frame, levelIndex, layout, build = null) {
        super(frame, levelIndex);
        if (build) build(this);   // partes sólidas (bloques, vigas) antes del vidrio
        layout.forEach((o) => this.addPanel(new Crystal(levelIndex, o)));
        this.rising = false;
    }

    update(delta, view) {
        super.update(delta);
        // Empiezan a salir cuando la cámara está a CRYSTAL_RISE_AHEAD metros
        if (!this.rising && this.s - view.s < CRYSTAL_RISE_AHEAD) {
            this.rising = true;
            this.panels.forEach((p) => p.startRising());
        }
        this.panels.forEach((p) => p.update(delta));
    }

    // --- Rectángulos ---------------------------------------------------------
    static panels(frame, levelIndex) {
        const variants = {
            classic: () => [Math.random() < 0.4 ? [{}, {}] : [{}]],
            row: () => {
                const h = rand(2.6, 3.6);
                return [[-3.4, 0, 3.4].map((x) => ({ width: rand(1.6, 2.2), height: h, x }))];
            },
            wall: () => {
                const h = rand(3.2, 4.5);
                const w = (2 * HALF_W) / 3 - 0.05;
                return [[-1, 0, 1].map((k) => ({ width: w, height: h, x: k * (w + 0.05) }))];
            },
            stagger: () => {
                const s0 = sign();
                return [[4, 0, -4].map((z, i) => ({
                    width: rand(2.5, 3.2), height: rand(3, 4), x: [s0 * 1.3, -s0 * 1.3, 0][i], z,
                }))];
            },
            onBlocks: () => {
                const sideH = rand(1, 1.8);
                const midH = rand(0.8, 1.1);
                return [[
                    { mount: 'block', base: sideH, x: -3.8, width: rand(2, 2.8), height: rand(2, 3) },
                    { mount: 'block', base: sideH, x: 3.8, width: rand(2, 2.8), height: rand(2, 3) },
                    { mount: 'block', base: midH, x: 0, width: rand(2.4, 3.2), height: rand(2.4, 3) },
                ], (ob) => {
                    ob.addStaticBox(-HALF_W, -2.6, 0, sideH, 0, 1.4);
                    ob.addStaticBox(2.6, HALF_W, 0, sideH, 0, 1.4);
                    ob.addStaticBox(-1.8, 1.8, 0, midH, 0, 1.2);
                }];
            },
            hanging: () => {
                const top = rand(6, 6.6);
                const xs = pick([[-2.4, 2.4], [-3.4, 0, 3.4], [0]]);
                return [xs.map((x) => ({ mount: 'top', top: top - 0.25, x, width: rand(2, 3), height: top - rand(1.4, 1.9) })),
                    (ob) => ob.addStaticBox(-HALF_W, HALF_W, top - 0.25, top + 0.35, 0, 0.6, { material: ob.metal })];
            },
        };
        const [layout, build] = pickVariant(variants)();
        return new GlassWall(frame, levelIndex, layout, build);
    }

    // --- Triángulos ----------------------------------------------------------
    static triangles(frame, levelIndex) {
        const tri = (o) => ({ shape: 'triangle', ...o });
        const variants = {
            big: () => [[tri({ width: rand(3.8, 5), height: rand(3.8, 4.8), x: rand(-1.5, 1.5) })]],
            // Dos triángulos cruzados, uno detrás del otro (en Z) para no atravesarse
            pair: () => {
                const w = rand(2.8, 3.4);
                const x = rand(0.5, 1.0);
                return [[
                    tri({ width: w, height: rand(3.4, 4.4), x: -x, z: 1.5 }),
                    tri({ width: w, height: rand(3.4, 4.4), x, z: -1.5 }),
                ]];
            },
            row: () => {
                const h = rand(2.6, 3.4);
                return [[-3.4, 0, 3.4].map((x) => tri({ width: rand(2.1, 2.6), height: h, x }))];
            },
            // Salen de las paredes con la punta hacia el centro
            walls: () => {
                const first = pick(['left', 'right']);
                const second = first === 'left' ? 'right' : 'left';
                return [[
                    tri({ mount: first, width: rand(2.6, 3.6), height: rand(4.6, 5.3), y: rand(1.8, 2.8), z: 1.5 }),
                    tri({ mount: second, width: rand(2.6, 3.6), height: rand(4.6, 5.3), y: rand(1.8, 2.8), z: -1.5 }),
                ]];
            },
            zigzag: () => {
                let side = pick(['left', 'right']);
                return [[4.5, 1.5, -1.5, -4.5].map((z) => {
                    const o = tri({ mount: side, width: rand(2.4, 3.2), height: rand(4, 5.2), y: rand(1.6, 3), z });
                    side = side === 'left' ? 'right' : 'left';
                    return o;
                })];
            },
            ceiling: () => {
                const top = rand(6.4, 7);
                const xs = pick([[-2.6, 2.6], [-3.3, 0, 3.3], [rand(-1, 1)]]);
                return [xs.map((x) => tri({ mount: 'top', top: top - 0.25, x, width: rand(2.6, 3.4), height: top - rand(1.4, 1.9) })),
                    (ob) => ob.addStaticBox(-HALF_W, HALF_W, top - 0.25, top + 0.35, 0, 0.6, { material: ob.metal })];
            },
            onBlocks: () => {
                const h = rand(1.2, 2);
                return [[
                    tri({ mount: 'block', base: h, x: -3.9, width: rand(2.2, 2.8), height: rand(2.2, 3.2) }),
                    tri({ mount: 'block', base: h, x: 3.9, width: rand(2.2, 2.8), height: rand(2.2, 3.2) }),
                    tri({ width: rand(3, 4), height: rand(3.6, 4.4), x: 0, z: -2.5 }),
                ], (ob) => {
                    ob.addStaticBox(-HALF_W, -2.5, 0, h, 0, 1.6);
                    ob.addStaticBox(2.5, HALF_W, 0, h, 0, 1.6);
                }];
            },
            star: () => {
                const top = 6.8;
                return [[
                    tri({ width: rand(3, 3.8), height: rand(2.4, 3), x: 0, z: 0 }),
                    tri({ mount: 'left', width: rand(2.4, 3), height: rand(3.6, 4.4), y: rand(2.6, 3.4), z: 0 }),
                    tri({ mount: 'right', width: rand(2.4, 3), height: rand(3.6, 4.4), y: rand(2.6, 3.4), z: 0 }),
                    tri({ mount: 'top', top: top - 0.25, x: 0, width: rand(3, 3.6), height: rand(3.4, 4) }),
                ], (ob) => ob.addStaticBox(-HALF_W, HALF_W, top - 0.25, top + 0.35, 0, 0.6, { material: ob.metal })];
            },
        };
        const [layout, build] = pickVariant(variants)();
        return new GlassWall(frame, levelIndex, layout, build);
    }
}
