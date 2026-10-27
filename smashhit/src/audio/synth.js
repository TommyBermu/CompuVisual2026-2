/*
    audio/synth.js
    --------------
    Piezas básicas de síntesis compartidas por los efectos (sfx.js) y la
    música (music.js). Todo es Web Audio puro: no hay archivos de sonido.

        mtof(n)            -> nota MIDI a frecuencia (69 = La 440 Hz)
        noiseBuffer(ctx)   -> 2 s de ruido blanco (se crea UNA vez y se reutiliza)
        reverbIR(ctx)      -> respuesta al impulso sintética para el ConvolverNode
        waveFor(ctx, name) -> forma de onda: las nativas ('sine', 'triangle'...)
                              o timbres propios hechos con PeriodicWave
        Voice              -> agrupa los nodos de UN sonido y los desconecta
                              solos cuando terminan todas sus fuentes (sin fugas)
        perc / swell       -> envolventes (golpe corto / colchón largo)
        noiseHit/tone/bell -> bloques: ráfaga de ruido filtrado, nota con
                              envolvente percusiva y campana FM

    Por qué Voice: cada sonido crea varios nodos (osciladores, filtros,
    ganancias). Si no se desconectan al acabar se quedan colgados del grafo y
    con cientos de vidrios rotos el navegador se ahoga. Voice cuenta las
    fuentes (osciladores / buffers) que arrancó y, cuando la última dispara
    'ended', desconecta todo lo que creó. Además permite "robar" la voz
    (kill) para limitar cuántos sonidos de un tipo suenan a la vez.
*/

export const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Contadores globales para depurar fugas (el test los lee vía AudioManager.stats)
export const stats = { created: 0, active: 0, voices: 0 };

// --- Ruido blanco compartido ---------------------------------------------------
const noiseCache = new WeakMap();
export function noiseBuffer(ctx) {
    let buf = noiseCache.get(ctx);
    if (!buf) {
        const len = Math.floor(ctx.sampleRate * 2);
        buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        noiseCache.set(ctx, buf);
    }
    return buf;
}

// --- Reverb sintética: ruido estéreo con caída exponencial ------------------
// Las colas se "oscurecen" con el tiempo (filtro paso bajo de un polo cuyo
// coeficiente crece), como en una sala real donde los agudos mueren antes.
export function reverbIR(ctx, seconds = 3.2, decay = 2.6) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
            const t = i / len;
            const k = 0.15 + 0.8 * t;               // más filtrado al final de la cola
            lp += (Math.random() * 2 - 1 - lp) * (1 - k);
            d[i] = lp * Math.pow(1 - t, decay);
        }
        // pre-delay corto (8-12 ms) distinto por canal = más ancho estéreo
        const pre = Math.floor(ctx.sampleRate * (0.008 + ch * 0.004));
        for (let i = 0; i < pre; i++) d[i] = 0;
    }
    return ir;
}

// --- Timbres con PeriodicWave (armónicos 1..n) ----------------------------------
const WAVES = {
    soft: [0, 1, 0.25, 0.08, 0.03],                    // casi seno, cálido
    hollow: [0, 1, 0, 0.35, 0, 0.15, 0, 0.07],         // impares: tipo clarinete suave
    glassy: [0, 1, 0.05, 0.3, 0.02, 0.12, 0, 0.06, 0, 0.04], // brillante pero sin aspereza
    warm: [0, 1, 0.5, 0.3, 0.18, 0.1, 0.06, 0.03],     // "sierra" muy redondeada
};
const waveCache = new WeakMap();
export function waveFor(ctx, name) {
    if (!WAVES[name]) return null; // nativa: se usa osc.type
    let byCtx = waveCache.get(ctx);
    if (!byCtx) { byCtx = {}; waveCache.set(ctx, byCtx); }
    if (!byCtx[name]) {
        const imag = new Float32Array(WAVES[name]);
        byCtx[name] = ctx.createPeriodicWave(new Float32Array(imag.length), imag);
    }
    return byCtx[name];
}

export function setWave(ctx, osc, name) {
    const w = waveFor(ctx, name);
    if (w) osc.setPeriodicWave(w);
    else osc.type = name || 'sine';
}

// --- Voice: un sonido = un grupo de nodos con limpieza automática -------------
export class Voice {
    // out: nodo de salida del sonido (al que se conecta todo); dest: a dónde va
    constructor(ctx, dest) {
        this.ctx = ctx;
        this.nodes = [];
        this.sources = [];
        this.pending = 0;
        this.done = false;
        this.onDone = null;
        this.endTime = 0;
        this.out = this.gain(1);
        if (dest) this.out.connect(dest);
        stats.voices++;
    }

    // Registrar un nodo para desconectarlo al final
    own(node) {
        this.nodes.push(node);
        return node;
    }

