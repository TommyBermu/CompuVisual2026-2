# Persona 2 · Capítulo 2 · Revolución temporal (2020–2023) · ~15 min

**Slides 9 a 15 del índice** (tecla M). Reparte así:

| # | Slide | Tiempo | Acumulado |
|---|-------|--------|-----------|
| 9 | Divisor Cap. 2 | 0:30 | 0:30 |
| 10 | DLSS 2.0 · recuperar, no inventar (demo jitter) | 3:00 | 3:30 |
| 11 | Cuatro entradas, un solo modelo | 2:00 | 5:30 |
| 12 | TAA vs DLSS 2.0 (demo) | 2:30 | 8:00 |
| 13 | DLSS 3.0 Frame Generation (demo) | 3:30 | 11:30 |
| 14 | DLSS 3.5 Ray Reconstruction (demo) | 2:30 | 14:00 |
| 15 | Resumen + puente | 1:00 | 15:00 |

> Si vas largo: recorta la slide 11 (solo nombra las 4 entradas) y la 12.

---

## 9 · Divisor (0:30) — conectar con Persona 1
"Como acaba de contar [Persona 1], DLSS 1.0 escalaba **un solo cuadro** y tenía que *inventar* detalle; el '1.9' fue un puente que corría en shaders. Ahora vamos de 2020 a 2023, y esto cambia por completo la idea: **dejar de inventar y empezar a recuperar**, y después dar dos pasos más: generar cuadros enteros y limpiar rayos con IA."

## 10 · DLSS 2.0 · recuperar, no inventar (3:00)
- **Fecha:** 23 de marzo de 2020 (driver GeForce 445.75). Rediseño total, **incompatible con 1.0**.
- **Idea central:** es un TAAU (upsampling con antialiasing temporal) acelerado por IA. No mira un cuadro aislado, mira **varios cuadros seguidos**.
- **Jitter (señala la demo):** "A la izquierda, un cuadro de baja resolución: las líneas finas se rompen, se ven como puntos. El motor, en cada cuadro, corre la cámara una fracción de píxel. Cada cuadro cae en un punto distinto. A la derecha vemos cómo, tras 16 cuadros, esos puntos juntos reconstruyen la imagen. Eso es detalle **real**, no inventado."
- **Aclaración honesta:** "La demo es una ilustración con escena quieta. Cuando algo se mueve, entran los vectores de movimiento para reubicar las muestras."
- Deja que la demo corra una vuelta completa mientras hablas (reinicia sola).

## 11 · Cuatro entradas, un solo modelo (2:00)
- Las 4 entradas que le da el motor a la red: **cuadro de baja resolución, vectores de movimiento, buffer de profundidad, exposición/brillo.**
- **Logros (los 3 recuadros):**
  1. **Un modelo genérico:** el artefacto temporal se comporta parecido en cualquier juego, así que se acabó el entrenamiento por juego (en 1.0 era uno por título).
  2. **1–2 ms por fotograma** (1.0 estaba en 2–4 ms).
  3. **DLAA:** la misma red a 100 % de resolución nativa, sin escalar → solo antialiasing.
- Frase puente: "O sea: misma tecnología, dos usos: bajar el costo (escalar) o subir la calidad (DLAA)."

## 12 · TAA clásico vs DLSS 2.0 (2:30)
- **Problema del TAA:** también acumula historia, pero decide qué descartar con **reglas manuales** (*neighborhood clamping*). Si la regla se equivoca: **emborrona** o deja **estela (ghosting)**.
- **DLSS 2.0:** la red aprende a distinguir qué historia sirve y cuál no. A menudo **iguala o supera** la nitidez del nativo con TAA.
- Señala la demo: "Izquierda, el cuadro blanco deja estela y todo se ve blando. Derecha, nítido." Dilo claro: **es una ilustración conceptual, no una captura real**.
- **Condición técnica (una frase):** el desarrollador aplica un **sesgo de mip-map negativo** para cargar texturas más detalladas y aprovechar lo que la red recupera.

## 13 · DLSS 3.0 · Frame Generation (3:30) — la más importante
- **Fecha:** anunciado en septiembre de 2022, junto a Ada Lovelace (RTX 40). Los primeros juegos salieron en octubre.
- **Qué hace:** toma **dos cuadros reales** y la IA **interpola un cuadro intermedio completo** (modo 2×). Ya no es "más píxeles": es un **cuadro nuevo**.
- **OFA (Optical Flow Accelerator):** hardware de las RTX 40. Calcula el movimiento pixel a pixel de cosas que los vectores de movimiento del motor no describen: **sombras, reflejos, partículas**. La red usa vectores del motor **y** flujo óptico a la vez. Por esa dependencia, NVIDIA lo dejó exclusivo de RTX 40+ (Persona 4 retomará si esa barrera era técnica o comercial).
- **Demo:** pulsa **OFF / ON** (o deja que alterne sola). "Arriba, lo que calcula el motor: cuadros reales. Abajo, lo que ves: con Frame Gen aparecen cuadros de IA entre medio. En pantalla pasas de 60 a 120, pero **el motor sigue calculando 60**." (Las cifras de la demo son un ejemplo ilustrativo.)
- **El costo, la latencia (clave de toda la charla):** "Tu mouse y el juego solo se actualizan con cuadros reales. Más FPS en pantalla **no** significa más respuesta; interpolar además agrega retraso." Por eso va unido a **NVIDIA Reflex** (sincroniza CPU y GPU, vacía la cola de render).
- **Regla del hilo conductor:** siempre decir **qué mide** un número de FPS: cuadros reales, cuadros generados o latencia.
- *(Dato opcional)* Con Super Resolution + Frame Generation, una gran parte de los píxeles que ves los genera la IA (la prensa lo resumió como "7 de cada 8" en el lanzamiento).

