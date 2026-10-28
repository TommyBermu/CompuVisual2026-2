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
        - RELLENO sólido (Props) cerca del arco de entrada (levels.js -> props).

    Los golpes de bola a los paneles se procesan aquí (fuera del step de
    física) y los trozos sueltos los gestiona el Shatter.

    `view` (lo da el Game) = { s, position, forward, floorY } de la cámara.
*/

import * as CANNON from 'cannon-es';
import Tunnel from '../entities/Tunnel.js';
import Pyramid from '../entities/Pyramid.js';
import Shatter from './Shatter.js';
import { createObstacles, createProps } from '../obstacles/index.js';
import { checkpointAt, LEVELS } from '../levels.js';
import { environmentFor, needsPortal, portalHeight, bottomY } from '../environments.js';
import {
    SEGMENT_LENGTH, SPAWN_AHEAD, DESPAWN_BEHIND, CRYSTAL_WALL_CHANCE,
    CAMERA_RADIUS, CRASH_BREAK_RADIUS, TUNNEL_WIDTH, WALL_THICKNESS,
} from '../constants.js';

// Ningún obstáculo se extiende más de esto (en s) desde su centro (descarte rápido)
const OBSTACLE_REACH = 7;
// Metros sin obstáculos delante de la cámara al empezar
const FREE_START = 40;
// Isla de suelo dentro de cada tramo en los entornos con vacío (igual que Tunnel.js)
const ISLAND_START = 0.5;
const ISLAND_END = 15.5;
// Dónde va el relleno dentro del tramo (metros desde su inicio)
const PROPS_AT = 3;
// Probabilidad de pirámides (bonus) en cada tramo
const PYRAMID_CHANCE = 0.75;

export default class Spawner {
    constructor(renderer, physics, track) {
        this.renderer = renderer;
        this.physics = physics;
        this.track = track;
        this.shatter = new Shatter(renderer, physics);
        this.segments = [];
        this.obstacles = [];
        this.pyramids = []; // bonus: las únicas que dan bolas
        this.onCrystalBroken = null; // callback(panel) cuando una bola rompe un cristal
        this._startAt(0);
    }

    // El primer tramo empieza un tramo detrás de la cámara (alineado a
    // múltiplos de SEGMENT_LENGTH, así los arcos caen en los inicios de
    // checkpoint) y los primeros FREE_START metros quedan sin obstáculos, para
    // no aparecer encima de uno al empezar (también desde un checkpoint).
    _startAt(cameraS) {
        this.nextS = Math.floor(cameraS / SEGMENT_LENGTH) * SEGMENT_LENGTH - SEGMENT_LENGTH;
        this.freeUntilS = cameraS + FREE_START;
        this.count = 0;
        this.lastLevel = undefined; // el primer tramo de la partida no lleva portal de entrada
    }

