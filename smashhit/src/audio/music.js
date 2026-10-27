/*
    audio/music.js
    --------------
    Música procedural: toca los temas de audio/themes.js generando las notas
    en tiempo real (nunca suena igual dos veces, pero siempre en la tonalidad
    y el tempo del checkpoint).

    PROGRAMADOR CON "LOOKAHEAD" (la técnica estándar de Web Audio):
    un temporizador de JS (setInterval en el AudioManager) llama a update()
    cada ~50 ms, y update() programa con tiempos EXACTOS de ctx.currentTime
    todas las semicorcheas que caen en los próximos `lookahead` segundos.
    Así el ritmo no depende de la precisión de setInterval (que tiembla), solo
    del reloj de audio. Si la pestaña se queda atrás (pestaña oculta), las
    notas perdidas se SALTAN en vez de sonar todas de golpe.

    Capas de un tema (ThemePlayer), que entran poco a poco para que evolucione:
        pad    acordes largos (2 osciladores desafinados por nota, paneados),
               con un filtro paso bajo que "respira" (LFO lento) y se va
               abriendo durante el primer minuto
        bass   fundamental/quinta con un seno filtrado
        arp    arpegio de semicorcheas con eco sincronizado al tempo; el
               patrón MUTA cada 4 compases y la densidad crece con el tiempo
        bells  campanas FM sueltas muy agudas con mucha reverb
        perc   percusión suave (hi-hat de ruido, bombo de seno) solo en los
               niveles altos; cada 16 compases hay 2 de "respiro" sin ella

    Cambio de tema (checkpoint nuevo): el tema viejo deja de programar notas y
    se desvanece mientras el nuevo entra (crossfade). El viejo se destruye
    (se desconectan sus nodos) cuando terminó de apagarse.

    Funciona con cualquier BaseAudioContext, también OfflineAudioContext (así
    se puede renderizar a un buffer para probarlo sin altavoces).
*/

import { Voice, mtof, perc, swell, tone, noiseHit, bell } from './synth.js';
import { degreeNote } from './themes.js';

const STEPS_PER_BAR = 16;
const rand = (a, b) => a + Math.random() * (b - a);

