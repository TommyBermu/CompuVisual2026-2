/*
    utils/fracture.js
    -----------------
    Geometría 2D PURA (sin Three ni Cannon) para romper paneles de vidrio.

    Un panel se representa como una lista de POLÍGONOS CONVEXOS en el plano XY
    del panel (coordenadas locales, origen en el centro del panel). Al principio
    es un solo rectángulo; cada impacto lo va subdividiendo.

    Cómo se rompe (parecido a Smash Hit):
        1. Semillas RADIALES alrededor del impacto: anillos densos cerca del
           punto y cada vez más espaciados -> trozos pequeños en el centro y
           grandes lejos (como las grietas en "telaraña" de un vidrio real).
        2. Diagrama de Voronoi de esas semillas, recortado contra cada trozo
           cercano (recorte por semiplanos, Sutherland–Hodgman). Como los
           trozos son convexos, las celdas también lo son (lo que necesita Cannon).
        3. Se DESPRENDEN las celdas cercanas al impacto (radio R): el agujero.
        4. CONECTIVIDAD: los trozos que siguen en su sitio pero ya no están
           unidos (por aristas compartidas) al borde inferior del panel -que es
           el que lo sostiene, sale del suelo- se caen como un bloque.

    Todos los polígonos son arrays de puntos [x, y] en sentido antihorario (CCW).
*/

const EPS = 1e-9;

// --- Utilidades básicas de polígonos -----------------------------------------

// Área con signo (> 0 si es antihorario)
export function signedArea(poly) {
    let a = 0;
    for (let i = 0, n = poly.length; i < n; i++) {
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % n];
        a += x1 * y2 - x2 * y1;
    }
    return a / 2;
}

export function polygonArea(poly) {
    return Math.abs(signedArea(poly));
}

export function polygonCentroid(poly) {
    let cx = 0, cy = 0, a = 0;
    for (let i = 0, n = poly.length; i < n; i++) {
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % n];
        const f = x1 * y2 - x2 * y1;
        cx += (x1 + x2) * f;
        cy += (y1 + y2) * f;
        a += f;
    }
    if (Math.abs(a) < EPS) {
        // Degenerado: media de los vértices
        const m = poly.reduce((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
        return [m[0] / poly.length, m[1] / poly.length];
    }
    return [cx / (3 * a), cy / (3 * a)];
}

export function bbox(poly) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of poly) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return { minX, minY, maxX, maxY };
}

export function rectPolygon(halfW, halfH) {
    return [[-halfW, -halfH], [halfW, -halfH], [halfW, halfH], [-halfW, halfH]];
}

// Quita vértices repetidos y colineales (Cannon no tolera caras degeneradas).
export function cleanPolygon(poly, minEdge = 1e-4) {
    let pts = [];
    for (const p of poly) {
        const last = pts[pts.length - 1];
        if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > minEdge) pts.push(p);
    }
    if (pts.length > 1) {
        const a = pts[0], b = pts[pts.length - 1];
        if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= minEdge) pts.pop();
    }
    // colineales
    let changed = true;
    while (changed && pts.length >= 3) {
        changed = false;
        for (let i = 0; i < pts.length; i++) {
            const p = pts[(i - 1 + pts.length) % pts.length];
            const c = pts[i];
            const q = pts[(i + 1) % pts.length];
            const cross = (c[0] - p[0]) * (q[1] - p[1]) - (c[1] - p[1]) * (q[0] - p[0]);
            if (Math.abs(cross) < 1e-8) {
                pts.splice(i, 1);
                changed = true;
                break;
            }
        }
    }
    return pts;
}

// Recorta un polígono convexo quedándose con los puntos donde nx*x + ny*y <= c
export function clipHalfPlane(poly, nx, ny, c) {
    const out = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
        const cur = poly[i];
        const prev = poly[(i - 1 + n) % n];
        const dc = nx * cur[0] + ny * cur[1] - c;
        const dp = nx * prev[0] + ny * prev[1] - c;
        if (dc <= 0) {
            if (dp > 0) out.push(lerpPoint(prev, cur, dp / (dp - dc)));
            out.push(cur);
        } else if (dp <= 0) {
            out.push(lerpPoint(prev, cur, dp / (dp - dc)));
        }
    }
    return out;
}

function lerpPoint(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

// ¿Punto dentro de un polígono convexo CCW?
export function pointInConvex(poly, x, y) {
    for (let i = 0, n = poly.length; i < n; i++) {
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % n];
        if ((x2 - x1) * (y - y1) - (y2 - y1) * (x - x1) < -1e-12) return false;
    }
    return true;
}

