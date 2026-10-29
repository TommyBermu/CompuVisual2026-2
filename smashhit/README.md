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
>
> **Cristales con poderes:** de vez en cuando flota una GEMA de color fuera
> del camino (más a menudo en los últimos checkpoints; nunca en el tubo de la
> cámara: hay que dispararle). Romperla activa un poder (no da las +3 bolas):
>
> | Gema | Poder | Efecto |
> |---|---|---|
> | Rosa (tres bolitas) | Triple bola | cada disparo lanza 3 bolas en abanico y cuesta 1 (10 s) |
> | Cian (∞) | Bolas infinitas | disparar no gasta bolas (8 s) |
> | Violeta (reloj de arena) | Cámara lenta | todo el juego va a la mitad de velocidad (6 s) |
> | Verde (+) | +10 bolas | instantáneo |
>
> Se pueden tener varios a la vez (triple + infinitas = 3 bolas gratis); coger
> otra vez uno activo suma su tiempo (tope 20 s). El HUD muestra cada poder
> activo con su tiempo y un cartel de su color al activarse. Se congelan en la
> pausa y se apagan al morir, terminar o salir al menú. Ajustes en
> `src/constants.js` (bloque `POWER_*`).

## Bolas, choques y bonus (modo normal)

Las bolas son munición y vida: se empieza con `BALLS_AVAILABLE` (25) y cada
disparo cuesta 1. Chocar de frente con vidrio quita `CRASH_PENALTY_BASE` (5)
bolas, **igual en todos los niveles** (como en el Smash Hit de móvil). Los
bonus dan bolas: pirámide apoyada +3, rombo flotante +5. Cuántos salen se
ajusta con `BONUS_SPAWN_MULT` (1.2 = un 20 % más que el reparto base, misma
proporción pirámide/rombo). Si las bolas llegan a 0, se acaba la partida.

## Modo "Sin perder"

Botón **∞ Sin perder** del menú principal (empieza desde el checkpoint 0). Las
bolas son infinitas (el HUD muestra ∞ y la etiqueta del modo) y la partida
solo termina al llegar a la meta. El objetivo es la máxima puntuación:

| Qué | Puntos (`src/constants.js`, bloque `NOLOSE_*`) |
|---|---|
| Pirámide (en el normal, +3 bolas) | +`NOLOSE_PYRAMID_POINTS` (150) |
| Rombo (en el normal, +5 bolas) | +`NOLOSE_DIAMOND_POINTS` (250) |
| Gema "+bolas" (en el normal, +10 bolas) | +`NOLOSE_POWER_BONUS_POINTS` (500) |
| Cada bola disparada (triple bola = 3) | −`NOLOSE_SHOT_COST` (10) |
| Chocar con vidrio | −`NOLOSE_CRASH_PENALTY` (250) |

El resto de la puntuación (distancia, cristales x combo, checkpoints, final)
funciona igual que en el modo normal, salvo el extra por bolas sobrantes. La
puntuación nunca baja de 0. La gema de "Bolas infinitas" no sale en este
modo. Su récord se guarda aparte (`smashhit.records.sinPerder`) y la pantalla
de resultados indica el modo.

## Puntuación, combo y récord

La puntuación la lleva `src/systems/Score.js` (solo cuenta; el HUD la pinta y
el `Game` le pasa los eventos). Todos los números están en `src/constants.js`
(bloque "Puntuación y combo").

| Qué | Puntos |
|---|---|
| Distancia | `SCORE_PER_METER` (5) por metro **recorrido** en la partida |
| Cristal roto de un disparo | `SCORE_CRYSTAL` (50) **x combo** |
| Cristal de power-up | `SCORE_POWERUP` (250) x combo, extra (`score.addPowerUp()`) |
| Cruzar un checkpoint | `SCORE_CHECKPOINT` (1000) |
| Completar el recorrido | `SCORE_FINISH` (5000) + `SCORE_FINISH_PER_BALL` (50) por bola que quede |

**Combo:** cada cristal roto seguido suma 1 a la racha; cada `COMBO_STEP` (5)
aciertos el multiplicador sube (x1 → x2 → … → x5, `COMBO_MAX`). Se pierde al
**chocar** con vidrio y al **fallar** un tiro: una bola cuyo primer choque no
es vidrio (suelo, pared, metal, o pasar por un agujero ya hecho) o que
desaparece sin tocar nada (`Shooter.onMiss`, desactivable con
`COMBO_RESET_ON_MISS`).