class ThemePlayer {
    constructor(engine, theme, start, fadeIn) {
        const ctx = (this.ctx = engine.ctx);
        this.engine = engine;
        this.theme = theme;
        this.stepDur = 60 / theme.bpm / 4;
        this.step = 0;
        this.nextTime = start;
        this.startTime = start;
        this.padUntil = 0;
        this.stopping = false;
        this.disposeAt = Infinity;
        this.voices = new Set();
        this.nodes = [];
        this.pattern = theme.arp ? [...theme.arp.pattern] : null;
        this.arpShift = 0;
        this.panFlip = 1;

        const node = (n) => { this.nodes.push(n); return n; };
        const gain = (v) => { const g = node(ctx.createGain()); g.gain.value = v; return g; };

        // Salidas con fundido: seca -> dest, húmeda -> reverb
        this.fadeDry = gain(0);
        this.fadeWet = gain(0);
        this.fadeDry.connect(engine.dest);
        this.fadeWet.connect(engine.rev);
        for (const f of [this.fadeDry, this.fadeWet]) {
            f.gain.setValueAtTime(0, start);
            f.gain.linearRampToValueAtTime(1, start + fadeIn);
        }
        const wet = (amount) => { const g = gain(amount * theme.reverb); g.connect(this.fadeWet); return g; };

        // PAD: filtro paso bajo con LFO lento sobre el corte
        this.padFilter = node(ctx.createBiquadFilter());
        this.padFilter.type = 'lowpass';
        this.padFilter.Q.value = 0.7;
        const cut = theme.pad.cutoff;
        this.padFilter.frequency.setValueAtTime(cut * 0.55, start);
        this.padFilter.frequency.linearRampToValueAtTime(cut, start + 40); // se abre con el tiempo
        this.lfo = node(ctx.createOscillator());
        this.lfo.frequency.value = rand(0.04, 0.09);
        const lfoDepth = gain(cut * 0.35);
        this.lfo.connect(lfoDepth).connect(this.padFilter.frequency);
        this.lfo.start(start);
        this.padFilter.connect(this.fadeDry);
        this.padFilter.connect(wet(0.8));

        // BAJO: seco, filtrado
        this.bassBus = node(ctx.createBiquadFilter());
        this.bassBus.type = 'lowpass';
        this.bassBus.frequency.value = 380;
        this.bassBus.connect(this.fadeDry);

        // ECO sincronizado al tempo (para arpegio y campanas)
        const beat = 60 / theme.bpm;
        this.delay = node(ctx.createDelay(4));
        this.delay.delayTime.value = Math.min(3.9, theme.delay.beats * beat);
        const delayTone = node(ctx.createBiquadFilter());
        delayTone.type = 'lowpass';
        delayTone.frequency.value = 2600;
        const feedback = gain(theme.delay.feedback);
        this.delayIn = gain(0.45);
        this.delayIn.connect(this.delay).connect(delayTone);
        delayTone.connect(feedback).connect(this.delay);
        delayTone.connect(this.fadeDry);
        delayTone.connect(wet(0.6));

        // ARPEGIO
        if (theme.arp) {
            this.arpBus = node(ctx.createBiquadFilter());
            this.arpBus.type = 'lowpass';
            this.arpBus.frequency.value = theme.arp.cutoff;
            this.arpBus.connect(this.fadeDry);
            this.arpBus.connect(this.delayIn);
            this.arpBus.connect(wet(0.4));
        }

        // CAMPANAS
        this.bellBus = gain(1);
        this.bellBus.connect(this.fadeDry);
        this.bellBus.connect(this.delayIn);
        this.bellBus.connect(wet(1));

        // PERCUSIÓN
        this.percBus = gain(1);
        this.percBus.connect(this.fadeDry);
        this.percBus.connect(wet(0.15));
    }

    // Programa todas las semicorcheas hasta `until` (s del AudioContext)
    schedule(until) {
        if (this.stopping) return;
        const now = this.ctx.currentTime;
        // ¿Nos quedamos atrás (pestaña oculta)? -> saltar sin tocar
        if (this.nextTime < now - 0.05) {
            const skip = Math.ceil((now - this.nextTime) / this.stepDur);
            this.step += skip;
            this.nextTime += skip * this.stepDur;
        }
        while (this.nextTime < until) {
            if (!this.engine.silent) this._play(this.step, this.nextTime);
            this.step++;
            this.nextTime += this.stepDur;
        }
    }

    // Notas del acorde de grado `deg`: fundamental, tercera, quinta, séptima
    _chord(deg) {
        return [0, 2, 4, 6].map((k) => degreeNote(this.theme, deg + k));
    }

