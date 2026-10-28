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
import { pickShape, LOOSE } from '../utils/shapes.js';

export default class GlassWall extends Obstacle {
    // layout: [opciones de Crystal] (shape, mount, width, height, x, y, z...)
    constructor(frame, levelIndex, layout, build = null) {
        super(frame, levelIndex);
        if (build) build(this);   // partes sólidas (bloques, vigas) antes del vidrio
        layout.forEach((o) => this.addPanel(new Crystal(levelIndex, o)));
        // Paneles de pared o colgados de una viga: sin paredes necesitan pórtico
        this.needsSupport = layout.some((o) => ['left', 'right', 'top'].includes(o.mount));
        this.needsWall = layout.some((o) => ['left', 'right'].includes(o.mount)); // apoyo largo en z
        // Paneles que salen del suelo (o de bloques): sin suelo necesitan una base flotante
        const onFloor = layout.filter((o) => !o.mount || o.mount === 'floor' || o.mount === 'block');
        this.needsBase = onFloor.length > 0 || !!build;
        this.baseDepth = 2.5 + 2 * Math.max(0, ...onFloor.map((o) => Math.abs(o.z ?? 0)));
        this.rising = false;
    }

    // Sin suelo del que salir: los paneles ya aparecen fuera del todo
    skipRise() {
        this.rising = true;
        this.panels.forEach((p) => {
            p.rise = 1;
            if (p.placeInFrame) p.placeInFrame();
        });
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
                return [[-1, 0, 1].map((k) => ({ shape: 'rect', width: w, height: h, x: k * (w + 0.05) }))];
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

    // --- Flotantes (niveles sin suelo) -----------------------------------------
    // Vidrios de formas variadas, cada uno sobre su PEDESTAL pequeño flotando a
    // distintas alturas, sobre todo POR DEBAJO de la vista: llenan la parte de
    // abajo del vacío. Algunos pedestales se quedan vacíos (ahí se posan
    // pirámides de bolas, ver perches).
    static floaters(frame, levelIndex) {
        const layout = [];
        const plinths = [];
        const n = 3 + Math.floor(Math.random() * 3);
        const xs = [-4.2, -2.1, 0, 2.1, 4.2].sort(() => Math.random() - 0.5).slice(0, n);
        xs.forEach((x, i) => {
            const w = rand(1.2, 2.2);
            const z = rand(-4, 4);
            // Bajo la cámara, o (si el vidrio cabe) a la altura de la vista
            const base = Math.abs(x) < 1.6 ? rand(-3.5, -0.3) : rand(-4, 1);
            plinths.push({ x, z, w, base });
            if (i < n - 1 || Math.random() < 0.5) {
                layout.push({ shape: pickShape(LOOSE), mount: 'block', base, x, z, width: w, height: rand(1.4, 2.8) });
            }
        });
        const ob = new GlassWall(frame, levelIndex, layout, (o) => {
            for (const p of plinths) {
                const t = rand(0.5, 1.1);
                o.addStaticBox(p.x - p.w / 2 - 0.25, p.x + p.w / 2 + 0.25, p.base - t, p.base, p.z, 1.1);
                // un trocito más pequeño colgando debajo (como una isla rota)
                o.addStaticBox(p.x - p.w * 0.3, p.x + p.w * 0.25, p.base - t - rand(0.4, 1.2), p.base - t, p.z, 0.8);
            }
        });
        // Los pedestales que quedaron sin vidrio son buenos sitios para una pirámide
        const used = new Set(layout.map((o) => o.x));
        ob.perches.push(...plinths.filter((p) => !used.has(p.x)).map((p) => ({ x: p.x, y: p.base, z: p.z })));
        ob.needsBase = false; // cada uno trae su pedestal
        return ob;
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
