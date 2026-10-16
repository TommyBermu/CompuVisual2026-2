/*
  main.js
  -------
  Punto de entrada. Igual que en Asteroids main.js solo crea el juego:
  aquí instanciamos Game (el orquestador del core) y lo arrancamos.
  Toda la lógica vive en core/, entities/, systems/...
*/

import Game from './core/Game.js';

const container = document.getElementById('game');
const game = new Game(container);
game.start();
