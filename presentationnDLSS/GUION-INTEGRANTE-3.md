
 GUIÓN HABLADO · INTEGRANTE 3
 Capítulo 3 — Era Transformer, Multi Frame Generation y competencia
 Duración objetivo: ~15 min  ·  8 diapositivas (1 divisor + 7 de contenido)

Este es un libreto para ensayar y hablar. No tienes que leerlo literal:
los puntos en MAYÚSCULA entre corchetes son los datos que NO te puedes
saltar. Al final hay una versión ultra-resumida ("CHULETA") y un plan B
por si vas corto de tiempo.

Navegación: avanza con la flecha derecha (→) o la barra espaciadora.
Tu bloque empieza en la diapositiva divisoria "03" y termina en la
comparativa DLSS/FSR/XeSS. Entregas al Integrante 4.

CAMBIO IMPORTANTE respecto a versiones anteriores del guión:
Tus diapositivas con mucho contenido se PARTIERON en dos para que todo
quepa en pantalla sin scroll. Ahora son 7 de contenido (antes 5):
  - "CNN vs Transformer" -> ahora son 2: concepto+demo / imágenes-evidencia.
  - "Multi Frame Generation" -> ahora son 2: concepto+datos / diagrama+demo.
El resto (4.5/FP8, Compatibilidad, Comparativa) sigue igual.


---------------------------------------------------------------------------
 TUS DIAPOSITIVAS TIENEN DEMOS INTERACTIVAS E IMÁGENES REALES
---------------------------------------------------------------------------
Cinco diapositivas tienen una DEMO con la que puedes INTERACTUAR mientras
hablas (etiqueta verde "Demo interactiva"). No son videos: respondes tú.
Dos diapositivas tienen IMÁGENES reales de NVIDIA (con su pie de fuente).

Plan de uso de las demos:

  - CNN vs Transformer -> MAPA DE ATENCIÓN. Mueve el cursor sobre las dos
    escenas. La izquierda (CNN) solo revela un cuadrito local; la derecha
    (Transformer) lanza líneas de atención a bordes finos de todo el cuadro.
    Mueve el mouse MIENTRAS explicas "la CNN mira parches, el Transformer mira
    todo". Es tu mejor gancho visual.

  - Multi Frame Generation -> SELECTOR DE MULTIPLICADOR. Haz clic en Off, 2x,
    3x, 4x, 6x. La tira animada muestra cuadros REALES (azul, "R") y GENERADOS
    (magenta, "IA"), y los números de FPS vistos vs reales cambian en vivo.
    Pulsa Off y luego 6x para que se vea el salto. ESTA es la demo clave de tu
    parte: úsala para martillar "cuadros reales vs generados".

  - DLSS 4.5 / FP8 -> SELECTOR DE GPU. Haz clic en RTX 20, 30, 40, 50. Las
    barras muestran cómo el Transformer 2a gen MEJORA con FP8 (RTX 40/50, barra
    verde) pero EMPEORA ~20% sin FP8 (RTX 20/30, barra roja). Clic en 50 y
    luego en 20 para mostrar el contraste.

  - Matriz de compatibilidad -> SELECTOR DE GPU. Haz clic en una GPU y se
    encienden/apagan las funciones (verde=sí, ambar=parcial, gris=no).
    Recorre 20 -> 40 -> 50 para contar la historia de un vistazo.

  - Comparativa DLSS/FSR/XeSS -> SELECTOR DE EJE. Haz clic en "Calidad",
    "Rendimiento", "Compatibilidad HW", "Render neuronal gen." y las barras de
    los tres rivales se reajustan. Termina en "Render neuronal gen." para
    rematar: solo DLSS la tiene.

Consejo de ensayo: practica MOVER el mouse / hacer los clics mientras hablas,
no en silencio. La demo debe acompañar la frase, no interrumpirla. Si fallara
algo en vivo, el texto de la diapositiva ya cuenta todo: sigue hablando.

NOTA sobre las fuentes: cada demo y cada imagen muestran de dónde salen los
datos. Las barras/porcentajes de las demos son ILUSTRATIVOS del documento
base (lo dice la propia demo: "Valores ilustrativos"), no benchmarks exactos.
Si te preguntan, acláralo sin problema.


