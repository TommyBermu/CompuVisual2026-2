# Smash Hit 3D (Three.js + Cannon-es)

Juego 3D inspirado en Smash Hit hecho con **Three.js** (gráficos) y **Cannon-es**
(físicas), cargados desde CDN como módulos ES (sin instalar nada, igual que el
Asteroids del repo).

> **Estado actual (paso 5):** recorrido de 10 checkpoints que ya NO es una
> recta: gira a izquierda/derecha y sube/baja en rampas (`src/systems/Track.js`).
> Siempre hay un giro al cambiar de checkpoint y, dentro de cada nivel, curvas
> y rampas según su campo `track` en `src/levels.js`. Cada partida genera un
> recorrido distinto.
>
> Cada checkpoint tiene su ambiente y sus obstáculos (campo `obstacles`; los
> checkpoints 0-4 enseñan un tipo cada uno y del 5 en adelante se mezclan), y
> cada tipo tiene muchas VARIANTES para que no se repita:
>
> | Obstáculo | Variantes |
> |---|---|
> | Paneles | sueltos, fila, muro de pared a pared, escalonados, sobre bloques, colgando de una viga |
> | Triángulos | grande, pareja cruzada, fila, desde las paredes, zigzag, colgando del techo, sobre bloques, "estrella" |
> | Compuertas | dos hojas, guillotina, deslizante, doble botón, rítmica (se abre y cierra sola) |
> | Péndulos | lateral, frontal, diagonal, ola de tres, pareja, pareja frontal |
> | Aspas giratorias | molino, molinos gemelos, hélice, torniquete (eje vertical), rodillo (eje horizontal) |
>
> Además hay RELLENO sólido que no se rompe (`src/obstacles/Props.js`, campo
> `props`): columnas, bloques apilados, muretes, vigas, aletas, marcos de
> puerta, escalones y cubos flotantes. Nunca invade el "tubo" por donde pasa
> la cámara (solo las puertas cerradas pueden bloquearlo).
>
> Todo el vidrio se ROMPE según dónde se golpee (Voronoi radial alrededor del
> impacto, ver `src/utils/fracture.js`), también el que se mueve o gira: los
> trozos sin apoyo caen y heredan la velocidad del obstáculo.

## Cómo ejecutar

Necesita un servidor local porque usa módulos ES (abrir el `index.html` con
`file://` no funciona).

### Opción A — con Node

```bash
npx serve
```

Normalmente queda en http://localhost:3000

### Opción B — con Python

```bash
python3 -m http.server 8000
```

Luego abre http://localhost:8000

## Three.js + Cannon-es desde CDN (import map)

Three.js moderno hace imports internos del tipo `import ... from 'three'`, así
que el `index.html` incluye un **import map** que resuelve esos nombres a URLs
del CDN. En los `.js` se importa con nombres limpios:

```js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
```

No hay paso de build: Vercel lo sirve estático igual que el Asteroids.

## Three.js vs Cannon-es (resumen)

- **Three.js** = lo que VES. Dibuja (escena, cámara, luces, materiales). No sabe
  nada de física.
- **Cannon-es** = lo que PASA. Calcula gravedad, velocidades y colisiones. No
  dibuja nada.
- Cada objeto tiene un `mesh` (Three) y un `body` (Cannon). En cada frame Cannon
  mueve el `body` y se copia su posición/rotación al `mesh` (ver `utils/sync.js`).

## Estructura de ficheros

```
smashhit/
├── index.html              # HTML + import map (CDN) + punto de entrada
├── css/
│   └── style.css           # Canvas a pantalla completa + HUD encima
├── assets/
│   ├── audio/              # sonidos (rotura, disparo, ambiente)
│   └── textures/           # texturas/skybox (opcional)
└── src/
    ├── main.js             # Crea Game y lo arranca
    ├── constants.js        # Números de ajuste (gravedad, rebote, bola...)
    ├── core/               # El "motor": piezas base
    │   ├── Game.js         # Orquestador + bucle principal (DEMO funcional)
    │   ├── Renderer.js     # Three.js: escena, cámara, luces, render (funcional)
    │   ├── Physics.js      # Cannon-es: mundo, gravedad, step (funcional)
    │   ├── InputManager.js # Input -> intención de disparo (andamiaje)
    │   └── Loop.js         # rAF + delta separado (opcional, andamiaje)
    ├── entities/           # Objetos: mesh (Three) + body (Cannon) juntos
    │   ├── Entity.js       # Base: sync() body->mesh, destroy() (funcional)
    │   ├── Ball.js         # La bola de metal (funcional, se usa en la demo)
    │   ├── GlassPanel.js   # Vidrio rompible de cualquier forma, puede moverse/girar
    │   ├── Crystal.js      # Panel montado en suelo/pared/viga/bloque (rectángulo o triángulo)
    │   ├── Obstacle.js     # Base de obstáculos: vidrio + partes sólidas, en el marco del recorrido
    │   └── Tunnel.js       # Un tramo del pasillo, "barrido" a lo largo de la curva
    ├── obstacles/          # Tipos de obstáculo (uno o varios por nivel)
    │   ├── index.js        # Catálogo + createObstacles(tipo, track, s, nivel)
    │   ├── shared.js       # Azar, medidas y el "tubo" de la cámara
    │   ├── GlassWall.js    # Paneles y triángulos (muchas formaciones)
    │   ├── Gate.js         # Compuertas con botones de vidrio
    │   ├── Pendulum.js     # Péndulos en varias direcciones
    │   ├── Spinner.js      # Aspas giratorias (molino, torniquete, rodillo...)
    │   └── Props.js        # Relleno sólido (columnas, bloques, vigas...)
    ├── systems/            # Lógica que actúa sobre las entidades
    │   ├── Track.js        # El recorrido: curva 3D con giros y rampas, frameAt(s)
    │   ├── Shooter.js      # Lanza bolas hacia la mira
    │   ├── Spawner.js      # Genera pasillo/obstáculos/relleno, golpes y choque de cámara
    │   ├── Shatter.js      # Astillas (física propia) y bloques que caen (Cannon)
    │   └── CameraRail.js   # Avance de la cámara a lo largo del recorrido
    ├── ui/
    │   ├── HUD.js          # Puntuación / bolas restantes (andamiaje)
    │   └── Screens.js      # Menú / game over / pausa (andamiaje)
    └── utils/
        ├── sync.js         # Copiar posición/rotación body -> mesh (funcional)
        ├── fracture.js     # Geometría 2D: Voronoi, rotura y conectividad
        ├── glass.js        # Polígono -> geometría Three + forma Cannon
        ├── frame.js        # Coords locales del recorrido <-> mundo
        └── loaders.js      # Carga de audio/texturas (andamiaje)
```

## Orden sugerido para construir el juego

1. `Renderer` + `Physics` + sincronizar un objeto que cae  ✅ (ya está, la demo)
2. `Ball` + disparo (`InputManager` + `Shooter`)
3. `Crystal` sólido + colisión
4. `Shatter` básico (desaparece + sonido) → luego fragmentos
5. `CameraRail` (avance)
6. `Spawner` (generar el recorrido)
7. `HUD` + `Screens`
```
