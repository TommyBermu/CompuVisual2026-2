/*
    obstacles/shared.js
    -------------------
    Utilidades comunes de los obstáculos: azar, medidas del pasillo y el
    "TUBO" de la cámara.

    La cámara pasa siempre por x = 0, y = CAMERA_HEIGHT (coords locales del
    recorrido) con un radio CAMERA_RADIUS. Las partes SÓLIDAS que no son
    puertas (bloques, columnas, vigas, ejes) deben quedar FUERA de ese tubo
    (con margen): si no, el choque sería inevitable. outsideTube() lo comprueba.
*/

import { TUNNEL_WIDTH, TUNNEL_HEIGHT, CAMERA_HEIGHT, CAMERA_RADIUS } from '../constants.js';

export const HALF_W = TUNNEL_WIDTH / 2;
export const WALL_H = TUNNEL_HEIGHT;
export const CAM_Y = CAMERA_HEIGHT;

// Margen del tubo: |x| < TUBE_X y TUBE_Y0 < y < TUBE_Y1 está prohibido para sólidos
export const TUBE_X = CAMERA_RADIUS + 0.9;
export const TUBE_Y0 = CAM_Y - CAMERA_RADIUS - 0.3;
export const TUBE_Y1 = CAM_Y + CAMERA_RADIUS + 0.4;

export const rand = (min, max) => min + Math.random() * (max - min);
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const pick = (list) => list[Math.floor(Math.random() * list.length)];
export const sign = () => (Math.random() < 0.5 ? -1 : 1);
export const chance = (p) => Math.random() < p;

// ¿Una caja (límites locales en X e Y) queda fuera del tubo de la cámara?
export function outsideTube(minX, maxX, minY, maxY) {
    return minX >= TUBE_X || maxX <= -TUBE_X || minY >= TUBE_Y1 || maxY <= TUBE_Y0;
}

// Elige una variante al azar de un objeto { nombre: función }
export function pickVariant(variants) {
    return variants[pick(Object.keys(variants))];
}