// Punto del polígono (relleno) más cercano a (x, y). dist = 0 si está dentro.
export function closestPointOnPolygon(poly, x, y) {
    if (pointInConvex(poly, x, y)) return { x, y, dist: 0 };
    let best = { x: poly[0][0], y: poly[0][1], dist: Infinity };
    for (let i = 0, n = poly.length; i < n; i++) {
        const [x1, y1] = poly[i];
        const [x2, y2] = poly[(i + 1) % n];
        const dx = x2 - x1, dy = y2 - y1;
        const len2 = dx * dx + dy * dy;
        let t = len2 > EPS ? ((x - x1) * dx + (y - y1) * dy) / len2 : 0;
        t = Math.max(0, Math.min(1, t));
        const px = x1 + dx * t, py = y1 + dy * t;
        const d = Math.hypot(x - px, y - py);
        if (d < best.dist) best = { x: px, y: py, dist: d };
    }
    return best;
}

// Longitud de borde que comparten dos polígonos (aristas colineales que se solapan).
// > 0 => son vecinos "pegados" (un vértice suelto no cuenta).
export function sharedEdgeLength(a, b, eps = 1e-3) {
    let total = 0;
    for (let i = 0; i < a.length; i++) {
        const p = a[i], q = a[(i + 1) % a.length];
        const dx = q[0] - p[0], dy = q[1] - p[1];
        const L = Math.hypot(dx, dy);
        if (L < EPS) continue;
        const ux = dx / L, uy = dy / L;
        for (let j = 0; j < b.length; j++) {
            const r = b[j], s = b[(j + 1) % b.length];
            // distancia de r y s a la recta pq
            const dr = Math.abs((r[0] - p[0]) * uy - (r[1] - p[1]) * ux);
            const ds = Math.abs((s[0] - p[0]) * uy - (s[1] - p[1]) * ux);
            if (dr > eps || ds > eps) continue;
            const tr = (r[0] - p[0]) * ux + (r[1] - p[1]) * uy;
            const ts = (s[0] - p[0]) * ux + (s[1] - p[1]) * uy;
            const overlap = Math.min(Math.max(tr, ts), L) - Math.max(Math.min(tr, ts), 0);
            if (overlap > 0) total += overlap;
        }
    }
    return total;
}

// --- Voronoi -----------------------------------------------------------------

// Celdas de Voronoi de `seeds` recortadas al polígono convexo `poly`.
// Devuelve solo celdas no vacías (y ya limpias).
export function voronoiCells(poly, seeds, minArea = 0) {
    const cells = [];
    for (let i = 0; i < seeds.length; i++) {
        const [sx, sy] = seeds[i];
        let cell = poly;
        for (let j = 0; j < seeds.length && cell.length >= 3; j++) {
            if (j === i) continue;
            const [tx, ty] = seeds[j];
            const nx = tx - sx, ny = ty - sy;
            if (nx * nx + ny * ny < 1e-12) continue; // semillas repetidas
            const c = (tx * tx + ty * ty - sx * sx - sy * sy) / 2;
            cell = clipHalfPlane(cell, nx, ny, c);
        }
        if (cell.length < 3) continue;
        cell = cleanPolygon(cell);
        if (cell.length >= 3 && polygonArea(cell) > minArea) cells.push(cell);
    }
    return cells;
}

// Semillas en "telaraña" alrededor de (x, y): anillos cada vez más separados.
const RINGS = [
    // [radio en múltiplos de R, nº de semillas]
    [0.45, 5],
    [0.95, 7],
    [1.6, 8],
    [2.6, 7],
    [4.2, 6],
];

export function radialSeeds(x, y, R, rand = Math.random) {
    // semilla central un poco desplazada (que el agujero no sea perfecto)
    const seeds = [[x + (rand() - 0.5) * R * 0.2, y + (rand() - 0.5) * R * 0.2]];
    for (const [k, count] of RINGS) {
        const step = (Math.PI * 2) / count;
        const offset = rand() * step;
        for (let i = 0; i < count; i++) {
            const ang = offset + i * step + (rand() - 0.5) * step * 0.6;
            const r = k * R * (0.85 + rand() * 0.3);
            seeds.push([x + Math.cos(ang) * r, y + Math.sin(ang) * r]);
        }
    }
    return seeds;
}

// Semillas aleatorias dentro de la caja de un polígono (romper un trozo entero).
function randomSeeds(poly, count, rand) {
    const b = bbox(poly);
    const seeds = [];
    let tries = 0;
    while (seeds.length < count && tries++ < count * 20) {
        const x = b.minX + rand() * (b.maxX - b.minX);
        const y = b.minY + rand() * (b.maxY - b.minY);
        if (pointInConvex(poly, x, y)) seeds.push([x, y]);
    }
    return seeds;
}

// --- Romper un panel ---------------------------------------------------------

