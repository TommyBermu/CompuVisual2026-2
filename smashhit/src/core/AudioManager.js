/*
    core/AudioManager.js
    --------------------
    Sonido del juego con dos canales de volumen independientes: música y SFX.
    Usa la Web Audio API (sin archivos todavía): la música es un pad ambiental
    sintetizado y los SFX son pequeños "blips". Así el control de volumen YA
    funciona de verdad; cuando el equipo meta .wav/.mp3 reales en assets/audio,
    basta cambiar _startMusic()/playSfx() para usar buffers cargados.

    Los navegadores bloquean el audio hasta que el usuario interactúa, por eso
    el AudioContext se "despierta" (resume) en el primer clic (ver unlock()).

    Volúmenes:
        masterGain -> musicGain -> música
                   -> sfxGain   -> efectos
    Leer settings.js para el volumen inicial y reaccionar a cambios.
*/

import { getSettings, onSettingsChange } from '../settings.js';

export default class AudioManager {
    constructor() {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();

        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.sfxGain = this.ctx.createGain();
        this.musicGain.connect(this.master);
        this.sfxGain.connect(this.master);

        this.musicNodes = [];
        this._applySettings(getSettings());
        onSettingsChange((s) => this._applySettings(s));

        // Desbloquear en la primera interacción (política de autoplay de los navegadores)
        const unlock = () => this.unlock();
        window.addEventListener('pointerdown', unlock, { once: true });
        window.addEventListener('keydown', unlock, { once: true });
    }

    _applySettings(s) {
        const m = s.muted ? 0 : 1;
        // rampas cortas para que no "chasquee" al cambiar el volumen
        const t = this.ctx.currentTime;
        this.master.gain.setTargetAtTime(m, t, 0.02);
        this.musicGain.gain.setTargetAtTime(s.musicVolume, t, 0.05);
        this.sfxGain.gain.setTargetAtTime(s.sfxVolume, t, 0.02);
    }

    unlock() {
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    // --- Música ambiental: dos osciladores suaves en quinta + un leve vibrato ---
    startMusic() {
        if (this.musicNodes.length) return; // ya sonando
        this.unlock();
        const t = this.ctx.currentTime;

        [110, 164.81].forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = i === 0 ? 'sine' : 'triangle';
            osc.frequency.value = freq;
            g.gain.value = i === 0 ? 0.18 : 0.08;
            osc.connect(g).connect(this.musicGain);
            osc.start(t);
            this.musicNodes.push(osc, g);
        });

        // vibrato lento sobre el primer oscilador para que "respire"
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.12;
        lfoGain.gain.value = 3;
        lfo.connect(lfoGain).connect(this.musicNodes[0].frequency);
        lfo.start(t);
        this.musicNodes.push(lfo, lfoGain);
    }

    stopMusic() {
        this.musicNodes.forEach((n) => {
            if (n.stop) { try { n.stop(); } catch { /* ya parado */ } }
        });
        this.musicNodes = [];
    }

    // --- Efecto corto (p.ej. al disparar). type: 'shoot' | 'ui' ---
    playSfx(type = 'ui') {
        this.unlock();
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.connect(g).connect(this.sfxGain);

        if (type === 'shoot') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(660, t);
            osc.frequency.exponentialRampToValueAtTime(180, t + 0.12);
            g.gain.setValueAtTime(0.25, t);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, t);
            g.gain.setValueAtTime(0.2, t);
        }
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.2);
    }
}
