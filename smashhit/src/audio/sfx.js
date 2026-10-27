/*
    audio/sfx.js
    ------------
    "Recetas" de los efectos de sonido, todas sintetizadas al vuelo.
    Cada receta recibe (ctx, io, opts) y devuelve una Voice (ver synth.js):
        io   = { out, rev }  -> bus de efectos (seco) y envío a la reverb
        opts = { intensity 0..1, size 0..1, pan -1..1, gain 0..1, notes [...] }

    Diseño de cada sonido:
        shoot      golpe grave corto (seno que cae de ~150 a 55 Hz) + "whoosh"
                   de aire (ruido con un pasabanda que sube de 500 a 2800 Hz)
                   + un clic metálico muy corto.
        glass      rotura en capas: CRACK (ruido agudo de 30 ms), CUERPO
                   (ruido pasabanda ~4 kHz que dura más cuanto más grande es el
                   trozo), CUERPO GRAVE (~1.4 kHz, solo trozos grandes) y
                   TINTINEOS: senos agudos inarmónicos (2.6-8 kHz) que entran
                   desordenados durante unos cientos de ms, como astillas
                   cayendo. Tono, filtros y tiempos se sortean en cada golpe.
        crash      lo mismo que glass al máximo + golpe sordo grave (seno que
                   cae de 110 a 38 Hz y ruido filtrado a 300 Hz).
        clank      bola de metal contra algo sólido: modos de una barra libre
                   (1, 2.76, 5.40, 8.93 x f0) con caídas distintas = timbre
                   metálico inarmónico, más un clic.
        shard      astilla que cae al suelo: 1-2 "pings" agudísimos y suaves.
        checkpoint campanas FM (portadora + moduladora x3.5) en arpegio con
                   las notas de la tonalidad del nuevo checkpoint.
        gameover   acorde menor que desciende con filtro que se cierra + boom.
        complete   arpegio mayor ascendente de campanas.
        powerup    arpegio rápido brillante + barrido de ruido hacia arriba.
        ui         tic corto para los botones del menú.
        blip       genérico: lo que no tenga receta suena así (no lanza error).
*/

import { Voice, mtof, noiseHit, tone, bell } from './synth.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Crea la voz con su paneo y su envío a la reverb. Devuelve { v, dest, t }
function begin(ctx, io, opts, reverb = 0) {
    const v = new Voice(ctx, io.out);
    let dest = v.out;
    const g = opts.gain ?? 1;
    if (g !== 1) {
        const gg = v.gain(g);
        gg.connect(v.out);
        dest = gg;
    }
    if (opts.pan) {
        const p = v.panner(opts.pan);
        if (p) { p.connect(dest); dest = p; }
    }
    if (reverb > 0 && io.rev) {
        const send = v.gain(reverb);
        dest.connect(send);
        send.connect(io.rev);
    }
    return { v, dest, t: ctx.currentTime + 0.005 };
}

// Las capas del vidrio (las usa glass y crash)
function glassLayers(v, dest, t, size, intensity) {
    const pitch = rand(0.85, 1.2) * (1.15 - 0.35 * size);
    const amp = 0.35 + 0.65 * intensity;
    // CRACK: transitorio muy corto y agudo
    noiseHit(v, dest, t, 'highpass', 2500 * pitch, 0.7, 0.55 * amp, 0.001, 0.03);
    // CUERPO: el "chhh" de la rotura
    noiseHit(v, dest, t, 'bandpass', 4200 * pitch, 0.9, 0.45 * amp, 0.002, 0.1 + 0.35 * size, rand(0.9, 1.1));
    // CUERPO GRAVE: solo trozos grandes
    if (size > 0.3) {
        noiseHit(v, dest, t + 0.004, 'bandpass', 1400 * pitch, 1.2, 0.3 * amp * size, 0.004, 0.08 + 0.25 * size);
    }
    // TINTINEOS: astillas que suenan desordenadas
    const n = 3 + Math.round(6 * size * rand(0.7, 1));
    const spread = 0.05 + 0.35 * size;
    for (let i = 0; i < n; i++) {
        const dt = Math.pow(Math.random(), 1.5) * spread;
        tone(v, dest, t + dt, 'sine', rand(2600, 8000) * pitch, 0.12 * amp * rand(0.5, 1), 0.001, rand(0.05, 0.25));
    }
}

