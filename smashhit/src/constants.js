/*
    Números de ajuste del juego en un solo sitio (igual que en Asteroids).
    Tocar aquí para "sentir" distinto el juego sin perseguir valores por el código.
*/

// --- Mundo físico (Cannon-es) ---
export const GRAVITY = -9.82;     // gravedad en el eje Y (m/s^2)
export const RESTITUTION = 0.7;   // "rebote": 0 = no rebota, 1 = rebote perfecto

// --- Cámara / avance por el túnel ---
// La cámara avanza hacia -Z (hacia "dentro" de la pantalla).
export const CAMERA_FOV = 70;
export const CAMERA_HEIGHT = 2.2; // altura de los "ojos" sobre el suelo
export const MAX_DELTA = 0.1;     // tope de delta (s) para que no salte al volver de otra pestaña

// --- Túnel / pasillo ---
export const TUNNEL_WIDTH = 8;     // ancho interior (X)
export const TUNNEL_HEIGHT = 6;    // alto de las paredes (Y)
export const WALL_THICKNESS = 0.5;
export const SEGMENT_LENGTH = 20;  // largo de cada tramo de pasillo (Z)
export const SPAWN_AHEAD = 140;    // cuántos metros por delante de la cámara se generan
export const DESPAWN_BEHIND = 10;  // metros detrás de la cámara antes de borrar

// --- Niveles ---
// Los 9 niveles (velocidad + colores) están en src/levels.js.
export const LEVEL_DURATION = 30;  // segundos aprox. que dura cada nivel
export const THEME_TRANSITION = 2; // segundos que tarda el cielo/luces en cambiar de paleta

// --- Bola ---
export const BALL_RADIUS = 0.35;
export const BALL_MASS = 1;
export const BALL_SPEED = 28;       // velocidad del lanzamiento (se le suma la de la cámara)
export const BALL_SPAWN_OFFSET = 1; // metros delante de la cámara donde nace la bola
export const BALL_LIFETIME = 6;     // segundos antes de borrar una bola
export const BALLS_AVAILABLE = 25;

// --- Cristales / rotura (para más adelante) ---
export const CRYSTAL_SHARDS = 8;  // nº de fragmentos al romper un cristal