    _play(step, t) {
        const th = this.theme;
        const bar = Math.floor(step / STEPS_PER_BAR);
        const s = step % STEPS_PER_BAR;
        const chordSteps = th.bars * STEPS_PER_BAR;
        const deg = th.prog[Math.floor(step / chordSteps) % th.prog.length];
        const chord = this._chord(deg);
        const left = (chordSteps - (step % chordSteps)) * this.stepDur; // lo que le queda al acorde
        const breather = bar % 16 >= 14; // 2 compases de respiro cada 16

        // Variación: cada 4 compases el arpegio muta un poco
        if (s === 0 && bar > 0 && bar % 4 === 0) this._mutate(bar);

        // PAD: al empezar cada acorde (o si se saltó su comienzo)
        if (t >= this.padUntil - 1e-3) {
            this._pad(t, left, chord);
            this.padUntil = t + left;
        }

        // BAJO
        if (th.bass && bar >= 1) {
            const b = th.bass[s];
            if (b) {
                let n = chord[0] - 12 + (b === 2 ? 7 : 0);
                while (n > 50) n -= 12;
                // pocos golpes por compás = notas largas; muchos = pulsos cortos
                const hits = th.bass.filter(Boolean).length;
                this._bass(t, n, hits <= 2 ? Math.min(left, (STEPS_PER_BAR / hits) * this.stepDur) : 0);
            }
        }

        // ARPEGIO: entra en el compás `in`, la densidad crece con el tiempo
        if (this.pattern && bar >= th.arp.in && !breather) {
            const idx = this.pattern[s];
            const density = Math.min(1, 0.55 + 0.05 * (bar - th.arp.in));
            if (idx >= 0 && Math.random() < density) {
                const n = chord[idx % 4] + 12 * (Math.floor(idx / 4) + th.arp.octave - 1 + this.arpShift);
                const accent = s % 4 === 0 ? 1 : rand(0.6, 0.9);
                this._arp(t, n, accent);
            }
        }

        // CAMPANAS: alguna suelta por compás, en un tiempo al azar
        if (s === 0 && Math.random() < th.bells) {
            const pent = [0, 1, 2, 4, 5][Math.floor(Math.random() * 5)];
            const n = degreeNote(th, deg + pent) + 24;
            this._bell(t + Math.floor(Math.random() * 4) * 4 * this.stepDur, n);
        }

        // PERCUSIÓN (solo niveles altos), entra a los 4 compases
        if (th.perc > 0 && bar >= 4 && !breather) {
            const p = th.perc * Math.min(1, (bar - 3) / 8);
            if (s % 4 === 2) this._hat(t, 0.05 * p, 0.05);
            if (th.perc >= 0.8 && s % 2 === 1) this._hat(t, 0.015 * p, 0.025);
            if (th.perc >= 0.5 && (s === 0 || (s === 8 && th.perc >= 0.7))) this._kick(t, 0.22 * p);
        }
    }

    _mutate(bar) {
        const base = this.theme.arp?.pattern;
        if (!base) return;
        // cambia 2-3 pasos: silencio <-> nota del acorde
        for (let k = 0; k < 3; k++) {
            const i = Math.floor(Math.random() * STEPS_PER_BAR);
            this.pattern[i] = this.pattern[i] < 0 ? Math.floor(Math.random() * 6) : (Math.random() < 0.5 ? -1 : base[i]);
        }
        // cada 8 compases, a veces sube una octava (y luego vuelve)
        if (bar % 8 === 0) this.arpShift = Math.random() < 0.3 ? 1 : 0;
    }

    // Una voz musical: se registra para poder cortarla al destruir el tema
    _voice(dest) {
        const v = new Voice(this.ctx, dest);
        this.voices.add(v);
        v.onDone = () => this.voices.delete(v);
        return v;
    }

    _pad(t, dur, chord) {
        const p = this.theme.pad;
        const attack = Math.min(2.2, dur * 0.35);
        const release = Math.min(3, dur * 0.6) + 0.4;
        const hold = Math.max(0, dur - attack);
        // voicing cercano: todas las notas dentro de una octava sobre root+10
        const lo = this.theme.root + 10;
        for (const raw of chord) {
            let n = raw;
            while (n < lo) n += 12;
            while (n >= lo + 12) n -= 12;
            const v = this._voice(this.padFilter);
            const pan = v.panner(rand(-0.4, 0.4));
            const g = v.gain(0);
            g.connect(pan || v.out);
            if (pan) pan.connect(v.out);
            swell(g.gain, t, p.gain, attack, hold, release);
            for (const det of [-p.detune, p.detune]) {
                const o = v.osc(p.wave, mtof(n));
                o.detune.value = det + rand(-2, 2);
                o.connect(g);
                v.play(o, t, t + attack + hold + release + 0.05);
            }
        }
    }

