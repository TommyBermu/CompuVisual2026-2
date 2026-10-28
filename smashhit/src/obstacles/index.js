/*
    obstacles/index.js
    ------------------
    Catálogo de obstáculos. Cada nivel (levels.js -> `obstacles`) dice qué tipos
    usa; el Spawner elige uno al azar de esa lista en cada tramo y llama a
    createObstacles. Cada tipo tiene a su vez varias VARIANTES (ver cada
    archivo), así nunca sale siempre lo mismo:

        panels     paneles rectangulares (sueltos, en fila, muro, sobre bloques, colgados...)
        triangles  triángulos (suelo, paredes, techo, zigzag, sobre bloques...)
        gates      compuertas (dos hojas, guillotina, deslizante, doble botón, rítmica)
        pendulums  péndulos (laterales, frontales, diagonales, en ola, en pareja...)
        spinners   aspas (molino, gemelos, hélice, torniquete, rodillo)
        floaters   vidrios de formas variadas sobre pedestales flotantes (niveles sin suelo)

    Además está el RELLENO sólido (Props: columnas, bloques, vigas...), que el
    Spawner reparte aparte según `props` del nivel.
*/

import GlassWall from './GlassWall.js';
import Pendulum from './Pendulum.js';
import Spinner from './Spinner.js';
import Gate from './Gate.js';
import Props from './Props.js';

export const OBSTACLE_NAMES = {
    panels: 'Paneles',
    triangles: 'Triángulos',
    gates: 'Compuertas',
    pendulums: 'Péndulos',
    spinners: 'Aspas giratorias',
};

// s: punto del recorrido (centro del tramo). Devuelve un array de obstáculos.
export function createObstacles(type, track, s, levelIndex) {
    const frame = track.frameAt(s);
    switch (type) {
        case 'triangles':
            return [GlassWall.triangles(frame, levelIndex)];
        case 'floaters':
            return [GlassWall.floaters(frame, levelIndex)];
        case 'gates':
            return [new Gate(frame, levelIndex)];
        case 'pendulums':
            return [new Pendulum(frame, levelIndex)];
        case 'spinners':
            return [new Spinner(frame, levelIndex)];
        case 'panels':
        default:
            return [GlassWall.panels(frame, levelIndex)];
    }
}

// Relleno sólido en el punto s
export function createProps(track, s, levelIndex) {
    return new Props(track.frameAt(s), levelIndex);
}