export const SFX = {
    shoot(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.08);
        const k = rand(0.9, 1.1);
        const { o } = tone(v, dest, t, 'sine', 150 * k, 0.5, 0.003, 0.12);
        o.frequency.setValueAtTime(150 * k, t);
        o.frequency.exponentialRampToValueAtTime(55 * k, t + 0.09);
        const { f } = noiseHit(v, dest, t, 'bandpass', 500, 1.5, 0.32, 0.02, 0.2);
        f.frequency.setValueAtTime(500 * k, t);
        f.frequency.exponentialRampToValueAtTime(2800 * k, t + 0.16);
        noiseHit(v, dest, t, 'highpass', 5000, 0.7, 0.12, 0.001, 0.02);
        return v;
    },

    glass(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.25);
        glassLayers(v, dest, t, clamp01(opts.size ?? 0.4), clamp01(opts.intensity ?? 0.7));
        return v;
    },

    crash(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.3);
        glassLayers(v, dest, t, 1, 1);
        // golpe sordo
        const { o } = tone(v, dest, t, 'sine', 110, 0.7, 0.004, 0.45);
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
        noiseHit(v, dest, t, 'lowpass', 300, 0.8, 0.45, 0.003, 0.25);
        noiseHit(v, dest, t, 'bandpass', 900, 0.7, 0.25, 0.002, 0.15);
        return v;
    },

    clank(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.15);
        const i = clamp01(opts.intensity ?? 0.5);
        const amp = 0.22 * (0.3 + 0.7 * i);
        const f0 = rand(380, 700);
        const modes = [[1, 1, 0.35], [2.76, 0.6, 0.22], [5.4, 0.35, 0.12], [8.93, 0.2, 0.07]];
        for (const [ratio, a, d] of modes) {
            tone(v, dest, t, 'sine', f0 * ratio * rand(0.99, 1.01), amp * a, 0.001, d * (0.5 + i));
        }
        noiseHit(v, dest, t, 'highpass', 3000, 0.7, amp * 0.8, 0.001, 0.012);
        return v;
    },

    shard(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.2);
        const amp = 0.06 * (0.4 + 0.6 * clamp01(opts.intensity ?? 0.5));
        const n = Math.random() < 0.5 ? 1 : 2;
        for (let k = 0; k < n; k++) {
            tone(v, dest, t + k * rand(0.01, 0.04), 'sine', rand(3000, 9000), amp, 0.001, rand(0.04, 0.1));
        }
        return v;
    },

    // opts.notes: notas MIDI del arpegio (las pone el AudioManager según el nivel)
    checkpoint(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.6);
        const notes = opts.notes || [72, 76, 79, 84];
        notes.forEach((n, k) => bell(v, dest, t + k * 0.11, mtof(n), 0.16, 1.6));
        return v;
    },

    gameover(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.4);
        const lp = v.filter('lowpass', 2500, 2);
        lp.connect(dest);
        lp.frequency.setValueAtTime(2500, t);
        lp.frequency.exponentialRampToValueAtTime(250, t + 1.8);
        const root = opts.root ?? 55;
        [12, 7, 3, 0].forEach((iv, k) => {
            const tt = t + k * 0.22;
            const len = k === 3 ? 1.4 : 0.5;
            for (const det of [-7, 7]) {
                const { o } = tone(v, lp, tt, 'warm', mtof(root + iv), 0.09, 0.02, len);
                o.detune.value = det;
            }
        });
        const { o } = tone(v, dest, t + 0.66, 'sine', 80, 0.55, 0.01, 1.2);
        o.frequency.setValueAtTime(80, t + 0.66);
        o.frequency.exponentialRampToValueAtTime(30, t + 1.8);
        return v;
    },

    complete(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.6);
        const root = opts.root ?? 60;
        [0, 4, 7, 12, 16, 19, 24].forEach((iv, k) => bell(v, dest, t + k * 0.09, mtof(root + iv), 0.13, 1.8));
        return v;
    },

    powerup(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.35);
        const root = opts.root ?? 72;
        [0, 4, 7, 12, 16].forEach((iv, k) => {
            tone(v, dest, t + k * 0.05, 'glassy', mtof(root + iv), 0.12, 0.004, 0.25);
        });
        const { f } = noiseHit(v, dest, t, 'bandpass', 1500, 4, 0.12, 0.15, 0.25);
        f.frequency.setValueAtTime(1500, t);
        f.frequency.exponentialRampToValueAtTime(9000, t + 0.35);
        return v;
    },

    ui(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.05);
        const { o } = tone(v, dest, t, 'sine', 1300, 0.16, 0.002, 0.06);
        o.frequency.setValueAtTime(1300, t);
        o.frequency.exponentialRampToValueAtTime(900, t + 0.03);
        noiseHit(v, dest, t, 'highpass', 6000, 0.7, 0.05, 0.001, 0.01);
        return v;
    },

    blip(ctx, io, opts) {
        const { v, dest, t } = begin(ctx, io, opts, 0.05);
        tone(v, dest, t, 'sine', opts.freq ?? 880, 0.18, 0.003, 0.15);
        return v;
    },
};
SFX.click = SFX.ui;
