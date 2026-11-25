/*
  slides.js
  ---------
  Contenido de la presentación como un arreglo de objetos.
  Cada slide tiene:
    - type: "cover" | "chapter" | "content"  (controla el layout)
    - title (para el índice)
    - chapter: true marca divisores de capítulo en el índice
    - html: el markup interno del slide (va dentro de .wrap)
  NO contiene guión, tiempos ni nombres de integrantes (eso va aparte).
*/

/* Ponlo en true cuando agregues assets/ch2/demo.mp4 y assets/ch2/comparacion.jpg */
const MEDIA_CH2 = false;

export const slides = [
  /* ============ PORTADA ============ */
  {
    type: "cover",
    title: "Portada",
    html: `
      <div class="eyebrow">NVIDIA · Deep Learning Super Sampling</div>
      <h1 class="grad">De la supermuestra espacial<br>al renderizado neuronal</h1>
      <p class="sub">La evolución de DLSS desde los prototipos de 2018 hasta DLSS&nbsp;5,
      el modelo generativo que reescribe el final del pipeline gráfico.</p>
      <div class="meta">
        <span>Línea temporal · <b>2018 → 2026</b></span>
        <span>Siete generaciones · <b>DLSS 1.0 a DLSS 5</b></span>
        <span>Computación Visual</span>
      </div>`
  },

  {
    type: "content",
    title: "Qué es DLSS y por qué importa",
    html: `
      <span class="kicker">Punto de partida</span>
      <h2>¿Qué es DLSS?</h2>
      <div class="cols side">
        <div>
          <p class="body"><b>Deep Learning Super Sampling</b> es el conjunto de técnicas de
          NVIDIA que usa redes neuronales, ejecutadas en los <span class="hl">Tensor Cores</span>
          de las GPU RTX, para producir más imagen de la que la tarjeta rasteriza directamente.</p>
          <ul class="ticks">
            <li>El juego se renderiza a <b>menor resolución</b> y la IA reconstruye el fotograma final.</li>
            <li>La IA puede además <b>generar fotogramas intermedios</b> para elevar los FPS.</li>
            <li>En su versión más reciente, <b>sintetiza iluminación y materiales</b> fotorrealistas.</li>
          </ul>
        </div>
        <div class="card accent">
          <h3>La idea en una frase</h3>
          <p>Renderizar menos píxeles "a mano" y dejar que una red neuronal entrenada
          complete el resto con calidad igual o superior a la nativa.</p>
          <p style="margin-top:1rem;" class="mono" >menos cómputo clásico<br>+ más inferencia de IA<br>= más rendimiento o más fidelidad</p>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "El punto de quiebre: rendimiento vs. fidelidad",
    html: `
      <span class="kicker">Tesis de la charla</span>
      <h2>Dos eras en una misma tecnología</h2>
      <div class="versus">
        <div class="card">
          <h3 class="hl">DLSS 1.0 → 4.5 · ahorrar cómputo</h3>
          <p>Todas estas generaciones buscan <b>más FPS</b>: renderizan a menor resolución
          o intercalan fotogramas generados. La IA sustituye trabajo para que la GPU vaya más rápido.</p>
        </div>
        <div class="vs">VS</div>
        <div class="card mg">
          <h3 class="hl-m">DLSS 5 · gastar cómputo</h3>
          <p>Invierte la lógica: parte de una escena ya renderizada y <b>añade fidelidad</b>
          (iluminación y materiales neuronales). Consume cómputo extra en vez de ahorrarlo.</p>
        </div>
      </div>
      <p class="note">Esta distinción ordena toda la historia: hasta 4.5, DLSS es una tecnología
      de rendimiento; con 5 se convierte también en una etapa de síntesis visual.</p>`
  },

  {
    type: "content",
    title: "Tres matices que se suelen malinterpretar",
    html: `
      <span class="kicker">Rigor documental</span>
      <h2>Antes de empezar, tres aclaraciones</h2>
      <div class="cols c3">
        <div class="card">
          <h3>No hubo "beta pública" 1.0</h3>
          <p>No existe una versión oficial etiquetada como beta previa a DLSS 1.0: hubo demos
          técnicas bajo el marco <span class="mono">NGX</span> y una etapa de transición apodada
          informalmente <b>"1.9"</b>.</p>
        </div>
        <div class="card">
          <h3>Cifras del fabricante</h3>
          <p>Muchos números de rendimiento de DLSS 4.5 y 5 vienen de <b>pruebas internas de NVIDIA</b>
          en títulos concretos. Hay que separar métricas de marketing de mediciones independientes.</p>
        </div>
        <div class="card">
          <h3>Reflex 2 sigue sin salir</h3>
          <p>Funciones muy publicitadas como <b>Reflex 2 (Frame Warp)</b> siguen sin lanzamiento
          comercial más de 18 meses después de su anuncio.</p>
        </div>
      </div>`
  },

  /* ============ CAPÍTULO 1 ============ */
  {
    type: "chapter",
    title: "Capítulo 1 · Orígenes y era espacial",
    chapter: true,
    html: `
      <div class="big-num">01</div>
      <span class="kicker">2018 – 2019</span>
      <h2>Orígenes: prototipos NGX,<br>DLSS 1.0 y el caso "1.9"</h2>
      <p class="lead">Turing, Tensor Cores y el primer intento de escalar con redes neuronales
      entrenadas juego por juego.</p>`
  },

  {
    type: "content",
    title: "Turing y la plataforma NGX (2018)",
    html: `
      <span class="kicker">El hardware que lo hizo posible</span>
      <h2>2018 · Llega Turing y los Tensor Cores</h2>
      <div class="cols side">
        <div>
          <p class="body">Con la microarquitectura <b>Turing</b> (GeForce RTX 20), NVIDIA integra
          por primera vez aprendizaje profundo en gráficos a través de la plataforma
          <span class="hl">NGX</span>, que incluía herramientas como AI InPainting, AI Slow-Mo
          y AI Super Rez.</p>
          <ul class="ticks">
            <li>Chip <b>TU102</b> (RTX 2080 Ti): 18.600 millones de transistores en 12 nm.</li>
            <li><b>4.608</b> núcleos CUDA · <b>72</b> núcleos RT · Tensor Cores con INT8/INT4.</li>
            <li>Demo técnica <b>Unreal Infiltrator</b>: 4K a más de <b>70 FPS</b> en una RTX 2080 Ti.</li>
          </ul>
        </div>
        <div class="card">
          <h3>¿Qué es un Tensor Core?</h3>
          <p>Unidad de hardware especializada en multiplicación de matrices, la operación
          base de las redes neuronales. Es lo que permite ejecutar inferencia de IA
          en tiempo real dentro del presupuesto de un fotograma.</p>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "Cómo funcionaba DLSS 1.0",
    html: `
      <span class="kicker">Oct 2018 – Feb 2019</span>
      <h2>DLSS 1.0 · escalado espacial, un fotograma</h2>
      <div class="cols side">
        <div>
          <p class="body">DLSS 1.0 era un escalador <b>predominantemente espacial</b> sobre
          autocodificadores convolucionales, en dos etapas:</p>
          <ol class="num-list">
            <li><b>Mejora de bordes y antialiasing</b> usando el fotograma actual y sus vectores de movimiento.</li>
            <li><b>Escalado</b> de ese único fotograma de baja resolución hasta la salida.</li>
          </ol>
          <p class="body" style="margin-top:1.2rem;">Al no tener historial temporal, la red debía
          <b>inventar</b> mucha información a partir de una sola imagen.</p>
        </div>
        <div class="card mg">
          <h3>Entrenamiento por juego</h3>
          <p>NVIDIA entrenaba un modelo <b>específico para cada videojuego</b> en su
          supercomputadora <span class="mono">Saturn V</span>, usando imágenes de referencia
          por supermuestreo a <b>64 muestras por píxel</b>.</p>
          <p style="margin-top:.9rem;">Coste: <b>2–4 ms</b> por fotograma. Resultado: imágenes
          blandas y "alucinaciones" en geometrías finas (hojas, vallas).</p>
        </div>
      </div>
      <p class="note">Recepción tibia: debutó en Battlefield V y Metro Exodus como prueba de concepto.</p>`
  },

  {
    type: "content",
    title: 'El caso puente DLSS "1.9"',
    html: `
      <span class="kicker">Ago 2019 · Control</span>
      <h2>DLSS "1.9": un puente sin Tensor Cores</h2>
      <div class="cols side">
        <div>
          <p class="body">Nombre <b>informal</b> acuñado por la comunidad para la implementación
          que llegó inicialmente al juego <b>Control</b>. Fue un caso único en la historia de DLSS.</p>
          <ul class="ticks">
            <li>No usaba los Tensor Cores dedicados, sino los <b>núcleos shader CUDA</b> tradicionales.</li>
            <li>Algoritmo de escalado y reconstrucción, no de pura inferencia neuronal.</li>
            <li>Sirvió como <b>puente experimental</b> antes de la actualización oficial a DLSS 2.0.</li>
          </ul>
        </div>
        <div class="card accent">
          <h3>Por qué importa</h3>
          <p>Demuestra que NVIDIA estaba buscando el método correcto: entre el escalado espacial
          de 1.0 y la reconstrucción temporal de 2.0 hubo un experimento intermedio que
          anticipa el gran cambio de paradigma.</p>
        </div>
      </div>`
  },

  /* ============ CAPÍTULO 2 ============ */
  {
    type: "chapter",
    title: "Capítulo 2 · Revolución temporal",
    chapter: true,
    html: `
      <div class="big-num">02</div>
      <span class="kicker">2020 – 2023</span>
      <h2>Revolución temporal y<br>los primeros fotogramas generados</h2>
      <p class="lead">Recuperar detalle en el tiempo, inventar cuadros enteros y limpiar los rayos con IA.</p>`
  },

  /* ---- 2.1 DLSS 2.0: jitter ---- */
  {
    type: "content",
    title: "DLSS 2.0 · recuperar, no inventar",
    html: `
      <span class="kicker">23 mar 2020 · rediseño total</span>
      <h2>DLSS 2.0 · recuperar, no inventar</h2>
      <div class="cols side">
        <div class="demo" data-demo="jitter">
          <div class="demo-panes">
            <figure><div class="pane-a"></div><figcaption>1 cuadro de baja resolución</figcaption></figure>
            <figure><div class="pane-b"></div><figcaption class="hl">Cuadros acumulados con jitter</figcaption></figure>
          </div>
          <div class="counter mono">cuadros acumulados: 0 / 16</div>
        </div>
        <ul class="ticks tight">
          <li>Ya no escala <b>un</b> cuadro: acumula <b>varios</b>.</li>
          <li>El motor mueve la cámara una fracción de píxel (<span class="hl">jitter subpíxel</span>).</li>
          <li>Cada cuadro ve puntos distintos → la IA los junta. Es detalle <b>real</b>.</li>
        </ul>
      </div>
      <p class="note">Ilustración conceptual con escena quieta. Con movimiento, los vectores de movimiento reubican las muestras.</p>`
  },

  /* ---- 2.2 Entradas y logros ---- */
  {
    type: "content",
    title: "DLSS 2.0 · entradas y logros",
    html: `
      <span class="kicker">Qué le entra a la red</span>
      <h2>Cuatro entradas, un solo modelo</h2>
      <div class="cols c4">
        <div class="card chip"><div class="ico">▦</div><h3>Baja resolución</h3><p>El cuadro bruto</p></div>
        <div class="card chip"><div class="ico">➜</div><h3>Vectores de movimiento</h3><p>Hacia dónde se mueve cada cosa</p></div>
        <div class="card chip"><div class="ico">▤</div><h3>Profundidad</h3><p>Buffer Z</p></div>
        <div class="card chip"><div class="ico">☀</div><h3>Exposición</h3><p>Brillo de la escena</p></div>
      </div>
      <div class="flow-arrow">▼ red convolucional en Tensor Cores ▼</div>
      <div class="cols c3" style="margin-top:.4rem;">
        <div class="card accent"><div class="big">1</div><p>modelo genérico: se acabó el entrenamiento por juego</p></div>
        <div class="card"><div class="big">1–2 ms</div><p>por fotograma (DLSS 1.0: 2–4 ms)</p></div>
        <div class="card mg"><div class="big">DLAA</div><p>la misma red a resolución nativa: antialiasing sin escalar</p></div>
      </div>`
  },

  /* ---- 2.3 TAA vs DLSS 2.0 ---- */
  {
    type: "content",
    title: "TAA clásico vs. DLSS 2.0",
    html: `
      <span class="kicker">Por qué fue un salto</span>
      <h2>La red decide qué historia conservar</h2>
      <div class="demo" data-demo="taa">
        <div class="demo-panes">
          <figure><div class="pane-a"></div><figcaption class="hl-m">TAA convencional · reglas manuales</figcaption></figure>
          <figure><div class="pane-b"></div><figcaption class="hl">DLSS 2.0 · la red decide</figcaption></figure>
        </div>
      </div>
      <div class="cols c2" style="margin-top:1rem;">
        <p class="short"><b>TAA:</b> descarta historia con reglas fijas (<span class="mono">neighborhood clamping</span>) → <b>emborrona</b> y deja estela.</p>
        <p class="short"><b>DLSS 2.0:</b> distingue qué conservar → a menudo iguala o supera el nativo con TAA.</p>
      </div>
      <p class="note">Ilustración conceptual (no es captura real). Condición: el juego aplica un sesgo de mip-map negativo para aprovechar el detalle.</p>`
  },

  /* ---- 2.4 DLSS 3.0 Frame Generation ---- */
  {
    type: "content",
    title: "DLSS 3.0 · generación de fotogramas",
    html: `
      <span class="kicker">Sep 2022 · Ada Lovelace (RTX 40)</span>
      <h2>DLSS 3.0 · inventar cuadros enteros</h2>
      <div class="demo" data-demo="framegen">
        <div class="demo-bar">
          <button data-mode="off" class="tbtn">Frame Gen OFF</button>
          <button data-mode="on" class="tbtn">Frame Gen ON</button>
          <span class="mono readout">pantalla: <b class="out-shown">120</b> FPS · cuadros reales: <b class="out-real">60</b> FPS <i>(ejemplo ilustrativo)</i></span>
        </div>
        <div class="pane-a"></div>
      </div>
      <div class="cols c3" style="margin-top:1rem;">
        <div class="card chip"><h3>2 cuadros → 1 nuevo</h3><p>La IA interpola un cuadro intermedio</p></div>
        <div class="card chip accent"><h3>Optical Flow Accelerator</h3><p>Hardware de RTX 40: sigue sombras, reflejos, partículas</p></div>
        <div class="card chip mg"><h3>El costo: latencia</h3><p>Más FPS en pantalla ≠ más respuesta → se une a Reflex</p></div>
      </div>`
  },

  /* ---- 2.5 DLSS 3.5 Ray Reconstruction ---- */
  {
    type: "content",
    title: "DLSS 3.5 · Ray Reconstruction",
    html: `
      <span class="kicker">Sep 2023 · todas las RTX</span>
      <h2>DLSS 3.5 · un denoiser de IA</h2>
      <div class="cols side">
        <div class="demo" data-demo="ray">
          <div class="demo-bar">
            <button data-mode="noisy" class="tbtn">Pocos rayos</button>
            <button data-mode="manual" class="tbtn">Denoisers manuales</button>
            <button data-mode="rr" class="tbtn">Ray Reconstruction</button>
          </div>
          <div class="pane-a"></div>
          <div class="mode-caption mono"></div>
        </div>
        <div>
          <ul class="ticks tight">
            <li>Path tracing: <b>pocos rayos</b> por píxel → ruido.</li>
            <li>Antes: varios <b>denoisers hechos a mano</b> (difuminan, parpadean).</li>
            <li>Ahora: <span class="hl">un solo modelo de IA</span>, entrenado con <b>5×</b> más datos.</li>
          </ul>
          <div class="pills">
            <span class="pill on">Cyberpunk 2077: Phantom Liberty</span>
            <span class="pill on">Alan Wake 2</span>
            <span class="pill on">Portal with RTX</span>
          </div>
          <div class="card accent" style="margin-top:1.1rem;"><p><b>Desde la serie RTX 20.</b> Es solo procesamiento de imagen: no necesita el OFA.</p></div>
        </div>
      </div>
      <p class="note">Ilustración conceptual (no es captura real).</p>`
  },

  /* ---- 2.6 (OPCIONAL) Media real: poner MEDIA_CH2 = true cuando estén los archivos ---- */
  ...(MEDIA_CH2 ? [{
    type: "content",
    title: "Míralo en un juego real",
    html: `
      <span class="kicker">Demostración</span>
      <h2>En un juego real</h2>
      <div class="cols c2">
        <figure class="media"><video src="assets/ch2/demo.mp4" autoplay muted loop playsinline></video><figcaption>Demo (≈15 s) · Fuente: NVIDIA</figcaption></figure>
        <figure class="media"><img src="assets/ch2/comparacion.jpg" alt="Comparación DLSS" /><figcaption>Comparación · Fuente: NVIDIA</figcaption></figure>
      </div>`
  }] : []),

  /* ---- 2.7 Resumen del capítulo ---- */
  {
    type: "content",
    title: "Resumen del capítulo 2",
    html: `
      <span class="kicker">Para llevarse</span>
      <h2>Tres movimientos, una idea</h2>
      <div class="cols c3">
        <div class="card accent"><div class="big">2020</div><h3>Recuperar</h3><p>DLSS 2.0: detalle real acumulado en el tiempo.</p></div>
        <div class="card mg"><div class="big">2022</div><h3>Inventar cuadros</h3><p>DLSS 3.0: Frame Generation con OFA (RTX 40).</p></div>
        <div class="card"><div class="big">2023</div><h3>Limpiar rayos</h3><p>DLSS 3.5: Ray Reconstruction (todas las RTX).</p></div>
      </div>
      <p class="lead">Todo esto con <b>redes convolucionales</b>. El siguiente salto cambia la arquitectura →</p>`
  },

  /* ============ CAPÍTULO 3 ============ */
  {
    type: "chapter",
    title: "Capítulo 3 · Era Transformer y competencia",
    chapter: true,
    html: `
      <div class="big-num">03</div>
      <span class="kicker">2025 – 2026</span>
      <h2>Era Transformer, Multi Frame<br>Generation y la competencia</h2>
      <p class="lead">DLSS 4.0 y 4.5 cambian de arquitectura neuronal y multiplican fotogramas,
      mientras AMD e Intel estrechan la brecha.</p>`
  },

  {
    type: "content",
    title: "CNN vs. Vision Transformer",
    html: `
      <span class="kicker">Ene 2025 · Blackwell (RTX 50)</span>
      <h2>DLSS 4.0 · del convolucional al Transformer</h2>
      <div class="versus">
        <div class="card">
          <h3 class="hl-m">Red convolucional (CNN)</h3>
          <p>Evalúa <b>regiones locales</b> de píxeles. Buena para texturas, pero pierde contexto
          global y sufre más <span class="mono">ghosting</span> en elementos finos.</p>
        </div>
        <div class="vs">→</div>
        <div class="card accent">
          <h3 class="hl">Vision Transformer</h3>
          <p>Analiza la <b>importancia relativa de cada píxel</b> en todo el fotograma y a través
          de varios cuadros. Misma familia que los modelos generativos modernos. El doble de parámetros.</p>
        </div>
      </div>
      <div class="cols c3" style="margin-top:1.4rem;">
        <div class="card"><div class="big">~30%</div><p>menos ghosting atribuido al modelo Transformer</p></div>
        <div class="card"><div class="big">SR·RR·DLAA</div><p>las tres rutas pasan a Transformer</p></div>
        <div class="card"><div class="big">todas RTX</div><p>llega a toda la gama vía DLSS Override en la NVIDIA App</p></div>
      </div>`
  },

  {
    type: "content",
    title: "Multi Frame Generation (MFG)",
    html: `
      <span class="kicker">Exclusiva RTX 50</span>
      <h2>DLSS 4.0 · hasta 3 fotogramas extra por cuadro real</h2>
      <div class="cols side">
        <div>
          <p class="body">MFG genera hasta <b>tres fotogramas adicionales</b> por cada cuadro
          renderizado (modos 3× y 4×). Según NVIDIA, llega a sintetizar <b>15 de cada 16 píxeles</b>
          mostrados en pantalla.</p>
          <h3 style="margin-top:1.2rem;">Tres rediseños que lo hicieron viable</h3>
          <ol class="num-list">
            <li><b>Flujo óptico por IA</b> en los Tensor Cores en vez del OFA: 40% más rápido, 30% menos VRAM.</li>
            <li><b>Cinco modelos simultáneos</b> por cuadro en los Tensor Cores de 5ª gen de Blackwell (hasta 3.352 AI TOPS).</li>
            <li><b>Hardware Flip Metering</b>: el ritmo de entrega de cuadros pasa de la CPU al motor de pantalla de la GPU.</li>
          </ol>
        </div>
        <div class="card accent">
          <h3>Cyberpunk 2077 (slides RTX 50)</h3>
          <p class="mono" style="font-size:1rem;line-height:1.7;margin-top:.5rem;">
          sin DLSS → <b class="hl">27 FPS</b> (~70 ms)<br>
          con DLSS 4 → <b class="hl">250 FPS</b> (~34 ms)</p>
          <p style="margin-top:1rem;">Medición independiente (Gamers Nexus, RTX 5090): 143,4 vs 136,4 FPS
          de media, +5,1% en cuadros reales. <b>Importa separar cuadros reales de generados.</b></p>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "DLSS 4.5 · Transformer de 2ª gen y FP8",
    html: `
      <span class="kicker">Ene – Ago 2026</span>
      <h2>DLSS 4.5 · más cuadros, pero con letra pequeña</h2>
      <div class="cols c2">
        <div class="card">
          <h3>Las novedades</h3>
          <ul class="ticks" style="margin-top:.6rem;">
            <li><b>Transformer de 2ª generación</b> (SR en ene; Ray Reconstruction en ago 2026).</li>
            <li><b>Dynamic MFG 6×</b>: hasta 5 cuadros por cada real (23 de cada 24 píxeles).</li>
            <li>Se adapta a monitores de <b>360 Hz / 480 Hz+</b> ajustando el multiplicador en vivo.</li>
          </ul>
        </div>
        <div class="card mg">
          <h3>El cuello de botella: FP8</h3>
          <p>El nuevo modelo hace <b>5× más cálculos</b> y depende de la aceleración <b>FP8</b>,
          presente solo en RTX 40 y 50.</p>
          <p style="margin-top:.9rem;">En RTX 20/30 (sin FP8 nativo) es ~5× más exigente: pruebas
          comunitarias registran caídas de ~<b>20% en FPS</b> frente al modelo K de DLSS 4.0.
          Se recomienda conservar el modelo anterior en esas tarjetas.</p>
        </div>
      </div>
      <p class="note">Reflex 2 con Frame Warp se anunció en ene 2025 (promesa: −75% de latencia reproyectando
      el fotograma según la última lectura del ratón), pero sigue sin lanzarse en ningún juego comercial.</p>`
  },

  {
    type: "content",
    title: "Matriz de compatibilidad por generación",
    html: `
      <span class="kicker">Qué corre en cada GPU</span>
      <h2>Compatibilidad de funciones por hardware</h2>
      <table class="tbl">
        <thead>
          <tr><th>Serie</th><th>Super Resolution / DLAA</th><th>Ray Reconstruction</th><th>Frame Gen 2×</th><th>MFG 3×–6×</th><th>DLSS 5</th></tr>
        </thead>
        <tbody>
          <tr><td><b>RTX 20</b> (Turing)</td><td class="q">Sí (−20% en 4.5, sin FP8)</td><td class="y">Sí</td><td class="n">No oficial</td><td class="n">No</td><td class="n">No</td></tr>
          <tr><td><b>RTX 30</b> (Ampere)</td><td class="q">Sí (−20% en 4.5)</td><td class="y">Sí</td><td class="n">Solo mods</td><td class="n">Solo mods</td><td class="n">No</td></tr>
          <tr><td><b>RTX 40</b> (Ada)</td><td class="y">Sí (FP8)</td><td class="y">Sí</td><td class="y">Sí</td><td class="q">Limitado a 2×</td><td class="q">Planeado, sin fecha</td></tr>
          <tr><td><b>RTX 50</b> (Blackwell)</td><td class="y">Sí (FP8)</td><td class="y">Sí</td><td class="y">Sí</td><td class="y">Sí (6× dinámico)</td><td class="y">Sí (desde sep 2026)</td></tr>
          <tr><td><b>GeForce NOW</b></td><td class="y">Según servidor</td><td class="y">Según servidor</td><td class="y">Ultimate</td><td class="y">Según servidor</td><td class="y">Sí desde sep 2026</td></tr>
        </tbody>
      </table>
      <p class="note">Nintendo Switch 2 (jun 2025) fue la primera consola con DLSS integrado, vía SoC NVIDIA Tegra T239 "Drake".</p>`
  },

  {
    type: "content",
    title: "Comparativa: DLSS vs FSR vs XeSS",
    html: `
      <span class="kicker">La competencia en 2026</span>
      <h2>DLSS 4.5 / 5 · AMD FSR 4.1 · Intel XeSS 2/3</h2>
      <table class="tbl">
        <thead>
          <tr><th>Aspecto</th><th>NVIDIA DLSS</th><th>AMD FSR 4.1 (Redstone)</th><th>Intel XeSS 2/3</th></tr>
        </thead>
        <tbody>
          <tr><td><b>Escalado por IA</b></td><td>Transformer 2ª gen; óptimo FP8 en RTX 40/50</td><td>ML en RX 9000/7000; fallback a FSR 3.1</td><td>Motores XMX en Arc; ruta shader en otras</td></tr>
          <tr><td><b>Generación de frames</b></td><td>FG 2× y MFG dinámico hasta 6×</td><td>FG ML 4.0 en RX 9000 (sin MFG en PC)</td><td>XeSS FG y Multi Frame Gen en Arc</td></tr>
          <tr><td><b>Ray tracing / latencia</b></td><td>Ray Reconstruction + Reflex</td><td>Ray Regeneration + Radiance Caching + Anti-Lag 2</td><td>Xe Low Latency (XeLL)</td></tr>
          <tr><td><b>Render neuronal generativo</b></td><td class="y">Sí (DLSS 5)</td><td class="n">Sin equivalente</td><td class="n">Sin equivalente</td></tr>
          <tr><td><b>Calidad vs rendimiento</b></td><td>Referencia en nitidez; ganó 6 de 7 en prueba ciega vs FSR 4.1</td><td>Algo más suave; 10–15% más rápido</td><td>Buena en XMX; menos nítida en ruta shader</td></tr>
        </tbody>
      </table>
      <p class="note">AMD e Intel corren en hardware más variado y abierto; NVIDIA exige GPU RTX pero suele liderar en fidelidad.</p>`
  },

  /* ============ CAPÍTULO 4 ============ */
  {
    type: "chapter",
    title: "Capítulo 4 · DLSS 5 y debates",
    chapter: true,
    html: `
      <div class="big-num">04</div>
      <span class="kicker">2026</span>
      <h2>DLSS 5 · renderizado neuronal<br>y debates críticos</h2>
      <div class="route">
        <div class="step"><span class="n">01</span><h3>Arquitectura 3D</h3></div>
        <div class="step"><span class="n">02</span><h3>Polémica y métricas</h3></div>
        <div class="step"><span class="n">03</span><h3>Intención artística</h3></div>
      </div>`
  },

  {
    type: "content",
    title: "DLSS 5 · qué es (y qué no es)",
    html: `
      <span class="tech-tag">Difusión en espacio de píxeles · 1 paso · inferencia causal 1-frame-in / 1-frame-out</span>
      <h2>DLSS 5 · renderizado neuronal guiado en 3D</h2>
      <div class="band" style="margin-top:.8rem;"><b>En pocas palabras:</b> DLSS 5 es una etapa de renderizado neuronal que combina la imagen del juego con datos del motor —como color, movimiento y máscaras— para sintetizar iluminación y materiales en el fotograma final. No crea la escena desde cero: transforma visualmente una escena 3D ya renderizada.</div>
      <div class="arch" style="margin-top:1.4rem;">
        <div class="block"><span class="n" style="font-family:var(--mono);color:var(--dim);font-size:.72rem;">ENTRADA</span><h3>Rasterización /<br>Path Tracing</h3></div>
        <div class="block core"><span class="n" style="font-family:var(--mono);color:var(--dim);font-size:.72rem;">GENERATIVO</span><h3>Bloque central<br>DLSS 5</h3></div>
        <div class="block"><span class="n" style="font-family:var(--mono);color:var(--dim);font-size:.72rem;">SALIDA</span><h3>Fotograma final<br>4K</h3></div>
      </div>
      <div class="feeds">
        <span class="feed">Color base</span>
        <span class="feed">Vectores movimiento</span>
        <span class="feed">Historial temporal</span>
        <span class="feed">Máscaras estudio</span>
      </div>`
  },

  {
    type: "content",
    title: "Qué sintetiza el renderizado neuronal",
    html: `
      <span class="kicker">Semántica de la escena</span>
      <h2>La IA entiende piel, cabello, metal y contacto</h2>
      <div class="cols" style="grid-template-columns:55fr 45fr;align-items:start;">
        <div class="imgframe" style="min-height:360px;">
          <img src="assets/img_dlss5/sintesis-antes-despues.jpg" alt="Comparativa render base vs DLSS 5">
        </div>
        <div>
          <ul class="ticks" style="margin-top:0;">
            <li><b>1 · Subsurface scattering</b> — translucidez en piel</li>
            <li><b>2 · Cabello y tela</b> — brillo y transmisión</li>
            <li><b>3 · Microreflejos</b> — superficies metálicas</li>
            <li><b>4 · Sombras de contacto / AO</b> — precisión en oquedades</li>
          </ul>
          <div class="band" style="margin-top:1.4rem;"><b>Regla de oro:</b> mejor escena base (path tracing &gt; rasterización) = salida neuronal más fiel.</div>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "La maduración de DLSS 5 en 2026",
    html: `
      <span class="kicker">De la polémica a la optimización</span>
      <h2>Marzo → noviembre de 2026</h2>
      <div class="timeline htimeline">
        <div class="hnode mg">
          <span class="date">Mar 2026</span>
          <div class="fig">2× RTX 5090</div>
          <span class="ctx">Demo inicial y polémica</span>
        </div>
        <div class="hnode">
          <span class="date">Jul 2026</span>
          <div class="fig">1× GPU + controles</div>
          <span class="ctx">Ajuste por escena / personaje</span>
        </div>
        <div class="hnode">
          <span class="date">Sep 2026</span>
          <div class="fig">370 FPS 4K</div>
          <span class="ctx">Debut en NBA 2K27</span>
        </div>
        <div class="hnode">
          <span class="date">Oct 2026</span>
          <div class="fig">−24% params · 1,4× FPS</div>
          <span class="ctx">Modelo optimizado</span>
        </div>
        <div class="hnode mg">
          <span class="date">Nov 2026</span>
          <div class="fig">4 juegos + RTX Spark</div>
          <span class="ctx">Expansión de catálogo</span>
        </div>
      </div>
      <!-- Miniaturas opcionales sobre hitos: logo GTC (mar), portada NBA 2K27 (sep),
           collage Hogwarts Legacy / Where Winds Meet (nov) en assets/img_dlss5/ -->`
  },

  {
    type: "content",
    title: "Debate 1 · fotogramas falsos y latencia",
    html: `
      <span class="kicker">Debate crítico · 1 de 4</span>
      <h2>"Fotogramas falsos" y la latencia real</h2>
      <div class="cols c2">
        <div>
          <div class="bars">
            <div class="bar-row">
              <div class="lbl"><span>Frametime visual <b>30 FPS → 120 (MFG 4×)</b></span></div>
              <div class="bar-track"><div class="bar-fill good" style="width:25%;">33 ms → 8,3 ms</div></div>
            </div>
            <div class="bar-row">
              <div class="lbl"><span>Latencia clic-a-pantalla <b>sigue alta</b></span></div>
              <div class="bar-track"><div class="bar-fill bad" style="width:80%;">~60 ms</div></div>
            </div>
          </div>
          <p class="note">Verde: fluidez aparente que gana el MFG. Rojo: la respuesta real a tus controles apenas cambia.</p>
        </div>
        <div>
          <ul class="ticks" style="margin-top:0;">
            <li><b>Base mínima:</b> 50–60 FPS nativos</li>
            <li><b>Monitores 360 Hz+:</b> ~90 FPS base</li>
            <li><b>Competitivos:</b> desactivar FG / MFG</li>
          </ul>
        </div>
      </div>
      <div class="punch"><span class="hl">FPS visuales</span> ≠ <span class="hl-m">latencia de entrada</span></div>`
  },

  {
    type: "content",
    title: "Debate 2 · exclusividad vs hardware",
    html: `
      <span class="kicker">Debate crítico · 2 de 4</span>
      <h2>¿Barrera física o segmentación?</h2>
      <table class="tbl matrix">
        <thead>
          <tr><th>Generación</th><th>Frame Gen</th><th>Multi-Frame Gen</th><th>DLSS 5</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><b>RTX 20 / 30</b></td>
            <td><span class="mod">OptiScaler (Mod)</span></td>
            <td><span class="mod">OptiScaler (Mod)</span></td>
            <td><span class="mod">OptiScaler (Mod)</span></td>
          </tr>
          <tr>
            <td><b>RTX 40</b></td>
            <td>nativo</td>
            <td><span class="mod">OptiScaler (Mod)</span></td>
            <td><span class="mod">OptiScaler (Mod)</span></td>
          </tr>
          <tr>
            <td><b>RTX 50</b></td>
            <td>nativo</td>
            <td>nativo</td>
            <td>nativo</td>
          </tr>
        </tbody>
      </table>
      <p class="punch" style="font-size:clamp(1.05rem,2vw,1.4rem);margin-top:1.4rem;">¿Limitación física del silicio o <span class="hl-m">segmentación comercial</span>?</p>`
  },

  {
    type: "content",
    title: "Debate 3 · laboratorio vs mundo real",
    html: `
      <span class="kicker">Debate crítico · 3 de 4</span>
      <h2>Fabricante vs. mediciones independientes</h2>
      <div class="cols" style="grid-template-columns:1.6fr 1fr;align-items:start;">
        <div class="bars">
          <div class="bar-row">
            <div class="lbl"><span>DLSS 5 Oct · <b>Marketing NVIDIA</b></span><span>velocidad interna</span></div>
            <div class="bar-track"><div class="bar-fill mk" style="width:100%;">2,0×</div></div>
          </div>
          <div class="bar-row">
            <div class="lbl"><span>DLSS 5 Oct · <b>Medición independiente</b></span><span>FPS reales</span></div>
            <div class="bar-track"><div class="bar-fill real" style="width:70%;">1,4×</div></div>
          </div>
          <div class="bar-row">
            <div class="lbl"><span>DLSS 4 · <b>Promesa de salto</b></span><span>marketing</span></div>
            <div class="bar-track"><div class="bar-fill mk" style="width:100%;">"gran salto"</div></div>
          </div>
          <div class="bar-row">
            <div class="lbl"><span>DLSS 4 · <b>Gamers Nexus</b></span><span>cuadros reales</span></div>
            <div class="bar-track"><div class="bar-fill real" style="width:12%;">+5,1%</div></div>
          </div>
        </div>
        <div class="card mg">
          <h3>Alerta</h3>
          <div class="big">−20%</div>
          <p class="unit">rendimiento en GPUs sin FP8 (medido por la comunidad)</p>
        </div>
      </div>
      <p class="note">Auditar siempre qué se mide: inferencia interna vs. fotogramas finales.</p>`
  },

  {
    type: "content",
    title: "Debate 4 · intención artística vs IA",
    html: `
      <span class="kicker">Debate crítico · 4 de 4</span>
      <h2>¿La IA respeta la visión del estudio?</h2>
      <div class="triptych">
        <figure class="imgframe" style="min-height:150px;"><img src="assets/img_dlss5/arte-original.webp" alt="Escena original del estudio"></figure>
        <span class="arrow">→</span>
        <figure class="imgframe" style="min-height:150px;"><img src="assets/img_dlss5/arte-mascara.webp" alt="Mapa de máscara semántica por colores"></figure>
        <span class="arrow">→</span>
        <figure class="imgframe" style="min-height:150px;"><img src="assets/img_dlss5/arte-iluminado.webp" alt="Iluminación IA respetando el estilo"></figure>
      </div>
      <div class="standoff">
        <div class="card accent">
          <h3 class="hl">A favor</h3>
          <ul class="ticks" style="margin-top:.5rem;">
            <li>Conserva geometría 3D</li>
            <li>Control por máscaras</li>
            <li>Preferido en pruebas ciegas</li>
          </ul>
        </div>
        <div class="card mg">
          <h3 class="hl-m">El debate</h3>
          <ul class="ticks" style="margin-top:.5rem;">
            <li>Riesgo de homogeneización</li>
            <li>Autoría de la iluminación</li>
          </ul>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "Comparación interactiva · sin IA vs con IA",
    html: `
      <span class="kicker">Antes / después · arrastra el control</span>
      <h2>Escena base vs. iluminación neuronal</h2>
      <div class="ics" data-ics>
        <div class="ics-img ics-before">
          <img src="assets/img_dlss5/arte-original.webp" alt="Escena de juego sin efectos de IA (Antes)">
        </div>
        <div class="ics-img ics-after" data-ics-after>
          <img src="assets/img_dlss5/arte-iluminado.webp" alt="Escena de juego con iluminación neuronal (Después)">
        </div>
        <div class="ics-line" data-ics-line>
          <button class="ics-handle" type="button" aria-label="Arrastrar para comparar" data-ics-handle>
            <span>&#9664;</span><span>&#9654;</span>
          </button>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "Ventajas y limitaciones",
    html: `
      <span class="kicker">Balance</span>
      <h2>Lo que gana y lo que cuesta</h2>
      <div class="cols c2">
        <div class="card accent">
          <h3 class="hl">Ventajas</h3>
          <ul class="ticks" style="margin-top:.6rem;">
            <li><b>4K ray tracing jugable</b></li>
            <li><b>Calidad superior a la nativa</b></li>
            <li><b>Presets ajustables</b></li>
            <li><b>~80% adopción RTX</b></li>
          </ul>
        </div>
        <div class="card mg">
          <h3 class="hl-m">Limitaciones</h3>
          <ul class="ticks" style="margin-top:.6rem;">
            <li><b>Exclusivo Tensor Cores</b></li>
            <li><b>Alto coste en DLSS 4.5/5</b></li>
            <li><b>Dependiente del estudio</b></li>
            <li><b>Ghosting ocasional</b></li>
          </ul>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "Cuatro paradigmas, una línea de tiempo",
    html: `
      <span class="kicker">Síntesis</span>
      <h2>La evolución en un vistazo</h2>
      <div class="stair">
        <div class="stp">
          <span class="yr">2018–19 · DLSS 1</span>
          <h3>Escalado espacial</h3>
          <p>CNN por juego · 1 cuadro → upscale</p>
        </div>
        <div class="stp">
          <span class="yr">2020 · DLSS 2</span>
          <h3>Reconstrucción temporal</h3>
          <p>+ historial temporal → imagen estable</p>
        </div>
        <div class="stp">
          <span class="yr">2022–25 · DLSS 3–4.5</span>
          <h3>Síntesis de cuadros y rayos</h3>
          <p>OFA / Transformer → cuadros sintéticos</p>
        </div>
        <div class="stp">
          <span class="yr">2026 · DLSS 5</span>
          <h3>Render neuronal generativo</h3>
          <p>Difusión → relighting 3D</p>
        </div>
      </div>
      <div class="band" style="margin-top:1.2rem;"><b>Conclusión:</b> De escalar píxeles a sintetizar iluminación en tiempo real.</div>
      <div class="challenge-row" style="margin-top:1rem;">
        <span class="ch">Coste computacional</span>
        <span class="ch">Barrera de hardware</span>
        <span class="ch">Métricas honestas</span>
      </div>
      <p class="open-q" style="margin-top:1rem;">¿Dónde trazamos el límite entre <span class="hl">optimización gráfica</span> y <span class="hl-m">autoría artística</span>?</p>`
  },

  {
    type: "cover",
    title: "Gracias · Fuentes",
    html: `
      <div class="cols" style="grid-template-columns:40fr 60fr;align-items:center;">
        <div>
          <div class="eyebrow">Fin de la presentación</div>
          <h1 class="grad">Gracias</h1>
          <p class="sub">Preguntas y discusión.</p>
        </div>
        <div class="cols c2" style="margin-top:0;">
          <div class="card accent">
            <h3 class="hl">Fuentes oficiales</h3>
            <ul class="ticks" style="margin-top:.5rem;">
              <li>NVIDIA Developer Blog</li>
              <li>GTC · GeForce News</li>
              <li>Research ADLR</li>
            </ul>
          </div>
          <div class="card mg">
            <h3 class="hl-m">Benchmarks independientes</h3>
            <ul class="ticks" style="margin-top:.5rem;">
              <li>Digital Foundry</li>
              <li>Gamers Nexus</li>
              <li>TechPowerUp</li>
            </ul>
          </div>
        </div>
      </div>`
  }
];
