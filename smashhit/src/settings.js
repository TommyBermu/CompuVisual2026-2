/*
    settings.js
    -----------
    Configuración del jugador (volúmenes, FOV, calidad...) persistida en
    localStorage, para que sobreviva al recargar la página.

    getSettings()        -> objeto con los valores actuales (defaults + guardados).
    saveSettings(partial) -> mezcla y guarda; devuelve el objeto completo.
    onSettingsChange(cb)  -> suscribirse a cambios (el AudioManager/Game reaccionan).
*/

import { FOG_DENSITY_SCALE } from './constants.js';

const STORAGE_KEY = 'smashhit.settings';

export const DEFAULT_SETTINGS = {
    musicVolume: 0.6,   // 0..1
    sfxVolume: 0.8,     // 0..1
    muted: false,
    fov: 70,            // campo de visión de la cámara (grados)
    shadows: true,      // sombras on/off (calidad)
    sensitivity: 1.0,   // multiplicador de la fuerza de disparo
    fogScale: FOG_DENSITY_SCALE, // densidad de la niebla (multiplica la de cada nivel)
    ballSkin: 'default', // skin de la bola (default, plata, oro...)
    ballTrail: 'none',   // estela de la bola (none, neon, arcoiris...)
};

let current = load();
const listeners = new Set();

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function getSettings() {
    return { ...current };
}

export function saveSettings(partial) {
    current = { ...current, ...partial };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {
        /* localStorage puede fallar en modo privado; no es crítico */
    }
    listeners.forEach((cb) => cb(getSettings()));
    return getSettings();
}

export function onSettingsChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}
