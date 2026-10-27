/*
    obstacles/index.js
    ------------------
    Catálogo de obstáculos. Cada nivel (levels.js -> `obstacles`) dice qué tipos
    usa; el Spawner elige uno al azar de esa lista en cada tramo y llama a
    createObstacles, que devuelve uno o varios obstáculos para ese tramo.

        panels     paneles rectangulares que salen del suelo (el clásico)
        triangles  formaciones de triángulos de vidrio
        gates      compuertas que se abren rompiendo su botón
        pendulums  placas de vidrio colgando que oscilan
        spinners   aspas de vidrio que giran
*/

import GlassWall from './GlassWall.js';
import Pendulum from './Pendulum.js';
import Spinner from './Spinner.js';
import Gate from './Gate.js';

export const OBSTACLE_NAMES = {
    panels: 'Paneles',
    triangles: 'Triángulos',
    gates: 'Compuertas',
    pendulums: 'Péndulos',
    spinners: 'Aspas giratorias',
};

// z: centro del tramo. Devuelve un array de obstáculos.
export function createObstacles(type, z, levelIndex) {
    switch (type) {
        case 'triangles':
            return [GlassWall.triangles(z, levelIndex)];
        case 'gates':
            return [new Gate(z, levelIndex)];
        case 'pendulums':
            // a veces dos seguidos, desacompasados
            return Math.random() < 0.4
                ? [new Pendulum(z + 4, levelIndex), new Pendulum(z - 4, levelIndex)]
                : [new Pendulum(z, levelIndex)];
        case 'spinners':
            return [new Spinner(z, levelIndex)];
        case 'panels':
        default:
            return [GlassWall.panels(z, levelIndex)];
    }
}
