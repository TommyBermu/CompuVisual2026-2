/*
    systems/Spawner.js
    ------------------
    Según avanza la cámara por el recorrido (systems/Track.js), genera tramos
    de pasillo por delante (hasta SPAWN_AHEAD metros) y borra los que quedaron
    detrás (DESPAWN_BEHIND), para que el pasillo sea "infinito" sin acumular
    objetos. Todo se mide en s = metros a lo largo del recorrido (el pasillo
    gira y sube, así que una coordenada fija como z ya no sirve).

    Cada tramo se pinta con los colores del nivel al que pertenece, así el
    pasillo del siguiente nivel ya se ve "distinto" desde lejos.

    En cada tramo puede haber:
        - un OBSTÁCULO de vidrio (src/obstacles/) en el centro, de uno de los
          tipos que usa su nivel (levels.js -> obstacles), con su variante al azar;
        - RELLENO sólido (Props) cerca del arco de entrada (levels.js -> props);
        - a veces un CRISTAL DE PODER (obstacles/PowerUp.js) flotando en un
          hueco libre, más a menudo en los últimos checkpoints.

    Los golpes de bola a los paneles se procesan aquí (fuera del step de
    física) y los trozos sueltos los gestiona el Shatter. Romper un cristal
    normal avisa con onCrystalBroken(panel); uno de poder, con
    onPowerCrystalBroken(tipo, panel) (sin el premio de bolas).

    `view` (lo da el Game) = { s, position, forward, floorY } de la cámara.
*/

import * as CANNON from 'cannon-es';
import Tunnel from '../entities/Tunnel.js';
import Shatter from './Shatter.js';
import { createObstacles, createProps } from '../obstacles/index.js';
import PowerUp from '../obstacles/PowerUp.js';
import { checkpointAt, LEVELS } from '../levels.js';
import {
    SEGMENT_LENGTH, SPAWN_AHEAD, DESPAWN_BEHIND, CRYSTAL_WALL_CHANCE,
    CAMERA_RADIUS, CRASH_BREAK_RADIUS, POWER_CHANCE, POWER_MIN_GAP,
} from '../constants.js';

// Ningún obstáculo se extiende más de esto (en s) desde su centro (descarte rápido)
const OBSTACLE_REACH = 7;
// Metros sin obstáculos delante de la cámara al empezar
const FREE_START = 40;
// Dónde va el relleno dentro del tramo (metros desde su inicio)
const PROPS_AT = 3;
// Dónde va el cristal de poder si el tramo tiene obstáculo: en el hueco entre
// el obstáculo (centro ± ~5 m) y el relleno del tramo siguiente
const POWER_GAP_AT = 17.5;

export default class Spawner {
    constructor(renderer, physics, track) {
        this.renderer = renderer;
        this.physics = physics;
        this.track = track;
        this.shatter = new Shatter(renderer, physics);
        this.segments = [];
        this.obstacles = [];
        this.onCrystalBroken = null; // callback(panel) cuando una bola rompe un cristal
        this.onPowerCrystalBroken = null; // callback(tipo, panel) cuando una bola rompe un cristal de poder
        this._startAt(0);
    }

    // El primer tramo empieza un tramo detrás de la cámara (alineado a
    // múltiplos de SEGMENT_LENGTH, así los arcos caen en los inicios de
    // checkpoint) y los primeros FREE_START metros quedan sin obstáculos, para
    // no aparecer encima de uno al empezar (también desde un checkpoint).
    _startAt(cameraS) {
        this.nextS = Math.floor(cameraS / SEGMENT_LENGTH) * SEGMENT_LENGTH - SEGMENT_LENGTH;
        this.freeUntilS = cameraS + FREE_START;
        this.lastPowerS = -Infinity; // último cristal de poder generado
        this.count = 0;
    }

    update(view, delta = 0) {
        // Generar por delante
        while (this.nextS < view.s + SPAWN_AHEAD) {
            const s0 = this.nextS;
            // La paleta del tramo = la del checkpoint al que pertenece (tope en la última paleta)
            const level = Math.min(checkpointAt(Math.max(0, s0 + SEGMENT_LENGTH / 2)), LEVELS.length - 1);
            const seg = new Tunnel(this.physics, this.track, s0, level, this.count++);
            seg.addTo(this.renderer, this.physics);
            this.segments.push(seg);
            this._populate(s0, level);
            this.nextS += SEGMENT_LENGTH;
        }

        // Procesar los golpes de bola de este frame (rompen el vidrio) y
        // animar los obstáculos. La primera vez que una bola rompe un panel se
        // avisa (recompensa +bolas) y el obstáculo reacciona (p.ej. una
        // compuerta se abre). Los paneles que ya no tienen trozos se borran.
        this.obstacles.forEach((ob) => {
            for (const panel of ob.panels) {
                const hits = panel.processHits(this.shatter);
                if (hits > 0 && !panel.broken) {
                    panel.broken = true;
                    ob.onPanelBroken(panel);
                    if (panel.power) {
                        if (this.onPowerCrystalBroken) this.onPowerCrystalBroken(panel.power, panel);
                    } else if (this.onCrystalBroken) this.onCrystalBroken(panel);
                }
            }
            ob.prunePanels();
            ob.update(delta, view);
        });
        this.shatter.update(delta, view);

        // Borrar los tramos que quedaron detrás (su final ya pasó la cámara)
        while (this.segments.length && this.segments[0].s1 < view.s - DESPAWN_BEHIND) {
            this.segments.shift().destroy(this.renderer, this.physics);
        }

        // Borrar los obstáculos que quedaron detrás
        this.obstacles = this.obstacles.filter((ob) => {
            if (ob.s + OBSTACLE_REACH < view.s - DESPAWN_BEHIND) {
                ob.destroy(this.renderer, this.physics);
                return false;
            }
            return true;
        });
    }

