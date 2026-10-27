/*
    core/AudioManager.js
    --------------------
    Todo el sonido del juego, 100 % procedural con la Web Audio API (no hay
    archivos de audio: assets/audio sigue vacío a propósito).

        - Efectos (SFX): recetas sintetizadas en src/audio/sfx.js.
        - Música: temas generativos por checkpoint (src/audio/themes.js) que
          toca el MusicEngine (src/audio/music.js) con un programador de
          "lookahead" sobre ctx.currentTime.

    Grafo de audio:
        música seca ─> filtro de pausa ─> musicGain ──┐
        música húmeda ─> musicWet ─┐                  │
        sfx secos ─────────────────┼──────> sfxGain ──┼─> master ─> limitador ─> altavoces
        sfx húmedos ─> sfxWet ─────┴─> reverb ────────┘
    musicGain/musicWet siguen el volumen de música y sfxGain/sfxWet el de
    efectos (settings.js, en vivo); master = 0 cuando está silenciado.

    API (la usan Game, Shooter, Screens y quien quiera):
        playSfx(name, opts)  -> 'shoot' | 'glass' | 'crash' | 'clank' | 'shard'
                                | 'checkpoint' | 'gameover' | 'complete'
                                | 'powerup' | 'ui'. Un nombre desconocido suena
                                como un "blip" genérico (nunca lanza error).
                                opts: { position, intensity, size, level, ... }
                                Con `position` (mundo) se panea y atenúa según
                                dónde está respecto a la cámara (setListener).
        startMusic(level)    -> empieza (o cambia a) la música; level = número
                                de checkpoint o 'menu'
        setLevel(level)      -> cambia de tema con crossfade (si ya suena)
        stopMusic(fade)      -> se desvanece en `fade` segundos
        setPaused(bool)      -> música más baja y filtrada (pausa)
        setListener(camera)  -> cámara para el paneo estéreo
        stats                -> contadores de nodos (para depurar fugas)

    Límites: cada tipo de efecto tiene un máximo de voces simultáneas y un
    intervalo mínimo entre disparos (LIMITS). Romper un panel suelta decenas
    de trozos a la vez; sin esto se crearían cientos de nodos en un frame.

    Los navegadores bloquean el audio hasta que el usuario interactúa: el
    AudioContext se CREA en el primer clic/tecla válidos (crearlo antes solo
    da avisos en consola) y se reanuda si el navegador lo suspende. Mientras
    no esté sonando no se crean notas ni efectos (sonarían todos juntos al
    reanudar); startMusic() antes del primer clic solo deja anotado qué
    tema tocar, y empieza en cuanto se pueda.
*/

import { getSettings, onSettingsChange } from '../settings.js';
import { stats, reverbIR } from '../audio/synth.js';
import { SFX } from '../audio/sfx.js';
import MusicEngine from '../audio/music.js';
import { themeFor, chimeNotes } from '../audio/themes.js';

// max = voces a la vez (si se pasa, se corta la más vieja; drop = se ignora
// la nueva), gap = s mínimos entre dos disparos del mismo tipo
const LIMITS = {
    glass: { max: 6, gap: 0.03 },
    crash: { max: 2, gap: 0.1 },
    shoot: { max: 4, gap: 0.03 },
    clank: { max: 4, gap: 0.05, drop: true },
    shard: { max: 3, gap: 0.06, drop: true },
    ui: { max: 3, gap: 0.03 },
    default: { max: 4, gap: 0.02 },
};
const MAX_ACTIVE_SOURCES = 260; // tope global de seguridad (osciladores + buffers vivos)
const SCHEDULER_MS = 50;        // cada cuánto se despierta el programador de música
const PAUSE_CUTOFF = 600;       // Hz del filtro de la música en pausa
const PAUSE_DUCK = 0.45;        // volumen relativo de la música en pausa
const MUSIC_LEVEL = 0.75;       // la música, de fondo: algo por debajo de los efectos

