/*
    core/Game.js
    ------------
    El ORQUESTADOR. Equivale a la GameScene de Phaser, pero como Three.js no tiene
    escenas, este archivo cumple ese rol central: une render + física + systems
    y contiene el bucle principal (requestAnimationFrame + delta time).

    Arranque: la escena 3D empieza a renderizarse de fondo y encima aparece el
    MENÚ (ui/Screens.js): jugar, seleccionar nivel (tarjetas con la paleta real
    de cada nivel) y configuración (volúmenes, FOV, sombras, sensibilidad).
    El recorrido real empieza cuando el jugador elige un nivel -> _begin(index).

    Niveles: 9 ambientes fijos (levels.js). El jugador elige UNO en el menú y se
    queda en él (su velocidad + paleta); NO se avanza de nivel con el tiempo.
    ESC pausa/reanuda (detiene avance, física y música).
    Clic/toque dispara una bola (InputManager -> Shooter).
    Próximos pasos: cristales + Shatter, bolas como vida/game over.
*/

import Renderer from './Renderer.js';
import Physics from './Physics.js';
import InputManager from './InputManager.js';
import AudioManager from './AudioManager.js';
import CameraRail from '../systems/CameraRail.js';
import Spawner from '../systems/Spawner.js';
import Shooter from '../systems/Shooter.js';
import HUD from '../ui/HUD.js';
import Screens from '../ui/Screens.js';
import { LEVELS } from '../levels.js';
import { getSettings, onSettingsChange } from '../settings.js';
import { MAX_DELTA } from '../constants.js';
export default class Game {
    constructor(container) {
        this.renderer = new Renderer(container);
        this.physics = new Physics();
        this.audio = new AudioManager();
        this.rail = new CameraRail(this.renderer.camera);
        this.spawner = new Spawner(this.renderer, this.physics);
        this.hud = new HUD(document.getElementById('hud'));

        this.shooter = new Shooter(this.renderer, this.physics, this.rail, this.audio);
        this.shooter.onAmmoChange = (n) => this.hud.setBalls(n);

        this.input = new InputManager(this.renderer.renderer.domElement, this.renderer.camera);
        this.input.onShoot = (dir) => {
            if (this.started && !this.paused) this.shooter.shoot(dir);
        };

        // Menú: al elegir un nivel, empieza el recorrido ahí; pausa gestiona ESC
        this.screens = new Screens(document.getElementById('menu'), {
            audio: this.audio,
            onStart: (levelIndex) => this._begin(levelIndex),
            onResume: () => this._setPaused(false),
            onExitToMenu: () => this._exitToMenu(),
        });

        // ESC: pausar/reanudar durante la partida (no si ya terminó el recorrido)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.started && !this.finished) {
                e.preventDefault();
                this._togglePause();
            }
        });

        // Ajustes en vivo (FOV, sombras) -> al Renderer
        this.renderer.applySettings(getSettings());
        onSettingsChange((s) => this.renderer.applySettings(s));

        this.entities = []; // entidades dinámicas (bolas, fragmentos...) que necesitan sync()
        this.levelIndex = -1;
        this.started = false;
        this.finished = false;
        this.paused = false;
        this.dead = false;
        this.lastTime = 0;
        this._loop = this._loop.bind(this);
    }

    // Mostramos el menú y dejamos el render corriendo de fondo
    start() {
        // Preview de fondo del menú: paleta del primer nivel, cámara quieta
        this.renderer.camera.position.z = -LEVELS[0].start;
        this.renderer.setTheme(LEVELS[0].colors, LEVELS[0].sunIntensity, 0);
        this.spawner.update(this.renderer.camera.position.z);
        this.screens.showMenu();
        requestAnimationFrame(this._loop);
    }

    // Empezar el recorrido en el nivel elegido desde el menú
    _begin(startIndex) {
        this.renderer.camera.position.z = -LEVELS[startIndex].start;
        this.spawner.clear();           // empezar con pasillo limpio
        this.shooter.clear();
        this.rail.resume();             // reactivar el avance (si veníamos de morir/pausa)
        this.rail.resetDistance();      // el contador de distancia arranca de cero
        this.hud.setBalls(this.shooter.ammo);
        this.hud.hideDamage();
        this.levelIndex = -1;
        this.finished = false;
        this.dead = false;
        this.started = true;
        this.audio.startMusic();
        this.hud.show();
        this.spawner.update(this.renderer.camera.position.z); // generar el primer tramo
        this._setLevel(startIndex);
    }

    // Entrar a un nivel: fija su velocidad y su paleta. Como cada partida se
    // juega en UN solo nivel, el cambio de paleta es instantáneo (duración 0).
    _setLevel(index) {
        const level = LEVELS[index];
        this.levelIndex = index;
        this.rail.setSpeed(level.speed);
        this.renderer.setTheme(level.colors, level.sunIntensity, 0);
        this.hud.setLevel(index + 1, LEVELS.length);
        this.hud.showBanner(`Nivel ${index + 1} · ${level.name}`);
    }

    _finish() {
        this.rail.pause();
        this.hud.showBanner('¡Recorrido completado!', 4000);
    }

    // Muerte: la cámara tocó un cristal. Para el avance, marco rojo, explosión
    // de bolas (estilo Sonic) y, tras unos segundos, vuelta al menú.
    _die() {
        if (this.dead) return;
        this.dead = true;
        this.rail.pause();
        this.hud.showDamage();
        this.hud.showBanner('¡Chocaste!', 2500);
        this.shooter.scatter();        // lluvia de bolas
        this.audio.playSfx('shoot');   // golpe (reusa el SFX por ahora)
        this.audio.stopMusic();
        setTimeout(() => this._exitToMenu(), 2800);
    }

    // --- Pausa (ESC) ---------------------------------------------------------
    _togglePause() {
        this._setPaused(!this.paused);
    }

    _setPaused(paused) {
        if (this.paused === paused) return;
        this.paused = paused;
        if (paused) {
            this.screens.showPause(); // overlay con Reanudar / Salir al menú
            this.audio.stopMusic();
        } else {
            this.screens.hide();
            this.audio.startMusic();
            this.lastTime = 0; // reinicia el delta para no "saltar" tras la pausa
        }
    }

    // Salir de la partida y volver al menú principal
    _exitToMenu() {
        this.paused = false;
        this.started = false;
        this.finished = false;
        this.dead = false;
        this.rail.pause();
        this.shooter.clear();
        this.spawner.clear();
        this.hud.hide();
        this.hud.hideDamage();
        this.audio.stopMusic();
        // Devolver el fondo al preview del primer nivel
        this.renderer.camera.position.z = -LEVELS[0].start;
        this.levelIndex = -1;
        this.renderer.setTheme(LEVELS[0].colors, LEVELS[0].sunIntensity, 0);
        this.spawner.update(this.renderer.camera.position.z);
        this.screens.showMenu();
    }

    _loop(time) {
        const delta = this.lastTime ? Math.min((time - this.lastTime) / 1000, MAX_DELTA) : 0;
        this.lastTime = time;

        // En pausa: congela todo (física, cámara, spawn) pero sigue dibujando
        if (this.paused) {
            this.renderer.render();
            requestAnimationFrame(this._loop);
            return;
        }

        if (this.started && !this.dead) {
            this.rail.update(delta);                              // 1. avanza la cámara
        }
        this.renderer.followCamera();                         //    (el sol la sigue)
        this.renderer.update(delta);                          //    (transición de colores)
        this.spawner.update(this.renderer.camera.position.z, delta); // 2. genera/borra/anima pasillo
        this.physics.step(delta);                             // 3. avanza la física
        this.shooter.update(delta);                           // 4. body -> mesh de bolas + limpieza
        this.entities.forEach((e) => e.sync());               //    (y del resto de entidades)

        // 5. ¿la cámara tocó un cristal? -> muerte
        if (this.started && !this.dead && this.spawner.hitCamera(this.renderer.camera)) {
            this._die();
        }

        // 6. HUD: distancia recorrida en el nivel actual
        if (this.started && !this.dead) {
            this.hud.setDistance(this.rail.distance);
        }

        this.renderer.render();                               // 7. dibuja
        requestAnimationFrame(this._loop);
    }
}
