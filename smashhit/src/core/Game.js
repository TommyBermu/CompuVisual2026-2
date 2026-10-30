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
    munición Y vida: disparar cuesta 1; reventar un bonus con una bola da
    bolas: pirámide apoyada +3, rombo flotante +5 (los cristales normales no dan);
    chocar contra vidrio sólido resta CRASH_PENALTY_BASE bolas (las mismas en
    todos los niveles, como en el original) y lo rompe donde lo tocó. Si las
    bolas llegan a 0 -> game over. Llegar al final (TOTAL_LENGTH) completa el
    recorrido.

    Modo "Sin perder" (mode = 'sinPerder', desde el menú): bolas infinitas y
    nunca hay game over; solo termina en la meta. Lo que daba bolas da puntos
    (NOLOSE_*_POINTS), cada bola disparada resta NOLOSE_SHOT_COST y chocar
    resta NOLOSE_CRASH_PENALTY (la puntuación no baja de 0). No sale la gema
    de bolas infinitas. Su récord se guarda aparte (records.js).
    Puntuación y combo en systems/Score.js; al morir / terminar / salir se
    guarda el récord (records.js) y se enseña la pantalla de resultados.
    ESC pausa/reanuda. Clic/toque dispara una bola (InputManager -> Shooter).

    Cristales de PODER (gemas de colores, ver systems/PowerUps.js): romper
    uno activa triple bola, bolas infinitas, cámara lenta o +bolas. Los
    poderes cuentan en tiempo real, se congelan en la pausa y se apagan al
    morir, terminar o salir al menú. La cámara lenta escala el delta del juego.

    Sonido (AudioManager): música procedural con un tema por checkpoint
    (crossfade al cruzarlo), más baja y filtrada en pausa; vidrio que se rompe
    (eventos del Shatter, paneados según dónde está), choque, campanas de
    checkpoint, game over y recorrido completado.
*/