    _bass(t, n, long) {
        const v = this._voice(this.bassBus);
        const o = v.osc('soft', mtof(n));
        const g = v.gain(0);
        o.connect(g).connect(v.out);
        if (long) {
            swell(g.gain, t, 0.2, 0.04, long * 0.75, long * 0.3 + 0.3);
            v.play(o, t, t + long * 1.05 + 0.4);
        } else {
            perc(g.gain, t, 0.2, 0.01, 0.35);
            v.play(o, t, t + 0.4);
        }
    }

    _arp(t, n, accent) {
        const a = this.theme.arp;
        const v = this._voice(this.arpBus);
        this.panFlip = -this.panFlip;
        const pan = v.panner(0.3 * this.panFlip);
        const dest = pan || v.out;
        if (pan) pan.connect(v.out);
        tone(v, dest, t, a.wave, mtof(n), a.gain * accent, 0.004, a.decay);
    }

    _bell(t, n) {
        const v = this._voice(this.bellBus);
        const pan = v.panner(rand(-0.6, 0.6));
        if (pan) pan.connect(v.out);
        bell(v, pan || v.out, t, mtof(n), 0.035, 2.4);
    }

    _hat(t, peak, decay) {
        const v = this._voice(this.percBus);
        noiseHit(v, v.out, t, 'highpass', 7000, 0.7, peak, 0.001, decay);
    }

    _kick(t, peak) {
        const v = this._voice(this.percBus);
        const lp = v.filter('lowpass', 200, 0.7);
        lp.connect(v.out);
        const { o } = tone(v, lp, t, 'sine', 110, peak, 0.003, 0.3);
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    }

    // Deja de programar y se apaga en `dur` segundos
    fadeOut(dur) {
        if (this.stopping) return;
        this.stopping = true;
        const t = this.ctx.currentTime;
        for (const f of [this.fadeDry, this.fadeWet]) {
            f.gain.cancelScheduledValues(t);
            f.gain.setValueAtTime(f.gain.value, t);
            f.gain.linearRampToValueAtTime(0, t + dur);
        }
        this.disposeAt = t + dur + 0.1;
    }

    dispose() {
        for (const v of [...this.voices]) v.kill();
        this.voices.clear();
        try { this.lfo.stop(); } catch { /* ya parado */ }
        for (const n of this.nodes) {
            try { n.disconnect(); } catch { /* ya desconectado */ }
        }
        this.nodes = [];
    }
}

export default class MusicEngine {
    // dest: bus seco de música; rev: entrada de la reverb (envío húmedo)
    constructor(ctx, dest, rev) {
        this.ctx = ctx;
        this.dest = dest;
        this.rev = rev;
        this.players = [];
        this.current = null;
        this.lookahead = 0.3;  // s que se programan por delante
        this.silent = false;   // true = no crear notas (silenciado / volumen 0)
    }

    get active() {
        return this.players.length > 0;
    }

    // Toca `theme` (si ya suena, nada). Si había otro, crossfade de `fade` s.
    play(theme, fade = 2.5) {
        if (this.current && this.current.theme === theme) return;
        const start = this.ctx.currentTime + 0.06;
        const prev = this.current;
        if (prev) prev.fadeOut(fade);
        this.current = new ThemePlayer(this, theme, start, prev ? fade : 1.5);
        this.players.push(this.current);
        this.update();
    }

    stop(fade = 1.5) {
        if (this.current) this.current.fadeOut(fade);
        this.current = null;
    }

    // Llamar periódicamente: programa notas y destruye los temas ya apagados
    update() {
        const now = this.ctx.currentTime;
        this.players = this.players.filter((p) => {
            if (p.stopping && now >= p.disposeAt) {
                p.dispose();
                return false;
            }
            p.schedule(now + this.lookahead);
            return true;
        });
    }

    // Cortar todo ya (al destruir el AudioManager)
    dispose() {
        this.players.forEach((p) => p.dispose());
        this.players = [];
        this.current = null;
    }
}
