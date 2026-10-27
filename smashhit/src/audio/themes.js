/*
    audio/themes.js
    ---------------
    La "partitura" de la música procedural: un TEMA por checkpoint (mismo
    índice que LEVELS en levels.js) más uno tranquilo para el menú.

    Cada tema define:
        root   nota MIDI de la tónica (43 = Sol2 ... 53 = Fa3)
        mode   escala (intervalos en semitonos) -> el "color" emocional
        bpm    tempo; sube con la velocidad del nivel
        prog   progresión de acordes en GRADOS de la escala (0 = I, 4 = V...)
        bars   compases por acorde
        pad    { wave, cutoff, detune, gain } colchón de acordes
        arp    { wave, pattern, decay, cutoff, gain, octave, in } arpegio
               pattern: 16 semicorcheas por compás; número = nota del acorde
               (0 = fundamental, 1 = tercera, 2 = quinta, 3 = séptima, 4+ =
               octava arriba), -1 = silencio. `in` = compás en que entra.
        bass   patrón de 16 pasos (1 = fundamental, 2 = quinta, 0 = nada)
        bells  probabilidad por compás de una campana aguda suelta
        perc   0..1 intensidad de percusión suave (0 = sin percusión)
        delay  { beats, feedback } eco sincronizado al tempo
        reverb cuánto va a la reverb

    La idea (como el Smash Hit original): cada sala suena distinta. Los
    primeros niveles son lentos, mayores y luminosos; el centro se oscurece
    (frigio, dórico, eólico) y el final vuelve a abrirse (lidio, mayor) con
    más tempo y más capas.
*/

export const MODES = {
    ionian: [0, 2, 4, 5, 7, 9, 11],
    lydian: [0, 2, 4, 6, 7, 9, 11],
    mixolydian: [0, 2, 4, 5, 7, 9, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
};

// Patrones de arpegio reutilizables (16 pasos = 1 compás)
const _ = -1;
const ARP = {
    sparse: [0, _, _, _, 2, _, _, _, 4, _, _, _, 2, _, _, _],
    eighths: [0, _, 2, _, 1, _, 3, _, 2, _, 1, _, 4, _, 2, _],
    sync: [0, _, _, 2, _, _, 4, _, _, 3, _, _, 2, _, 1, _],
    rolling: [0, 2, 4, 2, 1, 3, 4, 3, 0, 2, 4, 2, 1, 3, 5, 3],
    climb: [0, 1, 2, 4, 2, 3, 4, 5, 4, 3, 2, 4, 1, 2, 4, 6],
};
const BASS = {
    long: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    half: [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0],
    pulse: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 2, 0],
    drive: [1, 0, 1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 2, 0, 1, 0],
};

