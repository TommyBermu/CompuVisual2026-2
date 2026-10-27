/*
    core/Game.js
    ------------
    El ORQUESTADOR. Equivale a la GameScene de Phaser, pero como Three.js no tiene
    escenas, este archivo cumple ese rol central: une render + física + systems
    y contiene el bucle principal (requestAnimationFrame + delta time).

    Arranque: la escena 3D empieza a renderizarse de fondo y encima aparece el
    MENÚ (ui/Screens.js): jugar, elegir checkpoint y configuración.
    El recorrido real empieza al pulsar jugar / elegir checkpoint -> _begin(cp).

    Recorrido continuo con curvas y rampas (systems/Track.js), dividido en
    checkpoints de 500 m (0..9). Todo se mide en s = metros a lo largo del
    recorrido. Al cruzar cada checkpoint cambia el ambiente (paleta +
    velocidad) y el pasillo gira. Las bolas son
    munición Y vida: disparar cuesta 1; romper un cristal con un disparo da +3;
    chocar contra vidrio sólido resta (5 + N) bolas (N = checkpoint) y lo rompe
    donde lo tocó. Si las bolas llegan a 0 -> game over. Llegar al final
    (TOTAL_LENGTH) completa el recorrido.
    ESC pausa/reanuda. Clic/toque dispara una bola (InputManager -> Shooter).

    Cristales de PODER (gemas de colores, ver systems/PowerUps.js): romper
    uno activa triple bola, bolas infinitas, cámara lenta o +bolas. Los
    poderes cuentan en tiempo real, se congelan en la pausa y se apagan al
    morir, terminar o salir al menú. La cámara lenta escala el delta del juego.
*/

import Renderer from './Renderer.js';
import Physics from './Physics.js';
import InputManager from './InputManager.js';
import AudioManager from './AudioManager.js';
import CameraRail from '../systems/CameraRail.js';
import Track from '../systems/Track.js';
import Spawner from '../systems/Spawner.js';
import Shooter from '../systems/Shooter.js';
import PowerUps from '../systems/PowerUps.js';
import HUD from '../ui/HUD.js';
import Screens from '../ui/Screens.js';
import { checkpointAt, checkpointStart, ambienceFor, TOTAL_LENGTH } from '../levels.js';
import { getSettings, onSettingsChange } from '../settings.js';
import { MAX_DELTA, CRASH_PENALTY_BASE, CRYSTAL_BREAK_REWARD, CRASH_COOLDOWN, POWER_BONUS_BALLS } from '../constants.js';
export default class Game {
    constructor(container) {
        this.renderer = new Renderer(container);
        this.physics = new Physics();
        this.audio = new AudioManager();
        this.track = new Track();
        this.rail = new CameraRail(this.renderer.camera, this.track);
        this.spawner = new Spawner(this.renderer, this.physics, this.track);
        this.hud = new HUD(document.getElementById('hud'));

        this.shooter = new Shooter(this.renderer, this.physics, this.rail, this.audio);
        this.shooter.getAimTargets = () => this.spawner.aimTargets(); // para apuntar donde está la mira
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

        // Poderes: el Shooter los consulta al disparar y el HUD muestra lo que queda
        this.powers = new PowerUps();
        this.shooter.powers = this.powers;
        this.powers.onChange = (list) => this.hud.setPowers(list);
        this.spawner.onPowerCrystalBroken = (type) => this._activatePower(type);

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
        this.rail.place(0);
        const amb = ambienceFor(0);
        this.renderer.setTheme(amb.colors, amb.sunIntensity, 0);
        this.spawner.update(this._view());
        this.screens.showMenu();
        requestAnimationFrame(this._loop);
    }

    // Vista de la cámara para los systems: dónde está en el recorrido y hacia dónde mira
    _view() {
        return {
            s: this.rail.s,
            position: this.renderer.camera.position,
            forward: this.rail.forward,
            floorY: this.rail.frame.position.y,
        };
    }

