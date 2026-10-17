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
import { GRAVITY, RESTITUTION } from '../constants.js';

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
    }

    add(body) {
        this.world.addBody(body);
    }

    remove(body) {
        this.world.removeBody(body);
    }

    step(delta) {
        // paso fijo de 1/60 con interpolación según el delta real
        this.world.step(1 / 60, delta, 3);
    }
}
