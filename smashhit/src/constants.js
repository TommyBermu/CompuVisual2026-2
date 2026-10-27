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

// --- Obstáculos por nivel (ver src/obstacles/ y el campo `obstacles` de levels.js) ---
// Péndulo: una placa de vidrio colgada de una barra que oscila de lado a lado.
export const PENDULUM_PIVOT_Y = 7.4;          // altura del eje (m)
export const PENDULUM_ROD_LENGTH = 3.2;       // eje -> borde de arriba de la placa
export const PENDULUM_AMPLITUDE = [0.55, 0.75]; // rad (min, max)
export const PENDULUM_PERIOD = [2.0, 2.8];    // s por oscilación completa (min, max)
// Aspas giratorias: hojas de vidrio alrededor de un eje (sobre la cámara).
export const SPINNER_HUB_Y = [4.3, 4.9];      // altura del eje (min, max)
export const SPINNER_SPEED = [1.1, 1.9];      // rad/s (min, max)
// Compuerta: dos puertas metálicas que se abren al romper el botón de vidrio.
export const GATE_HEIGHT = 6;                 // alto de las puertas (m)
export const GATE_OPEN_TIME = 0.45;           // s que tardan en abrirse

// --- Choque cámara-vidrio ---
// La cámara se trata como una ESFERA (tiene "volumen", no es un punto). Se
// comprueba contra cada trozo de vidrio que siga en pie (y bloques grandes que
// se estén cayendo), así un panel roto a medias sigue golpeando por su parte sana.
export const CAMERA_RADIUS = 0.6;       // radio de la cámara (m)
export const CRASH_BREAK_RADIUS = 1.0;  // radio que rompe la cámara al chocar
export const CRASH_COOLDOWN = 0.5;      // s sin recibir otro golpe tras chocar

// --- Grupos de colisión (Cannon-es) ---
// Dos cuerpos chocan solo si el grupo de cada uno está en la máscara del otro.
// Sirve para que las bolas de la muerte (inertes) atraviesen los cristales
// pero sigan chocando con suelo y paredes.
export const GROUP_WORLD = 1;   // túnel: suelo + paredes
export const GROUP_CRYSTAL = 2; // paneles de cristal (en pie)
export const GROUP_BALL = 4;    // bolas normales (disparadas)
export const GROUP_CHUNK = 8;   // bloques de vidrio cayéndose

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
export const BALL_SPEED = 24;       // velocidad del lanzamiento (se le suma la de la cámara)
export const BALL_SPAWN_OFFSET = 1; // metros delante de la cámara donde nace la bola
export const BALL_SPAWN_DROP = 0.3; // metros por debajo de la mira donde nace la bola
// El arco del tiro sube ~g·t²/8 sobre la línea de la mira (t = tiempo de vuelo).
// Para que sea plano SIN que la bola vaya rapidísima, en el vuelo (hasta su
// primer choque) la bola siente solo una fracción de la gravedad.
export const BALL_FLIGHT_GRAVITY = 0.4;   // fracción de la gravedad hasta el primer choque
// Tope del tiempo de vuelo (s): solo los tiros MUY lejanos salen algo más rápidos.
// Ojo: muy bajo = bolas muy rápidas que podrían atravesar el vidrio sin detectarlo.
export const BALL_MAX_FLIGHT_TIME = 0.8;
// Arco SOLO VISUAL: el mesh de la bola se dibuja por encima de su cuerpo físico
// con una "joroba" que vale 0 al salir y 0 al llegar, así se ve una parábola
// marcada pero el impacto sigue siendo donde apunta la mira.
// 1 = se ve como si tuviera la gravedad completa; 0 = sin arco extra.
export const BALL_VISUAL_ARC = 1;
export const BALL_ARC_FADE = 0.12; // s en que se desvanece la joroba si choca antes de llegar
export const BALL_LIFETIME = 6;     // segundos antes de borrar una bola
export const BALLS_AVAILABLE = 25;
export const AIM_MAX_DISTANCE = 40; // si el clic no apunta a nada, se apunta a esta distancia

// --- Rotura del vidrio (ver utils/fracture.js y entities/Crystal.js) ---
export const GLASS_HOLE_RADIUS = 0.7;     // radio base del agujero de una bola (m)
export const GLASS_HEIGHT_WEAKNESS = 1.2; // golpe arriba del todo: radio x (1 + esto)
export const GLASS_EDGE_WEAKNESS = 0.6;   // golpe junto a un borde lateral: radio x (1 + esto)
export const GLASS_BALL_SLOWDOWN = 0.6;   // al PERFORAR, la bola conserva este % de velocidad
export const GLASS_RESTITUTION = 0.5;     // rebote de la bola contra vidrio intacto (0..1)
export const GLASS_BREAK_SPEED = 14;      // m/s mínimos para ROMPER y atravesar; por debajo, rebota
export const GLASS_CHUNK_DENSITY = 1.5;   // masa por m² de los bloques que se caen
export const CHUNK_HARMFUL_AREA = 0.3;    // bloques cayéndose de más área (m²) golpean a la cámara
export const CHUNK_LIFETIME = 8;          // s antes de borrar un bloque caído
export const DEBRIS_LIFETIME = 2.5;       // s que duran las astillas
export const MAX_DEBRIS = 200;            // tope de astillas a la vez