---------------------------------------------------------------------------
 ENTRADA / TRANSICIÓN DESDE EL INTEGRANTE 2   (~20 seg)
---------------------------------------------------------------------------
"Gracias. Como acabamos de ver, hasta DLSS 3.5 toda la magia ocurría con
redes CONVOLUCIONALES: recuperar información temporal y limpiar el ray
tracing. En mi parte vamos a dar el salto más grande en arquitectura desde
que existe DLSS: el cambio a Transformers, la multiplicación de fotogramas,
y por fin vamos a comparar a NVIDIA con la competencia, AMD e Intel."

(Avanza a la diapositiva "03 · Era Transformer".)


---------------------------------------------------------------------------
 DIAPOSITIVA 1  —  DIVISOR "03 · Era Transformer y competencia"  (~15 seg)
---------------------------------------------------------------------------
"Estamos en 2025 y 2026. Dos versiones, DLSS 4.0 y 4.5, cambian la red
neuronal por dentro y empujan la generación de fotogramas hasta un extremo
que parecía imposible. Empecemos por el cambio de arquitectura."

(Avanza.)


---------------------------------------------------------------------------
 DIAPOSITIVA 2  —  "CNN vs. Vision Transformer" (concepto + demo)  (~2 min)
---------------------------------------------------------------------------
(Esta diapositiva tiene las dos tarjetas CNN/Transformer y la DEMO del mapa
 de atención. Interactúa con el mouse mientras hablas.)

"DLSS 4.0 se anunció en enero de 2025, en el CES, junto a la arquitectura
Blackwell, que son las tarjetas GeForce RTX serie 50.

[CAMBIO CLAVE] Lo más importante: NVIDIA jubila la red neuronal
convolucional y la reemplaza por el primer VISION TRANSFORMER en tiempo real
de la industria gráfica. Y esto aplica a las tres rutas de DLSS: Super
Resolution, Ray Reconstruction y DLAA.

¿Por qué importa? Les explico la diferencia con esta demo (MUEVE EL MOUSE):

- Una red CONVOLUCIONAL mira la imagen por PARCHES, regiones locales de
  píxeles vecinos (fíjense en el recuadro de la izquierda: solo 've' lo que
  rodea al cursor). Es buena para texturas, pero pierde el contexto global.
  Por eso sufría 'ghosting' en cables lejanos, aspas girando o rejas.

- Un TRANSFORMER usa 'atención': pondera la IMPORTANCIA RELATIVA de cada píxel
  respecto a TODO el fotograma (a la derecha ven cómo lanza líneas a bordes
  finos de toda la escena), y además a lo largo de varios cuadros. Es la misma
  familia que usan los modelos generativos modernos.

[COMPATIBILIDAD] Aunque salió con la serie 50, el modelo Transformer llega a
TODA la gama RTX, de forma nativa o con la opción 'DLSS Override' en la NVIDIA
App. Hasta una RTX 20 vieja puede usar el Transformer de Super Resolution."

(Transición:) "¿Y esto en imágenes reales cómo se ve? Miren."

(Avanza.)


---------------------------------------------------------------------------
 DIAPOSITIVA 3  —  "CNN vs. Transformer · evidencia" (imágenes)  (~1.5 min)
---------------------------------------------------------------------------
(Esta diapositiva tiene DOS IMÁGENES REALES de NVIDIA y las tres métricas en
 tarjetas. Señala los detalles finos en las capturas.)

"Aquí tienen comparaciones reales de NVIDIA. Fíjense en los detalles finos
—cables, rejas, bordes— donde el modelo viejo dejaba rastros y el Transformer
los mantiene estables.

[DATOS] Tres cifras para cerrar:
- El modelo nuevo tiene el DOBLE de parámetros que el anterior.
- Se le atribuye alrededor de un 30% MENOS de ghosting.
- Y llega a TODA la gama RTX (vía DLSS Override)."

(Transición:) "Pero la exclusiva de verdad de la serie 50 fue otra cosa:
multiplicar fotogramas. Vamos a verlo."

(Avanza.)


---------------------------------------------------------------------------
 DIAPOSITIVA 4  —  "Multi Frame Generation (MFG)" (concepto)  (~2.5 min) [NÚCLEO]
---------------------------------------------------------------------------
(Esta diapositiva es TEXTO: el concepto, los 3 rediseños y los datos de
 Cyberpunk. La DEMO interactiva está en la SIGUIENTE diapositiva.)

