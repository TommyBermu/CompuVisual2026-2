/*
    systems/Spawner.js
    ------------------
    Según avanza la cámara, genera tramos de pasillo por delante (hasta
    SPAWN_AHEAD metros) y borra los que quedaron detrás (DESPAWN_BEHIND), para
    que el pasillo sea "infinito" sin acumular objetos.

    Cada tramo se pinta con los colores del nivel al que pertenece, así el
    pasillo del siguiente nivel ya se ve "distinto" desde lejos.

    Además, cada tramo puede tener un OBSTÁCULO (src/obstacles/) de uno de los
    tipos que usa su nivel (levels.js -> obstacles): paneles, triángulos,
    compuertas, péndulos o aspas. Los golpes de bola a sus paneles de vidrio se
    procesan aquí (fuera del step de física) y los trozos sueltos los gestiona
    el Shatter.
*/

import * as CANNON from 'cannon-es';
import Tunnel from '../entities/Tunnel.js';
import Shatter from './Shatter.js';
import { createObstacles } from '../obstacles/index.js';
import { checkpointAt, LEVELS } from '../levels.js';
import {
    SEGMENT_LENGTH, SPAWN_AHEAD, DESPAWN_BEHIND, CRYSTAL_WALL_CHANCE,
    CAMERA_RADIUS, CRASH_BREAK_RADIUS,
} from '../constants.js';

// Ningún obstáculo se extiende más de esto en Z desde su centro (descarte rápido)
const OBSTACLE_REACH_Z = 6;
// Metros sin obstáculos delante de la cámara al empezar
const FREE_START = 40;

export default class Spawner {
    constructor(renderer, physics) {
        this.renderer = renderer;
        this.physics = physics;
        this.shatter = new Shatter(renderer, physics);
        this.segments = [];
        this.obstacles = [];
        this.onCrystalBroken = null; // callback(panel) cuando una bola rompe un cristal
        this._startAt(0);
    }

    // El primer tramo empieza un tramo detrás de la cámara (alineado a
    // múltiplos de SEGMENT_LENGTH, así los arcos caen en los inicios de
    // checkpoint) y los primeros FREE_START metros quedan sin obstáculos, para
    // no aparecer encima de uno al empezar (también desde un checkpoint).
    _startAt(cameraZ) {
        this.nextZ = Math.ceil(cameraZ / SEGMENT_LENGTH) * SEGMENT_LENGTH + SEGMENT_LENGTH;
        this.freeUntilZ = cameraZ - FREE_START;
        this.count = 0;
    }

    update(cameraZ, delta = 0) {
        // Generar por delante (z más negativo = más adelante)
        while (this.nextZ > cameraZ - SPAWN_AHEAD) {
            const midDistance = -(this.nextZ - SEGMENT_LENGTH / 2); // distancia del centro del tramo
            // La paleta del tramo = la del checkpoint al que pertenece (tope en la última paleta)
            const level = Math.min(checkpointAt(Math.max(0, midDistance)), LEVELS.length - 1);
            const seg = new Tunnel(this.physics, this.nextZ, level, this.count++);
            seg.addTo(this.renderer, this.physics);
            this.segments.push(seg);

            // Al azar, uno de los tipos del nivel en el centro del tramo
            // (salvo en el tramo libre del inicio).
            const centerZ = this.nextZ - SEGMENT_LENGTH / 2;
            if (centerZ < this.freeUntilZ && Math.random() < CRYSTAL_WALL_CHANCE) {
                const types = LEVELS[level].obstacles;
                const type = types[Math.floor(Math.random() * types.length)];
                for (const ob of createObstacles(type, centerZ, level)) {
                    ob.addTo(this.renderer, this.physics);
                    this.obstacles.push(ob);
                }
            }

            this.nextZ -= SEGMENT_LENGTH;
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
                    if (this.onCrystalBroken) this.onCrystalBroken(panel);
                }
            }
            ob.prunePanels();
            ob.update(delta, cameraZ);
        });
        this.shatter.update(delta, cameraZ);

        // Borrar los tramos que quedaron detrás (su final ya pasó la cámara)
        while (this.segments.length && this.segments[0].endZ > cameraZ + DESPAWN_BEHIND) {
            this.segments.shift().destroy(this.renderer, this.physics);
        }

        // Borrar los obstáculos que quedaron detrás
        this.obstacles = this.obstacles.filter((ob) => {
            if (ob.z - OBSTACLE_REACH_Z > cameraZ + DESPAWN_BEHIND) {
                ob.destroy(this.renderer, this.physics);
                return false;
            }
            return true;
        });
    }

    // ¿La cámara (una esfera de radio CAMERA_RADIUS) toca algo sólido?
    // Se mira cada TROZO de vidrio que sigue en pie (un panel roto a medias
    // sigue golpeando por su parte sana), las partes metálicas que pueden
    // cerrar el paso (compuertas) y los bloques grandes que se están cayendo.
    // Devuelve { panel, x, y } | { obstacle } | { chunk } | null. El Game
    // aplica la penalización y el tiempo de gracia entre golpes.
    cameraCollision(camera) {
        const p = camera.position;
        for (const ob of this.obstacles) {
            if (Math.abs(ob.z - p.z) > OBSTACLE_REACH_Z + CAMERA_RADIUS) continue; // descarte rápido
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
        const ahead = new CANNON.Vec3(cameraVelocity.x, cameraVelocity.y, cameraVelocity.z).scale(1.3);
        if (hit.panel) {
            const launch = {
                push: ahead.vadd(new CANNON.Vec3(0, 0, -2)),
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

    // Para reiniciar partida (cameraZ = donde arranca la cámara)
    clear(cameraZ = 0) {
        this.segments.forEach((s) => s.destroy(this.renderer, this.physics));
        this.obstacles.forEach((ob) => ob.destroy(this.renderer, this.physics));
        this.shatter.clear();
        this.segments = [];
        this.obstacles = [];
        this._startAt(cameraZ);
    }
}
