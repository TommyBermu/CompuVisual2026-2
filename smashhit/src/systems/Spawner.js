/*
    systems/Spawner.js
    ------------------
    Según avanza la cámara, genera tramos de pasillo por delante (hasta
    SPAWN_AHEAD metros) y borra los que quedaron detrás (DESPAWN_BEHIND), para
    que el pasillo sea "infinito" sin acumular objetos.

    Cada tramo se pinta con los colores del nivel al que pertenece, así el
    pasillo del siguiente nivel ya se ve "distinto" desde lejos.

    Además, cada tramo puede tener 1-2 paneles de vidrio (Crystal) que salen del
    suelo al acercarse la cámara. Los golpes de bola se procesan aquí (fuera
    del step de física) y los trozos sueltos los gestiona el Shatter.
*/

import * as CANNON from 'cannon-es';
import Tunnel from '../entities/Tunnel.js';
import Crystal from '../entities/Crystal.js';
import Shatter from './Shatter.js';
import { checkpointAt, LEVELS } from '../levels.js';
import {
    SEGMENT_LENGTH, SPAWN_AHEAD, DESPAWN_BEHIND, CRYSTAL_WALL_CHANCE,
    CRYSTAL_RISE_AHEAD, CAMERA_RADIUS, CRASH_BREAK_RADIUS,
} from '../constants.js';

export default class Spawner {
    constructor(renderer, physics) {
        this.renderer = renderer;
        this.physics = physics;
        this.shatter = new Shatter(renderer, physics);
        this.segments = [];
        this.crystals = [];
        this.onCrystalBroken = null; // callback(crystal) cuando una bola rompe un cristal
        // Primer tramo empieza un tramo detrás de la cámara (z=0), así los
        // arcos caen justo en múltiplos de SEGMENT_LENGTH = inicios de nivel.
        this.nextZ = SEGMENT_LENGTH;
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

            // No ponemos muros en los primeros tramos (para no aparecer encima
            // del jugador nada más empezar) y luego, al azar, 1 o 2 por tramo.
            if (this.count > 2 && Math.random() < CRYSTAL_WALL_CHANCE) {
                const wallZ = this.nextZ - SEGMENT_LENGTH / 2;        // centro del tramo
                const howMany = Math.random() < 0.4 ? 2 : 1;         // a veces dos muros
                for (let k = 0; k < howMany; k++) {
                    const crystal = new Crystal(this.physics, wallZ, level);
                    crystal.addTo(this.renderer, this.physics);
                    this.crystals.push(crystal);
                }
            }

            this.nextZ -= SEGMENT_LENGTH;
        }

        // Animar los paneles y procesar los golpes de bola de este frame (rompen
        // el vidrio). La primera vez que una bola rompe un panel se avisa
        // (recompensa +bolas). Los paneles que ya no tienen trozos se borran.
        this.crystals.forEach((c) => {
            const hits = c.processHits(this.shatter);
            if (hits > 0 && !c.broken) {
                c.broken = true;
                if (this.onCrystalBroken) this.onCrystalBroken(c);
            }
            if (!c.rising && c.z > cameraZ - CRYSTAL_RISE_AHEAD) c.startRising();
            c.update(delta);
        });
        this.shatter.update(delta, cameraZ);

        // Borrar los tramos que quedaron detrás (su final ya pasó la cámara)
        while (this.segments.length && this.segments[0].endZ > cameraZ + DESPAWN_BEHIND) {
            this.segments.shift().destroy(this.renderer, this.physics);
        }

        // Borrar los paneles que quedaron detrás o que ya se rompieron del todo.
        this.crystals = this.crystals.filter((c) => {
            if (c.z > cameraZ + DESPAWN_BEHIND || c.empty) {
                c.destroy(this.renderer, this.physics);
                return false;
            }
            return true;
        });
    }

    // ¿La cámara (una esfera de radio CAMERA_RADIUS) toca vidrio sólido?
    // Se mira cada TROZO que sigue en pie (un panel roto a medias sigue
    // golpeando por su parte sana) y los bloques grandes que se están cayendo.
    // Devuelve { crystal, x, y } | { chunk } | null. El Game aplica la
    // penalización y el tiempo de gracia entre golpes.
    cameraCollision(camera) {
        const p = camera.position;
        for (const c of this.crystals) {
            if (Math.abs(c.z - p.z) > CAMERA_RADIUS + 1) continue; // descarte rápido
            const hit = c.closestSolid(p);
            if (hit && hit.dist <= CAMERA_RADIUS) return { crystal: c, x: hit.x, y: hit.y };
        }
        const chunk = this.shatter.chunkTouching(p, CAMERA_RADIUS);
        return chunk ? { chunk } : null;
    }

    // La cámara atraviesa el vidrio con el que chocó: lo rompe donde lo tocó.
    breakByCamera(hit, cameraVelocity) {
        // Los trozos salen hacia delante, algo más rápido que la cámara, para
        // no "arrastrarlos" con ella.
        const ahead = new CANNON.Vec3(cameraVelocity.x, cameraVelocity.y, cameraVelocity.z).scale(1.3);
        if (hit.crystal) {
            hit.crystal.breakAt(hit.x, hit.y, CRASH_BREAK_RADIUS, CAMERA_RADIUS * 1.15, this.shatter, {
                push: ahead.vadd(new CANNON.Vec3(0, 0, -2)),
                spread: 2,
                fallPush: ahead.scale(0.5),
            });
        } else if (hit.chunk) {
            this.shatter.shatterChunk(hit.chunk, ahead);
        }
    }

    // Objetos contra los que se apunta (InputManager/Shooter): pasillo + paneles
    aimTargets() {
        return [...this.segments.map((s) => s.mesh), ...this.crystals.map((c) => c.mesh)];
    }

    // Para reiniciar partida
    clear() {
        this.segments.forEach((s) => s.destroy(this.renderer, this.physics));
        this.crystals.forEach((c) => c.destroy(this.renderer, this.physics));
        this.shatter.clear();
        this.segments = [];
        this.crystals = [];
        this.nextZ = SEGMENT_LENGTH;
        this.count = 0;
    }
}
