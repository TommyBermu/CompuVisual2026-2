/*
    environments.js
    ---------------
    La GEOMETRÍA y el AMBIENTE de cada nivel ("sala"). Cada nivel elige un
    entorno (campo `env` en levels.js) y entities/Tunnel.js lo construye tramo
    a tramo.

    La idea (como en el Smash Hit original) es una sensación de espacio
    INFINITO: la niebla es del mismo color que el horizonte del cielo, así no
    se ve dónde empieza ni dónde acaba nada, y lo que se sostiene (islas,
    pórticos, pilares) baja hasta perderse en la niebla.

    Campos (todos opcionales):
        walls:      { height, thickness, jagged: [min, max], shadow, continuous }  paredes
                    laterales (continuous: siguen sobre el vacío entre islas). null = sin paredes.
        ceiling:    { y, halfWidth, slats, shadow }  techo. slats = vigas con
                    rendijas por las que entra el sol.
        outerFloor: media anchura de un suelo extra alrededor del carril.
        floor:      false = SIN SUELO: la cámara vuela sobre el vacío.
        base:       en los niveles sin suelo, fragmento flotante bajo lo que se
                    apoya en el suelo: 'slab' | 'disc' | 'raft'.
        slab:       grosor de la losa del suelo (se ve por debajo).
        islands:    el suelo NO es continuo: cada tramo es una isla y entre isla e
                    isla hay VACÍO (las bolas caen y no siguen rodando hacia
                    otros cristales). Las islas se apoyan en un pedestal que baja
                    hasta el fondo (niebla, arena o agua).
        pedestal:   false = las islas no llevan pedestal (el muelle usa pilotes).
        ground:     { y } suelo lejano bajo el recorrido (desierto: arena).
        water:      altura del agua (muelle).
        fogDensity: densidad de la niebla EXPONENCIAL (0.02: a 50 m la niebla tapa ~60%, a 90 m casi todo).
        fogWhite:   cuánto se aclara la niebla hacia el blanco (0..1). Bajo = la bruma
                    (y todo lo que se pierde en ella) conserva el tono del nivel.
        flatSky:    el cielo entero del color de la niebla (sin horizonte).
        supports:   sin paredes, de dónde cuelgan vigas/péndulos/aspas:
                    'pillars' (columnas desde el fondo), 'sky' (cables hacia arriba)
                    o 'float' (flotan solas con remates luminosos).
        camera:     { roll } cámara girada (rad, PI = boca abajo) o { spin } rad/s.
        deco:       elementos decorativos (ver Tunnel.js -> DECO).
*/

import { TUNNEL_HEIGHT } from './constants.js';

// Profundidad a la que bajan pedestales, pórticos y paredes sobre el vacío
export const VOID_DEPTH = 260;

