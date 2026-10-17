import { WIDTH, HEIGHT } from './constants.js';

/*
  Escala REAL del juego (no zoom CSS, que se ve borroso).

  La idea:
  - setGameSize agranda el canvas de verdad -> más resolución real, texto nítido.
  - camera.setZoom escala el mundo lógico (800x600) para que llene ese canvas
    reescalando la geometría, no estirando el bitmap de salida.

  El mundo lógico sigue siendo WIDTH x HEIGHT, así que toda la jugabilidad
  (posiciones, wrap, física) no cambia: solo se ve más grande y más nítido.
*/

// factor actual; se conserva entre escenas (el menú lo cambia)
let factorActual = 1;

export function getFactorEscala() {
  return factorActual;
}

export function setFactorEscala(factor) {
  factorActual = factor;
}

// agranda el canvas al tamaño real correspondiente al factor
export function aplicarTamanoCanvas(scene, factor = factorActual) {
  scene.scale.setGameSize(WIDTH * factor, HEIGHT * factor);
}

// escala la cámara de una escena para que el mundo 800x600 llene el canvas
export function aplicarZoomCamara(scene, factor = factorActual) {
  const camara = scene.cameras.main;
  camara.setZoom(factor);
  // con zoom, Phaser centra la cámara en el mundo; la reanclamos a (0,0)
  camara.centerOn(WIDTH / 2, HEIGHT / 2);
}

// aplica tamaño real + zoom de cámara de una vez (lo que usa cada escena jugable)
export function aplicarEscala(scene, factor = factorActual) {
  aplicarTamanoCanvas(scene, factor);
  aplicarZoomCamara(scene, factor);
}

/*
  El texto en Phaser se rasteriza a su fontSize y luego la cámara lo escala,
  por eso al hacer zoom se ve borroso. setResolution(factor) hace que el texto
  se rasterice a fontSize*factor px, quedando nítido tras el zoom de cámara.

  Recorre todos los Text ya creados en la escena y los deja nítidos.
  Para texto creado después del arranque, usar `nitidarTexto` sobre ese objeto.
*/
export function nitidarTextos(scene, factor = factorActual) {
  scene.children.list.forEach((obj) => {
    if (obj instanceof Phaser.GameObjects.Text) {
      nitidarTexto(obj, factor);
    }
  });
}

export function nitidarTexto(texto, factor = factorActual) {
  texto.setResolution(factor);
  return texto;
}