export default class AudioManager {
    constructor() {
        this.ctx = null;      // se crea en el primer gesto del usuario (_init)
        this.stats = stats;
        this.voices = {};     // nombre -> [Voice] sonando
        this.lastPlay = {};   // nombre -> ctx.currentTime del último disparo
        this.camera = null;
        this.level = 'menu';
        this.paused = false;
        this.musicOn = false;
        this._timer = null;
        this._failed = false;
        this.settings = getSettings();
        onSettingsChange((st) => {
            this.settings = st;
            if (this.ctx) this._applySettings(st);
        });

        // Desbloquear con la interacción del usuario (política de autoplay de los
        // navegadores). Sin `once`: ESC no cuenta como gesto válido y el
        // navegador también puede volver a suspender el contexto; unlock() no
        // hace nada si ya está sonando.
        const unlock = () => this.unlock();
        window.addEventListener('pointerdown', unlock);
        window.addEventListener('keydown', unlock);
        // Pestaña oculta: setInterval se ralentiza -> programar más por delante
        document.addEventListener('visibilitychange', () => {
            if (this.music) this.music.lookahead = document.hidden ? 1.5 : 0.3;
        });
    }

    // Crea el AudioContext y todo el grafo fijo (una sola vez)
    _init() {
        const AC = window.AudioContext || window.webkitAudioContext;
        try {
            this.ctx = new AC();
        } catch {
            this._failed = true; // sin Web Audio: todo queda en no-op
            return;
        }
        const ctx = this.ctx;
        const gain = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };

        // master -> limitador (compresor rápido): muchas roturas a la vez + un
        // choque pueden sumar más de 1.0; así no "rompe" (clipping) la salida
        this.master = gain(1);
        this.limiter = ctx.createDynamicsCompressor();
        this.limiter.threshold.value = -6;
        this.limiter.knee.value = 4;
        this.limiter.ratio.value = 12;
        this.limiter.attack.value = 0.003;
        this.limiter.release.value = 0.25;
        this.master.connect(this.limiter).connect(ctx.destination);

        // Reverb compartida (un único ConvolverNode para música y efectos)
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = reverbIR(ctx);
        this.reverb.connect(this.master);

        // Música: entrada seca -> filtro de pausa -> volumen; húmeda -> reverb
        this.musicIn = gain(MUSIC_LEVEL);
        this.pauseFilter = ctx.createBiquadFilter();
        this.pauseFilter.type = 'lowpass';
        this.pauseFilter.frequency.value = this.paused ? PAUSE_CUTOFF : 20000;
        this.musicGain = gain(0);
        this.musicIn.connect(this.pauseFilter).connect(this.musicGain).connect(this.master);
        this.musicWet = gain(0);
        this.musicWet.connect(this.reverb);

        // Efectos: seco -> volumen; húmedo -> reverb
        this.sfxGain = gain(0);
        this.sfxGain.connect(this.master);
        this.sfxWet = gain(0);
        this.sfxWet.connect(this.reverb);
        this.sfxIO = { out: this.sfxGain, rev: this.sfxWet };

