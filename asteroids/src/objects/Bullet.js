const BULLET_SPEED = 450;
const BULLET_LIFESPAN = 1200;

export default class Bullet extends Phaser.Physics.Arcade.Image {
      constructor(scene, x, y) {
            super(scene, x, y, 'bala');
            // dibujar en el canvas
            scene.add.existing(this);
            scene.physics.add.existing(this);
            this.setActive(false);
            this.setVisible(false);
            this.body.enable = false;
            this.expiry = null;
      }

      disparar(x, y, angulo) {
            this.expiry?.remove(false);
            this.setPosition(x, y);
            this.setRotation(angulo);
            this.setActive(true);
            this.setVisible(true);
            this.body.enable = true;
            this.body.reset(x, y);
            this.scene.physics.velocityFromRotation(angulo, BULLET_SPEED, this.body.velocity);
            this.scene.sound.play('shoot', { volume: 0.3 }); 
            this.expiry = this.scene.time.delayedCall(BULLET_LIFESPAN, () => {
                  this.desactivar();
            });
      }

      desactivar() {
            this.expiry?.remove(false);
            this.expiry = null;
            this.body.stop();
            this.body.enable = false;
            this.setActive(false);
            this.setVisible(false);
      }
}
