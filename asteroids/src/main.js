/*
  Solo se crea la instancia de phaser con la configuración global y registra las escenas
*/

import { WIDTH, HEIGHT } from './constants.js';
import BootScene from './scenes/BootScene.js';
import MenuScene from './scenes/MenuScene.js';
import GameScene from './scenes/GameScene.js';
import UIScene from './scenes/UIScene.js';
import PauseScene from './scenes/PauseScene.js';

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: 'game',
  backgroundColor: '#000000', //ahora si fondo del canvas xd
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: [BootScene, MenuScene, GameScene, UIScene, PauseScene], // PauseScene al final para dibujarse encima
};

const game = new Phaser.Game(config);