"Recuerden que en DLSS 3.0 la generación de fotogramas insertaba UN cuadro
interpolado entre cada dos reales. Multi Frame Generation lleva eso al
extremo: genera hasta TRES fotogramas adicionales por cada cuadro renderizado
de verdad. Son los modos 3x y 4x.

[FRASE DE NVIDIA] NVIDIA lo resume así: llega a sintetizar 15 de cada 16
píxeles que ves en pantalla. La GPU 'dibuja a mano' 1 de cada 16; el resto lo
pone la IA.

Para que esto fuera viable hicieron falta TRES rediseños:

[REDISEÑO 1] El flujo óptico ya NO usa el hardware dedicado OFA de las RTX 40.
Ahora es un MODELO DE IA que corre en los Tensor Cores: 40% más rápido y 30%
menos VRAM. Se ejecuta UNA sola vez por cuadro real para derivar varios
cuadros intermedios.

[REDISEÑO 2] CINCO modelos simultáneos por cuadro, lo que exige los Tensor
Cores de 5ª generación de Blackwell (hasta 3.352 AI TOPS).

[REDISEÑO 3] 'Hardware Flip Metering': el RITMO de entrega de cuadros pasa de
la CPU al motor de pantalla de la GPU. El efecto: fotogramas más parejos.

Ahora, los NÚMEROS, y aquí viene lo importante de toda mi parte:

[CIFRA MARKETING] En las slides de NVIDIA para Cyberpunk 2077: sin DLSS, 27
FPS con 70 ms de latencia. Con DLSS 4, 250 FPS con 34 ms. Un salto enorme.

[CIFRA INDEPENDIENTE] PERO Gamers Nexus, en la RTX 5090, midió que en CUADROS
REALES la mejora del modelo nuevo frente al viejo fue de +5,1%: 143 vs 136 FPS.

[LA LECCIÓN] Hay que separar siempre los CUADROS GENERADOS de los REALES. Ver
250 FPS se siente fluido, pero el juego responde a tu ratón a la velocidad de
los cuadros reales. Guárdense esta idea: vuelve en los debates del final."

(Transición:) "Y esto se entiende mejor viéndolo. Miren esta demo."

(Avanza.)


---------------------------------------------------------------------------
 DIAPOSITIVA 5  —  "MFG · cómo se ve y demo" (diagrama + demo)  (~1.5 min)
---------------------------------------------------------------------------
(Esta diapositiva tiene el DIAGRAMA de arquitectura de NVIDIA y la DEMO del
 multiplicador. AQUÍ es donde interactúas con los botones Off/2x/.../6x.)

"A la izquierda, el diagrama oficial de cómo encaja el flujo. A la derecha, una
demo: cada barra azul es un cuadro REAL, cada magenta es uno GENERADO por IA.

(HAZ CLIC EN 'Off') Sin Frame Gen: todos los cuadros son reales.
(HAZ CLIC EN '4x') Con MFG 4x: por cada real, tres generados. 15 de cada 16.
(HAZ CLIC EN '6x') Con el 6x dinámico de 4.5: 23 de cada 24.

Fíjense en los dos números: los 'FPS vistos' se disparan, pero los 'FPS reales'
—los que responden a tu input— se quedan igual. Esa es la idea clave."

(Transición:) "Un año después, en 2026, DLSS 4.5 empuja esto todavía más...
pero con letra pequeña."

(Avanza.)


---------------------------------------------------------------------------
 DIAPOSITIVA 6  —  "DLSS 4.5 · Transformer 2ª gen y FP8"   (~2.5 min)
---------------------------------------------------------------------------
(Texto a la izquierda + DEMO de selector de GPU. Haz clic en RTX 50 y luego
 en RTX 20 para mostrar la caída.)

"DLSS 4.5 trae dos novedades principales:

[NOVEDAD 1] Un Transformer de SEGUNDA generación. Llegó a Super Resolution en
enero de 2026 y a Ray Reconstruction en agosto de 2026.

[NOVEDAD 2] Dynamic Multi Frame Generation 6x: hasta CINCO cuadros por cada
cuadro real (23 de cada 24 píxeles). Es 'dinámico' porque ajusta el
multiplicador EN VIVO para monitores de 360 Hz o 480 Hz y más.

