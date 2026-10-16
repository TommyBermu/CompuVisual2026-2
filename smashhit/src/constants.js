/*
  Números de ajuste del juego en un solo sitio (igual que en Asteroids).
  Tocar aquí para "sentir" distinto el juego sin perseguir valores por el código.
*/

// --- Mundo físico (Cannon-es) ---
export const GRAVITY = -9.82;     // gravedad en el eje Y (m/s^2)
export const RESTITUTION = 0.7;   // "rebote": 0 = no rebota, 1 = rebote perfecto

// --- Cámara / avance por el túnel ---
export const CAMERA_FOV = 60;
export const CAMERA_SPEED = 0;    // velocidad de avance en Z (0 por ahora: demo estática)

// --- Bola ---
export const BALL_RADIUS = 0.5;
export const BALL_MASS = 1;
export const BALL_SPEED = 20;     // velocidad inicial al lanzar (para el Shooter, más adelante)
export const BALLS_AVAILABLE = 25;

// --- Suelo de la demo ---
export const GROUND_SIZE = 50;

// --- Cristales / rotura (para más adelante) ---
export const CRYSTAL_SHARDS = 8;  // nº de fragmentos al romper un cristal