/*
    fracturePanel(polys, impact, R, options)
        polys:  trozos actuales del panel (polígonos convexos, coords del panel)
        impact: { x, y } punto de impacto en coords del panel
        R:      radio de rotura (el "agujero")
        options:
            bottomY:     y del borde que sostiene el panel (el de abajo)
            anchor:      alternativa a bottomY: función (bbox de un trozo) ->
                         true si ese trozo está pegado al soporte (p.ej. el
                         borde de ARRIBA en un péndulo)
            holeRadius:  todo lo que esté a menos de esto del impacto se rompe
                         sí o sí (al menos el tamaño de la bola)
            minArea:     celdas más pequeñas se descartan (astillas)
            rand:        generador aleatorio (para tests deterministas)

    Devuelve { staticItems, detached, falling }:
        - Cada item es { poly, src } donde src = índice del trozo original si
          quedó intacto (para reutilizar su mesh) o -1 si es una celda nueva.
        - staticItems: siguen en el panel.
        - detached:    salen volando (el agujero).
        - falling:     array de COMPONENTES (arrays de items) sin apoyo -> caen.
*/
export function fracturePanel(polys, impact, R, options = {}) {
    const {
        bottomY = -Infinity,
        anchor = null,
        holeRadius = 0,
        minArea = 0.003,
        rand = Math.random,
        crackChance = 0.35,  // probabilidad de que se suelte una celda del anillo R..1.5R
    } = options;

    // 1. Subdividir los trozos que toca la zona de rotura
    const seeds = radialSeeds(impact.x, impact.y, R, rand);
    const reach = R * 1.5;
    const items = [];
    polys.forEach((poly, i) => {
        const near = closestPointOnPolygon(poly, impact.x, impact.y).dist < reach;
        if (near && polygonArea(poly) > minArea * 4) {
            for (const cell of voronoiCells(poly, seeds, minArea)) items.push({ poly: cell, src: -1 });
        } else {
            items.push({ poly, src: i });
        }
    });

    // 2. ¿Qué celdas se sueltan?
    const staticItems = [];
    const detached = [];
    for (const it of items) {
        const [cx, cy] = polygonCentroid(it.poly);
        const dCentroid = Math.hypot(cx - impact.x, cy - impact.y);
        const dPoly = closestPointOnPolygon(it.poly, impact.x, impact.y).dist;
        const breaks =
            dPoly <= holeRadius ||                         // bajo la bola: siempre
            dCentroid < R ||                               // dentro del agujero
            (dCentroid < reach && rand() < crackChance);   // grietas irregulares
        (breaks ? detached : staticItems).push(it);
    }

    // 3. Conectividad: lo que no esté unido al soporte se cae
    const { anchored, components } = splitByAnchor(staticItems, anchor || bottomY);
    return { staticItems: anchored, detached, falling: components };
}

// Separa los items en: unidos (directa o indirectamente) al soporte, y
// componentes sueltas. `anchor` es la y del borde inferior que sostiene o una
// función (bbox) -> boolean.
export function splitByAnchor(items, anchor, eps = 1e-3) {
    const touchesSupport = typeof anchor === 'function' ? anchor : (box) => box.minY <= anchor + eps;
    const n = items.length;
    const boxes = items.map((it) => bbox(it.poly));
    const adj = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const a = boxes[i], b = boxes[j];
            // descarte rápido por cajas
            if (a.minX > b.maxX + eps || b.minX > a.maxX + eps ||
                a.minY > b.maxY + eps || b.minY > a.maxY + eps) continue;
            if (sharedEdgeLength(items[i].poly, items[j].poly) > 0.01) {
                adj[i].push(j);
                adj[j].push(i);
            }
        }
    }

    const comp = new Array(n).fill(-1);
    const groups = [];
    for (let i = 0; i < n; i++) {
        if (comp[i] !== -1) continue;
        const stack = [i];
        const members = [];
        comp[i] = groups.length;
        while (stack.length) {
            const k = stack.pop();
            members.push(k);
            for (const m of adj[k]) {
                if (comp[m] === -1) { comp[m] = groups.length; stack.push(m); }
            }
        }
        groups.push(members);
    }

    const anchored = [];
    const components = [];
    for (const members of groups) {
        const isAnchored = members.some((k) => touchesSupport(boxes[k]));
        if (isAnchored) members.forEach((k) => anchored.push(items[k]));
        else components.push(members.map((k) => items[k]));
    }
    return { anchored, components };
}

// Romper un trozo ENTERO en astillas (cuando una bola o la cámara golpea un
// bloque que ya se estaba cayendo). Más área -> más astillas.
export function shatterPolygon(poly, rand = Math.random, minArea = 0.003) {
    const area = polygonArea(poly);
    const count = Math.max(2, Math.min(10, Math.round(area * 14)));
    if (area < minArea * 4) return [poly];
    const cells = voronoiCells(poly, randomSeeds(poly, count, rand), minArea);
    return cells.length ? cells : [poly];
}