        this.music = new MusicEngine(ctx, this.musicIn, this.musicWet);
        if (document.hidden) this.music.lookahead = 1.5;
        this._applySettings(this.settings);
        ctx.addEventListener?.('statechange', () => this._tick());
        if (this.musicOn) this._ensureScheduler();
    }

    _applySettings(s) {
        const t = this.ctx.currentTime;
        const duck = this.paused ? PAUSE_DUCK : 1;
        // rampas cortas para que no "chasquee" al cambiar el volumen
        this.master.gain.setTargetAtTime(s.muted ? 0 : 1, t, 0.02);
        this.musicGain.gain.setTargetAtTime(s.musicVolume * duck, t, 0.05);
        this.musicWet.gain.setTargetAtTime(s.musicVolume * duck, t, 0.05);
        this.sfxGain.gain.setTargetAtTime(s.sfxVolume, t, 0.02);
        this.sfxWet.gain.setTargetAtTime(s.sfxVolume, t, 0.02);
        // Si no se oye, ni siquiera crear las notas (ahorra CPU)
        this.music.silent = s.muted || s.musicVolume <= 0;
    }

    // Crear / reanudar el contexto. Solo tras un gesto del usuario: antes el
    // navegador lo rechaza (y avisa en consola), así que ni se intenta.
    unlock() {
        if (this._failed) return;
        if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
        if (!this.ctx) this._init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    }

    get running() {
        return !!this.ctx && this.ctx.state === 'running';
    }

    setListener(camera) {
        this.camera = camera;
    }

    // --- Efectos -----------------------------------------------------------------

    playSfx(name = 'ui', opts = {}) {
        if (!this.running) { this.unlock(); return null; }
        const s = this.settings;
        if (s.muted || s.sfxVolume <= 0) return null;
        if (stats.active > MAX_ACTIVE_SOURCES) return null;

        const recipe = SFX[name] || SFX.blip;
        const lim = LIMITS[name] || LIMITS.default;
        const now = this.ctx.currentTime;
        if (now - (this.lastPlay[name] ?? -1) < lim.gap) return null;

        const list = (this.voices[name] ||= []);
        if (list.length >= lim.max) {
            if (lim.drop) return null;
            list.shift().kill(); // robar la voz más vieja
        }
        this.lastPlay[name] = now;

        const o = { ...opts };
        if (opts.position) Object.assign(o, this._spatial(opts.position, o.gain));
        if (name === 'checkpoint' && !o.notes) o.notes = chimeNotes(themeFor(opts.level ?? this.level));
        if ((name === 'gameover' || name === 'complete' || name === 'powerup') && o.root == null) {
            const th = themeFor(this.level);
            o.root = th.root + (name === 'powerup' ? 24 : 12);
        }

        let v;
        try {
            v = recipe(this.ctx, this.sfxIO, o);
        } catch (e) {
            console.warn('[audio] fallo en el efecto', name, e);
            return null;
        }
        list.push(v);
        v.onDone = () => {
            const i = list.indexOf(v);
            if (i >= 0) list.splice(i, 1);
        };
        return v;
    }

    // Paneo y atenuación según dónde está `p` (mundo) respecto a la cámara.
    // Se usa la matriz de vista (matrixWorldInverse) que Three ya calcula al
    // renderizar: x > 0 = a la derecha de la cámara.
    _spatial(p, baseGain = 1) {
        const cam = this.camera;
        if (!cam) return { pan: 0, gain: baseGain };
        const e = cam.matrixWorldInverse.elements;
        const x = e[0] * p.x + e[4] * p.y + e[8] * p.z + e[12];
        const y = e[1] * p.x + e[5] * p.y + e[9] * p.z + e[13];
        const z = e[2] * p.x + e[6] * p.y + e[10] * p.z + e[14];
        const dist = Math.hypot(x, y, z);
        const pan = Math.max(-0.9, Math.min(0.9, x / Math.max(dist, 2)));
        const gain = baseGain * Math.min(1, 1.4 / (1 + 0.06 * dist));
        return { pan, gain };
    }

    // --- Música --------------------------------------------------------------------

    // Empieza (o cambia a) la música de `level`. Antes del primer gesto solo
    // queda anotado; el programador la arranca cuando el contexto suena.
    startMusic(level = this.level) {
        this.level = level;
        this.musicOn = true;
        this.unlock();
        this._ensureScheduler();
        this._tick();
    }

    setLevel(level) {
        this.level = level;
        if (this.musicOn) this._tick();
    }

    stopMusic(fade = 1.5) {
        this.musicOn = false;
        if (this.music) this.music.stop(fade);
    }

    // Pausa: la música sigue sonando pero lejana (paso bajo + más baja)
    setPaused(paused) {
        if (this.paused === paused) return;
        this.paused = paused;
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        this.pauseFilter.frequency.setTargetAtTime(paused ? PAUSE_CUTOFF : 20000, t, paused ? 0.15 : 0.3);
        this._applySettings(this.settings);
    }

    // Un paso del programador: pone el tema que toca y programa sus notas.
    // Con el contexto suspendido no hace nada (no se crean nodos).
    _tick() {
        if (!this.running) return;
        if (this.musicOn) this.music.play(themeFor(this.level)); // no-op si ya suena ese tema
        this.music.update();
    }

    // El temporizador corre mientras la música esté pedida o algún tema se
    // esté apagando; luego se detiene solo.
    _ensureScheduler() {
        if (this._timer) return;
        this._timer = setInterval(() => {
            this._tick();
            if (!this.musicOn && (!this.music || !this.music.active)) {
                clearInterval(this._timer);
                this._timer = null;
            }
        }, SCHEDULER_MS);
    }
}
