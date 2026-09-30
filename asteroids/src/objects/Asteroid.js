/*
  =========================================================
  Asteroid.js  —  Los asteroides
  =========================================================
  Responsabilidad: una roca que flota por la pantalla y, al
  recibir un disparo, se parte en trozos más pequeños (o
  desaparece si ya es del tamaño mínimo).

  Sugerencia: extiende Phaser.Physics.Arcade.Sprite/Image.

  Ideas de qué implementar:
  - un "tamaño" (grande / mediano / pequeño). Guarda el tamaño
    para saber en qué se parte y cuántos puntos vale.
  - constructor(scene, x, y, tamano)
  - spawn(): darle una dirección y velocidad aleatorias.
  - partir(): al ser golpeado:
        * si es grande/mediano -> crear 2 asteroides de tamaño menor
          en la misma posición, con direcciones distintas
        * si es pequeño -> solo desaparecer
  - wrap-around como los demás objetos.

  export default class Asteroid ...
*/

// export default class Asteroid extends Phaser.Physics.Arcade.Image {
//   constructor(scene, x, y, tamano) { super(scene, x, y, 'asteroide'); }
// }