    update(view, delta = 0) {
        // Generar por delante
        while (this.nextS < view.s + SPAWN_AHEAD) {
            const s0 = this.nextS;
            // La paleta del tramo = la del checkpoint al que pertenece (tope en la última paleta)
            const level = Math.min(checkpointAt(Math.max(0, s0 + SEGMENT_LENGTH / 2)), LEVELS.length - 1);
            // Primer tramo de un entorno nuevo -> gran portal de entrada
            const first = this.lastLevel !== undefined && level !== this.lastLevel;
            this.lastLevel = level;
            const seg = new Tunnel(this.physics, this.track, s0, level, this.count++, { first });
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
                    ob.onPanelBroken(panel); // p.ej. una compuerta se abre
                    // Los cristales normales NO dan bolas: solo las pirámides
                }
            }
            ob.prunePanels();
            ob.update(delta, view);
        });
        // Pirámides (bonus): la que toca una bola revienta y da bolas
        this.pyramids = this.pyramids.filter((p) => {
            p.update(delta);
            if (p.processHits(this.shatter) && this.onCrystalBroken) this.onCrystalBroken(p);
            const behind = p.s < view.s - DESPAWN_BEHIND;
            if (p.broken || behind) {
                p.destroy(this.renderer, this.physics);
                return false;
            }
            return true;
        });
        // Decorado animado del sueño
        this.segments.forEach((seg) => seg.update(delta));

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
        const env = environmentFor(cfg);
        const portal = needsPortal(env);
        const noFloor = env.floor === false;
        const center = s0 + SEGMENT_LENGTH / 2;
        const add = (ob) => {
            // Sin paredes (o paredes bajas/rotas): lo que cuelga de ellas necesita apoyo.
            // En los niveles de sueño, según el nivel (pilares, cables al cielo o
            // trozos flotando); en los demás, un pórtico.
            if (portal && ob.needsSupport) {
                const bottom = Math.min(bottomY(env), 0);
                if (env.supports) ob.addSupports(env.supports, portalHeight(env) + 0.6, bottom, { wide: !!ob.needsWall });
                else ob.addPortal(portalHeight(env), 11.5, !env.ceiling, bottom);
            }
            // Sin suelo: lo que se apoya en él va sobre un fragmento flotante y
            // los paneles ya aparecen fuera (no hay de dónde salir)
            if (noFloor && ob.needsBase) ob.addBase(env.base || 'slab', ob.baseDepth);
            if (noFloor && ob.skipRise) ob.skipRise();
            // Límites para las astillas: rebotan en paredes solo si existen y
            // caen al vacío fuera del suelo
            ob.frame.bounds = {
                wallX: env.walls && !portal ? TUNNEL_WIDTH / 2 - 0.05 : null,
                floorX: noFloor ? -1 : Math.max(TUNNEL_WIDTH / 2 + WALL_THICKNESS, env.outerFloor || 0),
                // Islas: tramo (en z local) donde hay suelo; fuera, vacío
                floorZ: env.islands ? [-(s0 + ISLAND_END - ob.s), -(s0 + ISLAND_START - ob.s)] : null,
                groundY: env.ground ? env.ground.y : null,
            };
            ob.addTo(this.renderer, this.physics);
            this.obstacles.push(ob);
        };
        if (center > this.freeUntilS && Math.random() < CRYSTAL_WALL_CHANCE) {
            // Sin suelo, la mitad de las veces salen vidrios flotando sobre pedestales
            // (sobre todo por debajo de la vista): llenan la parte de abajo del vacío
            const type = noFloor && Math.random() < 0.5
                ? 'floaters'
                : cfg.obstacles[Math.floor(Math.random() * cfg.obstacles.length)];
            createObstacles(type, this.track, center, level).forEach((ob) => {
                add(ob);
                this._perchBonus(ob, level);
            });
        }
        // El relleno (bloques, columnas...) se apoya en el suelo: no en los niveles de sueño
        const propsS = s0 + PROPS_AT;
        if (!noFloor && propsS > this.freeUntilS - 20 && Math.random() < (cfg.props ?? 0.5)) {
            add(createProps(this.track, propsS, level));
        }

        // Bonus de bolas a los lados del camino, fuera del paso de la cámara:
        //  - con suelo, a veces una PIRÁMIDE apoyada en él (+3)
        //  - si no, un ROMBO flotando (+5); sin suelo, muchas veces por debajo de la vista
        if (s0 + 2 > this.freeUntilS - 25 && Math.random() < PYRAMID_CHANCE) {
            const n = Math.random() < 0.35 ? 2 : 1;
            for (let k = 0; k < n; k++) {
                const s = s0 + 2 + Math.random() * (SEGMENT_LENGTH - 4);
                const frame = this.track.frameAt(s);
                const side = Math.random() < 0.5 ? -1 : 1;
                const x = side * (2.3 + Math.random() * 2.4);
                let bonus;
                if (!noFloor && Math.random() < 0.45) {
                    bonus = new Pyramid(frame, level, x, 0, { kind: 'pyramid' });
                } else {
                    const y = noFloor && Math.random() < 0.6 ? -2.5 + Math.random() * 3 : 1.2 + Math.random() * 3.6;
                    bonus = new Pyramid(frame, level, x, y, { kind: 'diamond' });
                }
                this._addBonus(bonus);
            }
        }
    }

    _addBonus(bonus) {
        bonus.addTo(this.renderer, this.physics);
        this.pyramids.push(bonus);
    }

    // A veces se posa una pirámide (+3) en un sitio libre del obstáculo (bordes
    // de su base flotante, pedestales vacíos): apoyada en algo que no es cristal
    _perchBonus(ob, level) {
        if (!ob.perches.length || Math.random() > 0.5) return;
        const p = ob.perches[Math.floor(Math.random() * ob.perches.length)];
        this._addBonus(new Pyramid(ob.frame, level, p.x, p.y, { z: p.z, kind: 'pyramid' }));
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
        return [
            ...this.segments.map((s) => s.mesh),
            ...this.obstacles.flatMap((ob) => ob.aimMeshes()),
            ...this.pyramids.map((p) => p.mesh),
        ];
    }

    // Para reiniciar partida (cameraS = donde arranca la cámara)
    clear(cameraS = 0) {
        this.segments.forEach((s) => s.destroy(this.renderer, this.physics));
        this.obstacles.forEach((ob) => ob.destroy(this.renderer, this.physics));
        this.pyramids.forEach((p) => p.destroy(this.renderer, this.physics));
        this.shatter.clear();
        this.segments = [];
        this.obstacles = [];
        this.pyramids = [];
        this._startAt(cameraS);
    }
}
