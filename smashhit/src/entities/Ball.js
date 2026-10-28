/*
    entities/Ball.js
    ----------------
    La bola de metal: esfera visual (Three) + cuerpo esférico con masa (Cannon).
    El Shooter la crea delante de la cámara y le da velocidad inicial; desde ahí
    solo la mueve la física (gravedad + rebotes).

    Cromo pulido con su propio entorno de reflejo (un estudio de fotografía,
    ver abajo): se lee como metal en cualquier nivel.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import {
    BALL_RADIUS, BALL_MASS, GROUP_BALL, GROUP_WORLD, GROUP_CRYSTAL, GROUP_CHUNK,
    GRAVITY, BALL_FLIGHT_GRAVITY, BALL_VISUAL_ARC, BALL_ARC_FADE,
    GLASS_BREAK_SPEED,
} from '../constants.js';

// Compartidos por todas las bolas (se dispara mucho, no recrearlos cada vez)
const geometry = new THREE.SphereGeometry(BALL_RADIUS, 40, 28);
/*
    METAL SATINADO: metal puro con algo de rugosidad (los reflejos se ven
    difuminados, menos espejo que un cromo) y un barniz suave encima. El tono
    es un plateado algo apagado, apenas frío.

    El reflejo NO es el cielo del nivel (casi todo niebla clara: con él el cromo
    se veía como una bola blanca lisa) sino un ESTUDIO de fotografía
    (RoomEnvironment de Three: una sala gris con paneles de luz), preparado por
    el Renderer y asignado con setBallEnvironment(). Esos paneles brillantes
    sobre fondo oscuro son lo que hace que se lea como metal al girar.
*/
const material = new THREE.MeshPhysicalMaterial({
    color: 0xd9dde3,          // plateado un poco más apagado
    metalness: 1,
    roughness: 0.22,          // satinado: los reflejos se difuminan (menos espejo)
    clearcoat: 0.35,          // barniz suave, sin el segundo brillo tan marcado
    clearcoatRoughness: 0.25,
    envMapIntensity: 1.0,
});

// La llama el Game cuando el Renderer tiene listo el entorno de estudio
export function setBallEnvironment(texture) {
    material.envMap = texture;
    material.needsUpdate = true;
}

export default class Ball extends Entity {
    constructor(physics, position = { x: 0, y: 8, z: 0 }) {
        // Visual
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;

        // Física
        const body = new CANNON.Body({
            mass: BALL_MASS,
            shape: new CANNON.Sphere(BALL_RADIUS),
            material: physics.defaultMaterial,
        });
        body.position.set(position.x, position.y, position.z);
        // Por defecto (bola disparada): choca con el mundo, los paneles y los bloques que caen.
        body.collisionFilterGroup = GROUP_BALL;
        body.collisionFilterMask = GROUP_WORLD | GROUP_CRYSTAL | GROUP_CHUNK;

        super(mesh, body);

        // Etiqueta + detección de choque contra el vidrio.
        // El vidrio tiene collisionResponse = true, así que Cannon hace REBOTAR
        // la bola por defecto. Solo si el impacto es FUERTE (>= GLASS_BREAK_SPEED)
        // encolamos la rotura: entonces el panel se rompe y, al procesar el golpe
        // (processHits, fuera del step), la bola PERFORA en vez de rebotar.
        body.userData = { type: 'ball', entity: this };
        this.hitCrystals = new Set(); // paneles que esta bola ya rompió (uno por pasada)
        this.firstContact = null;     // tipo de lo PRIMERO que tocó ('crystal', 'chunk', 'world'): para detectar fallos
        body.addEventListener('collide', (e) => {
            if (this.firstContact === null) this.firstContact = e.body.userData?.type ?? 'world';
            if (this.flying) {
                // primer choque: vuelve la gravedad normal y la joroba visual se desvanece
                this.flying = false;
                this.arcAtHit = this._arcOffset();
                this.hitAge = this.age;
            }
            if (this.inert) return; // las bolas de la animación de muerte no rompen nada
            const other = e.body.userData;
            if (!other) return;
            if (other.type === 'chunk' || other.type === 'pyramid') {
                // bloques que caen y pirámides (bonus): cualquier toque cuenta
                other.entity.registerBallHit(this);
            } else if (other.type === 'crystal') {
                // Solo rompe/perfora si viene con suficiente velocidad; si no, rebota.
                if (this.body.velocity.length() >= GLASS_BREAK_SPEED) {
                    other.entity.registerBallHit(this);
                }
            }
        });

        this.inert = false; // true = decorativa (no rompe cristales)

        // En vuelo (ver setFlying) se contrarresta parte de la gravedad con una
        // fuerza hacia arriba en cada substep de la física (Cannon no tiene
        // gravedad por cuerpo; las fuerzas se borran tras cada substep).
        this.flying = false;
        this.flightTime = 0; // s que dura el vuelo hasta la mira (lo da el Shooter)
        this.arcAtHit = 0;
        this.hitAge = 0;
        this.age = 0;
        this.world = physics.world;
        this._antiGravity = () => {
            if (this.flying) body.force.y -= GRAVITY * (1 - BALL_FLIGHT_GRAVITY) * body.mass;
        };
        this.world.addEventListener('preStep', this._antiGravity);
        this.sync();
    }

    // Bola disparada: gravedad reducida hasta su primer choque (tiro más plano)
    // y arco visual a lo largo de los `flightTime` segundos que tarda en llegar.
    setFlying(flightTime = 0) {
        this.flying = true;
        this.flightTime = flightTime;
        return this;
    }

    // Altura extra (solo visual) del mesh sobre el body. Es la parte de la
    // parábola que la gravedad reducida le quitó: H·4s(1-s), con s = progreso
    // del vuelo, así vale 0 al salir y al llegar a la mira.
    _arcOffset() {
        const T = this.flightTime;
        if (!T) return 0;
        if (!this.flying) {
            const fade = 1 - (this.age - this.hitAge) / BALL_ARC_FADE;
            return fade > 0 ? this.arcAtHit * fade : 0;
        }
        const s = Math.min(this.age / T, 1);
        const H = BALL_VISUAL_ARC * -GRAVITY * (1 - BALL_FLIGHT_GRAVITY) * T * T / 8;
        return H * 4 * s * (1 - s);
    }

    sync() {
        super.sync();
        this.mesh.position.y += this._arcOffset();
    }

    destroy(renderer, physics) {
        super.destroy(renderer, physics);
        this.world.removeEventListener('preStep', this._antiGravity);
    }

    // Marca la bola como "inerte" (animación de muerte): no rompe cristales y
    // físicamente los ATRAVIESA, pero sigue chocando con suelo y paredes.
    setInert() {
        this.inert = true;
        this.body.collisionFilterMask = GROUP_WORLD; // quita CRYSTAL de la máscara
        return this;
    }
}