export const ENVIRONMENTS = {
    // 0 · Galería cerrada: techo de vigas con rendijas, costillas y lámparas.
    gallery: {
        walls: { height: TUNNEL_HEIGHT },
        ceiling: { y: TUNNEL_HEIGHT, slats: true, shadow: true },
        fogDensity: 0.02,
        fogWhite: 0.3,
        deco: ['ribs', 'baseLamps', 'threshold'],
    },
    // 1 · Pasillo a cielo abierto: muros con almenas y contrafuertes por fuera.
    openCorridor: {
        walls: { height: TUNNEL_HEIGHT, shadow: true },
        fogDensity: 0.018,
        fogWhite: 0.35,
        deco: ['arch', 'merlons', 'buttresses', 'threshold'],
    },
    // 2 · Salón infinito: sin paredes, techo bajo, columnas hasta perderse en la niebla.
    hall: {
        walls: null,
        ceiling: { y: 6.8, halfWidth: 24, shadow: false },
        outerFloor: 24,
        fogDensity: 0.032, // ya es muy cerrada: con el multiplicador global, a 20 m tapa ~70%
        fogWhite: 0.2,
        flatSky: true,
        deco: ['columnGrid', 'ceilingLamps', 'threshold'],
    },
    // ========================================================================
    // A partir de aquí NO HAY PASILLO NI SUELO: la cámara vuela sobre el VACÍO.
    // Las bolas que fallan caen y se pierden en la niebla (no siguen rodando
    // hacia otros cristales). Lo que se apoya "en el suelo" (paneles, puertas)
    // va sobre un fragmento flotante (base); lo que cuelga (vigas, péndulos,
    // aspas) se sostiene según `supports`. Cada nivel es un SUEÑO distinto
    // (decorado en src/dreams.js), con objetos que flotan, giran y respiran.
    // ========================================================================

    // 3 · Desierto: muy abajo, arena con dunas y templos; en el cielo flotan
    //     pirámides invertidas. Las vigas se apoyan en columnas que salen de la arena.
    desert: {
        floor: false,
        ground: { y: -14 },
        base: 'slab',
        supports: 'pillars',
        fogDensity: 0.016,
        fogWhite: 0.15,
        deco: ['dunes', 'temples', 'invertedPyramids'],
    },
    // 4 · Jardín de burbujas: esferas pastel gigantes que suben y bajan,
    //     escaleras que no llevan a ningún sitio y baldosas de ajedrez flotando.
    //     Las vigas cuelgan de cables que se pierden hacia arriba.
    floatingBridge: {
        floor: false,
        base: 'disc',
        supports: 'sky',
        fogDensity: 0.024,
        fogWhite: 0.2,
        deco: ['underFragments', 'bubbles', 'floatingStairs', 'checkerTiles'],
    },
    // 5 · Mar de puertas: un mar en calma lejos abajo, marcos de puerta y faros
    //     plantados en el agua y casas boca abajo flotando en el cielo.
    pier: {
        floor: false,
        water: -9,
        base: 'raft',
        supports: 'pillars',
        fogDensity: 0.02,
        fogWhite: 0.15,
        deco: ['doorsOnWater', 'lighthouses', 'flyingHouses'],
    },
    // 6 · Noche de giroscopios: anillos gigantes que giran unos dentro de otros,
    //     estrellas y vitrales flotando. Las vigas FLOTAN solas (lógica de sueño).
    cathedral: {
        floor: false,
        base: 'disc',
        supports: 'float',
        fogDensity: 0.022,
        fogWhite: 0.1,
        deco: ['underFragments', 'gyroscopes', 'stars', 'stainedGlass'],
    },
    // 7 · Aurora: CÁMARA BOCA ABAJO. Estalactitas de cristal colgando de un
    //     cielo que ahora se ve abajo, pórticos gigantes y esquirlas que giran.
    auroraWalk: {
        floor: false,
        base: 'slab',
        supports: 'sky',
        fogDensity: 0.022,
        fogWhite: 0.15,
        camera: { roll: Math.PI },
        deco: ['underFragments', 'stalactites', 'rings', 'shards'],
    },
    // 8 · Escher al amanecer: LA CÁMARA DA VUELTAS. Escaleras imposibles, arcos
    //     y trozos de columna flotando girados en todas direcciones.
    ruins: {
        floor: false,
        base: 'slab',
        supports: 'pillars',
        fogDensity: 0.02,
        fogWhite: 0.15,
        camera: { spin: 0.3 },
        deco: ['underFragments', 'floatingStairs', 'floatingArches', 'columnChunks'],
    },
    // 9 · Cénit: geometría pura. Sólidos platónicos blancos gigantes girando
    //     lentamente y anillos en un cielo casi blanco.
    zenith: {
        floor: false,
        base: 'disc',
        supports: 'float',
        fogDensity: 0.018,
        fogWhite: 0.3,
        deco: ['underFragments', 'platonic', 'rings'],
    },
};

export function environmentFor(level) {
    return ENVIRONMENTS[level.env] || ENVIRONMENTS.openCorridor;
}

// ¿Los obstáculos de este entorno necesitan pórtico para colgar sus piezas?
export function needsPortal(env) {
    const w = env.walls;
    if (!w) return true;
    const minH = w.jagged ? w.jagged[0] : w.height;
    return minH < TUNNEL_HEIGHT;
}

// Altura del pórtico de soporte (hasta el techo si lo hay)
export function portalHeight(env) {
    return env.ceiling ? env.ceiling.y : TUNNEL_HEIGHT;
}

// Hasta dónde bajan las estructuras que se apoyan "en el fondo"
export function bottomY(env) {
    if (env.ground) return env.ground.y;
    if (env.water !== undefined) return env.water - 1.5;
    if (env.islands || env.floor === false) return -VOID_DEPTH;
    return 0;
}
