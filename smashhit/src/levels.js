/*
    levels.js
    ---------
    Los 9 niveles fijos del recorrido. Cada nivel tiene:
        - name:   nombre que aparece en el cartel al entrar.
        - speed:  velocidad de la cámara (m/s). Sube con el nivel = más difícil.
        - colors: paleta del nivel (cielo, niebla, luces, pasillo).
        - sunIntensity: fuerza del sol (más bajo en los niveles de noche).

    El largo de cada nivel se calcula para que dure ~LEVEL_DURATION segundos
    (largo = velocidad * tiempo), redondeado a tramos enteros de pasillo para
    que el cambio de colores coincida con un arco.

    Más adelante: aquí también irán los patrones de cristales/obstáculos de cada nivel.
*/

import { LEVEL_DURATION, SEGMENT_LENGTH } from './constants.js';

export const LEVELS = [
    {
        name: 'Tarde dorada',
        speed: 6,
        sunIntensity: 2.4,
        colors: {
            skyTop: '#5b7fbf', skyMid: '#f6b26b', skyHorizon: '#ffe0a3', skyBottom: '#6b4a3a',
            fog: '#f5c98a', sun: '#ffd9a0', hemiSky: '#ffe6c0', hemiGround: '#6b4f3a',
            floorA: '#e9c79a', floorB: '#ddb98a', wall: '#f6e3c8', arch: '#c9803f',
        },
    },
    {
        name: 'Atardecer',
        speed: 7,
        sunIntensity: 2.2,
        colors: {
            skyTop: '#3b2a5a', skyMid: '#f2766b', skyHorizon: '#ffc979', skyBottom: '#4a2c45',
            fog: '#f7a072', sun: '#ffb36b', hemiSky: '#ffd0a0', hemiGround: '#5a3550',
            floorA: '#e8b796', floorB: '#dba585', wall: '#f4d6c0', arch: '#c65d4f',
        },
    },
    {
        name: 'Cielo rosa',
        speed: 8,
        sunIntensity: 2.0,
        colors: {
            skyTop: '#4a2b6b', skyMid: '#e86a9a', skyHorizon: '#ffb3a7', skyBottom: '#3d2245',
            fog: '#f0959f', sun: '#ff9fb0', hemiSky: '#ffc6d3', hemiGround: '#4b2a4f',
            floorA: '#e7aab5', floorB: '#d999a6', wall: '#f6d3da', arch: '#a8436e',
        },
    },
    {
        name: 'Desierto rojo',
        speed: 9,
        sunIntensity: 2.2,
        colors: {
            skyTop: '#5a1f2e', skyMid: '#d9482b', skyHorizon: '#ff9a4d', skyBottom: '#3a1a1a',
            fog: '#e0683f', sun: '#ff7a3d', hemiSky: '#ffb08a', hemiGround: '#4a1f1f',
            floorA: '#c9643f', floorB: '#b85636', wall: '#e8a07c', arch: '#7a2a22',
        },
    },
    {
        name: 'Lavanda',
        speed: 10,
        sunIntensity: 1.8,
        colors: {
            skyTop: '#2a2350', skyMid: '#8d6bc9', skyHorizon: '#f2b8d0', skyBottom: '#251c3d',
            fog: '#b48fd0', sun: '#f5c0e0', hemiSky: '#d8c2f0', hemiGround: '#33264f',
            floorA: '#b9a3d9', floorB: '#a891cc', wall: '#ddd0f0', arch: '#5d3d99',
        },
    },
    {
        name: 'Mar al ocaso',
        speed: 11,
        sunIntensity: 1.8,
        colors: {
            skyTop: '#173a5e', skyMid: '#3f8fa6', skyHorizon: '#ffc48a', skyBottom: '#14283a',
            fog: '#7fb2b8', sun: '#ffc890', hemiSky: '#bfe3e6', hemiGround: '#1f3a4a',
            floorA: '#8fc2c4', floorB: '#7db3b6', wall: '#cfe6e4', arch: '#2f6f80',
        },
    },
    {
        name: 'Noche azul',
        speed: 12,
        sunIntensity: 1.2,
        colors: {
            skyTop: '#0b1030', skyMid: '#23306b', skyHorizon: '#5a6fb0', skyBottom: '#080b1e',
            fog: '#2d3a70', sun: '#9fb4ff', hemiSky: '#6f80c8', hemiGround: '#10142e',
            floorA: '#3b4880', floorB: '#334072', wall: '#5a689e', arch: '#c9a94f',
        },
    },
    {
        name: 'Aurora',
        speed: 13.5,
        sunIntensity: 1.2,
        colors: {
            skyTop: '#06141f', skyMid: '#1f6b5a', skyHorizon: '#6ff0b0', skyBottom: '#05101a',
            fog: '#2a7a68', sun: '#8affc8', hemiSky: '#7fe0c0', hemiGround: '#0b1f24',
            floorA: '#2f6f66', floorB: '#285f58', wall: '#4f9488', arch: '#b04fc9',
        },
    },
    {
        name: 'Amanecer',
        speed: 15,
        sunIntensity: 2.6,
        colors: {
            skyTop: '#4f6fb0', skyMid: '#ffb08a', skyHorizon: '#fff0c0', skyBottom: '#5a4a5a',
            fog: '#ffd2a8', sun: '#fff0d0', hemiSky: '#fff0dc', hemiGround: '#6a5060',
            floorA: '#f5dcc0', floorB: '#ecd0b2', wall: '#fff3e6', arch: '#e0a040',
        },
    },
];

// Calcular dónde empieza (start) y cuánto mide (length) cada nivel, en metros.
let acc = 0;
LEVELS.forEach((level) => {
    const segments = Math.max(1, Math.round((level.speed * LEVEL_DURATION) / SEGMENT_LENGTH));
    level.start = acc;
    level.length = segments * SEGMENT_LENGTH;
    acc += level.length;
});

export const TOTAL_LENGTH = acc; // metros de todo el recorrido

// Índice (0..8) del nivel al que pertenece una distancia recorrida.
export function levelIndexAt(distance) {
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (distance >= LEVELS[i].start) return i;
    }
    return 0;
}
