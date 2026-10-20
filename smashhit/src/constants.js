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
export const TUNNEL_WIDTH = 11;    // ancho interior (X)
export const TUNNEL_HEIGHT = 8;    // alto de las paredes (Y)
export const WALL_THICKNESS = 0.5;
export const SEGMENT_LENGTH = 20;  // largo de cada tramo de pasillo (Z)
export const SPAWN_AHEAD = 140;    // cuántos metros por delante de la cámara se generan
export const DESPAWN_BEHIND = 10;  // metros detrás de la cámara antes de borrar

// --- Muros de cristal (salen del suelo, tipo "topo") ---
export const CRYSTAL_WALL_CHANCE = 0.85; // probabilidad de que un tramo tenga un muro (0..1)
export const CRYSTAL_THICKNESS = 0.3;    // grosor del panel de cristal (Z)
export const CRYSTAL_OPACITY = 0.5;      // transparencia del cristal (0 = invisible, 1 = opaco)
export const CRYSTAL_MIN_WIDTH = 2;      // ancho mínimo del muro (X)
export const CRYSTAL_MAX_WIDTH = 4;      // ancho máximo del muro (X)
export const CRYSTAL_MIN_HEIGHT = 2.5;   // alto mínimo del muro (Y)
export const CRYSTAL_MAX_HEIGHT = 4.5;   // alto máximo del muro (Y)
export const CRYSTAL_RISE_TIME = 0.6;    // segundos que tarda en salir del suelo
export const CRYSTAL_RISE_AHEAD = 45;    // a cuántos metros de la cámara empieza a subir

// --- Muerte / colisión con la cámara ---
// La cámara se trata como una pequeña caja (tiene "volumen"), no un punto:
// mueres un poco antes de tocar el muro, lo que se siente más justo.
export const DEATH_MARGIN_Z = 1;  // holgura en Z (profundidad)
export const DEATH_MARGIN_X = 1;  // holgura en X (laterales)
export const DEATH_MARGIN_Y = 1;  // holgura en Y (altura, por si el muro es bajo)

// --- Grupos de colisión (Cannon-es) ---
// Dos cuerpos chocan solo si el grupo de cada uno está en la máscara del otro.
// Sirve para que las bolas de la muerte (inertes) atraviesen los cristales
// pero sigan chocando con suelo y paredes.
export const GROUP_WORLD = 1;   // túnel: suelo + paredes
export const GROUP_CRYSTAL = 2; // muros de cristal
export const GROUP_BALL = 4;    // bolas normales (disparadas)

// --- Checkpoints / avance lineal ---
export const CHECKPOINT_LENGTH = 500; // metros por checkpoint
export const CHECKPOINT_COUNT = 10;   // checkpoints 0..9 (fin del recorrido en el 9)

// --- Economía de bolas (las bolas son munición Y vida) ---
export const CRYSTAL_BREAK_REWARD = 3; // +bolas al romper un cristal con un disparo
export const CRASH_PENALTY_BASE = 5;   // -bolas base al chocar de frente con un cristal
// penalización total al chocar = CRASH_PENALTY_BASE + checkpoint actual (N)

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
