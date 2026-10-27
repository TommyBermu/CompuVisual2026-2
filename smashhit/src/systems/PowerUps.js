/*
    systems/PowerUps.js
    -------------------
    Los PODERES que dan los cristales de colores (entities/PowerCrystal.js).
    Al romper uno con un disparo, el Game llama a activate(tipo):

        triple    Triple bola: cada disparo lanza 3 bolas en abanico (cuesta 1).
        infinite  Bolas infinitas: disparar no gasta bolas.
        slowmo    Cámara lenta: todo el juego va a POWER_SLOWMO_SCALE.
        bonus     +POWER_BONUS_BALLS bolas al instante (no dura).

    Los que duran llevan un temporizador (segundos de tiempo REAL, así la
    cámara lenta no alarga su propia duración). Pueden estar varios activos a
    la vez (triple + infinitas = 3 bolas gratis por disparo). Coger otra vez
    uno que ya está activo SUMA su duración, con tope POWER_MAX_TIME.

    Pausa: el Game no llama a update() mientras está en pausa, así que los
    temporizadores se congelan solos. clear() los apaga (game over, reinicio,
    salir al menú).

    Lo consultan:
        Shooter  -> shotCount (bolas por disparo) y freeShots (no gasta)
        Game     -> timeScale (multiplica el delta del juego)
        HUD      -> onChange(lista) con lo que queda de cada poder
*/

import {
    POWER_TRIPLE_DURATION, POWER_INFINITE_DURATION, POWER_SLOWMO_DURATION,
    POWER_SLOWMO_SCALE, POWER_SLOWMO_EASE, POWER_MAX_TIME, POWER_BONUS_BALLS, POWER_WEIGHTS,
} from '../constants.js';

// Catálogo: nombre (HUD/cartel), color (gema, HUD) y duración (0 = instantáneo)
export const POWERS = {
    triple: { name: 'Triple bola', color: '#ff4fd8', duration: POWER_TRIPLE_DURATION },
    infinite: { name: 'Bolas infinitas', color: '#38e8ff', duration: POWER_INFINITE_DURATION },
    slowmo: { name: 'Cámara lenta', color: '#a98bff', duration: POWER_SLOWMO_DURATION },
    bonus: { name: `+${POWER_BONUS_BALLS} bolas`, color: '#5dff8a', duration: 0 },
};

// Elige un tipo de poder al azar según POWER_WEIGHTS
export function randomPower() {
    const entries = Object.entries(POWER_WEIGHTS);
    let r = Math.random() * entries.reduce((sum, [, w]) => sum + w, 0);
    for (const [type, w] of entries) {
        r -= w;
        if (r <= 0) return type;
    }
    return entries[0][0];
}

export default class PowerUps {
    constructor() {
        this.timers = {};       // tipo -> segundos que le quedan
        this.timeScale = 1;     // velocidad del juego (la cámara lenta la baja suavemente)
        this.onChange = null;   // callback(lista) para el HUD: [{ type, name, color, remaining, duration }]
        this.onActivate = null; // callback(tipo) para otros sistemas (sonido, puntuación...)
        this._shown = '';       // lo último que se le mandó al HUD (para no repetir)
    }

    // Activa un poder. Devuelve su definición (POWERS[tipo]).
    activate(type) {
        const def = POWERS[type];
        if (!def) return null;
        if (def.duration > 0) {
            // Acumula si ya estaba activo (con tope)
            this.timers[type] = Math.min((this.timers[type] || 0) + def.duration, POWER_MAX_TIME);
        }
        if (this.onActivate) this.onActivate(type);
        this._notify(true);
        return def;
    }

    isActive(type) {
        return (this.timers[type] || 0) > 0;
    }

    remaining(type) {
        return this.timers[type] || 0;
    }

    // Bolas que salen en cada disparo
    get shotCount() {
        return this.isActive('triple') ? 3 : 1;
    }

    // ¿Disparar es gratis?
    get freeShots() {
        return this.isActive('infinite');
    }

    // delta en tiempo REAL (sin escalar). No se llama en pausa.
    update(delta) {
        for (const type of Object.keys(this.timers)) {
            this.timers[type] -= delta;
            if (this.timers[type] <= 0) delete this.timers[type];
        }
        // La cámara lenta entra y sale suave (no de golpe)
        const target = this.isActive('slowmo') ? POWER_SLOWMO_SCALE : 1;
        const step = (delta / POWER_SLOWMO_EASE) * (1 - POWER_SLOWMO_SCALE);
        this.timeScale = target < this.timeScale
            ? Math.max(target, this.timeScale - step)
            : Math.min(target, this.timeScale + step);
        this._notify();
    }

    // Lo que hay activo, para el HUD (de más a menos tiempo restante)
    list() {
        return Object.entries(this.timers)
            .map(([type, remaining]) => ({ type, ...POWERS[type], remaining }))
            .sort((a, b) => b.remaining - a.remaining);
    }

    // Avisa al HUD solo cuando cambia lo que se ve (décimas de segundo)
    _notify(force = false) {
        if (!this.onChange) return;
        const list = this.list();
        const key = list.map((p) => `${p.type}:${p.remaining.toFixed(1)}`).join('|');
        if (!force && key === this._shown) return;
        this._shown = key;
        this.onChange(list);
    }

    // Apaga todo (game over, reinicio, salir al menú)
    clear() {
        this.timers = {};
        this.timeScale = 1;
        this._notify(true);
    }
}
