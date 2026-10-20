/*
    core/Game.js
    ------------
    El ORQUESTADOR. Equivale a la GameScene de Phaser, pero como Three.js no tiene
    escenas, este archivo cumple ese rol central: une render + física + systems
    y contiene el bucle principal (requestAnimationFrame + delta time).

    Arranque: la escena 3D empieza a renderizarse de fondo y encima aparece el
    MENÚ (ui/Screens.js): jugar, elegir checkpoint y configuración.
    El recorrido real empieza al pulsar jugar / elegir checkpoint -> _begin(cp).

    Recorrido LINEAL y continuo, dividido en checkpoints de 500 m (0..9). Al
    cruzar cada checkpoint cambia el ambiente (paleta + velocidad). Las bolas son
    munición Y vida: disparar cuesta 1; romper un cristal con un disparo da +3;
    chocar de frente contra un cristal resta (5 + N) bolas (N = checkpoint) y
    tumba ese cristal. Si las bolas llegan a 0 -> game over. Llegar al final
    (TOTAL_LENGTH) completa el recorrido.
    ESC pausa/reanuda. Clic/toque dispara una bola (InputManager -> Shooter).
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
import { checkpointAt, checkpointStart, ambienceFor, TOTAL_LENGTH } from '../levels.js';
import { getSettings, onSettingsChange } from '../settings.js';
import { MAX_DELTA, CRASH_PENALTY_BASE, CRYSTAL_BREAK_REWARD } from '../constants.js';
export default class Game {
    constructor(container) {
        this.renderer = new Renderer(container);
        this.physics = new Physics();
        this.audio = new AudioManager();
        this.rail = new CameraRail(this.renderer.camera);
        this.spawner = new Spawner(this.renderer, this.physics);
        this.hud = new HUD(document.getElementById('hud'));

        this.shooter = new Shooter(this.renderer, this.physics, this.rail, this.audio);
        this.shooter.onAmmoChange = (n) => {
            this.hud.setBalls(n);
            // Las bolas son vida: si se acaban durante la partida, game over.
            if (this.started && !this.dead && n <= 0) this._gameOver();
        };

        // Romper un cristal con un disparo premia con bolas (+CRYSTAL_BREAK_REWARD)
        this.spawner.onCrystalBroken = () => {
            this.shooter.addAmmo(CRYSTAL_BREAK_REWARD);
            this.hud.showBanner(`+${CRYSTAL_BREAK_REWARD}`, 700);
        };

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
        this.checkpoint = -1;
        this.started = false;
        this.finished = false;
        this.paused = false;
        this.dead = false;
        this.lastTime = 0;
        this._loop = this._loop.bind(this);
    }

    // Mostramos el menú y dejamos el render corriendo de fondo
    start() {
        // Preview de fondo del menú: ambiente del checkpoint 0, cámara quieta
        this.renderer.camera.position.z = 0;
        const amb = ambienceFor(0);
        this.renderer.setTheme(amb.colors, amb.sunIntensity, 0);
        this.spawner.update(this.renderer.camera.position.z);
        this.screens.showMenu();
        requestAnimationFrame(this._loop);
    }

    // Empezar el recorrido lineal desde el checkpoint elegido en el menú.
    _begin(startCheckpoint) {
        const startDistance = checkpointStart(startCheckpoint);
        this.renderer.camera.position.z = -startDistance;
        this.spawner.clear();           // empezar con pasillo limpio
        this.shooter.clear();
        this.rail.resume();             // reactivar el avance (si veníamos de morir/pausa)
        this.rail.resetDistance();      // el contador arranca; la distancia se calcula con offset
        this.startDistance = startDistance;
        this.hud.setBalls(this.shooter.ammo);
        this.hud.hideDamage();
        this.checkpoint = -1;
        this.finished = false;
        this.dead = false;
        this.started = true;
        this.audio.startMusic();
        this.hud.show();
        this.spawner.update(this.renderer.camera.position.z); // generar el primer tramo
        this._setAmbience(startCheckpoint);
    }

    // Entrar a un checkpoint: fija velocidad + paleta + cartel. Transición suave
    // salvo en el primero de la partida (instantánea).
    _setAmbience(checkpoint) {
        const first = this.checkpoint < 0;
        const amb = ambienceFor(checkpoint);
        this.checkpoint = checkpoint;
        this.rail.setSpeed(amb.speed);
        this.renderer.setTheme(amb.colors, amb.sunIntensity, first ? 0 : 2);
        this.hud.setLevel(checkpoint, 9); // muestra "Checkpoint N/9"
        this.hud.showBanner(amb.name);
    }

    _finish() {
        if (this.finished) return;
        this.finished = true;
        this.rail.pause();
        this.hud.showBanner('¡Recorrido completado!', 4000);
        this.audio.stopMusic();
        setTimeout(() => this._exitToMenu(), 4200);
    }

    // Game over: se acabaron las bolas. Marco rojo, lluvia de bolas (estilo
    // Sonic) y, tras unos segundos, vuelta al menú.
    _gameOver() {
        if (this.dead) return;
        this.dead = true;
        this.rail.pause();
        this.hud.showDamage();
        this.hud.showBanner('¡Sin bolas!', 2500);
        this.shooter.scatter();        // lluvia de bolas
        this.audio.playSfx('shoot');
        this.audio.stopMusic();
        setTimeout(() => this._exitToMenu(), 2800);
    }

    // El jugador chocó de frente con un cristal: pierde (5 + N) bolas y el
    // cristal se cae (como si lo hubiera golpeado una bola).
    _crashInto(crystal) {
        const penalty = CRASH_PENALTY_BASE + this.checkpoint; // N = checkpoint actual
        this.shooter.addAmmo(-penalty);
        this.hud.showBanner(`-${penalty}`, 900);
        this.hud.flashDamage();        // destello rojo breve
        this.audio.playSfx('shoot');
        crystal.hit = true;            // que el Spawner lo tumbe (sin premiar, va charged)
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
        // Devolver el fondo al preview del checkpoint 0
        this.renderer.camera.position.z = 0;
        this.checkpoint = -1;
        const amb = ambienceFor(0);
        this.renderer.setTheme(amb.colors, amb.sunIntensity, 0);
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

        // 5. distancia total en el recorrido = base del checkpoint inicial + avance
        if (this.started && !this.dead && !this.finished) {
            const distance = (this.startDistance || 0) + this.rail.distance;

            // ¿cruzamos a un nuevo checkpoint? -> nuevo ambiente
            const cp = checkpointAt(distance);
            if (cp !== this.checkpoint) this._setAmbience(cp);

            // ¿chocamos de frente con un cristal? -> penalización de bolas
            const crystal = this.spawner.crystalHittingCamera(this.renderer.camera);
            if (crystal) this._crashInto(crystal);

            // ¿llegamos al final del recorrido?
            if (distance >= TOTAL_LENGTH) this._finish();

            this.hud.setDistance(distance);
        }

        this.renderer.render();                               // 7. dibuja
        requestAnimationFrame(this._loop);
    }
}
