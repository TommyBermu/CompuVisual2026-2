/*
    systems/Track.js
    ----------------
    El RECORRIDO: una curva en 3D parametrizada por s = metros recorridos.
    Ya no es una recta hacia -Z: gira a la izquierda/derecha (rumbo, yaw) y
    sube/baja en rampas (pendiente, pitch). Todo lo que se coloca en el
    pasillo (tramos, obstáculos, cámara) pide su MARCO en un punto del
    recorrido con frameAt(s):

        position:   centro del SUELO en ese punto
        quaternion: orientación del pasillo. En coords locales del marco:
                      +X = derecha, +Y = arriba (normal del suelo),
                      -Z = hacia delante (como la cámara de Three.js)
        forward, right, up: esos mismos ejes en coords de mundo

    El recorrido se genera por PIEZAS a medida que se necesita (recta, curva,
    rampa) y se muestrea cada DS metros integrando la dirección. Las curvas y
    rampas usan smoothstep en el rumbo/pendiente, así no hay "codos".

    Cuándo gira (ver `track` en levels.js):
        - SIEMPRE al cambiar de checkpoint (curva o rampa grande, cambio de "sala").
        - Dentro de un nivel, según sus probabilidades de curva y de rampa.
    El rumbo y la altura se mantienen acotados (si se va mucho a un lado o muy
    arriba, la siguiente pieza tiende a compensar) para que no se enrolle.
*/

import * as THREE from 'three';
import { LEVELS, checkpointAt } from '../levels.js';
import { CHECKPOINT_LENGTH } from '../constants.js';

const DS = 1;                                  // metros entre muestras
const DEG = Math.PI / 180;
const rand = (min, max) => min + Math.random() * (max - min);
const sign = () => (Math.random() < 0.5 ? -1 : 1);
const smooth = (t) => t * t * (3 - 2 * t);

const MAX_YAW = 110 * DEG;  // rumbo máximo (acumulado) antes de forzar la vuelta
const MAX_RISE = 14;        // metros de altura máxima (arriba o abajo) antes de compensar

const tmpEuler = new THREE.Euler(0, 0, 0, 'YXZ');

// Orientación del pasillo a partir de rumbo y pendiente
function orientation(yaw, pitch, out = new THREE.Quaternion()) {
    tmpEuler.set(pitch, yaw, 0, 'YXZ');
    return out.setFromEuler(tmpEuler);
}

export default class Track {
    constructor() {
        this.reset();
    }

    // Recorrido nuevo (cada partida es distinta)
    reset() {
        // Muestras: pos (centro del suelo), yaw, pitch. La muestra i está en s = i*DS.
        this.samples = [{ pos: new THREE.Vector3(0, 0, 0), yaw: 0, pitch: 0 }];
        this.pieces = [];      // piezas pendientes de muestrear
        this.endS = 0;         // s de la última muestra
    }

    // --- Consulta -----------------------------------------------------------

    // Marco del recorrido en s (ver cabecera). Para s < 0 se prolonga recto
    // hacia atrás (el menú y el primer tramo empiezan un poco antes de 0).
    frameAt(s, out = {}) {
        let pos, yaw, pitch;
        if (s <= 0) {
            const first = this.samples[0];
            pos = new THREE.Vector3(0, 0, -s); // recto hacia -Z
            yaw = first.yaw;
            pitch = first.pitch;
        } else {
            this._ensure(s + DS);
            const f = s / DS;
            const i = Math.floor(f);
            const t = f - i;
            const a = this.samples[i];
            const b = this.samples[i + 1];
            pos = a.pos.clone().lerp(b.pos, t);
            yaw = a.yaw + (b.yaw - a.yaw) * t;
            pitch = a.pitch + (b.pitch - a.pitch) * t;
        }
        out.s = s;
        out.position = pos;
        out.quaternion = orientation(yaw, pitch, out.quaternion || new THREE.Quaternion());
        out.forward = new THREE.Vector3(0, 0, -1).applyQuaternion(out.quaternion);
        out.right = new THREE.Vector3(1, 0, 0).applyQuaternion(out.quaternion);
        out.up = new THREE.Vector3(0, 1, 0).applyQuaternion(out.quaternion);
        out.yaw = yaw;
        out.pitch = pitch;
        return out;
    }

    // --- Generación -----------------------------------------------------------

    _ensure(s) {
        while (this.endS < s) {
            if (!this.pieces.length) this._plan();
            const piece = this.pieces[0];
            this._sampleStep(piece);
            if (piece.done >= piece.length) this.pieces.shift();
        }
    }

