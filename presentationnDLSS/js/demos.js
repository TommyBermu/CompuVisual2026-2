/*
  demos.js
  --------
  Demos interactivas del Capítulo 3 (Integrante 3).
  Cada demo es una función registrada en DEMOS[nombre] que recibe el
  contenedor <div data-demo="nombre"> y lo rellena. app.js llama a la demo
  cuando su diapositiva se activa, y llama a .destroy() (si existe) al salir.

  Las demos NO usan librerías: canvas 2D + DOM. Están pensadas para EXPLICAR
  visualmente lo que el expositor dice, no como adorno.
*/

export const DEMOS = {};

/* Utilidad: crea un elemento con clases y HTML */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}

/* =========================================================
   DEMO 1 · CNN vs Vision Transformer
   "Pasa el mouse por la imagen": la CNN solo ve un parche
   local; el Transformer resalta zonas relevantes de TODO el
   cuadro (atención). Demuestra la diferencia de contexto.
   ========================================================= */
DEMOS.attention = function (root) {
  root.innerHTML = "";
  const wrap = el("div", "demo demo-attn");
  wrap.innerHTML = `
    <div class="demo-head">
      <span class="demo-tag">Demo interactiva</span>
      <span class="demo-hint">Mové el cursor (o el dedo) sobre la escena</span>
    </div>
    <div class="attn-grid">
      <figure><figcaption>Red convolucional · <b>parche local</b></figcaption><canvas data-k="cnn"></canvas></figure>
      <figure><figcaption>Vision Transformer · <b>atención global</b></figcaption><canvas data-k="vit"></canvas></figure>
    </div>
    <p class="demo-foot">La CNN solo "razona" con los píxeles vecinos; el Transformer pondera
    píxeles relevantes de toda la imagen (bordes finos: cables, rejas, aspas).</p>`;
  root.appendChild(wrap);

  const cCnn = wrap.querySelector('[data-k="cnn"]');
  const cVit = wrap.querySelector('[data-k="vit"]');
  const w = 440, h = 250;
  [cCnn, cVit].forEach((c) => { c.width = w; c.height = h; });
  const gC = cCnn.getContext("2d"), gV = cVit.getContext("2d");

  // "Escena" sintética: líneas finas (cables/rejas) donde el detalle importa.
  const edges = [];
  for (let i = 0; i < 26; i++) {
    edges.push({ x: 20 + i * 16, kind: "v" });
  }
  const diag = [];
  for (let i = 0; i < 14; i++) diag.push(i * 22);

  function scene(g) {
    g.fillStyle = "#0b1220";
    g.fillRect(0, 0, w, h);
    // rejilla fina (donde la CNN falla con ghosting)
    g.strokeStyle = "rgba(120,140,180,.5)";
    g.lineWidth = 1;
    edges.forEach((e) => {
      g.beginPath(); g.moveTo(e.x, 30); g.lineTo(e.x, h - 30); g.stroke();
    });
    // aspas / diagonales
    g.strokeStyle = "rgba(90,200,255,.55)";
    diag.forEach((d) => {
      g.beginPath(); g.moveTo(d, h); g.lineTo(d + 120, 0); g.stroke();
    });
  }

  let mx = w * 0.5, my = h * 0.5, raf;
  function draw() {
    // CNN: oscurece todo salvo un parche cuadrado alrededor del cursor
    scene(gC);
    gC.fillStyle = "rgba(7,9,15,.78)";
    gC.fillRect(0, 0, w, h);
    const r = 46;
    gC.save();
    gC.beginPath();
    gC.rect(mx - r, my - r, r * 2, r * 2);
    gC.clip();
    scene(gC);
    gC.restore();
    gC.strokeStyle = "#ff5db1";
    gC.lineWidth = 2;
    gC.strokeRect(mx - r, my - r, r * 2, r * 2);

    // Transformer: resalta el punto + "atiende" a bordes lejanos relevantes
    scene(gV);
    gV.fillStyle = "rgba(7,9,15,.55)";
    gV.fillRect(0, 0, w, h);
    // halo local
    const g1 = gV.createRadialGradient(mx, my, 2, mx, my, 70);
    g1.addColorStop(0, "rgba(58,214,196,.55)");
    g1.addColorStop(1, "rgba(58,214,196,0)");
    gV.fillStyle = g1;
    gV.fillRect(0, 0, w, h);
    // líneas de atención hacia bordes finos distantes
    gV.strokeStyle = "rgba(58,214,196,.5)";
    gV.lineWidth = 1;
    const targets = [[40, 60], [w - 50, 70], [w - 70, h - 50], [70, h - 60], [w * .5, 40]];
    targets.forEach((t, i) => {
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / 600 + i));
      gV.globalAlpha = pulse;
      gV.beginPath(); gV.moveTo(mx, my); gV.lineTo(t[0], t[1]); gV.stroke();
      gV.fillStyle = "#3ad6c4";
      gV.beginPath(); gV.arc(t[0], t[1], 3, 0, 7); gV.fill();
    });
    gV.globalAlpha = 1;
    raf = requestAnimationFrame(draw);
  }

  function move(e) {
    const rect = cVit.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    const scaleX = w / rect.width, scaleY = h / rect.height;
    mx = Math.max(0, Math.min(w, (src.clientX - rect.left) * scaleX));
    my = Math.max(0, Math.min(h, (src.clientY - rect.top) * scaleY));
  }
  [cCnn, cVit].forEach((c) => {
    c.addEventListener("pointermove", move);
    c.addEventListener("touchmove", move, { passive: true });
  });
  draw();

  return { destroy() { cancelAnimationFrame(raf); } };
};