    gain(value = 1) {
        const g = this.ctx.createGain();
        g.gain.value = value;
        return this.own(g);
    }

    filter(type, freq, Q = 1) {
        const f = this.ctx.createBiquadFilter();
        f.type = type;
        f.frequency.value = freq;
        f.Q.value = Q;
        return this.own(f);
    }

    // Paneo estéreo (-1 izquierda .. 1 derecha). Devuelve el nodo o null si no existe.
    panner(pan) {
        if (!this.ctx.createStereoPanner) return null;
        const p = this.ctx.createStereoPanner();
        p.pan.value = Math.max(-1, Math.min(1, pan || 0));
        return this.own(p);
    }

    osc(wave, freq) {
        const o = this.ctx.createOscillator();
        setWave(this.ctx, o, wave);
        o.frequency.value = freq;
        return this._source(o);
    }

    noise(rate = 1) {
        const n = this.ctx.createBufferSource();
        n.buffer = noiseBuffer(this.ctx);
        n.playbackRate.value = rate;
        return this._source(n);
    }

    _source(src) {
        this.own(src);
        this.sources.push(src);
        return src;
    }

    // Arranca una fuente entre t0 y t1 (s del AudioContext). El ruido empieza
    // en un punto al azar del buffer para que dos golpes no suenen idénticos.
    play(src, t0, t1) {
        if (src.buffer) {
            const room = src.buffer.duration - (t1 - t0) * src.playbackRate.value - 0.01;
            src.start(t0, room > 0 ? Math.random() * room : 0);
        } else {
            src.start(t0);
        }
        src.stop(t1);
        this.pending++;
        stats.created++;
        stats.active++;
        this.endTime = Math.max(this.endTime, t1);
        src.onended = () => {
            stats.active--;
            this.pending--;
            if (this.pending <= 0) this._cleanup();
        };
    }

    // Cortar ya (robo de voz): fundido de 15 ms y parada
    kill() {
        if (this.done) return;
        const t = this.ctx.currentTime;
        this.out.gain.cancelScheduledValues(t);
        this.out.gain.setValueAtTime(this.out.gain.value, t);
        this.out.gain.linearRampToValueAtTime(0, t + 0.015);
        for (const s of this.sources) {
            try { s.stop(t + 0.02); } catch { /* ya parada */ }
        }
        // si ninguna fuente llegó a arrancar, limpiar ahora
        if (this.pending <= 0) this._cleanup();
    }

    _cleanup() {
        if (this.done) return;
        this.done = true;
        stats.voices--;
        for (const n of this.nodes) {
            try { n.disconnect(); } catch { /* ya desconectado */ }
        }
        this.nodes = [];
        this.sources = [];
        if (this.onDone) this.onDone(this);
    }
}

// Envolvente percusiva: 0 -> peak en `attack` y caída exponencial hasta ~0 en `decay`
export function perc(param, t, peak, attack, decay) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

// Envolvente suave tipo pad: sube en `attack`, se mantiene y baja en `release`
export function swell(param, t, peak, attack, hold, release) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + attack);
    param.setValueAtTime(peak, t + attack + hold);
    param.linearRampToValueAtTime(0, t + attack + hold + release);
}

// --- Bloques de construcción (los usan sfx.js y music.js) ----------------------

// Ráfaga de ruido filtrado con envolvente percusiva
export function noiseHit(v, dest, t, type, freq, Q, peak, attack, decay, rate = 1) {
    const n = v.noise(rate);
    const f = v.filter(type, freq, Q);
    const g = v.gain(0);
    n.connect(f).connect(g).connect(dest);
    perc(g.gain, t, peak, attack, decay);
    v.play(n, t, t + attack + decay + 0.02);
    return { n, f, g };
}

// Seno (u otra onda) con envolvente percusiva
export function tone(v, dest, t, wave, freq, peak, attack, decay) {
    const o = v.osc(wave, freq);
    const g = v.gain(0);
    o.connect(g).connect(dest);
    perc(g.gain, t, peak, attack, decay);
    v.play(o, t, t + attack + decay + 0.02);
    return { o, g };
}

// Campana FM: la moduladora (x3.5) da los parciales inarmónicos y se apaga
// antes que la portadora, así el ataque es brillante y la cola pura.
export function bell(v, dest, t, freq, peak, decay) {
    const car = v.osc('sine', freq);
    const mod = v.osc('sine', freq * 3.5);
    const modGain = v.gain(0);
    const g = v.gain(0);
    mod.connect(modGain).connect(car.frequency);
    car.connect(g).connect(dest);
    perc(modGain.gain, t, freq * 1.8, 0.002, decay * 0.35);
    perc(g.gain, t, peak, 0.004, decay);
    v.play(car, t, t + decay + 0.05);
    v.play(mod, t, t + decay + 0.05);
}