    // Obstáculo de vidrio en el centro del tramo y relleno cerca de la entrada
    _populate(s0, level) {
        const cfg = LEVELS[level];
        const center = s0 + SEGMENT_LENGTH / 2;
        const add = (ob) => {
            ob.addTo(this.renderer, this.physics);
            this.obstacles.push(ob);
        };
        let hasObstacle = false;
        if (center > this.freeUntilS && Math.random() < CRYSTAL_WALL_CHANCE) {
            const type = cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
            createObstacles(type, this.track, center, level).forEach(add);
            hasObstacle = true;
        }
        const propsS = s0 + PROPS_AT;
        if (propsS > this.freeUntilS - 20 && Math.random() < (cfg.props ?? 0.5)) {
            add(createProps(this.track, propsS, level));
        }
        const power = this._maybePower(s0, level, hasObstacle);
        if (power) add(power);
    }

    // A veces, un cristal de poder: en el centro del tramo si quedó libre, o
    // en el hueco detrás del obstáculo. La probabilidad sube con el checkpoint
    // (POWER_CHANCE) y nunca salen dos a menos de POWER_MIN_GAP metros.
    _maybePower(s0, level, hasObstacle) {
        const s = s0 + (hasObstacle ? POWER_GAP_AT : SEGMENT_LENGTH / 2);
        if (s <= this.freeUntilS || s - this.lastPowerS < POWER_MIN_GAP) return null;
        const k = level / Math.max(1, LEVELS.length - 1); // 0 en el primero .. 1 en el último
        const p = POWER_CHANCE[0] + (POWER_CHANCE[1] - POWER_CHANCE[0]) * k;
        if (Math.random() >= p) return null;
        this.lastPowerS = s;
        return new PowerUp(this.track.frameAt(s), level);
    }

    // ¿La cámara (una esfera de radio CAMERA_RADIUS) toca algo sólido?
    // Se mira cada TROZO de vidrio que sigue en pie (un panel roto a medias
    // sigue golpeando por su parte sana), las partes que pueden cerrar el
    // paso (puertas) y los bloques grandes que se están cayendo.
    // Devuelve { panel, x, y } | { obstacle } | { chunk } | null. El Game
    // aplica la penalización y el tiempo de gracia entre golpes.
    cameraCollision(view) {
        const p = view.position;
        for (const ob of this.obstacles) {
            if (Math.abs(ob.s - view.s) > OBSTACLE_REACH + CAMERA_RADIUS) continue; // descarte rápido
            for (const panel of ob.panels) {
                const hit = panel.closestSolid(p);
                if (hit && hit.dist <= CAMERA_RADIUS) return { panel, x: hit.x, y: hit.y };
            }
            if (ob.cameraHit(p, CAMERA_RADIUS)) return { obstacle: ob };
        }
        const chunk = this.shatter.chunkTouching(p, CAMERA_RADIUS);
        return chunk ? { chunk } : null;
    }

    // La cámara atraviesa el vidrio con el que chocó: lo rompe donde lo tocó.
    breakByCamera(hit, cameraVelocity) {
        // Los trozos salen hacia delante, algo más rápido que la cámara, para
        // no "arrastrarlos" con ella.
        const v = new CANNON.Vec3(cameraVelocity.x, cameraVelocity.y, cameraVelocity.z);
        const ahead = v.scale(1.3);
        if (hit.panel) {
            const dir = v.length() > 1e-6 ? v.scale(2 / v.length()) : new CANNON.Vec3();
            const launch = {
                push: ahead.vadd(dir),
                spread: 2,
                fallPush: ahead.scale(0.5),
            };
            if (hit.panel.fragile) hit.panel.shatterAll(hit.x, hit.y, this.shatter, launch);
            else hit.panel.breakAt(hit.x, hit.y, CRASH_BREAK_RADIUS, CAMERA_RADIUS * 1.15, this.shatter, launch);
        } else if (hit.obstacle) {
            hit.obstacle.smashByCamera(this.shatter, ahead);
        } else if (hit.chunk) {
            this.shatter.shatterChunk(hit.chunk, ahead);
        }
    }

    // Objetos contra los que se apunta (InputManager/Shooter): pasillo + obstáculos
    aimTargets() {
        return [...this.segments.map((s) => s.mesh), ...this.obstacles.flatMap((ob) => ob.aimMeshes())];
    }

    // Para reiniciar partida (cameraS = donde arranca la cámara)
    clear(cameraS = 0) {
        this.segments.forEach((s) => s.destroy(this.renderer, this.physics));
        this.obstacles.forEach((ob) => ob.destroy(this.renderer, this.physics));
        this.shatter.clear();
        this.segments = [];
        this.obstacles = [];
        this._startAt(cameraS);
    }
}