import Renderer from './Renderer.js';
import { setBallEnvironment } from '../entities/Ball.js';
import Physics from './Physics.js';
import InputManager from './InputManager.js';
import AudioManager from './AudioManager.js';
import CameraRail from '../systems/CameraRail.js';
import Track from '../systems/Track.js';
import Spawner from '../systems/Spawner.js';
import Shooter from '../systems/Shooter.js';
import PowerUps from '../systems/PowerUps.js';
import Score from '../systems/Score.js';
import HUD from '../ui/HUD.js';
import Screens, { MODE_LABELS } from '../ui/Screens.js';
import { checkpointAt, checkpointStart, ambienceFor, TOTAL_LENGTH } from '../levels.js';
import { environmentFor } from '../environments.js';
import { getSettings, onSettingsChange } from '../settings.js';
import { submitRun, getRecords } from '../records.js';
import { unlock, onAchievementUnlocked } from '../achievements.js';
import {
    MAX_DELTA, CRASH_PENALTY_BASE, CRYSTAL_BREAK_REWARD, CRASH_COOLDOWN, POWER_BONUS_BALLS, CHECKPOINT_COUNT,
    NOLOSE_PYRAMID_POINTS, NOLOSE_DIAMOND_POINTS, NOLOSE_POWER_BONUS_POINTS, NOLOSE_SHOT_COST, NOLOSE_CRASH_PENALTY,
} from '../constants.js';
export default class Game {
    constructor(container) {
        this.renderer = new Renderer(container);
        setBallEnvironment(this.renderer.studioEnvironment); // reflejos del cromo de las bolas
        this.physics = new Physics();
        this.audio = new AudioManager();
        this.track = new Track();
        this.rail = new CameraRail(this.renderer.camera, this.track);
        this.spawner = new Spawner(this.renderer, this.physics, this.track);
        // Sonidos del vidrio: el Shatter avisa de cada rotura y de las astillas que caen
        this.audio.setListener(this.renderer.camera);
        this.spawner.shatter.onBreak = (b) => this.audio.playSfx('glass', b);
        this.spawner.shatter.onShardHit = (b) => this.audio.playSfx('shard', b);
        this.hud = new HUD(document.getElementById('hud'));

        // Logros: suscripción para notificaciones y sonido
        onAchievementUnlocked((a) => {
            this.hud.showAchievement(a);
            this.audio.playSfx('powerup', { volume: 0.5 }); // reutilizamos el sonido brillante
        });

        // Puntuación: el Score lleva la cuenta y el HUD la pinta
        this.score = new Score();
        this.score.onChange = (state) => this.hud.setScore(state);
        this.score.onGain = (points, kind, mult) => this.hud.popScore(points, kind, mult);
        this.startCheckpoint = 0;
        this.mode = 'normal'; // 'normal' | 'sinPerder' (lo elige el menú)

        this.shooter = new Shooter(this.renderer, this.physics, this.rail, this.audio);
        this.shooter.getAimTargets = () => this.spawner.aimTargets(); // para apuntar donde está la mira
        this.shooter.onAmmoChange = (n) => {
            this.hud.setBalls(this.noLose ? Infinity : n);
            if (n > 0) this.lastShotPending = false;
            // Define último disparo, espera a que se impacte y verificar si continua o finaliza.
            if (this.started && !this.dead && !this.noLose && n <= 0 && !this.lastShotPending) {
                this._gameOver();
            }
        };
        this.shooter.onVolleyResolved = (volley) => {
            if (!volley.lastAmmo || !this.lastShotPending) return;
            this.lastShotPending = false;
            if (this.started && !this.dead && !this.noLose && this.shooter.ammo <= 0) this._gameOver();
        };
        this.shooter.onMiss = () => this.score.onMiss(); // tiro que no tocó vidrio: pierde el combo

        // Romper un cristal normal suma a la puntuación (pero NO da bolas)
        this.spawner.onCrystalBroken = () => this.score.addHit();
        // Reventar un bonus da bolas: pirámide apoyada +3, rombo flotante +5.
        // En "Sin perder" da puntos. Nada durante el final del recorrido.
        this.spawner.onBonusBroken = (bonus) => {
            if (!this.started || this.dead || this.finished) return;
            if (this.noLose) {
                const pts = bonus?.kind === 'diamond' ? NOLOSE_DIAMOND_POINTS : NOLOSE_PYRAMID_POINTS;
                this.score.addBonusPoints(pts);
                this.hud.showBanner(`+${pts}`, 700);
            } else {
                const n = bonus?.reward ?? CRYSTAL_BREAK_REWARD;
                this.shooter.addAmmo(n);
                this.hud.showBanner(`+${n}`, 700);
            }
            this.score.addHit();
        };

        // Poderes: el Shooter los consulta al disparar y el HUD muestra lo que queda
        this.powers = new PowerUps();
        this.shooter.powers = this.powers;
        this.powers.onChange = (list) => this.hud.setPowers(list);
        this.spawner.onPowerCrystalBroken = (type) => this._activatePower(type);

        this.input = new InputManager(this.renderer.renderer.domElement, this.renderer.camera);
        this.input.onShoot = (dir) => {
            // No se dispara en pausa, tras morir ni durante el final del recorrido
            if (!this.started || this.paused || this.finished || this.dead) return;
            // Define ultimo disparo
            const usesAmmo = !this.shooter.infiniteAmmo && !this.powers.freeShots;
            const lastAmmoShot = usesAmmo && this.shooter.ammo === 1;
            if (lastAmmoShot) this.lastShotPending = true;
            const fired = this.shooter.shoot(dir);      // 
            if (fired <= 0 && lastAmmoShot) this.lastShotPending = false;
            if (fired > 0) this.totalBallsSpent += fired;
            // "Sin perder": cada bola disparada cuesta puntos (triple bola = 3)
            if (this.noLose && fired > 0) this.score.addPenalty(fired * NOLOSE_SHOT_COST, 'shot');
        };

        // Menú: al elegir un nivel, empieza el recorrido ahí; pausa gestiona ESC
        this.screens = new Screens(document.getElementById('menu'), {
            audio: this.audio,
            onStart: (levelIndex, mode) => this._begin(levelIndex, mode),
            onResume: () => this._setPaused(false),
            onExitToMenu: () => this._exitToMenu(),
        });

        // ESC: pausar/reanudar durante la partida (no si ya terminó el recorrido)
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.started && !this.finished && !this.dead) {
                e.preventDefault();
                this._togglePause();
            }
        });

        // Ajustes en vivo (FOV, sombras, niebla) -> al Renderer
        this.renderer.applySettings(getSettings());
        onSettingsChange((s) => this.renderer.applySettings(s));

        this.entities = []; // entidades dinámicas (bolas, fragmentos...) que necesitan sync()
        this.checkpoint = -1;
        this.crashesInCheckpoint = 0; // para el logro 'clean_pass'
        this.totalBallsSpent = 0;     // para el logro 'eco_shooter'
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
        this.renderer.setTheme(amb.colors, amb.sunIntensity, 0, environmentFor(amb));
        this.spawner.update(this._view());
        this.screens.showMenu();
        this.audio.startMusic('menu'); // suena en cuanto el navegador deje (primer clic)
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

    // ¿Partida en modo "Sin perder"?
    get noLose() {
        return this.mode === 'sinPerder';
    }

    // Fija el modo de juego (antes de limpiar/generar: el Spawner y el Shooter lo usan)
    _setMode(mode) {
        this.mode = mode === 'sinPerder' ? 'sinPerder' : 'normal';
        this.shooter.infiniteAmmo = this.noLose;
        this.spawner.excludePowers = this.noLose ? ['infinite'] : []; // ahí ya son infinitas
        this.hud.setMode(this.noLose ? MODE_LABELS.sinPerder : '');
    }

    // Empezar el recorrido desde el checkpoint elegido en el menú, en ese modo.
    _begin(startCheckpoint, mode = 'normal') {
        this._setMode(mode);
        const startDistance = checkpointStart(startCheckpoint);
        this.spawner.clear(startDistance); // empezar con pasillo limpio desde ahí
        this.track.reset();                // cada partida tiene curvas distintas
        this.rail.place(startDistance);
        this.shooter.clear();
        this.powers.clear();
        this.rail.resume();             // reactivar el avance (si veníamos de morir/pausa)
        this.hud.setBalls(this.noLose ? Infinity : this.shooter.ammo);
        this.hud.hideDamage();
        this.checkpoint = -1;
        this.crashesInCheckpoint = 0;
        this.totalBallsSpent = 0;
        this.lastShotPending = false;
        this.crashCooldown = 0;
        this.finished = false;
        this.dead = false;
        this.started = true;
        this.startCheckpoint = startCheckpoint;
        this.score.start(startDistance); // puntuación y combo a cero
        this.audio.setPaused(false);
        this.audio.startMusic(startCheckpoint); // tema del checkpoint (crossfade desde el menú)
        this.hud.show();
        this.spawner.update(this._view()); // generar el primer tramo
        this._setAmbience(startCheckpoint);
    }

    // Entrar a un checkpoint: fija velocidad + paleta + cartel. Transición suave
    // salvo en el primero de la partida (instantánea).
    _setAmbience(checkpoint) {
        const first = this.checkpoint < 0;

        // Logros de checkpoint
        if (checkpoint >= 1) unlock('first_steps');
        if (checkpoint >= 2) unlock('checkpoint_2');
        if (checkpoint >= 3) unlock('checkpoint_3');
        if (checkpoint >= 4) unlock('checkpoint_4');
        if (checkpoint >= 5) unlock('checkpoint_5');
        if (checkpoint >= 8) unlock('checkpoint_8');
        if (checkpoint >= 9) unlock('checkpoint_9');

        // Logro: Paso Limpio (checkpoint entero sin chocar)
        if (!first && this.crashesInCheckpoint === 0) unlock('clean_pass');
        this.crashesInCheckpoint = 0;

        // Logro: Economía de Guerra (cross cp with >= 35 balls)
        if (!first && !this.noLose && this.shooter.ammo >= 35) unlock('war_economy');

        const amb = ambienceFor(checkpoint);
        this.checkpoint = checkpoint;
        this.rail.setSpeed(amb.speed);
        this.rail.setFx(environmentFor(amb).camera, first); // boca abajo / dar vueltas
        this.renderer.setTheme(amb.colors, amb.sunIntensity, first ? 0 : 2, environmentFor(amb));
        this.hud.setLevel(checkpoint, CHECKPOINT_COUNT - 1); // muestra "Checkpoint N/9"
        this.hud.showBanner(amb.name);
        if (!first) this.score.addCheckpoint(); // bono por llegar (no por el de salida)
        // Música del nuevo checkpoint (crossfade) + campanas en su tonalidad
        this.audio.setLevel(checkpoint);
        if (!first) this.audio.playSfx('checkpoint', { level: checkpoint });
    }

    _finish() {
        if (this.finished) return;
        this.finished = true;
        this.rail.pause();
        this.powers.clear();
        this.score.setDistance(this.rail.distance); // los últimos metros, antes de cerrar
        // bono final + bolas que quedan (en "Sin perder" son infinitas: no cuentan)
        this.score.addFinish(this.noLose ? 0 : this.shooter.ammo, this.totalBallsSpent, this.noLose);
        const result = this._saveRun('¡Recorrido completado!');
        this.hud.showBanner('¡Recorrido completado!', 4000);
        this.audio.playSfx('complete');
        this.audio.stopMusic(3.5);
        setTimeout(() => this._showResults(result), 4200);
    }

    // Game over: se acabaron las bolas. Marco rojo, lluvia de bolas (estilo
    // Sonic) y, tras unos segundos, vuelta al menú.
    _gameOver() {
        if (this.dead) return;
        this.dead = true;
        this.rail.pause();
        this.powers.clear();
        const result = this._saveRun('¡Sin bolas!'); // deja de sumar ya
        this.hud.showDamage();
        this.hud.showBanner('¡Sin bolas!', 2500);
        this.shooter.scatter(getSettings().ballSkin);        // lluvia de bolas
        this.audio.playSfx('gameover');
        this.audio.stopMusic(2.5);     // la música se apaga mientras cae la lluvia
        setTimeout(() => this._showResults(result), 2800);
    }

    // Cierra la puntuación de la partida y guarda el récord (records.js).
    // Devuelve el resultado para la pantalla final, o null si ya estaba cerrada.
    _saveRun(title) {
        if (!this.score.active) return null;
        this.score.stop();
        const sum = this.score.summary();
        const saved = submitRun({
            ...sum, gems: this.score.gems, startCheckpoint: this.startCheckpoint, checkpoint: this.checkpoint, mode: this.mode,
        });

        // Logros acumulativos tras guardar la partida
        const records = getRecords(this.mode);
        if (records.cumulativeDistance >= 5000) unlock('marathon');
        if (records.gemsBroken >= 25) unlock('gem_hunter');

        return { title, ...sum, checkpoint: this.checkpoint, mode: this.mode, ...saved };
    }

    // Tras la animación de fin: limpia la escena (como salir al menú) y
    // enseña los resultados encima.
    _showResults(result) {
        this._exitToMenu();
        if (result) this.screens.showResults(result);
    }

    // Una bola rompió un cristal de poder: activarlo (+bolas al instante si es
    // el bonus; en "Sin perder", +puntos)
    _activatePower(type) {
        if (!this.started || this.dead || this.finished) return;
        const def = this.powers.activate(type);
        if (!def) return;
        let label = def.duration ? `¡${def.name}!` : def.name;
        if (type === 'bonus') {
            if (this.noLose) {
                this.score.addBonusPoints(NOLOSE_POWER_BONUS_POINTS);
                label = `+${NOLOSE_POWER_BONUS_POINTS} puntos`;
            } else {
                this.shooter.addAmmo(POWER_BONUS_BALLS);
            }
        }
        this.score.addPowerUp(type);       // puntos extra (x combo)
        this.hud.showPower(label, def.color);
        this.audio.playSfx('powerup');
    }

    // El jugador chocó con vidrio sólido (un trozo de panel o un bloque que
    // cae): pierde CRASH_PENALTY_BASE bolas (igual en todos los niveles; en
    // "Sin perder", NOLOSE_CRASH_PENALTY puntos) y rompe el vidrio donde lo
    // tocó. Después hay un pequeño tiempo de gracia; pasado ese tiempo,
    // cualquier otro trozo sólido que se cruce (p.ej. un bloque que rebotó)
    // vuelve a golpear.
    _crashInto(hit) {
        this.score.onCrash();          // el choque rompe el combo (antes de que el game over cierre la puntuación)
        this.crashesInCheckpoint++;

        if (this.noLose) {
            this.score.addPenalty(NOLOSE_CRASH_PENALTY, 'penalty');
            this.hud.showBanner(`-${NOLOSE_CRASH_PENALTY}`, 900);
        } else {
            const penalty = CRASH_PENALTY_BASE;
            const before = this.shooter.ammo;
            this.lastShotPending = false;
            this.shooter.addAmmo(-penalty);
            // Logro: Por los pelos (sobrevive con < 5 bolas)
            if (before >= penalty && this.shooter.ammo > 0 && this.shooter.ammo < 5) {
                unlock('close_call');
            }
            this.hud.showBanner(`-${penalty}`, 900);
        }
        this.hud.flashDamage();        // destello rojo breve
        this.audio.playSfx('crash');
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
            this.audio.setPaused(true); // música lejana (filtrada y más baja)
        } else {
            this.screens.hide();
            this.audio.setPaused(false);
            this.lastTime = 0; // reinicia el delta para no "saltar" tras la pausa
        }
    }

    // Salir de la partida y volver al menú principal
    _exitToMenu() {
        this._saveRun('');   // salir desde la pausa también guarda el récord (no-op si ya se guardó)
        this._setMode('normal'); // el fondo del menú, como siempre
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
        this.audio.setPaused(false);
        this.audio.startMusic('menu'); // vuelve la música tranquila del menú
        // Devolver el fondo al preview del checkpoint 0
        this.track.reset();
        this.rail.setFx(null, true);
        this.rail.place(0);
        this.checkpoint = -1;
        const amb = ambienceFor(0);
        this.renderer.setTheme(amb.colors, amb.sunIntensity, 0, environmentFor(amb));
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
            this.score.update();
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
            this.score.setDistance(distance);
        }

        this.renderer.render();                               // 7. dibuja
        requestAnimationFrame(this._loop);
    }
}
