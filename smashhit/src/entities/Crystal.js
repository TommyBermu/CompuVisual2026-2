/*
    entities/Crystal.js
    -------------------
    Un panel de vidrio que SALE DEL SUELO como un "topo" de feria: no ocupa todo
    el pasillo, tiene ancho/alto aleatorios y aparece en una X aleatoria. Nace
    hundido bajo el suelo y sube hasta su altura final (animación de subida).

    Forma: 'rect' (panel clásico) o 'triangle' (pirámide plana, nivel de
    triángulos). Se sostiene desde el suelo: un golpe alto (más "palanca") o
    cerca de un borde lateral rompe mucho más que uno abajo en el centro.

    Toda la lógica de rotura está en GlassPanel; aquí solo va el tamaño, la
    posición y la subida.
*/

import GlassPanel from './GlassPanel.js';
import {
    CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH, CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT,
    CRYSTAL_RISE_TIME, TUNNEL_WIDTH,
} from '../constants.js';
import { rectPolygon } from '../utils/fracture.js';

const rand = (min, max) => min + Math.random() * (max - min);

// Contorno (CCW, centrado en su caja) de cada forma
function outlineFor(shape, w, h) {
    if (shape === 'triangle') return [[-w / 2, -h / 2], [w / 2, -h / 2], [0, h / 2]];
    return rectPolygon(w / 2, h / 2);
}

export default class Crystal extends GlassPanel {
    /*
        options (todas opcionales, si faltan se eligen al azar):
            shape: 'rect' | 'triangle'
            width, height, x
    */
    constructor(z, levelIndex = 0, options = {}) {
        const shape = options.shape || 'rect';
        const width = options.width ?? rand(CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH);
        const height = options.height ?? rand(CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT);
        super(outlineFor(shape, width, height), levelIndex, { anchor: 'bottom' });

        // Posición X aleatoria dentro del pasillo (que no atraviese las paredes)
        const maxX = (TUNNEL_WIDTH - width) / 2 - 0.2;
        this.x = options.x ?? rand(-maxX, maxX);
        this.z = z;
        this.targetY = height / 2;      // centro del panel cuando está fuera del todo
        this.rise = 0;                  // 0 = hundido, 1 = fuera del todo
        this.rising = false;            // lo activa el obstáculo cuando la cámara se acerca

        this._place();
    }

    // Coloca el panel según el progreso de subida (rise 0..1)
    _place() {
        // Cuando rise=0 el centro está una altura entera bajo el suelo (invisible)
        const y = this.targetY - (1 - this.rise) * this.height;
        this.setPose(this.x, y, this.z);
    }

    startRising() {
        this.rising = true;
    }

    update(delta) {
        if (this.rising && this.rise < 1) {
            this.rise = Math.min(1, this.rise + delta / CRYSTAL_RISE_TIME);
            this.velocity.set(0, this.height / CRYSTAL_RISE_TIME, 0);
            this._place();
            if (this.rise >= 1) this.velocity.set(0, 0, 0);
        }
    }
}