/* =========================================================
   DEMO 2 · Multi Frame Generation
   Slider de multiplicador: muestra cuántos cuadros son
   REALES (azul) y cuántos GENERADOS (magenta), el ratio de
   píxeles sintetizados y la diferencia FPS vistos vs. reales.
   Este es el núcleo conceptual del bloque.
   ========================================================= */
DEMOS.mfg = function (root) {
  root.innerHTML = "";
  const modes = [
    { k: "Off", mult: 1, label: "Sin Frame Gen" },
    { k: "2×", mult: 2, label: "DLSS 3 · Frame Gen" },
    { k: "3×", mult: 3, label: "DLSS 4 · MFG" },
    { k: "4×", mult: 4, label: "DLSS 4 · MFG" },
    { k: "6×", mult: 6, label: "DLSS 4.5 · MFG dinámico" },
  ];
  let idx = 3; // arranca en 4×
  const base = 60; // FPS reales base (cuadros renderizados)

  const wrap = el("div", "demo demo-mfg");
  wrap.innerHTML = `
    <div class="demo-head">
      <span class="demo-tag">Demo interactiva</span>
      <span class="demo-hint">Elegí el multiplicador y observá qué es real y qué es IA</span>
    </div>
    <div class="mfg-modes"></div>
    <div class="mfg-stage"><canvas></canvas></div>
    <div class="mfg-stats"></div>
    <p class="demo-foot">Los cuadros <b class="c-real">reales</b> fijan la latencia (tu ratón responde a esa velocidad);
    los <b class="c-gen">generados</b> solo suavizan lo que ves. Más multiplicador = más fluidez visual, misma respuesta.</p>`;
  root.appendChild(wrap);

  const modesEl = wrap.querySelector(".mfg-modes");
  const statsEl = wrap.querySelector(".mfg-stats");
  const canvas = wrap.querySelector("canvas");
  canvas.width = 720; canvas.height = 90;
  const g = canvas.getContext("2d");

  modes.forEach((m, i) => {
    const b = el("button", "mfg-btn" + (i === idx ? " on" : ""), `${m.k}`);
    b.addEventListener("click", () => { idx = i; render(); });
    modesEl.appendChild(b);
  });

  let raf, t = 0;
  function render() {
    [...modesEl.children].forEach((b, i) => b.classList.toggle("on", i === idx));
    const m = modes[idx];
    const shown = base * m.mult;
    const genPerReal = m.mult - 1;
    // Ratio de píxeles tipo NVIDIA: con 4x -> 15/16 ; con 6x -> 23/24
    const ratioMap = { 1: "0 de 1", 2: "1 de 2", 3: "7 de 8", 4: "15 de 16", 6: "23 de 24" };
    statsEl.innerHTML = `
      <div class="stat"><div class="sv c-real">${base}</div><div class="sl">FPS reales<br>(responden al input)</div></div>
      <div class="stat"><div class="sv c-gen">${shown}</div><div class="sl">FPS vistos<br>(fluidez en pantalla)</div></div>
      <div class="stat"><div class="sv">${genPerReal}</div><div class="sl">cuadros generados<br>por cada real</div></div>
      <div class="stat"><div class="sv">${ratioMap[m.mult]}</div><div class="sl">píxeles sintetizados<br>(estimado NVIDIA)</div></div>`;
  }

  function loop() {
    t += 0.016;
    const m = modes[idx];
    g.clearRect(0, 0, canvas.width, canvas.height);
    const cols = 16;
    const cw = canvas.width / cols;
    const scroll = (t * 60) % cw;
    for (let i = -1; i < cols + 2; i++) {
      const groupPos = ((i % m.mult) + m.mult) % m.mult;
      const isReal = groupPos === 0;
      const x = i * cw - scroll;
      g.fillStyle = isReal ? "#41b6ff" : "#ff5db1";
      g.globalAlpha = isReal ? 1 : 0.5;
      g.fillRect(x + 3, 20, cw - 6, 50);
      g.globalAlpha = 1;
      g.fillStyle = isReal ? "#07090f" : "rgba(255,255,255,.9)";
      g.font = "bold 11px JetBrains Mono, monospace";
      g.textAlign = "center";
      g.fillText(isReal ? "R" : "IA", x + cw / 2, 50);
    }
    raf = requestAnimationFrame(loop);
  }

  render();
  loop();
  return { destroy() { cancelAnimationFrame(raf); } };
};

