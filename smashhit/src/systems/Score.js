/*
    systems/Score.js
    ----------------
    Puntuación de la partida + COMBO (racha de aciertos), al estilo de la
    racha de Smash Hit pero simple. Solo lleva la cuenta: no dibuja nada; el
    Game le pasa los eventos y el HUD pinta lo que avisa por los callbacks.

    De dónde salen los puntos (números en constants.js):
        - Distancia:  SCORE_PER_METER por cada metro RECORRIDO en la partida
                      (desde donde empezaste; sin combo).
        - Cristal:    SCORE_CRYSTAL x combo por cada cristal roto de un disparo.
        - Power-up:   SCORE_POWERUP x combo (extra; lo llama Game._activatePower).
        - Checkpoint: SCORE_CHECKPOINT al cruzar a un checkpoint nuevo.
        - Final:      SCORE_FINISH + SCORE_FINISH_PER_BALL por bola que quede.
        - Modo "Sin perder": addBonusPoints() (lo que en el normal da bolas)
                      y addPenalty() (cada bola disparada, choques). Nunca
                      deja la puntuación por debajo de 0.

    Combo: cada acierto seguido suma 1 a la racha; cada COMBO_STEP aciertos el
    multiplicador sube en 1 (x1 -> x2 -> ... -> xCOMBO_MAX). Chocar con vidrio
    lo devuelve a x1, y fallar un tiro (la bola toca primero algo que no es
    vidrio) también, si COMBO_RESET_ON_MISS está activo.

    Ciclo de vida: start() al empezar la partida, stop() al morir / terminar /
    salir. Mientras está parado (o el Game está en pausa y no lo llama) no
    suma nada.

    Callbacks (los asigna el Game):
        onChange(state) -> { score, multiplier, streak, progress } (progress 0..1
                           hacia el siguiente multiplicador)
        onGain(points, kind, multiplier) -> para los "+N" del HUD
                           kind: 'crystal' | 'powerup' | 'checkpoint' | 'finish' | 'combo'
                                 | 'bonus' | 'shot' | 'penalty' (points < 0 en los dos últimos)
*/

import {
    SCORE_PER_METER, SCORE_CRYSTAL, SCORE_POWERUP, SCORE_CHECKPOINT,
    SCORE_FINISH, SCORE_FINISH_PER_BALL, COMBO_STEP, COMBO_MAX, COMBO_RESET_ON_MISS,
} from '../constants.js';
import { unlock } from '../achievements.js';

export default class Score {
    constructor() {
        this.onChange = null;
        this.onGain = null;
        this.active = false;
        this.reset();
    }

    // Todo a cero (sin avisar; start() avisa)
    reset(startDistance = 0) {
        this.startDistance = startDistance;
        this.travelled = 0;      // metros recorridos en esta partida
        this.bonus = 0;          // puntos de eventos (cristales, bonos...)
        this.streak = 0;         // aciertos seguidos
        this.bestMultiplier = 1;
        this.crystals = 0;       // cristales rotos de un disparo
        this.gems = 0;           // cristales de poder rotos en esta partida
        this.misses = 0;
        this.crashes = 0;
        this.powersCollected = new Set(); // IDs de poderes recogidos
        this.hitsThisFrame = 0;
    }

    start(startDistance = 0) {
        this.reset(startDistance);
        this.active = true;
        this._notify();
    }

    stop() {
        this.active = false;
    }

    // Llamar en cada frame para reiniciar contadores temporales
    update() {
        this.hitsThisFrame = 0;
    }

    // Puntuación total = distancia + eventos
    get score() {
        return Math.floor(this.travelled * SCORE_PER_METER) + this.bonus;
    }

    // Multiplicador actual según la racha
    get multiplier() {
        return Math.min(COMBO_MAX, 1 + Math.floor(this.streak / COMBO_STEP));
    }

    // Progreso (0..1) hacia el siguiente multiplicador (1 si ya está al máximo)
    get progress() {
        if (this.multiplier >= COMBO_MAX) return 1;
        return (this.streak % COMBO_STEP) / COMBO_STEP;
    }

    // Distancia ABSOLUTA de la cámara en el recorrido (rail.distance), cada frame
    setDistance(distance) {
        if (!this.active) return;
        const travelled = Math.max(0, distance - this.startDistance);
        if (travelled <= this.travelled) return;
        const before = this.score;
        this.travelled = travelled;
        if (this.score !== before) this._notify();
    }

