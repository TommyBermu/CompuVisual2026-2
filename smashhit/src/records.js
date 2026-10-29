/*
    records.js
    ----------
    Récords del jugador persistidos en localStorage (mismo patrón que
    settings.js), para que sobrevivan al recargar la página.

    Se guarda UN récord por MODO de juego, cada uno en su propia clave (así
    las partidas "Sin perder", con bolas infinitas, no se mezclan con las
    normales):
        'normal'     -> smashhit.records            (la de siempre)
        'sinPerder'  -> smashhit.records.sinPerder

    Cada récord tiene:
        score:      mejor puntuación de una partida.
        distance:   más metros RECORRIDOS en una partida (desde donde empezó).
        checkpoint: checkpoint más lejano alcanzado empezando desde el 0
                    (-1 = todavía ninguna partida desde el inicio).

    Empezar desde un checkpoint avanzado SÍ cuenta para la puntuación y la
    distancia, porque solo suman los metros que de verdad recorriste (no los
    que te saltaste). Para el checkpoint más lejano solo valen las partidas
    desde el inicio; si no, bastaría con elegir el checkpoint 9.

    getRecords(mode)  -> objeto con los récords actuales de ese modo.
    submitRun(run)    -> run = { score, distance, startCheckpoint, checkpoint, mode }.
                         Actualiza y guarda; devuelve { records, newScore, newDistance, newCheckpoint }.
*/

const STORAGE_KEYS = {
    normal: 'smashhit.records',
    sinPerder: 'smashhit.records.sinPerder',
};

export const DEFAULT_RECORDS = {
    score: 0,
    distance: 0,
    checkpoint: -1,
    cumulativeDistance: 0, // Metros totales entre todas las partidas
    gemsBroken: 0,         // Cristales de poder totales rotos
};

const current = {};
for (const mode of Object.keys(STORAGE_KEYS)) current[mode] = load(STORAGE_KEYS[mode]);

// Modo desconocido -> normal
const modeKey = (mode) => (mode in STORAGE_KEYS ? mode : 'normal');

function load(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return { ...DEFAULT_RECORDS };
        const saved = JSON.parse(raw);
        // Solo números válidos (por si alguien editó el localStorage a mano)
        const out = { ...DEFAULT_RECORDS };
        for (const k of Object.keys(out)) {
            if (Number.isFinite(saved?.[k])) out[k] = saved[k];
        }
        // Asegurar que las nuevas claves existen si cargamos un registro viejo
        if (out.cumulativeDistance === undefined) out.cumulativeDistance = 0;
        if (out.gemsBroken === undefined) out.gemsBroken = 0;
        return out;
    } catch {
        return { ...DEFAULT_RECORDS };
    }
}

export function getRecords(mode = 'normal') {
    return { ...current[modeKey(mode)] };
}

export function submitRun({ score, distance, startCheckpoint, checkpoint, gems = 0, mode = 'normal' }) {
    const key = modeKey(mode);
    const rec = current[key];
    const newScore = score > rec.score;
    const newDistance = distance > rec.distance;
    const newCheckpoint = startCheckpoint === 0 && checkpoint > rec.checkpoint;
    
    if (newScore) rec.score = Math.floor(score);
    if (newDistance) rec.distance = Math.floor(distance);
    if (newCheckpoint) rec.checkpoint = checkpoint;
    
    // Estadísticas acumulativas
    rec.cumulativeDistance += Math.floor(distance);
    rec.gemsBroken += gems;

    try {
        localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(rec));
    } catch {
        /* localStorage puede fallar en modo privado; no es crítico */
    }
    
    return { records: getRecords(key), newScore, newDistance, newCheckpoint };
}
