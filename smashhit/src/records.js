/*
    records.js
    ----------
    Récords del jugador persistidos en localStorage (mismo patrón que
    settings.js), para que sobrevivan al recargar la página.

    Se guarda UN récord global:
        score:      mejor puntuación de una partida.
        distance:   más metros RECORRIDOS en una partida (desde donde empezó).
        checkpoint: checkpoint más lejano alcanzado empezando desde el 0
                    (-1 = todavía ninguna partida desde el inicio).

    Empezar desde un checkpoint avanzado SÍ cuenta para la puntuación y la
    distancia, porque solo suman los metros que de verdad recorriste (no los
    que te saltaste). Para el checkpoint más lejano solo valen las partidas
    desde el inicio; si no, bastaría con elegir el checkpoint 9.

    getRecords()     -> objeto con los récords actuales.
    submitRun(run)   -> run = { score, distance, startCheckpoint, checkpoint }.
                        Actualiza y guarda; devuelve { records, newScore, newDistance, newCheckpoint }.
*/

const STORAGE_KEY = 'smashhit.records';

export const DEFAULT_RECORDS = {
    score: 0,
    distance: 0,
    checkpoint: -1,
};

let current = load();

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_RECORDS };
        const saved = JSON.parse(raw);
        // Solo números válidos (por si alguien editó el localStorage a mano)
        const out = { ...DEFAULT_RECORDS };
        for (const key of Object.keys(out)) {
            if (Number.isFinite(saved?.[key])) out[key] = saved[key];
        }
        return out;
    } catch {
        return { ...DEFAULT_RECORDS };
    }
}

export function getRecords() {
    return { ...current };
}

export function submitRun({ score, distance, startCheckpoint, checkpoint }) {
    const newScore = score > current.score;
    const newDistance = distance > current.distance;
    const newCheckpoint = startCheckpoint === 0 && checkpoint > current.checkpoint;
    if (newScore) current.score = Math.floor(score);
    if (newDistance) current.distance = Math.floor(distance);
    if (newCheckpoint) current.checkpoint = checkpoint;
    if (newScore || newDistance || newCheckpoint) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch {
            /* localStorage puede fallar en modo privado; no es crítico */
        }
    }
    return { records: getRecords(), newScore, newDistance, newCheckpoint };
}