## 14 · DLSS 3.5 · Ray Reconstruction (2:30)
- **Fecha:** anunciado en agosto de 2023; disponible el 21 de septiembre de 2023 en Cyberpunk 2077 (actualización 2.0); Phantom Liberty salió el 26 de septiembre.
- **Problema:** con ray tracing intensivo o path tracing el motor traza **pocos rayos por píxel** → imagen ruidosa. Se limpia con varios **denoisers hechos a mano**, que **difuminan reflejos y parpadean**.
- **Solución:** **un solo modelo de IA** que reemplaza esos denoisers, entrenado con **5× más datos** que DLSS 3 (dato de NVIDIA).
- **Demo (3 estados, alterna sola):** ruido → denoisers manuales (limpio pero borroso) → Ray Reconstruction (nítido y estable). Ilustración conceptual.
- **Juegos:** Cyberpunk 2077: Phantom Liberty, Alan Wake 2, Portal with RTX.
- **Punto fuerte:** funciona desde **RTX 20 en adelante** porque es solo procesamiento de imagen (no necesita el OFA). Distingue: "DLSS 3.5 ≠ Frame Generation; una RTX 30 tiene Ray Reconstruction pero no Frame Gen".

## 15 · Resumen y puente (1:00)
"Tres movimientos, una idea: **2020 recuperar**, **2022 inventar cuadros**, **2023 limpiar rayos**. Todo con **redes convolucionales**. El siguiente salto cambia la arquitectura entera de la red. Eso lo cuenta [Persona 3]."

---

## Preguntas que te pueden hacer (respuestas cortas)
- **¿Por qué el jitter no hace temblar la imagen?** El desplazamiento es subpíxel y se compensa al reconstruir con los vectores de movimiento; la salida queda estable.
- **¿Qué diferencia hay entre DLSS 2 y Frame Generation?** 2.0 reconstruye **píxeles** (más resolución); Frame Gen crea **cuadros completos** (más fluidez, no más respuesta).
- **¿Frame Generation baja la latencia?** No: la sube un poco; Reflex la compensa.
- **¿Por qué solo RTX 40?** NVIDIA dijo que por el OFA. Parte de la comunidad cuestionó después si era una barrera técnica o comercial (tema de Persona 4).
- **¿Por qué Ray Reconstruction funciona en RTX 20/30?** Es procesamiento de imagen en Tensor Cores; no depende del OFA.
- **¿DLAA qué es?** La red de DLSS 2.0 aplicada a resolución nativa, solo para antialiasing.
- **¿Qué es un denoiser?** Un filtro que limpia el ruido de pocos rayos; antes había varios hechos a mano, 3.5 los junta en un modelo.
- **¿Qué es el sesgo de mip-map negativo?** Un ajuste para que el juego use texturas más nítidas, y la red aproveche el detalle recuperado.

## Hoja de datos rápida
| Tema | Dato |
|------|------|
| DLSS 2.0 | 23 mar 2020 · driver 445.75 · modelo único · 1–2 ms · incompatible con 1.0 |
| Entradas | baja res · vectores de movimiento · profundidad · exposición |
| DLAA | misma red a resolución nativa |
| DLSS 3.0 | sep 2022 · RTX 40 · cuadro intermedio con IA · OFA · Reflex |
| DLSS 3.5 | disp. 21 sep 2023 · Ray Reconstruction · RTX 20+ · 5× más datos |

## Correcciones al documento base
- **DLSS 2.0:** el documento dice "abril de 2020". NVIDIA lo anunció y lo lanzó el **23 de marzo de 2020** (driver 445.75; en Control llegó el 26 de marzo). Las slides ya dicen 23 mar 2020.
- **No confundir** dos "5×" de DLSS 3.5: "entrenado con 5× más datos" (Ray Reconstruction) y "hasta 5× los FPS combinando SR + FG + RR vs. 4K nativo" (claim de NVIDIA en Cyberpunk). No son lo mismo.
- El "5× más datos" es una cifra de NVIDIA que viene del documento base; no la reverifiqué por separado.
- Las demos son ilustraciones propias, no capturas de NVIDIA; las slides lo dicen.

## Fuentes para abrir como respaldo
- NVIDIA · DLSS 2.0: https://www.nvidia.com/en-us/geforce/news/nvidia-dlss-2-0-a-big-leap-in-ai-rendering/
- NVIDIA · DLSS 3: https://www.nvidia.com/en-eu/geforce/news/dlss3-ai-powered-neural-graphics-innovations/
- NVIDIA · DLSS 3.5: https://www.nvidia.com/en-gb/geforce/news/nvidia-dlss-3-5-ray-reconstruction
- NVIDIA · Cyberpunk con DLSS 3.5 (video): https://www.nvidia.com/en-au/geforce/news/dlss-3-5-available-september-21/

## Para agregar fotos/video reales (opcional)
1. Descarga de esas páginas de NVIDIA una comparación (jpg) y un clip corto (mp4, ≤15 s).
2. Guárdalos como `presentationnDLSS/assets/ch2/comparacion.jpg` y `presentationnDLSS/assets/ch2/demo.mp4`.
3. En `js/slides.js` cambia `const MEDIA_CH2 = false;` a `true`. Aparece una slide extra "En un juego real" antes del resumen (10 slides en total en tu bloque; ajusta tiempos).
4. Plan B sin internet: abre esas 4 páginas en pestañas antes de empezar.
