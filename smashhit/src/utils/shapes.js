/*
    utils/shapes.js
    ---------------
    Catálogo de CONTORNOS de vidrio (polígonos convexos, antihorarios,
    centrados en su caja de w x h). La rotura (utils/fracture.js) trabaja con
    cualquier polígono convexo, así que todas se rompen igual de bien.

    Todas tienen el lado de abajo "apoyable" (base plana o casi) para salir del
    suelo; para colgar (soporte arriba) se usa flipY().
*/

import { rectPolygon } from './fracture.js';

// n puntos sobre una elipse de semiejes (a, b), desde el ángulo a0
function ellipse(n, a, b, a0 = 0, from = 0, to = Math.PI * 2) {
    const pts = [];
    const closed = to - from >= Math.PI * 2 - 1e-6;
    const count = closed ? n : n + 1;
    for (let i = 0; i < count; i++) {
        const t = from + ((to - from) * i) / (closed ? n : n);
        pts.push([a * Math.cos(t + a0), b * Math.sin(t + a0)]);
    }
    return pts;
}

export const SHAPES = {
    rect: (w, h) => rectPolygon(w / 2, h / 2),
    triangle: (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [0, h / 2]],
    // Trapecio: base ancha, arriba estrecho
    trapezoid: (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w * 0.28, h / 2], [-w * 0.28, h / 2]],
    // Casita: rectángulo con tejado en punta
    house: (w, h) => [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h * 0.12], [0, h / 2], [-w / 2, h * 0.12]],
    // Arco: base recta y arriba media elipse
    arch: (w, h) => {
        const r = h - w / 2 > 0 ? w / 2 : h / 2;
        const top = ellipse(9, w / 2, r, 0, 0, Math.PI).map(([x, y]) => [x, y + h / 2 - r]);
        return [[-w / 2, -h / 2], [w / 2, -h / 2], ...top.filter(([, y]) => y > -h / 2 + 1e-3)];
    },
    // Hexágono (de canto: lado plano abajo)
    hexagon: (w, h) => ellipse(6, w / 2, h / 2, Math.PI / 6 + Math.PI / 2 - Math.PI / 3),
    // Octágono (casi un círculo)
    octagon: (w, h) => ellipse(8, w / 2, h / 2, Math.PI / 8),
    // Rombo
    diamond: (w, h) => [[0, -h / 2], [w / 2, 0], [0, h / 2], [-w / 2, 0]],
    // Pentágono con base plana
    pentagon: (w, h) => [[-w * 0.32, -h / 2], [w * 0.32, -h / 2], [w / 2, h * 0.08], [0, h / 2], [-w / 2, h * 0.08]],
    // Romboide (paralelogramo inclinado)
    parallelogram: (w, h) => [[-w / 2, -h / 2], [w * 0.2, -h / 2], [w / 2, h / 2], [-w * 0.2, h / 2]],
    // Cometa: punta arriba larga
    kite: (w, h) => [[0, -h / 2], [w / 2, h * 0.1], [0, h / 2], [-w / 2, h * 0.1]],
};

// Formas buenas para salir del suelo / colgar de una viga (base o techo plano)
export const STANDING = ['rect', 'trapezoid', 'house', 'arch', 'pentagon', 'hexagon', 'parallelogram', 'octagon'];
// Formas "sueltas" (flotando sobre un pedestal pequeño o en un péndulo)
export const LOOSE = ['hexagon', 'octagon', 'diamond', 'kite', 'pentagon', 'house', 'arch', 'trapezoid'];

export const pickShape = (list = STANDING) => list[Math.floor(Math.random() * list.length)];

export function outline(shape, w, h) {
    return (SHAPES[shape] || SHAPES.rect)(w, h);
}

// Refleja en vertical (para colgar: el lado plano queda arriba). Mantiene el
// sentido antihorario invirtiendo el orden.
export function flipY(poly) {
    return poly.map(([x, y]) => [x, -y]).reverse();
}
