/*
    entities/Crystal.js
    -------------------
    Un muro de cristal que SALE DEL SUELO como un "topo" de feria: no ocupa todo
    el pasillo, tiene ancho/alto aleatorios y aparece en una X aleatoria. Nace
    hundido bajo el suelo y sube hasta su altura final (animación de subida).

    Por ahora NO se rompe: solo aparece y lo despawnea el Spawner con su tramo.
    Si la CÁMARA lo toca, el jugador muere (lo comprueba el Spawner con aabb()).

    Encaja en Entity como un mesh + un body estático (mass 0). El body se mueve
    junto con la animación para que las bolas reboten contra la parte visible.
*/

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import Entity from './Entity.js';
import { LEVELS } from '../levels.js';
import {
    CRYSTAL_THICKNESS, CRYSTAL_OPACITY,
    CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH, CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT,
    CRYSTAL_RISE_TIME, TUNNEL_WIDTH,
    GROUP_WORLD, GROUP_CRYSTAL, GROUP_BALL,
} from '../constants.js';

const CT = CRYSTAL_THICKNESS;
const rand = (min, max) => min + Math.random() * (max - min);

// Un material de cristal por nivel (color del arco del nivel), reutilizado.
const materialsByLevel = new Map();

function materialFor(levelIndex) {
    if (!materialsByLevel.has(levelIndex)) {
        const c = LEVELS[levelIndex].colors;
        materialsByLevel.set(levelIndex, new THREE.MeshPhysicalMaterial({
            color: c.arch,
            transparent: true,
            opacity: CRYSTAL_OPACITY,
            roughness: 0.05,
            metalness: 0,
            transmission: 0.6,
            thickness: 0.5,
            envMapIntensity: 1,
            side: THREE.DoubleSide,
        }));
    }
    return materialsByLevel.get(levelIndex);
}

export default class Crystal extends Entity {
    constructor(physics, z, levelIndex = 0) {
        // Tamaño y posición X aleatorios dentro del pasillo
        const width = rand(CRYSTAL_MIN_WIDTH, CRYSTAL_MAX_WIDTH);
        const height = rand(CRYSTAL_MIN_HEIGHT, CRYSTAL_MAX_HEIGHT);
        const maxX = (TUNNEL_WIDTH - width) / 2 - 0.2; // que no atraviese las paredes
        const x = rand(-maxX, maxX);

        // --- Visual ---
        const geo = new THREE.BoxGeometry(width, height, CT);
        const mesh = new THREE.Mesh(geo, materialFor(levelIndex));
        mesh.castShadow = true;

        // --- Física: caja estática ---
        const body = new CANNON.Body({ mass: 0, material: physics.defaultMaterial });
        body.addShape(new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, CT / 2)));
        // Cristal: choca con el mundo y con bolas NORMALES. Las bolas inertes
        // (animación de muerte) lo atraviesan porque su máscara no incluye CRYSTAL.
        body.collisionFilterGroup = GROUP_CRYSTAL;
        body.collisionFilterMask = GROUP_WORLD | GROUP_BALL;

        super(mesh, body);

        // Etiqueta para que la bola sepa que chocó contra un cristal
        body.userData = { type: 'crystal', entity: this };

        // Geometría del muro (para animación y para el AABB de muerte)
        this.x = x;
        this.z = z;
        this.halfWidth = width / 2;
        this.height = height;
        this.width = width;
        this.targetY = height / 2;      // centro del muro cuando está fuera del todo
        this.rise = 0;                  // 0 = hundido, 1 = fuera del todo
        this.rising = false;            // lo activa el Spawner cuando la cámara se acerca
        this.hit = false;               // la marca una bola al golpearlo
        this.charged = false;           // ya cobró penalización al jugador (choque de cámara)
        this.falling = false;           // ya convertido a dinámico (cayéndose)

        this._place();
    }

    // Coloca mesh+body según el progreso de subida (rise 0..1)
    _place() {
        // Cuando rise=0 el centro está una altura entera bajo el suelo (invisible)
        const y = this.targetY - (1 - this.rise) * this.height;
        this.mesh.position.set(this.x, y, this.z);
        this.body.position.set(this.x, y, this.z);
    }

    startRising() {
        this.rising = true;
    }

    // Golpeado por una bola: se "cae". Lo volvemos dinámico y le damos un
    // empujón + giro para que se desprenda y la gravedad lo tumbe.
    knockDown(impactVelocity = null) {
        if (this.falling) return;
        this.falling = true;
        this.rising = false;
        this.body.type = CANNON.Body.DYNAMIC;
        this.body.mass = 2;
        this.body.updateMassProperties();
        this.body.wakeUp();
        // empujón en la dirección del impacto (o hacia adelante por defecto)
        const push = impactVelocity || new CANNON.Vec3(0, 2, -4);
        this.body.velocity.set(push.x * 0.3, 2 + Math.random() * 2, push.z * 0.3 - 2);
        this.body.angularVelocity.set(
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
        );
    }

    update(delta) {
        if (this.falling) {
            this.sync(); // ya lo mueve la física
            return;
        }
        if (this.rising && this.rise < 1) {
            this.rise = Math.min(1, this.rise + delta / CRYSTAL_RISE_TIME);
            this._place();
        }
        this.sync();
    }

    // Caja del muro ya visible (lo que sobresale del suelo), en coordenadas de mundo.
    // Devuelve límites para comparar con la cámara. Solo cuenta si ya salió algo.
    // Un muro ya golpeado (cayéndose) no mata.
    aabb() {
        if (this.falling) return null;
        const top = this.mesh.position.y + this.height / 2;
        if (top <= 0.1) return null; // aún bajo el suelo
        return {
            minX: this.x - this.halfWidth, maxX: this.x + this.halfWidth,
            maxY: top,
            z: this.z, halfZ: CT / 2,
        };
    }
}
