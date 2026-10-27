/*
    obstacles/Gate.js
    -----------------
    COMPUERTAS: puertas metálicas que cierran el pasillo de pared a pared. Se
    abren rompiendo su(s) BOTÓN(es) de vidrio brillante (rombos frágiles).
    Variantes:

        split       dos puertas que se separan hacia las paredes (la clásica)
        guillotine  una sola puerta que sube hacia el cielo
        slide       una sola puerta que se desliza hacia una pared
        double      dos puertas con DOS botones: hay que romper los dos
        rhythm      se abren y cierran solas a ritmo; romper el botón las deja abiertas

    Las puertas son partes sólidas BLOQUEANTES (Obstacle.cameraHit): si la
    cámara llega con ellas cerradas, choca (penalización de bolas como con el
    vidrio) y se abren de golpe para dejarla pasar.
*/

import Obstacle from '../entities/Obstacle.js';
import GlassPanel from '../entities/GlassPanel.js';
import { buttonMaterial } from '../utils/glass.js';
import { CRYSTAL_THICKNESS, GATE_HEIGHT, GATE_OPEN_TIME } from '../constants.js';
import { HALF_W, rand, pick, sign } from './shared.js';

const W = HALF_W * 2;
const H = GATE_HEIGHT;
const D = 0.4;              // grosor de las puertas
const BUTTON_SIZE = 0.75;   // "radio" del rombo
const RHYTHM_PERIOD = 2.6;  // s por ciclo abrir/cerrar (variante rhythm)

const easeInOut = (t) => t * t * (3 - 2 * t);
const KINDS = ['split', 'guillotine', 'slide', 'double', 'rhythm'];

export default class Gate extends Obstacle {
    constructor(frame, levelIndex, kind = pick(KINDS)) {
        super(frame, levelIndex);
        this.kind = kind;

        // Dintel fijo sobre las puertas (salvo la guillotina, que sale por arriba)
        if (kind !== 'guillotine') {
            const lintel = this.addBox(W + 1, 0.5, D + 0.3);
            this.placeSolid(lintel, 0, H + 0.25, 0);
        }

        // Puertas
        if (kind === 'guillotine' || kind === 'slide') {
            this.doors = [this.addBox(W, H, D, { blocking: true })];
            this.slideDir = sign(); // hacia qué pared se va la deslizante
        } else {
            this.doors = [this.addBox(W / 2, H, D, { blocking: true }), this.addBox(W / 2, H, D, { blocking: true })];
        }

        // Botones: rombos de vidrio brillante pegados a la cara que mira a la cámara
        const count = kind === 'double' ? 2 : 1;
        this.buttons = [];
        for (let i = 0; i < count; i++) {
            const s = BUTTON_SIZE;
            const diamond = [[0, -s], [s, 0], [0, s], [-s, 0]];
            const b = this.addPanel(new GlassPanel(diamond, levelIndex, { fragile: true, material: buttonMaterial() }));
            const x = count === 2 ? (i ? 1 : -1) * rand(1.5, 4) : rand(-3, 3);
            if (kind === 'rhythm') {
                // Las puertas se mueven solas: el botón va en el dintel (fijo)
                b.setPose(x, H + 0.25, (D + 0.3) / 2 + CRYSTAL_THICKNESS / 2 + 0.05);
            } else {
                b.setPose(x, rand(2.6, 4.8), D / 2 + CRYSTAL_THICKNESS / 2 + 0.05);
            }
            this.buttons.push(b);
        }

        this.open = 0;         // 0 = cerradas, 1 = abiertas del todo
        this.opening = false;  // abriéndose para siempre (botones rotos o choque)
        this.phase = Math.random() * RHYTHM_PERIOD;
        this._pose();
    }

    // Coloca las puertas según `open` (0..1)
    _pose() {
        const e = easeInOut(this.open);
        if (this.kind === 'guillotine') {
            this.placeSolid(this.doors[0], 0, H / 2 + e * (H + 1), 0);
        } else if (this.kind === 'slide') {
            this.placeSolid(this.doors[0], this.slideDir * e * W, H / 2, 0);
        } else {
            // Cada puerta se desliza medio pasillo hacia su pared (queda tapada por ella)
            const slide = e * (W / 2);
            this.placeSolid(this.doors[0], -W / 4 - slide, H / 2, 0);
            this.placeSolid(this.doors[1], W / 4 + slide, H / 2, 0);
        }
    }

    onPanelBroken() {
        // Abren cuando ya no queda ningún botón sin romper
        if (this.buttons.every((b) => b.broken || b.empty)) this.opening = true;
    }

    update(delta) {
        super.update(delta);
        if (this.opening) {
            if (this.open < 1) this.open = Math.min(1, this.open + delta / GATE_OPEN_TIME);
        } else if (this.kind === 'rhythm') {
            // Ciclo: cerrada -> se abre -> abierta -> se cierra
            const t = ((this.time + this.phase) % RHYTHM_PERIOD) / RHYTHM_PERIOD;
            this.open = t < 0.3 ? 0 : t < 0.45 ? (t - 0.3) / 0.15 : t < 0.85 ? 1 : 1 - (t - 0.85) / 0.15;
        } else {
            return;
        }
        this._pose();
    }

    // La cámara se estrella: los botones revientan y las puertas ceden de golpe
    smashByCamera(shatter, push) {
        for (const b of this.buttons) {
            if (!b.empty) b.shatterAll(0, 0, shatter, { push, spread: 2, fallPush: push });
        }
        this.opening = true;
        this.open = 1;
        this._pose();
    }
}
