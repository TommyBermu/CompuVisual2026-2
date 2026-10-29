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
import { isUnlocked } from '../achievements.js';
import {
    BALL_RADIUS, BALL_MASS, GROUP_BALL, GROUP_WORLD, GROUP_CRYSTAL, GROUP_CHUNK,
    GRAVITY, BALL_FLIGHT_GRAVITY, BALL_VISUAL_ARC, BALL_ARC_FADE,
    GLASS_BREAK_SPEED,
} from '../constants.js';

// Compartidos por todas las bolas (se dispara mucho, no recrearlos cada vez)
const geometry = new THREE.SphereGeometry(BALL_RADIUS, 40, 28);
const TRAIL_LENGTH = 10;
const trailPoint = new THREE.Vector3();
const TRAIL_COLORS = [0xff4fd8, 0xa98bff, 0x38e8ff, 0x5dff8a, 0xffd9a0, 0xffffff];
const TRAIL_STYLES = {
    rainbow: { opacity: 0.9, size: 0.16 },
    ghost: { opacity: 0.65, size: 0.13 },
};

function createTrail(type) {
    if (type !== 'rainbow' && type !== 'ghost') return null;
    const positions = new Float32Array(TRAIL_LENGTH * 3);
    const colors = new Float32Array(TRAIL_LENGTH * 3);
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (type === 'rainbow') trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({
        color: type === 'ghost' ? 0xb9f2ff : 0xffffff,
        vertexColors: type === 'rainbow',
        transparent: true,
        opacity: TRAIL_STYLES[type].opacity,
        depthWrite: false,
    });
    const glow = new THREE.Points(
        trailGeometry,
        new THREE.PointsMaterial({
            color: type === 'ghost' ? 0xb9f2ff : 0xffffff,
            size: TRAIL_STYLES[type].size,
            sizeAttenuation: true,
            transparent: true,
            opacity: TRAIL_STYLES[type].opacity * 0.5,
            depthWrite: false,
            vertexColors: type === 'rainbow',
        }),
    );
    return { line: new THREE.Line(trailGeometry, material), glow, type };
}

/*
    MATERIALES DE SKINS (Skins desbloqueables)
*/
const SKINS = {
    default: new THREE.MeshPhysicalMaterial({
        color: 0xd9dde3, metalness: 1, roughness: 0.22, clearcoat: 0.35, clearcoatRoughness: 0.25, envMapIntensity: 1.0,
    }),
    silver: new THREE.MeshPhysicalMaterial({
        color: 0xc9d2df, metalness: 1, roughness: 0.14, clearcoat: 0.55, clearcoatRoughness: 0.08, envMapIntensity: 1.1,
    }),
    bronze: new THREE.MeshPhysicalMaterial({
        color: 0xcd7f32, metalness: 0.95, roughness: 0.18, clearcoat: 0.65, clearcoatRoughness: 0.08, envMapIntensity: 1.15,
    }),
    gold: new THREE.MeshPhysicalMaterial({
        color: 0xffd34d, metalness: 1, roughness: 0.13, clearcoat: 0.7, clearcoatRoughness: 0.06, envMapIntensity: 1.35,
    }),
    amethyst: new THREE.MeshPhysicalMaterial({
        color: 0x9b58d1, metalness: 0.65, roughness: 0.12, transmission: 0.35, thickness: 0.65, clearcoat: 0.8, envMapIntensity: 1.1,
    }),
    sapphire: new THREE.MeshPhysicalMaterial({
        color: 0x1767c8, metalness: 0.7, roughness: 0.11, transmission: 0.3, thickness: 0.7, clearcoat: 0.8, envMapIntensity: 1.15,
    }),
    emerald: new THREE.MeshPhysicalMaterial({
        color: 0x40c982, metalness: 0.65, roughness: 0.12, transmission: 0.35, thickness: 0.65, clearcoat: 0.8, envMapIntensity: 1.1,
    }),
    diamond: new THREE.MeshPhysicalMaterial({
        color: 0xc8f7ff, metalness: 0.2, roughness: 0.04, transmission: 0.82, thickness: 1.1, clearcoat: 1, envMapIntensity: 1.7,
    }),
};

const SKIN_ACHIEVEMENTS = {
    silver: 'first_steps',
    bronze: 'checkpoint_2',
    amethyst: 'checkpoint_5',
    gold: 'finish_game',
    emerald: 'survivor',
    sapphire: 'combo_max',
    diamond: 'eco_shooter',
};

function getValidSkin(skin) {
    if (!skin || skin === 'default' || !SKINS[skin]) return 'default';
    const req = SKIN_ACHIEVEMENTS[skin];
    if (req && !isUnlocked(req)) return 'default';
    return skin;
}

// La llama el Game cuando el Renderer tiene listo el entorno de estudio
export function setBallEnvironment(texture) {
    for (const m of Object.values(SKINS)) {
        m.envMap = texture;
        m.needsUpdate = true;
    }
}

export default class Ball extends Entity {
    constructor(physics, position = { x: 0, y: 8, z: 0 }, skin = 'default', trail = 'none') {
        // Visual
        const validSkin = getValidSkin(skin);
        const material = SKINS[validSkin] || SKINS.default;
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        const trailVisual = createTrail(trail);
        if (trailVisual) mesh.add(trailVisual.line, trailVisual.glow);

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
        this.trail = trailVisual;

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
        this.trailPositions = [];
        this.world = physics.world;
        this._antiGravity = () => {
            if (this.flying) body.force.y -= GRAVITY * (1 - BALL_FLIGHT_GRAVITY) * body.mass;
        };
        this.world.addEventListener('preStep', this._antiGravity);
        this.sync();
    }

    _updateTrail() {
        if (!this.trail) return;
        this.trailPositions.unshift(this.mesh.position.clone());
        this.trailPositions.length = Math.min(this.trailPositions.length, TRAIL_LENGTH);
        const positions = this.trail.line.geometry.attributes.position.array;
        const colors = this.trail.line.geometry.attributes.color?.array;
        for (let i = 0; i < TRAIL_LENGTH; i++) {
            const point = this.trailPositions[i] || this.trailPositions[this.trailPositions.length - 1];
            trailPoint.copy(point).sub(this.mesh.position);
            positions[i * 3] = trailPoint.x;
            positions[i * 3 + 1] = trailPoint.y;
            positions[i * 3 + 2] = trailPoint.z;
            if (colors) {
                const color = new THREE.Color(TRAIL_COLORS[i % TRAIL_COLORS.length]);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }
        }
        this.trail.line.geometry.attributes.position.needsUpdate = true;
        this.trail.glow.geometry.attributes.position.needsUpdate = true;
        if (colors) this.trail.line.geometry.attributes.color.needsUpdate = true;
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
        this._updateTrail();
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
