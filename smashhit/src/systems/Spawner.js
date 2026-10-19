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
import { levelIndexAt } from '../levels.js';
import { SEGMENT_LENGTH, SPAWN_AHEAD, DESPAWN_BEHIND } from '../constants.js';

export default class Spawner {
    constructor(renderer, physics) {
        this.renderer = renderer;
        this.physics = physics;
        this.segments = [];
        // Primer tramo empieza un tramo detrás de la cámara (z=0), así los
        // arcos caen justo en múltiplos de SEGMENT_LENGTH = inicios de nivel.
        this.nextZ = SEGMENT_LENGTH;
        this.count = 0;
    }

    update(cameraZ) {
        // Generar por delante (z más negativo = más adelante)
        while (this.nextZ > cameraZ - SPAWN_AHEAD) {
            const midDistance = -(this.nextZ - SEGMENT_LENGTH / 2); // distancia del centro del tramo
            const level = levelIndexAt(Math.max(0, midDistance));
            const seg = new Tunnel(this.physics, this.nextZ, level, this.count++);
            seg.addTo(this.renderer, this.physics);
            this.segments.push(seg);
            this.nextZ -= SEGMENT_LENGTH;
        }

        // Borrar los que quedaron detrás (su final ya pasó la cámara)
        while (this.segments.length && this.segments[0].endZ > cameraZ + DESPAWN_BEHIND) {
            this.segments.shift().destroy(this.renderer, this.physics);
        }
    }

    // Para reiniciar partida
    clear() {
        this.segments.forEach((s) => s.destroy(this.renderer, this.physics));
        this.segments = [];
        this.nextZ = SEGMENT_LENGTH;
        this.count = 0;
    }
}