[EL PERO: FP8] Aquí está la letra pequeña (y la demo lo muestra). Este modelo
hace 5 veces más cálculos y depende de una aceleración llamada FP8, que solo
existe en las RTX 40 y 50. (CLIC EN RTX 50: barra verde, rinde mejor). En las
RTX 20 y 30, sin FP8 nativo, es ~5x más exigente (CLIC EN RTX 20: la barra cae
en rojo): pruebas de la comunidad registraron caídas cercanas al 20% en FPS.
Por eso en esas tarjetas se recomienda CONSERVAR el modelo anterior. La versión
'mejor' no siempre es mejor para todos.

[REFLEX 2] Un apunte honesto: NVIDIA anunció en 2025 Reflex 2 con 'Frame Warp',
prometiendo −75% de latencia. Más de 18 meses después, sigue sin salir en
ningún juego comercial. No todo lo anunciado llega al mercado."

(Transición:) "Con tantas versiones, la pregunta obvia es: ¿qué corre en MI
tarjeta?"

(Avanza.)


---------------------------------------------------------------------------
 DIAPOSITIVA 7  —  "Matriz de compatibilidad por generación"   (~2 min)
---------------------------------------------------------------------------
(DEMO: selector de GPU. Recorre 20 -> 40 -> 50 con los botones. No leas celda
 por celda; deja que la demo encienda/apague las funciones.)

"Esta demo resume qué tienes según tu GPU. Recorramos:

(CLIC EN RTX 20/30) Turing y Ampere: tienen Super Resolution y Ray
Reconstruction, pero con la penalización de ~20% en 4.5 por falta de FP8. NO
tienen generación de fotogramas oficial, ni DLSS 5.

(CLIC EN RTX 40) Ada: ya tiene FP8 y Frame Generation 2x completa, pero el
Multi Frame Gen se queda limitado a 2x. DLSS 5 está PLANEADO, sin fecha.

(CLIC EN RTX 50) Blackwell: la gama completa. Todo: SR, RR, Frame Gen, MFG 6x
dinámico y DLSS 5 desde septiembre de 2026.

Y GeForce NOW, la nube de NVIDIA, da acceso según el servidor, incluido DLSS 5.

[DATO CURIOSO] Un dato que sorprende: la primera CONSOLA con DLSS integrado fue
la Nintendo Switch 2, en junio de 2025, gracias a su chip NVIDIA Tegra T239,
nombre en clave 'Drake'."

(Transición:) "Hasta aquí todo es NVIDIA. Pero no está sola: AMD e Intel tienen
sus propias tecnologías. Terminemos comparándolas."

(Avanza.)


---------------------------------------------------------------------------
 DIAPOSITIVA 8  —  "Comparativa: DLSS vs FSR vs XeSS"   (~2 min)
---------------------------------------------------------------------------
(DEMO: selector de eje. Haz clic en cada eje; termina en "Render neuronal gen."
 para rematar.)

"Tres jugadores: NVIDIA con DLSS, AMD con FSR 4.1 (nombre Redstone) e Intel con
XeSS 2 y 3. Comparemos por ejes (voy haciendo clic):

[ESCALADO] NVIDIA usa el Transformer de 2ª gen, óptimo en RTX 40/50. AMD por
fin dio el salto al machine learning acelerado por hardware en sus RX 9000 y
7000, con respaldo a FSR 3.1 en otras. Intel usa sus motores matriciales XMX en
las Arc, y una ruta por shaders, más lenta, en el resto.

[GENERACIÓN DE FRAMES] NVIDIA llega hasta MFG dinámico 6x. AMD tiene generación
por ML pero SIN multi-frame en PC todavía. Intel tiene la suya en las Arc.

[RAY TRACING Y LATENCIA] Cada uno tiene equivalente: NVIDIA, Ray Reconstruction
+ Reflex; AMD, Ray Regeneration con Radiance Caching y Anti-Lag 2; Intel, Xe
Low Latency.

[LA DIFERENCIA DE FONDO] (CLIC EN 'Render neuronal gen.') Y aquí la fila que lo
resume todo: el RENDERIZADO NEURONAL GENERATIVO, que es DLSS 5, solo lo tiene
NVIDIA. Ni AMD ni Intel han anunciado un equivalente.