    // Avanza DS metros dentro de una pieza
    _sampleStep(piece) {
        const last = this.samples[this.samples.length - 1];
        piece.done += DS;
        const k = smooth(Math.min(piece.done / piece.length, 1));
        const yaw = piece.yaw0 + (piece.yaw1 - piece.yaw0) * k;
        const pitch = piece.pitch0 + (piece.pitch1 - piece.pitch0) * k;
        // Dirección media del paso (más exacta que usar solo la final)
        const midYaw = (last.yaw + yaw) / 2;
        const midPitch = (last.pitch + pitch) / 2;
        const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(orientation(midYaw, midPitch));
        this.samples.push({ pos: last.pos.clone().addScaledVector(dir, DS), yaw, pitch });
        this.endS += DS;
    }

    // Pieza: durante `length` metros el rumbo/pendiente van de su valor actual
    // a yaw1/pitch1 (con smoothstep).
    _push(length, yaw1 = null, pitch1 = null) {
        const prev = this.pieces.length ? this.pieces[this.pieces.length - 1] : null;
        const last = this.samples[this.samples.length - 1];
        const yaw0 = prev ? prev.yaw1 : last.yaw;
        const pitch0 = prev ? prev.pitch1 : last.pitch;
        this.pieces.push({
            length: Math.max(DS, Math.round(length)),
            done: 0,
            yaw0, pitch0,
            yaw1: yaw1 ?? yaw0,
            pitch1: pitch1 ?? pitch0,
        });
    }

    // Final de lo planificado: s, rumbo y altura
    _planEnd() {
        let s = this.endS;
        this.pieces.forEach((p) => { s += p.length - p.done; });
        const last = this.pieces.length ? this.pieces[this.pieces.length - 1] : this.samples[this.samples.length - 1];
        const yaw = last.yaw1 ?? last.yaw;
        return { s, yaw, y: this.samples[this.samples.length - 1].pos.y };
    }

    // Elige las siguientes piezas
    _plan() {
        const { s, yaw, y } = this._planEnd();
        const cp = checkpointAt(s);
        const level = LEVELS[Math.min(cp, LEVELS.length - 1)];
        const cfg = level.track || { turns: 0, ramps: 0 };
        const nextBoundary = (cp + 1) * CHECKPOINT_LENGTH;

        // Primeros metros de la partida: recto
        if (s < 60) {
            this._push(60 - s + 1);
            return;
        }

        // Cambio de checkpoint: la transición queda centrada en el límite
        const toBoundary = nextBoundary - s;
        if (toBoundary > 0 && toBoundary < 90) {
            if (toBoundary > 25) this._push(toBoundary - 25);
            this._transition(yaw, y);
            return;
        }

        const r = Math.random();
        if (r < cfg.turns) this._turn(yaw, rand(30, 70) * DEG, rand(30, 50));
        else if (r < cfg.turns + cfg.ramps) this._ramp(y, rand(6, 12) * DEG);
        else this._push(rand(25, 50));
    }

    // Curva de `angle` rad a un lado (el que devuelva el rumbo hacia 0 si ya
    // está muy torcido) seguida de una recta para que se lea bien.
    _turn(yaw, angle, length) {
        let dir = sign();
        if (Math.abs(yaw + dir * angle) > MAX_YAW) dir = -dir;
        this._push(length, yaw + dir * angle);
        this._push(rand(15, 30));
    }

    // Rampa: sube (o baja) hasta `pitch`, la mantiene y vuelve a plano
    _ramp(y, pitch) {
        let dir = sign();
        if (y > MAX_RISE / 2) dir = -1;
        if (y < -MAX_RISE / 2) dir = 1;
        this._push(15, null, dir * pitch);
        this._push(rand(8, 20));
        this._push(15, null, 0);
        this._push(rand(10, 20));
    }

    // Transición entre checkpoints: curva cerrada (o curva + rampa)
    _transition(yaw, y) {
        if (Math.random() < 0.65) {
            this._turn(yaw, rand(60, 90) * DEG, rand(40, 50));
        } else {
            let dir = sign();
            if (y > MAX_RISE / 2) dir = -1;
            if (y < -MAX_RISE / 2) dir = 1;
            const turnDir = Math.abs(yaw) > 40 * DEG ? -Math.sign(yaw) : sign();
            this._push(20, yaw + turnDir * rand(25, 45) * DEG, dir * rand(8, 12) * DEG);
            this._push(rand(8, 15));
            this._push(20, null, 0);
            this._push(15);
        }
    }
}