/* =========================================================
   DEMO 3 · FP8: la misma versión, distinto hardware
   Toggle entre generaciones. En RTX 20/30 (sin FP8) el
   modelo de DLSS 4.5 es ~5× más pesado y cae ~20% de FPS.
   ========================================================= */
DEMOS.fp8 = function (root) {
  root.innerHTML = "";
  const gpus = [
    { k: "RTX 20", fp8: false },
    { k: "RTX 30", fp8: false },
    { k: "RTX 40", fp8: true },
    { k: "RTX 50", fp8: true },
  ];
  let idx = 2;
  const wrap = el("div", "demo demo-fp8");
  wrap.innerHTML = `
    <div class="demo-head">
      <span class="demo-tag">Demo interactiva</span>
      <span class="demo-hint">Misma DLSS 4.5, distinto hardware</span>
    </div>
    <div class="fp8-gpus"></div>
    <div class="fp8-bars">
      <div class="barrow"><span>DLSS 4.0 (modelo K)</span><div class="bar"><i data-b="k"></i><em data-l="k"></em></div></div>
      <div class="barrow"><span>DLSS 4.5 (Transformer 2ª gen)</span><div class="bar"><i data-b="t"></i><em data-l="t"></em></div></div>
    </div>
    <div class="fp8-verdict"></div>
    <p class="demo-foot">La "mejor" versión no siempre rinde mejor: sin unidades <b>FP8</b> (RTX 20/30),
    el Transformer de 2ª gen hace ~5× más cálculos y la tasa cae. Ahí conviene quedarse en DLSS 4.0.</p>`;
  root.appendChild(wrap);

  const gpuEl = wrap.querySelector(".fp8-gpus");
  gpus.forEach((gpu, i) => {
    const b = el("button", "fp8-btn" + (i === idx ? " on" : ""), gpu.k);
    b.addEventListener("click", () => { idx = i; render(); });
    gpuEl.appendChild(b);
  });

  const bK = wrap.querySelector('[data-b="k"]'), bT = wrap.querySelector('[data-b="t"]');
  const lK = wrap.querySelector('[data-l="k"]'), lT = wrap.querySelector('[data-l="t"]');
  const verdict = wrap.querySelector(".fp8-verdict");

  function render() {
    [...gpuEl.children].forEach((b, i) => b.classList.toggle("on", i === idx));
    const gpu = gpus[idx];
    const fpsK = 100; // referencia
    const fpsT = gpu.fp8 ? 112 : 80; // con FP8 mejora; sin FP8 cae ~20%
    bK.style.width = "100%";
    bT.style.width = (fpsT / Math.max(fpsK, fpsT) * 100) + "%";
    bT.classList.toggle("down", !gpu.fp8);
    lK.textContent = fpsK + " fps";
    lT.textContent = fpsT + " fps";
    verdict.className = "fp8-verdict " + (gpu.fp8 ? "ok" : "bad");
    verdict.innerHTML = gpu.fp8
      ? `<b>${gpu.k}</b> · tiene FP8 → el Transformer 2ª gen rinde mejor. Usá DLSS 4.5.`
      : `<b>${gpu.k}</b> · sin FP8 → ~20% menos FPS con DLSS 4.5. Mejor conservá DLSS 4.0.`;
  }
  render();
  return {};
};

/* =========================================================
   DEMO 4 · Matriz de compatibilidad interactiva
   Seleccioná una GPU y se resalta qué funciones tenés.
   (Reemplaza visualmente la tabla estática.)
   ========================================================= */
