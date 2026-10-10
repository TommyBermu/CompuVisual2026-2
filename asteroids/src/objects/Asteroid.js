import { ASTEROID_MIN_SPEED, ASTEROID_MAX_SPEED } from '../constants.js';

const ASTEROID_SIZES = {
  3: { diameter: 64, puntuacion: 50 },
  2: { diameter: 42, puntuacion: 30 },
  1: { diameter: 26, puntuacion: 10 },
};

export default class Asteroid extends Phaser.Physics.Arcade.Image {
  constructor(scene, x, y, tamano = 3, opciones = {}) {
    super(scene, x, y, 'asteroide');
    // dibujar en el canvas
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.tamano = Phaser.Math.Clamp(tamano, 1, 3);
    this.enMovimiento = opciones.enMovimiento ?? true;
    this.collisionReadyAt = scene.time.now + 350;

    const config = ASTEROID_SIZES[this.tamano];
    this.velocidadMinima = ASTEROID_MIN_SPEED;
    this.velocidadMaxima = ASTEROID_MAX_SPEED;
    this.puntuacion = config.puntuacion;
    this.setDisplaySize(config.diameter, config.diameter);
    this.body.setCircle(config.diameter * 0.42);
    this.body.setBounce(1);
  }

  spawn({ angulo, velocidad } = {}) {
    if (this.enMovimiento) {
      const direccion = angulo ?? Phaser.Math.FloatBetween(0, Math.PI * 2);
      const rapidez = Phaser.Math.Clamp(
        velocidad ?? Phaser.Math.FloatBetween(this.velocidadMinima, this.velocidadMaxima),
        ASTEROID_MIN_SPEED,
        ASTEROID_MAX_SPEED,
      );
      this.scene.physics.velocityFromRotation(direccion, rapidez, this.body.velocity);
      this.setAngularVelocity(Phaser.Math.Between(-35, 35));
      return;
    }

    this.setVelocity(0, 0);
    this.setAngularVelocity(0);
  }

  partir() {
    this.scene.sound.play(`explosion${this.tamano}`, { volume: 0.5 }); 
    if (this.tamano > 1) {
      const config = ASTEROID_SIZES[this.tamano];
      const cantidad = Phaser.Math.Between(2, 5);
      const separacion = (Math.PI * 2) / cantidad;
      const anguloInicial = Phaser.Math.FloatBetween(0, Math.PI * 2);

      for (let indice = 0; indice < cantidad; indice += 1) {
        const angulo = anguloInicial + separacion * indice
          + Phaser.Math.FloatBetween(-separacion * 0.2, separacion * 0.2);
        const velocidad = Phaser.Math.FloatBetween(ASTEROID_MIN_SPEED, ASTEROID_MAX_SPEED);
        const tamanoHijo = this.tamano - 1;
        const configHijo = ASTEROID_SIZES[tamanoHijo];
        const distancia = config.diameter * 0.42 + configHijo.diameter * 0.42 + 2;
        const x = this.x + Math.cos(angulo) * distancia;
        const y = this.y + Math.sin(angulo) * distancia;

        this.scene.crearAsteroide(x, y, tamanoHijo, {
          angulo,
          velocidad,
          enMovimiento: true,
        });
      }
    }
    this.destroy();
  }
}
