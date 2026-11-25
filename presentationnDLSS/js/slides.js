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
      <p class="lead">DLSS 2.0, DLAA, la generación de fotogramas de DLSS 3.0 y la
      reconstrucción de rayos de DLSS 3.5.</p>`
  },

  {
    type: "content",
    title: "DLSS 2.0 · reconstrucción temporal",
    html: `
      <span class="kicker">Abr 2020 · rediseño total</span>
      <h2>DLSS 2.0 · recuperar, no inventar</h2>
      <div class="cols side">
        <div>
          <p class="body">Rediseño completo, incompatible con 1.0. En lugar de escalar un cuadro
          aislado, implementa una forma de <b>TAAU</b> (Temporal Anti-Aliasing Upsampling)
          acelerada por IA.</p>
          <p class="body" style="margin-top:1rem;">La clave: el motor aplica pequeños
          <span class="hl">desplazamientos subpíxel</span> entre fotogramas para capturar muestras
          distintas de la misma escena. La IA acumula información <b>real a lo largo del tiempo</b>
          en vez de inventarla.</p>
        </div>
        <div class="card accent">
          <h3>Cuatro entradas del motor</h3>
          <ul class="ticks" style="margin-top:.6rem;">
            <li>Fotograma bruto a baja resolución</li>
            <li>Vectores de movimiento</li>
            <li>Buffers de profundidad</li>
            <li>Exposición / brillo</li>
          </ul>
        </div>
      </div>
      <div class="cols c3" style="margin-top:1.4rem;">
        <div class="card"><div class="big">1</div><p>modelo único genérico — se acabó el entrenamiento por juego</p></div>
        <div class="card"><div class="big">1–2 ms</div><p>coste por fotograma, frente a 2–4 ms de DLSS 1.0</p></div>
        <div class="card"><div class="big">DLAA</div><p>la misma red al 100% de resolución nativa: antialiasing por IA sin escalar</p></div>
      </div>`
  },

  {
    type: "content",
    title: "TAA clásico vs. DLSS 2.0",
    html: `
      <span class="kicker">Por qué fue un salto</span>
      <h2>La red decide qué historia conservar</h2>
      <div class="versus">
        <div class="card">
          <h3 class="hl-m">TAA convencional</h3>
          <p>Usa reglas manuales como el <span class="mono">neighborhood clamping</span> para
          descartar píxeles históricos que no concuerdan. Tiende a <b>emborronar</b> la imagen.</p>
        </div>
        <div class="vs">VS</div>
        <div class="card accent">
          <h3 class="hl">DLSS 2.0</h3>
          <p>La red neuronal <b>distingue</b> qué datos temporales conservar y cuáles descartar.
          A menudo iguala o supera la nitidez del render nativo con TAA.</p>
        </div>
      </div>
      <p class="note">Condición: el desarrollador debe aplicar un sesgo de mip-map negativo
      para cargar texturas de alta resolución y aprovechar el detalle recuperado.</p>`
  },

  {
    type: "content",
    title: "DLSS 3.0 · generación de fotogramas",
    html: `
      <span class="kicker">Sep 2022 · Ada Lovelace (RTX 40)</span>
      <h2>DLSS 3.0 · inventar fotogramas enteros</h2>
      <p class="body">Introduce <b>Frame Generation</b>: toma dos fotogramas renderizados e
      <b>interpola con IA un fotograma completo intermedio</b> (modo 2×).</p>
      <div class="pipe">
        <div class="pipe-step"><span class="n">frame N</span><h4>Render real</h4><p>El motor rasteriza el fotograma.</p></div>
        <div class="pipe-step ai"><span class="n">IA + OFA</span><h4>Fotograma generado</h4><p>Se interpola un cuadro intermedio con el Acelerador de Flujo Óptico.</p></div>
        <div class="pipe-step"><span class="n">frame N+1</span><h4>Render real</h4><p>Siguiente fotograma rasterizado.</p></div>
      </div>
      <div class="cols c2" style="margin-top:1.4rem;">
        <div class="card">
          <h3>Optical Flow Accelerator (OFA)</h3>
          <p>Hardware dedicado en las RTX 40 que calcula el movimiento de elementos que los
          vectores geométricos no describen: sombras, reflejos, partículas. Por esta dependencia,
          Frame Generation quedó <b>exclusivo de RTX 40+</b>.</p>
        </div>
        <div class="card mg">
          <h3>El coste: latencia</h3>
          <p>Interpolar añade retraso de entrada. NVIDIA lo vincula con <b>Reflex</b> para
          sincronizar CPU y GPU, vaciar la cola de render y mitigar ese aumento de latencia.</p>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "DLSS 3.5 · Ray Reconstruction",
    html: `
      <span class="kicker">Sep 2023 · todas las RTX</span>
      <h2>DLSS 3.5 · un denoiser de IA para ray tracing</h2>
      <div class="cols side">
        <div>
          <p class="body">En juegos con trazado de rayos intensivo o path tracing, el motor traza
          pocos rayos por píxel y depende de varios <b>denoisers ajustados a mano</b> que
          difuminan reflejos o provocan parpadeos.</p>
          <p class="body" style="margin-top:1rem;"><b>Ray Reconstruction</b> reemplaza todos esos
          filtros por un <span class="hl">único modelo de IA</span>, entrenado con 5× más datos
          que DLSS 3, que genera píxeles mucho más estables entre los rayos muestreados.</p>
          <div class="pills">
            <span class="pill on">Cyberpunk 2077: Phantom Liberty</span>
            <span class="pill on">Alan Wake 2</span>
            <span class="pill on">Portal with RTX</span>
          </div>
        </div>
        <div class="card accent">
          <h3>Compatibilidad amplia</h3>
          <p>Al ser solo procesamiento de imagen (no requiere OFA), funciona en
          <b>toda la línea RTX, de la serie 20 en adelante</b>.</p>
        </div>
      </div>`
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
      </div>
      <div data-demo="attention"></div>`
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
      </div>
      <div data-demo="mfg"></div>`
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
      <div data-demo="fp8"></div>
      <p class="note">Reflex 2 con Frame Warp se anunció en ene 2025 (promesa: −75% de latencia reproyectando
      el fotograma según la última lectura del ratón), pero sigue sin lanzarse en ningún juego comercial.</p>`
  },

  {
    type: "content",
    title: "Matriz de compatibilidad por generación",
    html: `
      <span class="kicker">Qué corre en cada GPU</span>
      <h2>Compatibilidad de funciones por hardware</h2>
      <div data-demo="compat"></div>
      <p class="note">Nintendo Switch 2 (jun 2025) fue la primera consola con DLSS integrado, vía SoC NVIDIA Tegra T239 "Drake".</p>`
  },

  {
    type: "content",
    title: "Comparativa: DLSS vs FSR vs XeSS",
    html: `
      <span class="kicker">La competencia en 2026</span>
      <h2>DLSS 4.5 / 5 · AMD FSR 4.1 · Intel XeSS 2/3</h2>
      <div data-demo="rivals"></div>
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
      <h2>DLSS 5, los debates críticos<br>y el estado actual</h2>
      <p class="lead">El renderizado neuronal guiado en 3D, la polémica de marzo a noviembre,
      los "fotogramas falsos" y la intención artística.</p>`
  },

  {
    type: "content",
    title: "DLSS 5 · qué es (y qué no es)",
    html: `
      <span class="kicker">16 mar 2026 · GTC · "el momento GPT de los gráficos"</span>
      <h2>DLSS 5 · renderizado neuronal guiado en 3D</h2>
      <div class="cols side">
        <div>
          <p class="body"><b>No es</b> un escalador de resolución ni un generador de fotogramas.
          Es una <span class="hl-m">etapa de renderizado generativo</span> al final del pipeline:
          mejora iluminación, sombreado y materiales <b>sin sustituir</b> la rasterización, el ray
          tracing ni el path tracing.</p>
          <p class="body" style="margin-top:1rem;">Técnicamente, un <b>modelo de difusión en espacio
          de píxeles de un solo paso</b> (one-step pixel-space diffusion). Su inferencia es
          <b>causal, determinista y fotograma a fotograma</b> (one-frame-in, one-frame-out) en
          tiempo real hasta 4K.</p>
        </div>
        <div class="card mg">
          <h3>Cuatro condicionantes por cuadro</h3>
          <ol class="num-list" style="margin-top:.6rem;">
            <li>Fotograma de color recién renderizado</li>
            <li>Vectores de movimiento del motor</li>
            <li>Estado temporal de cuadros previos (coherencia)</li>
            <li>Dirección artística del estudio (tono, estructura, máscaras semánticas)</li>
          </ol>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "Qué sintetiza el renderizado neuronal",
    html: `
      <span class="kicker">Semántica de la escena</span>
      <h2>La IA entiende piel, cabello, tela, metal, agua</h2>
      <p class="body">Anclado a la geometría 3D de la escena, el modelo sintetiza fenómenos ópticos
      difíciles de simular en tiempo real:</p>
      <div class="cols c3" style="margin-top:1.4rem;">
        <div class="card"><h3>Dispersión subsuperficial</h3><p>Calidez de la piel bajo focos, translucidez en orejas (subsurface scattering).</p></div>
        <div class="card"><h3>Luz en el cabello</h3><p>Transmisión de luz a través de los mechones y brillo fino en tejidos.</p></div>
        <div class="card"><h3>Microreflejos</h3><p>Reflejos sutiles sobre metales y superficies.</p></div>
        <div class="card"><h3>Sombras de contacto</h3><p>Bordes de sombra más definidos donde los objetos se tocan.</p></div>
        <div class="card"><h3>Oclusión ambiental</h3><p>Sombras suaves en oquedades, refinadas por la red.</p></div>
        <div class="card accent"><h3>Regla de oro</h3><p>Cuanto mejor sea la escena base (path tracing &gt; rasterización simple), más fiel es la salida neuronal.</p></div>
      </div>`
  },

  {
    type: "content",
    title: "La maduración de DLSS 5 en 2026",
    html: `
      <span class="kicker">De la polémica a la optimización</span>
      <h2>Marzo → noviembre de 2026</h2>
      <div class="timeline">
        <div class="tl-row mg"><div class="tl-year">Mar 2026</div><div class="tl-body"><h3>Anuncio y controversia</h3><p>Las demos requerían <b>dos RTX 5090 en paralelo</b> (una para el juego, otra para el modelo). Temor de los jugadores a que la IA distorsione el arte original.</p></div></div>
        <div class="tl-row"><div class="tl-year">Jul 2026</div><div class="tl-body"><h3>SIGGRAPH</h3><p>Versiones que corren en <b>una sola GPU</b> y controles granulares por escena/personaje para preservar la intención artística.</p></div></div>
        <div class="tl-row"><div class="tl-year">3 Sep 2026</div><div class="tl-body"><h3>Debut comercial · NBA 2K27</h3><p>Primer juego con DLSS 5. NVIDIA reporta hasta <b>370 FPS a 4K</b> Ultra con ray tracing en una RTX 5090 con toda la suite.</p></div></div>
        <div class="tl-row"><div class="tl-year">13 Oct 2026</div><div class="tl-body"><h3>Modelo optimizado</h3><p>Huella −24% (≈118M parámetros), −20% de VRAM en 4K y modelo <b>2× más rápido</b> internamente. Pero eso no son 2× FPS: la ganancia real en NBA 2K27 fue hasta <b>1,4×</b>.</p></div></div>
        <div class="tl-row"><div class="tl-year">Nov 2026</div><div class="tl-body"><h3>Más juegos</h3><p>RTX Remix, Hogwarts Legacy, War Thunder (Eagle's Shadow) y Where Winds Meet. Soporte: RTX 50, portátiles RTX Spark y GeForce NOW.</p></div></div>
      </div>`
  },

  {
    type: "content",
    title: "Debate 1 · fotogramas falsos y latencia",
    html: `
      <span class="kicker">Debate crítico · 1 de 4</span>
      <h2>"Fotogramas falsos" y la latencia real</h2>
      <div class="cols side">
        <div>
          <p class="body">Multiplicar cuadros con Frame Generation o MFG <b>suaviza el movimiento
          visual</b>, pero <b>no acelera la simulación lógica</b> del juego ni la respuesta a los
          controles.</p>
          <ul class="ticks">
            <li>No corrige tasas base bajas: no conviertas 30 FPS en una experiencia de 120 FPS "real".</li>
            <li>Se recomienda partir de <b>50–60 FPS nativos</b> (o ~90 para monitores de 360–480 Hz+).</li>
            <li>Desactivarlo en <b>juegos competitivos</b>, donde la latencia mínima manda.</li>
          </ul>
        </div>
        <div class="card accent">
          <h3>La métrica honesta</h3>
          <p>FPS mostrados ≠ FPS con los que el juego responde a tu ratón. Una presentación seria
          debe precisar <b>qué se está midiendo</b>: cuadros reales, cuadros generados o latencia de entrada.</p>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "Debate 2 · exclusividad vs hardware",
    html: `
      <span class="kicker">Debate crítico · 2 de 4</span>
      <h2>¿Barrera física o segmentación comercial?</h2>
      <div class="cols side">
        <div>
          <p class="body">Cuando DLSS 3 salió exclusivo de RTX 40, NVIDIA lo justificó por el
          hardware <b>OFA</b>. Pero en DLSS 4 el flujo óptico se movió a los Tensor Cores…</p>
          <p class="body" style="margin-top:1rem;">…y aparecieron mods no oficiales (como
          <span class="mono">OptiScaler</span>) capaces de ejecutar Frame Generation, MFG e incluso
          DLSS 5 en RTX 20, 30 y 40 (con fuerte pérdida de FPS).</p>
        </div>
        <div class="card mg">
          <h3>La pregunta abierta</h3>
          <p>Si los mods lo logran (aunque con penalización), ¿qué límites son <b>estrictamente
          físicos</b> y cuáles responden a <b>segmentación de producto</b>? La comunidad no deja de
          cuestionarlo.</p>
        </div>
      </div>`
  },

  {
    type: "content",
    title: "Debate 3 · laboratorio vs mundo real",
    html: `
      <span class="kicker">Debate crítico · 3 de 4</span>
      <h2>Las cifras del fabricante vs. las independientes</h2>
      <div class="cols c3">
        <div class="card">
          <div class="big">−20%</div>
          <p>Penalización del Transformer de DLSS 4.5 en GPU sin FP8, medida por la comunidad — no por NVIDIA.</p>
        </div>
        <div class="card mg">
          <div class="big">2× ≠ 2×</div>
          <p>El modelo de octubre de DLSS 5 es "2× más rápido" <b>internamente</b>, pero eso se traduce en hasta <b>1,4× FPS</b> en el juego.</p>
        </div>
        <div class="card">
          <div class="big">+5,1%</div>
          <p>Mejora de cuadros reales de DLSS 4 (RTX 5090) según Gamers Nexus, lejos de los saltos de marketing.</p>
        </div>
      </div>
      <p class="note">Moraleja: toda exposición seria debe aclarar qué se mide exactamente antes de citar un número.</p>`
  },

  {
    type: "content",
    title: "Debate 4 · intención artística vs IA",
    html: `
      <span class="kicker">Debate crítico · 4 de 4</span>
      <h2>¿La IA respeta la visión del estudio?</h2>
      <div class="cols side">
        <div>
          <p class="body">DLSS 5 reavivó la discusión sobre <b>automatización por IA frente a la
          intención artística</b>. ¿Puede una red neuronal "repintar" la iluminación sin traicionar
          el estilo que diseñó el estudio?</p>
          <p class="body" style="margin-top:1rem;">La respuesta de NVIDIA: priorizar
          <span class="hl">máscaras semánticas</span> y <span class="hl">controles de tono</span>
          para que la iluminación neuronal respete la estética de cada juego.</p>
        </div>
        <div class="card accent">
          <h3>El argumento a favor</h3>
          <p>El modelo solo añade efectos de luz sobre geometrías ya definidas, sin cambiar formas
          ni posiciones. En pruebas ciegas, parte del público <b>prefirió</b> la imagen con IA.
          Pero el debate purista sigue abierto.</p>
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
            <li>Aumento notable de FPS: 4K con ray tracing jugable.</li>
            <li>Mejor calidad: elimina aliasing, a veces supera a la nativa.</li>
            <li>Presets ajustables (calidad / equilibrio / rendimiento).</li>
            <li>Estándar de facto: ~80% de usuarios RTX lo activan; miles de juegos.</li>
          </ul>
        </div>
        <div class="card mg">
          <h3 class="hl-m">Limitaciones</h3>
          <ul class="ticks" style="margin-top:.6rem;">
            <li>Solo hardware NVIDIA con Tensor Cores.</li>
            <li>DLSS 4.5/5 consumen mucho; en GPU modestas el beneficio es marginal.</li>
            <li>Depende de que el estudio integre y calibre bien la tecnología.</li>
            <li>Artefactos menores y ghosting ocasional según la escena.</li>
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
      <div class="timeline">
        <div class="tl-row"><div class="tl-year">2018–19</div><div class="tl-body"><h3>Escalado espacial</h3><p>DLSS 1.0: CNN, un fotograma, entrenamiento por juego. El caso "1.9" como puente.</p></div></div>
        <div class="tl-row"><div class="tl-year">2020</div><div class="tl-body"><h3>Reconstrucción temporal</h3><p>DLSS 2.0 + DLAA: modelo genérico, acumulación temporal, 1–2 ms.</p></div></div>
        <div class="tl-row"><div class="tl-year">2022–25</div><div class="tl-body"><h3>Síntesis de fotogramas y rayos</h3><p>DLSS 3.0 (Frame Gen + OFA), 3.5 (Ray Reconstruction), 4.0/4.5 (Transformer + MFG hasta 6×).</p></div></div>
        <div class="tl-row mg"><div class="tl-year">2026</div><div class="tl-body"><h3>Renderizado neuronal generativo</h3><p>DLSS 5: difusión de un paso que añade iluminación y materiales fotorrealistas.</p></div></div>
      </div>`
  },

  {
    type: "content",
    title: "Conclusión",
    html: `
      <span class="kicker">Cierre</span>
      <h2 class="grad">De promesa experimental<br>a pilar del render moderno</h2>
      <div class="cols side">
        <div>
          <ul class="ticks">
            <li>DLSS pasó de <b>escalar un fotograma</b> entrenado por juego a un <b>ecosistema</b> de reconstrucción, generación y síntesis neuronal.</li>
            <li>Hasta 4.5 persigue <b>rendimiento</b>; DLSS 5 invierte la lógica y busca <b>fidelidad</b>.</li>
            <li>El reto hoy: coste computacional, dependencia del hardware más nuevo y <b>honestidad en las métricas</b>.</li>
            <li>El futuro: gráficos donde la <b>IA es parte estándar del pipeline</b>.</li>
          </ul>
        </div>
        <div class="card accent">
          <h3>La frase de Jensen Huang</h3>
          <p style="font-size:1.1rem;line-height:1.5;">"El momento GPT para los gráficos."</p>
          <p style="margin-top:.8rem;">DLSS 5 no cierra la historia: abre la era del renderizado neuronal en tiempo real.</p>
        </div>
      </div>`
  },

  {
    type: "cover",
    title: "Gracias · Fuentes",
    html: `
      <div class="eyebrow">Fin de la presentación</div>
      <h1 class="grad">Gracias</h1>
      <p class="sub">Preguntas y discusión.</p>
      <div class="meta" style="flex-direction:column;gap:.5rem;align-items:flex-start;">
        <span>Fuentes principales: <b>NVIDIA</b> (GeForce News, Developer Blog, Research ADLR), <b>Wikipedia</b>, <b>TechPowerUp</b>, <b>Gamers Nexus</b>, <b>Tom's Hardware</b>, <b>IGN</b></span>
        <span>Comparativas: <b>HyperPC</b>, <b>FlowUP</b>, <b>DropReference</b>, <b>SageTweaks</b>, <b>Digital Foundry</b></span>
        <span>Período cubierto: <b>2018 – noviembre 2026</b></span>
      </div>`
  }
];