En el HUD la puntuación va arriba a la derecha (bajo la distancia) con la
insignia "xN" y una barrita de progreso hacia el siguiente multiplicador; al
sumar sale un "+N" pequeño junto al marcador (no en el centro, para no tapar
la mira). En pausa, tras morir o tras terminar no se suma nada.

**Récord** (`src/records.js`, localStorage `smashhit.records`, y
`smashhit.records.sinPerder` para el modo "Sin perder", con try/catch
como `settings.js`): mejor puntuación, más metros recorridos en una partida y
checkpoint más lejano alcanzado empezando desde el 0. Empezar desde un
checkpoint avanzado **sí cuenta** para puntuación y distancia, porque solo
suman los metros que de verdad recorres (no los que te saltas); para el
"checkpoint más lejano" solo valen las partidas desde el inicio. Se guarda al
morir, al completar y también al salir al menú desde la pausa. El récord sale
en el menú principal y en la pantalla de resultados (con "¡Nuevo récord!" si
se batió), que tiene **Reintentar** (mismo checkpoint) y **Menú**.

Para enganchar otros eventos basta una línea en el `Game`:
`this.score.addHit()`, `addPowerUp()`, `addCheckpoint()`, `addFinish(bolas)`,
`onCrash()`, `onMiss()`.

## Audio y música (100 % procedural)

No hay archivos de sonido: todo se sintetiza en vivo con la **Web Audio API**
(`src/audio/` + `src/core/AudioManager.js`). Respeta los volúmenes de música y
efectos y el "Silenciar todo" de Configuración (en vivo).

**Efectos** (`src/audio/sfx.js`, uno por evento del juego):

| Sonido | Cuándo | Cómo está hecho |
|---|---|---|
| `shoot` | disparar | golpe grave (seno que cae) + "whoosh" de ruido con filtro que sube |
| `glass` | se rompe vidrio | crack agudo + cuerpo de ruido filtrado + tintineos agudos desordenados; tamaño y fuerza según cuánto vidrio se soltó y la velocidad del golpe; tono y tiempos al azar en cada rotura; **paneado** izquierda/derecha y más bajo cuanto más lejos |
| `shard` | astillas que caen al suelo | "pings" agudísimos y suaves |
| `clank` | la bola choca con algo sólido | modos inarmónicos de una barra metálica + clic |
| `crash` | la cámara choca con vidrio | rotura al máximo + golpe sordo grave |
| `checkpoint` | cruzar un checkpoint | arpegio de campanas FM en la tonalidad del nuevo nivel |
| `gameover` / `complete` | fin de partida | acorde que cae y se apaga / arpegio ascendente |
| `powerup`, `ui` | cristales especiales, botones del menú | arpegio brillante / tic corto |

Un nombre desconocido en `audio.playSfx('lo-que-sea')` suena como un "blip"
genérico (no lanza error).

**Música** (`src/audio/themes.js` + `src/audio/music.js`): un tema generativo
por checkpoint con su propia tonalidad, modo, tempo y timbres (p. ej. *Tarde
dorada* = Re mayor a 70 BPM; *Desierto rojo* = Mi frigio a 84 BPM con pulso;
*Cénit* = Do lidio a 116 BPM con todas las capas). Capas: colchón de acordes,
bajo, arpegio con eco a tempo, campanas sueltas y percusión suave en los niveles
altos. Las capas entran poco a poco, el arpegio muta cada 4 compases y cada 16
hay 2 de "respiro", así no cansa en bucle. Al cruzar un checkpoint hay
**crossfade** al tema nuevo; en **pausa** la música sigue pero filtrada y más
baja; en **game over** se desvanece; el menú tiene su propio tema tranquilo.

Las notas se programan con un *lookahead scheduler* sobre `ctx.currentTime`
(un `setInterval` solo despierta al programador; el ritmo lo marca el reloj de
audio).

**Rendimiento / robustez:**
- Cada sonido es una `Voice` que desconecta sus nodos al terminar (sin fugas).
- Límite de voces por tipo + intervalo mínimo (`LIMITS` en `AudioManager.js`)
  y las roturas de un mismo frame se agrupan en un solo sonido (`Shatter.js`):
  romper un panel con decenas de trozos no dispara decenas de sonidos.
- Limitador en la salida para que muchas roturas a la vez no saturen.
- El `AudioContext` se crea en el primer clic/tecla (política de autoplay) y
  mientras no suena no se crea ningún nodo. Silenciado = no se generan notas.

API: `playSfx(name, opts)`, `startMusic(level|'menu')`, `setLevel(n)`,
`stopMusic(fade)`, `setPaused(bool)`, `setListener(camera)`.

