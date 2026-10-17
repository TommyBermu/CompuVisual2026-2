// el canvas, creo que está muy pequeño xd
export const WIDTH = 800;
export const HEIGHT = 600;

// nave
export const SHIP_THRUST = 300;         // aceleración
export const SHIP_ROTATION_SPEED = 220; // velocidad de giro
export const SHIP_MAX_SPEED = 300;      // velocidad maxima
export const SHIP_DRAG = 80;            // frenado de la nave cuando no se acelera
export const SHIP_LIVES = 5;
export const SHIP_INVULNERABILITY_MS = 1300;    //Invulneravilidad al reeaparecer (1.3s)

// asteroides iniciales (valor por defecto del menú)
export const ASTEROID_COUNT = 6;

// modo oleadas: cada oleada nueva añade este número de asteroides a la anterior
export const WAVE_ASTEROID_INCREMENT = 2;

// velocidad de los asteroides
export const ASTEROID_MIN_SPEED = 0;
export const ASTEROID_MAX_SPEED = 140;