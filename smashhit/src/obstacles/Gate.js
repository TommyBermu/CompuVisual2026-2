/*
    obstacles/Gate.js
    -----------------
    COMPUERTA: dos puertas metálicas que cierran el pasillo de pared a pared.
    Delante tienen un BOTÓN de vidrio (un rombo frágil): al romperlo de un
    disparo las puertas se abren deslizándose hacia las paredes.

    Si la cámara llega con las puertas cerradas, choca (penalización de bolas
    como con el vidrio) y las puertas se abren de golpe para dejarla pasar.
*/

import Obstacle from '../entities/Obstacle.js';
import GlassPanel from '../entities/GlassPanel.js';
import { buttonMaterial } from '../utils/glass.js';
import { TUNNEL_WIDTH, CRYSTAL_THICKNESS, GATE_HEIGHT, GATE_OPEN_TIME } from '../constants.js';

const rand = (min, max) => min + Math.random() * (max - min);
const W = TUNNEL_WIDTH;
const H = GATE_HEIGHT;
const D = 0.4;              // grosor de las puertas
const BUTTON_SIZE = 0.75;   // "radio" del rombo

const easeInOut = (t) => t * t * (3 - 2 * t);

export default class Gate extends Obstacle {
    constructor(z, levelIndex) {
        super(z, levelIndex);

        // Dintel fijo sobre las puertas
        const lintel = this.addBox(W + 1, 0.5, D + 0.3);
        this.placeSolid(lintel, 0, H + 0.25, z);

        // Puertas (cada una medio pasillo)
        this.left = this.addBox(W / 2, H, D);
        this.right = this.addBox(W / 2, H, D);

        // Botón: rombo de vidrio brillante pegado a la cara de las puertas que mira a la cámara
        const s = BUTTON_SIZE;
        const diamond = [[0, -s], [s, 0], [0, s], [-s, 0]];
        this.button = this.addPanel(new GlassPanel(diamond, levelIndex, { fragile: true, material: buttonMaterial() }));
        this.button.setPose(rand(-3, 3), rand(2.6, 4.8), z + D / 2 + CRYSTAL_THICKNESS / 2 + 0.05);

        this.open = 0;         // 0 = cerradas, 1 = abiertas del todo
        this.opening = false;
        this._pose();
    }

    // Cada puerta se desliza medio pasillo hacia su pared (queda tapada por ella)
    _slide() {
        return easeInOut(this.open) * (W / 2);
    }

    _pose() {
        const slide = this._slide();
        this.placeSolid(this.left, -W / 4 - slide, H / 2, this.z);
        this.placeSolid(this.right, W / 4 + slide, H / 2, this.z);
    }

    onPanelBroken(panel) {
        if (panel === this.button) this.opening = true;
    }

    update(delta) {
        super.update(delta);
        if (this.opening && this.open < 1) {
            this.open = Math.min(1, this.open + delta / GATE_OPEN_TIME);
            this._pose();
        }
    }

    // Esfera de la cámara contra las cajas de las puertas
    cameraHit(pos, radius) {
        if (this.open >= 1) return false;
        const slide = this._slide();
        for (const cx of [-W / 4 - slide, W / 4 + slide]) {
            const dx = Math.max(Math.abs(pos.x - cx) - W / 4, 0);
            const dy = Math.max(Math.abs(pos.y - H / 2) - H / 2, 0);
            const dz = Math.max(Math.abs(pos.z - this.z) - D / 2, 0);
            if (Math.hypot(dx, dy, dz) <= radius) return true;
        }
        return false;
    }

    // La cámara se estrella: el botón revienta y las puertas ceden de golpe
    smashByCamera(shatter, push) {
        if (!this.button.empty) {
            this.button.shatterAll(0, 0, shatter, { push, spread: 2, fallPush: push });
        }
        this.opening = true;
        this.open = 1;
        this._pose();
    }
}