export const THEMES = [
    { // 0 Tarde dorada: Re mayor, lento y cálido
        root: 50, mode: MODES.ionian, bpm: 70, prog: [0, 3, 5, 4], bars: 2,
        pad: { wave: 'soft', cutoff: 1500, detune: 7, gain: 0.07 },
        arp: { wave: 'glassy', pattern: ARP.sparse, decay: 0.9, cutoff: 3500, gain: 0.07, octave: 2, in: 2 },
        bass: BASS.long, bells: 0.35, perc: 0, delay: { beats: 0.75, feedback: 0.35 }, reverb: 0.5,
    },
    { // 1 Atardecer: La mixolidio, algo más de movimiento
        root: 45, mode: MODES.mixolydian, bpm: 74, prog: [0, 6, 3, 0], bars: 2,
        pad: { wave: 'warm', cutoff: 1100, detune: 8, gain: 0.06 },
        arp: { wave: 'glassy', pattern: ARP.eighths, decay: 0.6, cutoff: 3000, gain: 0.06, octave: 2, in: 2 },
        bass: BASS.half, bells: 0.3, perc: 0, delay: { beats: 0.75, feedback: 0.4 }, reverb: 0.5,
    },
    { // 2 Cielo rosa: Fa lidio, flotante, muchas campanas
        root: 53, mode: MODES.lydian, bpm: 78, prog: [0, 1, 5, 4], bars: 2,
        pad: { wave: 'soft', cutoff: 1800, detune: 9, gain: 0.065 },
        arp: { wave: 'sine', pattern: ARP.sync, decay: 1.0, cutoff: 4000, gain: 0.08, octave: 2, in: 1 },
        bass: BASS.long, bells: 0.55, perc: 0.15, delay: { beats: 0.75, feedback: 0.45 }, reverb: 0.6,
    },
    { // 3 Desierto rojo: Mi frigio, oscuro y con pulso
        root: 52, mode: MODES.phrygian, bpm: 84, prog: [0, 1, 0, 6], bars: 2,
        pad: { wave: 'hollow', cutoff: 900, detune: 10, gain: 0.06 },
        arp: { wave: 'hollow', pattern: ARP.sync, decay: 0.45, cutoff: 2200, gain: 0.07, octave: 1, in: 2 },
        bass: BASS.pulse, bells: 0.2, perc: 0.35, delay: { beats: 0.75, feedback: 0.35 }, reverb: 0.45,
    },
    { // 4 Lavanda: Si bemol dórico, suave y melancólico
        root: 46, mode: MODES.dorian, bpm: 88, prog: [0, 3, 0, 6], bars: 2,
        pad: { wave: 'warm', cutoff: 1200, detune: 8, gain: 0.06 },
        arp: { wave: 'glassy', pattern: ARP.rolling, decay: 0.35, cutoff: 2800, gain: 0.05, octave: 2, in: 2 },
        bass: BASS.half, bells: 0.3, perc: 0.4, delay: { beats: 0.5, feedback: 0.3 }, reverb: 0.5,
    },
    { // 5 Mar al ocaso: Do# eólico, olas largas
        root: 49, mode: MODES.aeolian, bpm: 92, prog: [0, 5, 2, 6], bars: 2,
        pad: { wave: 'soft', cutoff: 1300, detune: 11, gain: 0.065 },
        arp: { wave: 'sine', pattern: ARP.eighths, decay: 0.7, cutoff: 3500, gain: 0.07, octave: 2, in: 1 },
        bass: BASS.pulse, bells: 0.35, perc: 0.5, delay: { beats: 0.75, feedback: 0.45 }, reverb: 0.6,
    },
    { // 6 Noche azul: Sol eólico, grave y espacioso
        root: 43, mode: MODES.aeolian, bpm: 96, prog: [0, 5, 3, 4], bars: 2,
        pad: { wave: 'warm', cutoff: 800, detune: 9, gain: 0.065 },
        arp: { wave: 'hollow', pattern: ARP.sparse, decay: 1.1, cutoff: 2400, gain: 0.08, octave: 2, in: 1 },
        bass: BASS.half, bells: 0.4, perc: 0.5, delay: { beats: 1.5, feedback: 0.5 }, reverb: 0.7,
    },
    { // 7 Aurora: Si lidio, brillante, arpegio rodando
        root: 47, mode: MODES.lydian, bpm: 100, prog: [0, 1, 5, 1], bars: 2,
        pad: { wave: 'soft', cutoff: 1700, detune: 12, gain: 0.07 },
        arp: { wave: 'glassy', pattern: ARP.rolling, decay: 0.3, cutoff: 4500, gain: 0.05, octave: 2, in: 0 },
        bass: BASS.pulse, bells: 0.45, perc: 0.6, delay: { beats: 0.75, feedback: 0.4 }, reverb: 0.6,
    },
    { // 8 Amanecer: Mi bemol mayor, ascendente
        root: 51, mode: MODES.ionian, bpm: 108, prog: [3, 4, 5, 0], bars: 1,
        pad: { wave: 'warm', cutoff: 1600, detune: 8, gain: 0.07 },
        arp: { wave: 'glassy', pattern: ARP.climb, decay: 0.3, cutoff: 4000, gain: 0.05, octave: 1, in: 0 },
        bass: BASS.drive, bells: 0.3, perc: 0.75, delay: { beats: 0.75, feedback: 0.35 }, reverb: 0.5,
    },
    { // 9 Cénit: Do lidio, el más rápido y lleno
        root: 48, mode: MODES.lydian, bpm: 116, prog: [0, 1, 5, 4], bars: 1,
        pad: { wave: 'soft', cutoff: 2000, detune: 10, gain: 0.07 },
        arp: { wave: 'glassy', pattern: ARP.climb, decay: 0.28, cutoff: 5000, gain: 0.05, octave: 2, in: 0 },
        bass: BASS.drive, bells: 0.4, perc: 0.85, delay: { beats: 0.75, feedback: 0.4 }, reverb: 0.55,
    },
];

// Tema del menú: solo colchón y campanas, muy lento
export const MENU_THEME = {
    root: 50, mode: MODES.lydian, bpm: 60, prog: [0, 4, 1, 5], bars: 2,
    pad: { wave: 'soft', cutoff: 1100, detune: 8, gain: 0.06 },
    arp: null, bass: BASS.long, bells: 0.5, perc: 0,
    delay: { beats: 1.5, feedback: 0.45 }, reverb: 0.7,
};

// Tema de un nivel ('menu' o índice de checkpoint; los que sobran usan el último)
export function themeFor(level) {
    if (level === 'menu' || level == null || level < 0) return MENU_THEME;
    return THEMES[Math.min(level, THEMES.length - 1)];
}

// Nota MIDI del grado `deg` de la escala del tema (grados > 6 suben de octava)
export function degreeNote(theme, deg) {
    const n = theme.mode.length;
    const oct = Math.floor(deg / n);
    return theme.root + theme.mode[((deg % n) + n) % n] + 12 * oct;
}

// Arpegio de campanas para el sonido de checkpoint, en la tonalidad del tema
export function chimeNotes(theme) {
    return [0, 2, 4, 7].map((d) => degreeNote(theme, d) + 24);
}