    // Una bola rompió un cristal: sube la racha y suma con el multiplicador NUEVO
    // (el acierto que completa la racha ya cuenta doble).
    addHit() {
        if (!this.active) return 0;
        const before = this.multiplier;
        this.streak++;
        this.crystals++;
        this.hitsThisFrame++;

        // Logro: Efecto Dominó (4 en un frame/disparo)
        if (this.hitsThisFrame >= 4) unlock('domino');

        // Logro: Francotirador (10 seguidos)
        if (this.streak >= 10) unlock('sniper');

        const mult = this.multiplier;
        this.bestMultiplier = Math.max(this.bestMultiplier, mult);

        // Logros de combo
        if (mult >= 3) unlock('combo_3');
        if (mult >= 5) unlock('combo_max');

        if (mult > before) this._gain(0, 'combo', mult);
        return this._gain(SCORE_CRYSTAL * mult, 'crystal', mult);
    }

    // Cristal de power-up: puntos EXTRA (x combo). No toca la racha: si el
    // cristal también avisa onCrystalBroken, ese acierto ya contó en addHit().
    addPowerUp(powerId) {
        if (!this.active) return 0;
        this.gems++;
        if (powerId) {
            this.powersCollected.add(powerId);
            // Logro: Poder Absoluto (los 4 en una partida)
            // IDs: triple, infinite, slowmo, bonus (+10)
            if (this.powersCollected.size >= 4) unlock('full_power');
        }
        return this._gain(SCORE_POWERUP * this.multiplier, 'powerup', this.multiplier);
    }

    // Se cruzó a un checkpoint nuevo
    addCheckpoint() {
        if (!this.active) return 0;
        return this._gain(SCORE_CHECKPOINT, 'checkpoint', 1);
    }

    // Recorrido completado (ballsLeft = bolas que quedan)
    addFinish(ballsLeft = 0, totalBallsSpent = 0, isNoLoseMode = false) {
        if (!this.active) return 0;

        // Logros de fin de juego
        unlock('finish_game');
        if (isNoLoseMode) unlock('survivor');
        if (totalBallsSpent < 60) unlock('eco_shooter');

        return this._gain(SCORE_FINISH + SCORE_FINISH_PER_BALL * Math.max(0, ballsLeft), 'finish', 1);
    }

    // Modo "Sin perder": puntos fijos (sin combo) por lo que en el normal da
    // bolas (pirámide, rombo, gema +bolas)
    addBonusPoints(points) {
        if (!this.active || points <= 0) return 0;
        return this._gain(points, 'bonus', 1);
    }

    // Modo "Sin perder": resta puntos (disparo, choque). La puntuación nunca
    // baja de 0: se quita como mucho lo que haya. Devuelve lo que se restó.
    // kind: 'shot' | 'penalty' (color del "-N" en el HUD)
    addPenalty(points, kind = 'penalty') {
        if (!this.active) return 0;
        const lost = Math.min(points, this.score);
        if (lost <= 0) return 0;
        return -this._gain(-lost, kind, 1);
    }

    // Chocó con vidrio: se pierde el combo
    onCrash() {
        if (!this.active) return;
        this.crashes++;
        this._breakStreak();
    }

    // Un tiro no tocó vidrio: se pierde el combo (si así está configurado)
    onMiss() {
        if (!this.active) return;
        this.misses++;
        if (COMBO_RESET_ON_MISS) this._breakStreak();
    }

    // Resumen para la pantalla final y los récords
    summary() {
        return {
            score: this.score,
            distance: Math.floor(this.travelled),
            crystals: this.crystals,
            gems: this.gems,
            bestMultiplier: this.bestMultiplier,
        };
    }

    _breakStreak() {
        if (this.streak === 0) return;
        this.streak = 0;
        this._notify();
    }

    _gain(points, kind, multiplier) {
        this.bonus += points;
        if (this.onGain) this.onGain(points, kind, multiplier);
        this._notify();
        return points;
    }

    _notify() {
        if (this.onChange) {
            this.onChange({
                score: this.score,
                multiplier: this.multiplier,
                streak: this.streak,
                progress: this.progress,
            });
        }
    }
}
