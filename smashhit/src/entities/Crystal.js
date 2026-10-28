/*
    entities/Crystal.js
    -------------------
    Un panel de vidrio MONTADO en el pasillo, que sale de su soporte como un
    "topo" de feria al acercarse la cámara (animación de subida):

        mount 'floor'  sale del suelo (el clásico). Se sostiene por abajo.
        mount 'left'   sale de la pared izquierda hacia el centro.
        mount 'right'  sale de la pared derecha hacia el centro.
        mount 'top'    cuelga de una viga a altura `top` (no se anima).
        mount 'block'  sale de encima de un bloque (base a altura `base`).

    Forma: 'rect' o 'triangle'. En las paredes el triángulo queda acostado con
    la base pegada a la pared y la punta hacia el centro; colgado, al revés.
    En coords del panel el soporte es SIEMPRE el borde de abajo (anchor
    'bottom'): el montaje solo lo gira, así la rotura sabe qué se cae.

    Toda la lógica de rotura está en GlassPanel; aquí solo va el tamaño, el
    montaje y la subida. Las coords son LOCALES al obstáculo (ver Obstacle).
*/

import * as THREE from 'three';
import GlassPanel from './GlassPanel.js';
import {
    CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH, CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT,
    CRYSTAL_RISE_TIME, TUNNEL_WIDTH,
} from '../constants.js';
import { outline, pickShape, STANDING } from '../utils/shapes.js';

const rand = (min, max) => min + Math.random() * (max - min);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const HALF_W = TUNNEL_WIDTH / 2;


// Giro del panel y dirección en la que "sale" de su soporte, por montaje
const MOUNTS = {
    floor: { angle: 0, out: [0, 1] },
    block: { angle: 0, out: [0, 1] },
    left: { angle: -Math.PI / 2, out: [1, 0] },
    right: { angle: Math.PI / 2, out: [-1, 0] },
    top: { angle: Math.PI, out: [0, -1] },
};

export default class Crystal extends GlassPanel {
    /*
        options (todas opcionales, si faltan se eligen al azar):
            shape:  cualquiera de utils/shapes.js (rect, triangle, trapezoid, house,
                    arch, hexagon, octagon, diamond, pentagon...). Si falta, una al azar.
            mount:  'floor' | 'left' | 'right' | 'top' | 'block'
            width:  a lo largo del soporte
            height: cuánto sale del soporte
            x:      posición lateral (suelo, bloque, colgado)
            y:      altura del centro (paredes)
            base:   altura del bloque (mount 'block')
            top:    altura de la viga (mount 'top')
            z:      posición a lo largo del pasillo (local)
    */
    constructor(levelIndex = 0, options = {}) {
        const shape = options.shape || pickShape(STANDING);
        const mount = options.mount || 'floor';
        const width = options.width ?? rand(CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH);
        const height = options.height ?? rand(CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT);
        super(outline(shape, width, height), levelIndex, { anchor: 'bottom' });

        const m = MOUNTS[mount] || MOUNTS.floor;
        this.z = options.z ?? 0;
        this.q = new THREE.Quaternion().setFromAxisAngle(Z_AXIS, m.angle);
        this.out = m.out;

        // Centro del panel cuando ya salió del todo
        const maxX = HALF_W - width / 2 - 0.2; // que no atraviese las paredes
        if (mount === 'left' || mount === 'right') {
            const side = mount === 'left' ? -1 : 1;
            this.cx = side * (HALF_W - height / 2);
            this.cy = options.y ?? rand(1.5, 4);
        } else if (mount === 'top') {
            this.cx = options.x ?? Math.max(-maxX, Math.min(maxX, rand(-1.6, 1.6)));
            this.cy = (options.top ?? 6) - height / 2;
        } else {
            // Sin x fija: cerca del centro, para que tape el camino de la cámara
            // (x = 0) y haya que romperlo o chocar con él
            this.cx = options.x ?? Math.max(-maxX, Math.min(maxX, rand(-1.6, 1.6)));
            this.cy = (mount === 'block' ? options.base ?? 1 : 0) + height / 2;
        }

        // Colgado no se anima: ya está fuera
        this.rise = mount === 'top' ? 1 : 0;   // 0 = escondido en el soporte, 1 = fuera del todo
        this.rising = false;                   // lo activa el obstáculo cuando la cámara se acerca
    }

    // Lo llama Obstacle.addPanel en cuanto el panel tiene su marco
    placeInFrame() {
        this._place();
    }

    // Coloca el panel según el progreso de subida (rise 0..1)
    _place(delta = 0) {
        // Escondido = desplazado una altura entera hacia dentro del soporte
        const back = (1 - this.rise) * this.height;
        this.moveTo(this.cx - this.out[0] * back, this.cy - this.out[1] * back, this.z, this.q, delta);
    }

    startRising() {
        this.rising = true;
    }

    update(delta) {
        if (this.rising && this.rise < 1) {
            this.rise = Math.min(1, this.rise + delta / CRYSTAL_RISE_TIME);
            this._place(delta);
            if (this.rise >= 1) this.velocity.set(0, 0, 0);
        }
    }
}
