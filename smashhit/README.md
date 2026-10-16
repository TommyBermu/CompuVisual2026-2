# Smash Hit 3D (Three.js + Cannon-es)

Clon básico de Smash Hit en 3D hecho con **Three.js** (gráficos) y **Cannon-es**
(físicas), cargados desde CDN como módulos ES (sin instalar nada, igual que el
Asteroids del repo).

> **Estado actual:** demo de verificación — una bola que cae y rebota en el
> suelo. Sirve para comprobar que Three.js + Cannon-es cargan y que despliega
> bien en Vercel. El resto de piezas están como andamiaje (archivos con la
> responsabilidad documentada, listos para rellenar).

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
    │   ├── Crystal.js      # Cristal rompible (andamiaje)
    │   ├── Obstacle.js     # Paredes/columnas sólidas (andamiaje)
    │   └── Tunnel.js       # El corredor (andamiaje)
    ├── systems/            # Lógica que actúa sobre las entidades
    │   ├── Shooter.js      # Lanza bolas (andamiaje)
    │   ├── Spawner.js      # Genera/recicla cristales y obstáculos (andamiaje)
    │   ├── Shatter.js      # Rompe cristales en fragmentos (andamiaje)
    │   └── CameraRail.js   # Avance de la cámara por el túnel (andamiaje)
    ├── ui/
    │   ├── HUD.js          # Puntuación / bolas restantes (andamiaje)
    │   └── Screens.js      # Menú / game over / pausa (andamiaje)
    └── utils/
        ├── sync.js         # Copiar posición/rotación body -> mesh (funcional)
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