    // Empezar el recorrido desde el checkpoint elegido en el menú.
    _begin(startCheckpoint) {
        const startDistance = checkpointStart(startCheckpoint);
        this.spawner.clear(startDistance); // empezar con pasillo limpio desde ahí
        this.track.reset();                // cada partida tiene curvas distintas
        this.rail.place(startDistance);
        this.shooter.clear();
        this.powers.clear();
        this.rail.resume();             // reactivar el avance (si veníamos de morir/pausa)
        this.hud.setBalls(this.shooter.ammo);
        this.hud.hideDamage();
        this.checkpoint = -1;
        this.crashCooldown = 0;
        this.finished = false;
        this.dead = false;
        this.started = true;
        this.audio.startMusic();
        this.hud.show();
        this.spawner.update(this._view()); // generar el primer tramo
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
        this.powers.clear();
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
        this.powers.clear();
        this.hud.showDamage();
        this.hud.showBanner('¡Sin bolas!', 2500);
        this.shooter.scatter();        // lluvia de bolas
        this.audio.playSfx('shoot');
        this.audio.stopMusic();
        setTimeout(() => this._exitToMenu(), 2800);
    }

    // Una bola rompió un cristal de poder: activarlo (+bolas al instante si es el bonus)
    _activatePower(type) {
        if (!this.started || this.dead || this.finished) return;
        const def = this.powers.activate(type);
        if (!def) return;
        if (type === 'bonus') this.shooter.addAmmo(POWER_BONUS_BALLS);
        this.hud.showPower(def.duration ? `¡${def.name}!` : def.name, def.color);
        this.audio.playSfx('power');
    }

    // El jugador chocó con vidrio sólido (un trozo de panel o un bloque que
    // cae): pierde (5 + N) bolas y rompe el vidrio donde lo tocó. Después hay
    // un pequeño tiempo de gracia; pasado ese tiempo, cualquier otro trozo
    // sólido que se cruce (p.ej. un bloque que rebotó) vuelve a golpear.
    _crashInto(hit) {
        const penalty = CRASH_PENALTY_BASE + this.checkpoint; // N = checkpoint actual
        this.shooter.addAmmo(-penalty);
        this.hud.showBanner(`-${penalty}`, 900);
        this.hud.flashDamage();        // destello rojo breve
        this.audio.playSfx('shoot');
        this.spawner.breakByCamera(hit, this.rail.velocity);
        this.crashCooldown = CRASH_COOLDOWN;
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
        this.powers.clear();
        this.spawner.clear();
        this.hud.hide();
        this.hud.hideDamage();
        this.audio.stopMusic();
        // Devolver el fondo al preview del checkpoint 0
        this.track.reset();
        this.rail.place(0);
        this.checkpoint = -1;
        const amb = ambienceFor(0);
        this.renderer.setTheme(amb.colors, amb.sunIntensity, 0);
        this.spawner.update(this._view());
        this.screens.showMenu();
    }

    _loop(time) {
        let delta = this.lastTime ? Math.min((time - this.lastTime) / 1000, MAX_DELTA) : 0;
        this.lastTime = time;

        // En pausa: congela todo (física, cámara, spawn) pero sigue dibujando
        if (this.paused) {
            this.renderer.render();
            requestAnimationFrame(this._loop);
            return;
        }

        // Poderes: cuentan en tiempo real; la cámara lenta escala el delta del juego
        if (this.started && !this.dead) this.powers.update(delta);
        delta *= this.powers.timeScale;

        if (this.started && !this.dead) {
            this.rail.update(delta);                              // 1. avanza la cámara
        }
        this.renderer.followCamera();                         //    (el sol la sigue)
        this.renderer.update(delta);                          //    (transición de colores)
        this.physics.step(delta);                             // 2. avanza la física
        const view = this._view();
        this.spawner.update(view, delta);                     // 3. genera/borra pasillo, rompe vidrio
        this.shooter.update(delta, view);                     // 4. body -> mesh de bolas + limpieza
        this.entities.forEach((e) => e.sync());               //    (y del resto de entidades)

        // 5. distancia recorrida = s de la cámara en el recorrido
        if (this.started && !this.dead && !this.finished) {
            const distance = this.rail.distance;

            // ¿cruzamos a un nuevo checkpoint? -> nuevo ambiente
            const cp = checkpointAt(distance);
            if (cp !== this.checkpoint) this._setAmbience(cp);

            // ¿chocamos con vidrio sólido? -> penalización de bolas (con tiempo de gracia)
            if (this.crashCooldown > 0) {
                this.crashCooldown -= delta;
            } else {
                const hit = this.spawner.cameraCollision(view);
                if (hit) this._crashInto(hit);
            }

            // ¿llegamos al final del recorrido?
            if (distance >= TOTAL_LENGTH) this._finish();

            this.hud.setDistance(distance);
        }

        this.renderer.render();                               // 7. dibuja
        requestAnimationFrame(this._loop);
    }
}
