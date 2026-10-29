/*
    achievements.js
    ---------------
    Gestor de logros y desbloqueables del juego. Persistido en localStorage
    bajo la clave 'smashhit.achievements'.

    Define los 20 logros (progresión y habilidad) y permite consultar el
    estado de desbloqueo y recompensas.
*/

const STORAGE_KEY = 'smashhit.achievements';

export const ACHIEVEMENTS = [
    // --- Progresión (Checkpoints) ---
    {
        id: 'first_steps',
        title: 'Primeros Pasos',
        desc: 'Cruza tu primer checkpoint.',
        reward: { type: 'skin', id: 'silver', name: 'Plata', color: '#c0c0c0' },
    },
    {
        id: 'checkpoint_2',
        title: 'Atardecer Dorado',
        desc: 'Alcanza el Checkpoint 2 (Atardecer).',
        reward: { type: 'skin', id: 'bronze', name: 'Bronce', color: '#cd7f32' },
    },
    {
        id: 'checkpoint_3',
        title: 'Cielo Rosa',
        desc: 'Alcanza el Checkpoint 3.',
    },
    {
        id: 'checkpoint_4',
        title: 'Explorador del Desierto',
        desc: 'Alcanza el Checkpoint 4 (Desierto rojo).',
    },
    {
        id: 'checkpoint_5',
        title: 'Noches de Lavanda',
        desc: 'Alcanza el Checkpoint 5.',
        reward: { type: 'skin', id: 'amethyst', name: 'Amatista', color: '#9966cc' },
    },
    {
        id: 'checkpoint_8',
        title: 'Viajero Cósmico',
        desc: 'Alcanza el Checkpoint 8.',
    },
    {
        id: 'checkpoint_9',
        title: 'Cima de Cristal',
        desc: 'Alcanza el Checkpoint 9.',
    },
    {
        id: 'finish_game',
        title: 'Fin del Viaje',
        desc: 'Completa el recorrido llegando al Checkpoint 10.',
        reward: { type: 'skin', id: 'gold', name: 'Oro', color: '#ffd700' },
    },
    {
        id: 'marathon',
        title: 'Maratoniano',
        desc: 'Recorre un acumulado de 5,000 metros.',
    },
    {
        id: 'survivor',
        title: 'Superviviente Nato',
        desc: 'Termina una partida completa en el modo "Sin perder".',
        reward: { type: 'skin', id: 'emerald', name: 'Esmeralda', color: '#50c878' },
    },

    // --- Habilidad y Creatividad ---
    {
        id: 'combo_3',
        title: 'Combo x3',
        desc: 'Alcanza un multiplicador de combo de x3.',
    },
    {
        id: 'combo_max',
        title: 'Maestro del Combo',
        desc: 'Llega al multiplicador máximo de combo (x5).',
        reward: { type: 'skin', id: 'sapphire', name: 'Zafiro', color: '#0f52ba' },
    },
    {
        id: 'sniper',
        title: 'Francotirador',
        desc: 'Rompe 10 cristales seguidos sin fallar ni un disparo.',
    },
    {
        id: 'full_power',
        title: 'Poder Absoluto',
        desc: 'Recoge los 4 tipos de gemas de poder en una partida.',
        reward: { type: 'trail', id: 'rainbow', name: 'Arcoíris' },
    },
    {
        id: 'war_economy',
        title: 'Economía de Guerra',
        desc: 'Termina un nivel conservando al menos 35 bolas.',
    },
    {
        id: 'close_call',
        title: 'Por los pelos',
        desc: 'Choca y sobrevive con menos de 5 bolas restantes.',
    },
    {
        id: 'gem_hunter',
        title: 'Cazador de Gemas',
        desc: 'Destruye un total de 25 cristales de poder.',
    },
    {
        id: 'clean_pass',
        title: 'Paso Limpio',
        desc: 'Supera un checkpoint entero sin chocar con vidrio.',
        reward: { type: 'trail', id: 'ghost', name: 'Fantasma', color: '#ffffff' },
    },
    {
        id: 'domino',
        title: 'Efecto Dominó',
        desc: 'Rompe 4 piezas de vidrio con un solo disparo.',
    },
    {
        id: 'eco_shooter',
        title: 'Eco-tirador',
        desc: 'Completa el juego gastando menos de 60 bolas.',
        reward: { type: 'skin', id: 'diamond', name: 'Diamante', color: '#b9f2ff' },
    },
];

let unlocked = load();
const listeners = new Set();

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw); // Array de IDs desbloqueados
    } catch {
        return [];
    }
}

function save() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {
        /* localStorage puede fallar en modo privado */
    }
}

export function getUnlockedIds() {
    return [...unlocked];
}

export function isUnlocked(id) {
    return unlocked.includes(id);
}

// Desbloquea un logro si no lo estaba ya. Devuelve el objeto del logro si se desbloqueó ahora.
export function unlock(id) {
    if (unlocked.includes(id)) return null;

    const achievement = ACHIEVEMENTS.find(a => a.id === id);
    if (!achievement) return null;

    unlocked.push(id);
    save();

    // Avisar a los interesados (ej. HUD para mostrar notificación)
    listeners.forEach(cb => cb(achievement));

    return achievement;
}

export function onAchievementUnlocked(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
}

// Reset (solo para debugging si se desea)
export function _resetAchievements() {
    unlocked = [];
    save();
}
