# Asteroids (Phaser 3)

Clon de Asteroids hecho con [Phaser 3](https://phaser.io/) + JavaScript, cargando Phaser desde CDN (sin instalar nada).

## Cómo ejecutar

Como se usan módulos ES (`import`/`export`), **no** basta con abrir el `index.html` haciendo doble clic (el navegador bloquea módulos con `file://`). Levanta un servidor local:

```bash
# Opción con Python (ya suele estar instalado)
python3 -m http.server 8000
```

Luego abre http://localhost:8000 en el navegador.

> Cualquier servidor estático sirve (la extensión "Live Server" de VS Code, por ejemplo).

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

## Orden sugerido para implementar

1. `constants.js`: define tamaño del mundo y algunos valores base.
2. `main.js`: config mínima con una sola escena para ver el canvas en pantalla.
3. `GameScene`: dibuja la nave y muévela con el teclado.
4. Wrap-around de pantalla.
5. Disparos (`Bullet`).
6. Asteroides (`Asteroid`) y que se partan.
7. Colisiones + puntuación + vidas (`UIScene`).
8. Oleadas / fin de partida.

Cada archivo tiene comentarios explicando qué debe ir dentro. ¡A por ello!
