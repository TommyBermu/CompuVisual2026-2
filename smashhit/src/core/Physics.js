/*
  core/Physics.js
  ---------------
  Capa FÍSICA (Cannon-es). No dibuja nada.
  Responsabilidad: crear el "mundo" con gravedad y materiales de contacto,
  avanzar la simulación (step) y añadir/quitar cuerpos.

  En la demo ya está funcional. Más adelante: materiales por tipo de objeto,
  grupos de colisión, eventos de impacto para el sistema Shatter, etc.
*/

import * as CANNON from 'cannon-es';
import { GRAVITY, RESTITUTION, GLASS_RESTITUTION } from '../constants.js';

export default class Physics {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, GRAVITY, 0);

        // Material por defecto con rebote (restitution)
        this.defaultMaterial = new CANNON.Material('default');
        const contact = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            { friction: 0.3, restitution: RESTITUTION }
        );
        this.world.addContactMaterial(contact);
        this.world.defaultContactMaterial = contact;

        // Material del vidrio: la bola rebota contra el vidrio intacto con su
        // propia restitución (más apagada que el rebote general). Cannon calcula
        // la dirección de salida según la cara golpeada, sea panel o pirámide.
        this.glassMaterial = new CANNON.Material('glass');
        this.world.addContactMaterial(new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.glassMaterial,
            { friction: 0.1, restitution: GLASS_RESTITUTION }
        ));
    }

    add(body) {
        this.world.addBody(body);
    }

    remove(body) {
        this.world.removeBody(body);
    }

    step(delta) {
        // Paso fijo de 1/120 s: las bolas van rápido (~40 m/s) y con pasos más
        // grandes podrían "atravesar" paredes delgadas sin detectar el choque.
        this.world.step(1 / 120, delta, 12);
    }
}
