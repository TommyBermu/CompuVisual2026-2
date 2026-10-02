# Asteroids (Phaser 3)

Clon de Asteroids hecho con [Phaser 3](https://phaser.io/) + JavaScript, cargando Phaser desde CDN (sin instalar nada).

## Cómo ejecutar

### Opción A — con Node

Si tienes Node instalado, no necesitas instalar nada permanente, `npx` lo descarga:

```bash
npx serve
```

La primera vez te pedirá confirmar la instalación del paquete (responde `y`) y luego mostrará una URL, normalmente http://localhost:3000

### Opción B — con Python

Si tienes Python

```bash
python3 -m http.server 8000
```

Luego abre http://localhost:8000 en el navegador

## Controles

- **← / →** : girar la nave
- **↑** : acelerar (la nave "deriva" por inercia)

## Estructura de ficheros

```
asteroids/
├── index.html            # Punto de entrada HTML. Carga Phaser (CDN) y src/main.js
├── css/
│   └── style.css         # Estilos: centrar el canvas, fondo del espacio
├── assets/               # Imágenes y sonidos (si usas sprites en vez de gráficos vectoriales)
└── src/
    ├── main.js           # Crea Phaser.Game con la config y registra las escenas
    ├── constants.js      # Números de ajuste (tamaños, velocidades, vidas...)
    ├── scenes/
    │   ├── BootScene.js  # Carga de assets, luego arranca GameScene
    │   ├── GameScene.js  # Bucle principal: nave, asteroides, balas, colisiones
    │   └── UIScene.js    # HUD: puntuación, vidas, mensajes (corre en paralelo)
    └── objects/
        ├── Player.js     # La nave: rotación, aceleración, disparo
        ├── Bullet.js     # Los disparos
        └── Asteroid.js   # Roca que se parte en trozos al recibir impacto
```

## Flujo general

1. `index.html` carga Phaser y `src/main.js`.
2. `main.js` crea el juego con las escenas: `Boot -> Game (+ UI)`.
3. `BootScene` carga recursos y pasa a `GameScene`.
4. `GameScene` crea la nave, los asteroides y las balas, lee el teclado y gestiona colisiones.
5. `UIScene` corre encima mostrando puntos y vidas, escuchando eventos de `GameScene`.