## Cómo ejecutar

Necesita un servidor local porque usa módulos ES (abrir el `index.html` con
`file://` no funciona).

### Opción A — servidor del proyecto (Express)

Desde la carpeta `smashhit/`:

```bash
npm install && npm start
```

Queda en http://localhost:1024 (otro puerto con la variable `PORT`).

### Opción B — `npx serve`

```bash
npx serve
```

Normalmente queda en http://localhost:3000

### Opción C — con Python

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
│   ├── audio/              # vacío: todo el audio se sintetiza (ver src/audio)
│   └── textures/           # texturas/skybox (opcional)
└── src/
    ├── main.js             # Crea Game y lo arranca
    ├── constants.js        # Números de ajuste (gravedad, rebote, bola, puntos...)
    ├── settings.js         # Ajustes del jugador (localStorage)
    ├── records.js          # Récords: mejor puntuación/distancia (localStorage)
    ├── audio/              # Sonido procedural (Web Audio, sin archivos)
    │   ├── synth.js        # Ruido, reverb, timbres, Voice (limpieza de nodos), envolventes
    │   ├── sfx.js          # Recetas de efectos: disparo, vidrio, clank, choque, campanas...
    │   ├── themes.js       # Un tema musical por checkpoint (tonalidad, tempo, capas)
    │   └── music.js        # Motor de música generativa (lookahead scheduler + crossfade)
    ├── core/               # El "motor": piezas base
    │   ├── Game.js         # Orquestador + bucle principal (DEMO funcional)
    │   ├── Renderer.js     # Three.js: escena, cámara, luces, render (funcional)
    │   ├── Physics.js      # Cannon-es: mundo, gravedad, step (funcional)
    │   ├── AudioManager.js # Volúmenes, reverb, límites de voces, API playSfx/música
    │   ├── InputManager.js # Input -> intención de disparo (andamiaje)
    │   └── Loop.js         # rAF + delta separado (opcional, andamiaje)
    ├── entities/           # Objetos: mesh (Three) + body (Cannon) juntos
    │   ├── Entity.js       # Base: sync() body->mesh, destroy() (funcional)
    │   ├── Ball.js         # La bola de metal (funcional, se usa en la demo)
    │   ├── GlassPanel.js   # Vidrio rompible de cualquier forma, puede moverse/girar
    │   ├── Crystal.js      # Panel montado en suelo/pared/viga/bloque (rectángulo o triángulo)
    │   ├── PowerCrystal.js # Gema de poder: vidrio frágil de color + icono + halo
    │   ├── Obstacle.js     # Base de obstáculos: vidrio + partes sólidas, en el marco del recorrido
    │   └── Tunnel.js       # Un tramo del pasillo, "barrido" a lo largo de la curva
    ├── obstacles/          # Tipos de obstáculo (uno o varios por nivel)
    │   ├── index.js        # Catálogo + createObstacles(tipo, track, s, nivel)
    │   ├── shared.js       # Azar, medidas y el "tubo" de la cámara
    │   ├── GlassWall.js    # Paneles y triángulos (muchas formaciones)
    │   ├── Gate.js         # Compuertas con botones de vidrio
    │   ├── Pendulum.js     # Péndulos en varias direcciones
    │   ├── Spinner.js      # Aspas giratorias (molino, torniquete, rodillo...)
    │   ├── Props.js        # Relleno sólido (columnas, bloques, vigas...)
    │   └── PowerUp.js      # Gema de poder flotando fuera del tubo (encima o a un lado)
    ├── systems/            # Lógica que actúa sobre las entidades
    │   ├── Track.js        # El recorrido: curva 3D con giros y rampas, frameAt(s)
    │   ├── Shooter.js      # Lanza bolas hacia la mira (1 o 3 en abanico con triple bola)
    │   ├── PowerUps.js     # Poderes activos: temporizadores, triple, infinitas, cámara lenta
    │   ├── Spawner.js      # Genera pasillo/obstáculos/relleno/gemas, golpes y choque de cámara
    │   ├── Shatter.js      # Astillas (física propia) y bloques que caen (Cannon)
    │   ├── CameraRail.js   # Avance de la cámara a lo largo del recorrido
    │   └── Score.js        # Puntuación + combo (racha de aciertos)
    ├── ui/
    │   ├── HUD.js          # Bolas, distancia, puntuación + combo, poderes activos, carteles
    │   └── Screens.js      # Menú (con récord) / resultados / pausa / ajustes
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