[BALANCE] En calidad, DLSS suele ser la referencia; en una prueba ciega de 2026
ganó en 6 de 7 juegos frente a FSR 4.1. PERO la ventaja de AMD e Intel es que
corren en MUCHO más hardware y son más abiertas; FSR incluso funciona en
tarjetas NVIDIA. DLSS exige sí o sí una GPU RTX.

Resumiendo: NVIDIA lidera en fidelidad, pero paga el precio de ser cerrado."

(Transición final, entregas al Integrante 4:)
"Y fíjense: todo lo que les conté hoy —4.0, 4.5, la competencia— persigue lo
mismo, MÁS RENDIMIENTO. La versión 5 rompe con eso: en vez de ahorrar cómputo
para ir más rápido, lo GASTA para verse mejor. Esa vuelta de tuerca la cuenta
[nombre del Integrante 4]."

(Cede la palabra.)


===========================================================================
 CHULETA  (lo mínimo que NO puedes olvidar)
===========================================================================
 1. DLSS 4.0 (ene 2025, RTX 50/Blackwell): CNN -> VISION TRANSFORMER.
    Transformer = atención a todo el fotograma; CNN = parches locales.
    Doble de parámetros, ~30% menos ghosting, llega a toda RTX (DLSS Override).
 2. MFG: hasta 3 cuadros extra (3x/4x), "15 de cada 16 píxeles".
    3 rediseños: flujo óptico por IA (no OFA), 5 modelos simultáneos,
    Hardware Flip Metering.
    Cyberpunk 27->250 FPS (NVIDIA) vs +5,1% reales (Gamers Nexus).
    >>> SIEMPRE separar cuadros reales de cuadros generados. <<<
 3. DLSS 4.5 (2026): Transformer 2ª gen + Dynamic MFG 6x (5 cuadros, 23/24 px,
    360/480 Hz). Cuello de botella FP8: en RTX 20/30 cae ~20%, mejor el modelo
    viejo. Reflex 2 sigue SIN salir.
 4. Compatibilidad: 20/30 = SR+RR (con penalización); 40 = +FrameGen, DLSS5
    planeado; 50 = todo + DLSS5. Switch 2 = 1ª consola con DLSS (Tegra T239).
 5. DLSS vs FSR 4.1 (Redstone) vs XeSS 2/3: NVIDIA lidera fidelidad (ganó 6/7
    vs FSR) pero exige RTX; FSR/XeSS más abiertas. Solo NVIDIA tiene render
    neuronal generativo (DLSS 5).

 Mapa rápido diapositiva -> tema:
   1 divisor · 2 CNN/ViT concepto+demo · 3 CNN/ViT imágenes · 4 MFG concepto
   · 5 MFG diagrama+demo · 6 DLSS 4.5/FP8 · 7 compatibilidad · 8 comparativa.


===========================================================================
 PLAN B  (si vas corto de tiempo, recorta por aquí)
===========================================================================
 - Diapos 2 y 3 (CNN/Transformer) se pueden contar casi juntas: explica el
   concepto con la demo en la 2 y en la 3 solo señala "aquí lo ven en capturas
   reales de NVIDIA, 30% menos ghosting". No te detengas mucho en la 3.
 - Diapos 4 y 5 (MFG): la 4 es el discurso, la 5 es la demo. Si vas corto, en
   la 4 resume los 3 rediseños en una frase y gasta el tiempo en la demo (5),
   que es lo que impacta.
 - En COMPATIBILIDAD (7): no la recorras entera. Di solo "lo básico corre en
   todas las RTX; Frame Gen pide RTX 40; MFG 6x y DLSS 5 son exclusivos de la
   RTX 50". Y el dato de Switch 2.
 - En la COMPARATIVA (8): quédate con DOS ideas: (a) DLSS lidera en nitidez
   pero exige RTX; (b) solo NVIDIA tiene render neuronal generativo.
 - Si vas MUY corto, en DLSS 4.5 (6) di solo "más cuadros (6x) pero depende de
   FP8, así que en tarjetas viejas rinde peor" y salta Reflex 2.

 Lo que NUNCA debes cortar: el contraste 27->250 FPS vs +5,1% reales y la frase
 "separar cuadros reales de generados". Es tu aporte más valioso a la charla.
===========================================================================
