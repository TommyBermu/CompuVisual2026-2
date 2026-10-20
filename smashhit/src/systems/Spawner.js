/*
    systems/Spawner.js
    ------------------
    Según avanza la cámara, genera tramos de pasillo por delante (hasta
    SPAWN_AHEAD metros) y borra los que quedaron detrás (DESPAWN_BEHIND), para
    que el pasillo sea "infinito" sin acumular objetos.

    Cada tramo se pinta con los colores del nivel al que pertenece, así el
    pasillo del siguiente nivel ya se ve "distinto" desde lejos.

    Por ahora solo tramos de túnel.
    Más adelante: en cada tramo nuevo, colocar un patrón de cristales/obstáculos
    elegido según el nivel (dificultad).
*/

import Tunnel from '../entities/Tunnel.js';
import Crystal from '../entities/Crystal.js';
import { checkpointAt, LEVELS } from '../levels.js';
import {
    SEGMENT_LENGTH, SPAWN_AHEAD, DESPAWN_BEHIND, CRYSTAL_WALL_CHANCE,
    CRYSTAL_RISE_AHEAD, DEATH_MARGIN_Z, DEATH_MARGIN_X, DEATH_MARGIN_Y,
} from '../constants.js';

export default class Spawner {
    constructor(renderer, physics) {
        this.renderer = renderer;
        this.physics = physics;
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

        // Animar los muros. Si una bola disparada golpeó uno (c.hit), lo
        // tumbamos y avisamos (recompensa +bolas). Un muro tumbado por choque
        // de cámara lleva charged=true y NO premia.
        this.crystals.forEach((c) => {
            if (c.hit && !c.falling) {
                c.knockDown(c._impact);
                if (!c.charged && this.onCrystalBroken) this.onCrystalBroken(c);
            }
            if (!c.rising && !c.falling && c.z > cameraZ - CRYSTAL_RISE_AHEAD) c.startRising();
            c.update(delta);
        });

        // Borrar los tramos que quedaron detrás (su final ya pasó la cámara)
        while (this.segments.length && this.segments[0].endZ > cameraZ + DESPAWN_BEHIND) {
            this.segments.shift().destroy(this.renderer, this.physics);
        }

        // Borrar los muros de cristal que quedaron detrás o que ya cayeron al vacío.
        // (los que caen se filtran en cualquier posición de la lista)
        this.crystals = this.crystals.filter((c) => {
            const behind = c.z > cameraZ + DESPAWN_BEHIND;
            const fell = c.falling && c.body.position.y < -10;
            if (behind || fell) {
                c.destroy(this.renderer, this.physics);
                return false;
            }
            return true;
        });
    }

    // ¿La cámara está tocando un muro de cristal? Devuelve ese cristal (una sola
    // vez por muro, para no cobrar en cada frame) o null. Ya NO mata: el Game
    // decide la penalización de bolas y tumba el cristal.
    crystalHittingCamera(camera) {
        const p = camera.position;
        for (const c of this.crystals) {
            if (c.charged) continue; // ya cobrado
            const box = c.aabb();
            if (!box) continue;
            // La cámara se trata con "volumen": margen en cada eje.
            const inZ = Math.abs(p.z - box.z) <= box.halfZ + DEATH_MARGIN_Z;
            const inX = p.x >= box.minX - DEATH_MARGIN_X && p.x <= box.maxX + DEATH_MARGIN_X;
            const inY = p.y <= box.maxY + DEATH_MARGIN_Y;
            if (inZ && inX && inY) {
                c.charged = true;
                return c;
            }
        }
        return null;
    }

    // Para reiniciar partida
    clear() {
        this.segments.forEach((s) => s.destroy(this.renderer, this.physics));
        this.crystals.forEach((c) => c.destroy(this.renderer, this.physics));
        this.segments = [];
        this.crystals = [];
        this.nextZ = SEGMENT_LENGTH;
        this.count = 0;
    }
}