DEMOS.compat = function (root) {
  root.innerHTML = "";
  const feats = ["Super Resolution / DLAA", "Ray Reconstruction", "Frame Gen 2×", "MFG 3×–6×", "DLSS 5"];
  // 2=sí, 1=parcial/mods/planeado, 0=no
  const data = {
    "RTX 20": { v: [1, 2, 0, 0, 0], note: "Turing · SR y RR sí, pero −20% en 4.5 por falta de FP8. Sin Frame Gen ni DLSS 5." },
    "RTX 30": { v: [1, 2, 0, 0, 0], note: "Ampere · igual que 20; Frame Gen/MFG solo vía mods de terceros." },
    "RTX 40": { v: [2, 2, 2, 1, 1], note: "Ada · con FP8 y Frame Gen 2×. MFG limitado a 2×. DLSS 5 planeado, sin fecha." },
    "RTX 50": { v: [2, 2, 2, 2, 2], note: "Blackwell · la gama completa: MFG 6× dinámico y DLSS 5 desde sep 2026." },
    "GeForce NOW": { v: [2, 2, 2, 2, 2], note: "Nube de NVIDIA · acceso según el servidor, incluido DLSS 5 desde sep 2026." },
  };
  let cur = "RTX 50";
  const wrap = el("div", "demo demo-compat");
  wrap.innerHTML = `
    <div class="demo-head">
      <span class="demo-tag">Demo interactiva</span>
      <span class="demo-hint">Elegí una GPU y mirá qué funciones tenés</span>
    </div>
    <div class="compat-gpus"></div>
    <div class="compat-feats"></div>
    <p class="compat-note"></p>`;
  root.appendChild(wrap);

  const gpuEl = wrap.querySelector(".compat-gpus");
  const featEl = wrap.querySelector(".compat-feats");
  const noteEl = wrap.querySelector(".compat-note");
  Object.keys(data).forEach((k) => {
    const b = el("button", "compat-gpu" + (k === cur ? " on" : ""), k);
    b.addEventListener("click", () => { cur = k; render(); });
    gpuEl.appendChild(b);
  });

  function render() {
    [...gpuEl.children].forEach((b) => b.classList.toggle("on", b.textContent === cur));
    const d = data[cur];
    featEl.innerHTML = feats.map((f, i) => {
      const st = d.v[i];
      const cls = st === 2 ? "yes" : st === 1 ? "part" : "no";
      const mark = st === 2 ? "✓" : st === 1 ? "~" : "✕";
      return `<div class="feat ${cls}"><span class="mk">${mark}</span>${f}</div>`;
    }).join("");
    noteEl.innerHTML = d.note;
  }
  render();
  return {};
};

/* =========================================================
   DEMO 5 · DLSS vs FSR vs XeSS (comparador por ejes)
   Botones de eje; barras comparan a los tres competidores.
   ========================================================= */
DEMOS.rivals = function (root) {
  root.innerHTML = "";
  // valores 0..100 ilustrativos según el documento base (no benchmarks exactos)
  const axes = {
    "Calidad de imagen": { DLSS: 95, FSR: 82, XeSS: 84, note: "DLSS suele liderar en nitidez; ganó 6 de 7 juegos en prueba ciega vs FSR 4.1." },
    "Rendimiento (FPS)": { DLSS: 85, FSR: 92, XeSS: 83, note: "FSR es ~10–15% más rápido por su menor carga frente al Transformer." },
    "Compatibilidad HW": { DLSS: 45, FSR: 95, XeSS: 80, note: "FSR y XeSS corren en hardware variado (incluso GPUs NVIDIA); DLSS exige RTX." },
    "Render neuronal gen.": { DLSS: 100, FSR: 0, XeSS: 0, note: "Solo NVIDIA tiene render neuronal generativo (DLSS 5). AMD e Intel: sin equivalente." },
  };
  const names = ["DLSS", "FSR", "XeSS"];
  const colors = { DLSS: "#3ad6c4", FSR: "#ff5db1", XeSS: "#41b6ff" };
  let cur = "Calidad de imagen";
  const wrap = el("div", "demo demo-rivals");
  wrap.innerHTML = `
    <div class="demo-head">
      <span class="demo-tag">Demo interactiva</span>
      <span class="demo-hint">Elegí el eje a comparar</span>
    </div>
    <div class="rivals-axes"></div>
    <div class="rivals-bars"></div>
    <p class="rivals-note"></p>`;
  root.appendChild(wrap);

  const axEl = wrap.querySelector(".rivals-axes");
  const barEl = wrap.querySelector(".rivals-bars");
  const noteEl = wrap.querySelector(".rivals-note");
  Object.keys(axes).forEach((k) => {
    const b = el("button", "rivals-ax" + (k === cur ? " on" : ""), k);
    b.addEventListener("click", () => { cur = k; render(); });
    axEl.appendChild(b);
  });

  function render() {
    [...axEl.children].forEach((b) => b.classList.toggle("on", b.textContent === cur));
    const d = axes[cur];
    barEl.innerHTML = names.map((n) => `
      <div class="rbar">
        <span class="rn" style="color:${colors[n]}">${n}</span>
        <div class="rtrack"><i style="width:0%;background:${colors[n]}"></i></div>
        <span class="rv">${d[n] === 0 ? "—" : d[n]}</span>
      </div>`).join("");
    // animación de llenado
    requestAnimationFrame(() => {
      [...barEl.querySelectorAll(".rbar")].forEach((row, i) => {
        row.querySelector("i").style.width = d[names[i]] + "%";
      });
    });
    noteEl.textContent = d.note;
  }
  render();
  return {};
};
