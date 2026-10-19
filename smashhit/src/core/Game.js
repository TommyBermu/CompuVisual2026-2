/*
    core/Game.js
    ------------
    El ORQUESTADOR. Equivale a la GameScene de Phaser, pero como Three.js no tiene
    escenas, este archivo cumple ese rol central: une render + física + systems
    y contiene el bucle principal (requestAnimationFrame + delta time).

    Recorrido: 9 niveles fijos (levels.js) de ~30 s cada uno. Al entrar a un
    nivel sube la velocidad y cambia la paleta de colores. Al terminar el
    nivel 9 la cámara se detiene: recorrido completado.
    Próximos pasos: Shooter (disparo), cristales + Shatter, bolas/game over.
*/

import Renderer from './Renderer.js';
import Physics from './Physics.js';
import CameraRail from '../systems/CameraRail.js';
import Spawner from '../systems/Spawner.js';
import HUD from '../ui/HUD.js';
import { LEVELS, TOTAL_LENGTH, levelIndexAt } from '../levels.js';
import { MAX_DELTA, THEME_TRANSITION } from '../constants.js';

export default class Game {
    constructor(container) {
        this.renderer = new Renderer(container);
        this.physics = new Physics();
        this.rail = new CameraRail(this.renderer.camera);
        this.spawner = new Spawner(this.renderer, this.physics);
        this.hud = new HUD(document.getElementById('hud'));

        this.entities = []; // entidades dinámicas (bolas, fragmentos...) que necesitan sync()
        this.levelIndex = -1;
        this.finished = false;
        this.lastTime = 0;
        this._loop = this._loop.bind(this);
    }

    start() {
        // Atajo para probar: index.html?nivel=5 empieza directamente en el nivel 5
        const n = parseInt(new URLSearchParams(window.location.search).get('nivel'), 10);
        const startIndex = n >= 1 && n <= LEVELS.length ? n - 1 : 0;
        this.renderer.camera.position.z = -LEVELS[startIndex].start;

        this._setLevel(startIndex);
        requestAnimationFrame(this._loop);
    }

    // Entrar a un nivel: nueva velocidad + nueva paleta (instantánea solo en el primero)
    _setLevel(index) {
        const first = this.levelIndex < 0;
        const level = LEVELS[index];
        this.levelIndex = index;
        this.rail.setSpeed(level.speed);
        this.renderer.setTheme(level.colors, level.sunIntensity, first ? 0 : THEME_TRANSITION);
        this.hud.setLevel(index + 1, LEVELS.length);
        this.hud.showBanner(`Nivel ${index + 1} · ${level.name}`);
    }

    _finish() {
        this.finished = true;
        this.rail.pause();
        this.hud.showBanner('¡Recorrido completado!', 4000);
    }

    _loop(time) {
        const delta = this.lastTime ? Math.min((time - this.lastTime) / 1000, MAX_DELTA) : 0;
        this.lastTime = time;

        this.rail.update(delta);                              // 1. avanza la cámara
        this.renderer.followCamera();                         //    (el sol la sigue)
        this.renderer.update(delta);                          //    (transición de colores)
        this.spawner.update(this.renderer.camera.position.z); // 2. genera/borra pasillo
        this.physics.step(delta);                             // 3. avanza la física
        this.entities.forEach((e) => e.sync());               // 4. body -> mesh

        // 5. ¿cambiamos de nivel o terminamos?
        const distance = this.rail.distance;
        if (!this.finished) {
            if (distance >= TOTAL_LENGTH) this._finish();
            else {
                const index = levelIndexAt(distance);
                if (index !== this.levelIndex) this._setLevel(index);
            }
        }
        this.hud.setDistance(distance);

        this.renderer.render();                               // 6. dibuja
        requestAnimationFrame(this._loop);
    }
}
