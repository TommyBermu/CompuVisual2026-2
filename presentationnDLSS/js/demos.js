/*
  demos.js
  --------
  Mini-demos animadas (canvas) para el Capítulo 2. Son ilustraciones
  conceptuales hechas desde cero: NO son capturas de NVIDIA.
  Cada demo se engancha a un elemento con data-demo="nombre".
  Solo animan cuando su slide está activa (no gastan CPU en el resto).
*/

const TEAL = "#3ad6c4", CYAN = "#41b6ff", MAG = "#ff5db1", BG = "#0d111c";

/* ---------- utilidades ---------- */
const isActive = (el) => el.closest(".slide")?.classList.contains("active");

function makeCanvas(host, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.className = "demo-canvas";
  host.appendChild(c);
  return c;
}

/* Un solo bucle global; cada demo registra su "tick" */
const ticks = [];
let last = performance.now();
function loop(now) {
  const dt = now - last; last = now;
  for (const t of ticks) if (isActive(t.el)) t.fn(dt, now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
const register = (el, fn) => ticks.push({ el, fn });

/* Botones de modo (sin dejar foco, para que la barra espaciadora siga pasando de slide) */
function bindButtons(el, onPick) {
  el.querySelectorAll("[data-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      onPick(b.dataset.mode, true);
      b.blur();
    });
  });
}
function markActive(el, mode) {
  el.querySelectorAll("[data-mode]").forEach((b) =>
    b.classList.toggle("on", b.dataset.mode === mode));
}

/* =========================================================
   1) JITTER SUBPÍXEL: 16 cuadros de baja res → imagen completa
   ========================================================= */
function demoJitter(el) {
  const W = 320, H = 200, C = 4;                 // C = lado de la celda de baja res
  const left = makeCanvas(el.querySelector(".pane-a"), W, H);
  const right = makeCanvas(el.querySelector(".pane-b"), W, H);
  const lx = left.getContext("2d"), rx = right.getContext("2d");
  const counter = el.querySelector(".counter");

  /* "Verdad" en alta resolución: líneas finas + círculo (lo que a baja res se rompe) */
  const t = document.createElement("canvas"); t.width = W; t.height = H;
  const tx = t.getContext("2d");
  tx.fillStyle = BG; tx.fillRect(0, 0, W, H);
  tx.lineWidth = 1;
  tx.strokeStyle = TEAL;
  for (let i = 0; i < 14; i++) {                  // abanico de líneas finas
    tx.beginPath(); tx.moveTo(10, 190); tx.lineTo(310, 10 + i * 13); tx.stroke();
  }
  tx.strokeStyle = MAG;
  tx.beginPath(); tx.arc(210, 110, 62, 0, Math.PI * 2); tx.stroke();
  tx.beginPath(); tx.arc(210, 110, 40, 0, Math.PI * 2); tx.stroke();
  tx.strokeStyle = "#e8ecf4";
  tx.beginPath(); tx.moveTo(30, 40); tx.lineTo(150, 40); tx.stroke();
  tx.beginPath(); tx.moveTo(30, 46); tx.lineTo(150, 46); tx.stroke();
  const truth = tx.getImageData(0, 0, W, H).data;

  /* Orden de 16 posiciones subpíxel (secuencia Halton 2,3 sin repetir) */
  const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };
  const order = []; const seen = new Set();
  for (let k = 1; order.length < C * C && k < 200; k++) {
    const p = [Math.floor(halton(k, 2) * C), Math.floor(halton(k, 3) * C)];
    const key = p.join(","); if (!seen.has(key)) { seen.add(key); order.push(p); }
  }

  const hist = new Uint8ClampedArray(W * H * 4);
  const px = (x, y) => (y * W + x) * 4;
  let frame = 0, wait = 0, timer = 0;

  function reset() { frame = 0; hist.fill(0); lx.clearRect(0, 0, W, H); rx.clearRect(0, 0, W, H); }
  function step() {
    const [jx, jy] = order[frame % order.length];
    const imgL = lx.createImageData(W, H);
    for (let cy = 0; cy < H / C; cy++) for (let cx = 0; cx < W / C; cx++) {
      const sx = cx * C + jx, sy = cy * C + jy;       // muestra con jitter
      const s = px(sx, sy);
      const r = truth[s], g = truth[s + 1], b = truth[s + 2];
      // panel izquierdo: este cuadro solo, llenando la celda
      for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
        const d = px(cx * C + x, cy * C + y);
        imgL.data[d] = r; imgL.data[d + 1] = g; imgL.data[d + 2] = b; imgL.data[d + 3] = 255;
      }
      // historial: la muestra va a su posición exacta; en el primer cuadro rellena la celda
      if (frame === 0) for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
        const d = px(cx * C + x, cy * C + y);
        hist[d] = r; hist[d + 1] = g; hist[d + 2] = b; hist[d + 3] = 255;
      }
      hist[s] = r; hist[s + 1] = g; hist[s + 2] = b; hist[s + 3] = 255;
    }
    lx.putImageData(imgL, 0, 0);
    rx.putImageData(new ImageData(new Uint8ClampedArray(hist), W, H), 0, 0);
    frame++;
    counter.textContent = `cuadros acumulados: ${frame} / ${order.length}`;
  }

  reset();
  register(el, (dt) => {
    timer += dt;
    if (frame >= order.length) {                    // pausa y reinicia
      wait += dt; if (wait > 2200) { wait = 0; reset(); }
      return;
    }
    if (timer > 420) { timer = 0; step(); }
  });
}

/* =========================================================
   2) TAA clásico (ghosting) vs red neuronal (nítido) — conceptual
   ========================================================= */
function demoTAA(el) {
  const W = 340, H = 170;
  const a = makeCanvas(el.querySelector(".pane-a"), W, H);
  const b = makeCanvas(el.querySelector(".pane-b"), W, H);
  const ax = a.getContext("2d"), bx = b.getContext("2d");

  function scene(ctx, x, blur) {
    ctx.save();
    if (blur) ctx.filter = "blur(1.1px)";
    ctx.strokeStyle = "rgba(154,166,189,.55)"; ctx.lineWidth = 1;
    for (let i = 0; i < 34; i++) { ctx.beginPath(); ctx.moveTo(i * 10 + .5, 0); ctx.lineTo(i * 10 + .5, H); ctx.stroke(); }
    ctx.fillStyle = "#e8ecf4";
    ctx.fillRect(x - 18, H / 2 - 18, 36, 36);
    ctx.restore();
  }

  let t = 0;
  ax.fillStyle = BG; ax.fillRect(0, 0, W, H);
  register(el, (dt) => {
    t += dt * 0.00045;
    const x = W / 2 + Math.sin(t * Math.PI * 2) * (W / 2 - 40);
    // TAA: el "historial" se mezcla sin descartar → estela y borrosidad
    ax.fillStyle = "rgba(13,17,28,.16)"; ax.fillRect(0, 0, W, H);
    scene(ax, x, true);
    // DLSS 2.0: la red descarta el historial que no corresponde → nítido
    bx.fillStyle = BG; bx.fillRect(0, 0, W, H);
    scene(bx, x, false);
  });
}

/* =========================================================
   3) Frame Generation: lo que calcula el motor vs lo que ves
   ========================================================= */
function demoFrameGen(el) {
  const W = 760, H = 210;
  const cv = makeCanvas(el.querySelector(".pane-a"), W, H);
  const cx = cv.getContext("2d");
  const outReal = el.querySelector(".out-real"), outShown = el.querySelector(".out-shown");
  let mode = "on", off = 0, auto = true, acc = 0;
  const S = 150;                                  // separación entre cuadros reales (px)

  function set(m, byUser) { mode = m; if (byUser) auto = false; markActive(el, m); update(); }
  function update() {
    // Cifras ilustrativas (no son una medición)
    outReal.textContent = "60";
    outShown.textContent = mode === "on" ? "120" : "60";
    outShown.classList.toggle("hot", mode === "on");
  }
  bindButtons(el, set);
  set("on");

  function box(x, y, label, col, dashed) {
    const w = 64, h = 46;
    cx.save();
    cx.fillStyle = col + "22"; cx.strokeStyle = col; cx.lineWidth = 2;
    if (dashed) cx.setLineDash([6, 4]);
    cx.beginPath(); cx.roundRect(x, y, w, h, 8); cx.fill(); cx.stroke();
    cx.setLineDash([]);
    cx.fillStyle = col; cx.font = "600 13px 'JetBrains Mono', monospace";
    cx.textAlign = "center"; cx.textBaseline = "middle";
    cx.fillText(label, x + w / 2, y + h / 2);
    cx.restore();
  }

  register(el, (dt) => {
    off = (off + dt * 0.06) % S;
    if (auto) { acc += dt; if (acc > 4500) { acc = 0; set(mode === "on" ? "off" : "on"); } }
    cx.clearRect(0, 0, W, H);
    cx.font = "12px 'JetBrains Mono', monospace"; cx.fillStyle = "#9aa6bd"; cx.textAlign = "left";
    cx.fillText("EL MOTOR CALCULA (cuadros reales)", 8, 16);
    cx.fillText("TÚ VES EN PANTALLA", 8, 118);
    for (let i = -1; i < 8; i++) {
      const x = i * S - off + 40;
      box(x, 28, "real", CYAN);
      box(x, 128, "real", CYAN);
      if (mode === "on") box(x + S / 2, 128, "IA", MAG, true);
    }
    // línea de "tu input": solo se lee con cuadros reales
    cx.strokeStyle = "rgba(255,207,92,.0)";
  });
}

/* =========================================================
   4) Ray Reconstruction: pocos rayos → denoisers vs una sola IA
   ========================================================= */
function demoRay(el) {
  const W = 240, H = 150, SC = 2;
  const cv = makeCanvas(el.querySelector(".pane-a"), W * SC, H * SC);
  cv.style.imageRendering = "auto";
  const ctx = cv.getContext("2d");
  const work = document.createElement("canvas"); work.width = W; work.height = H;
  const wx = work.getContext("2d");

  function drawScene(c) {
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1b2236"); g.addColorStop(.55, "#0f1424"); g.addColorStop(1, "#2a3350");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // suelo reflectante con franjas de luz
    for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(65,182,255,${0.06 + i * .01})`; c.fillRect(0, 92 + i * 10, W, 3); }
    // esfera brillante + reflejo en el suelo
    const s = c.createRadialGradient(95, 64, 4, 105, 74, 42);
    s.addColorStop(0, "#ffffff"); s.addColorStop(.25, TEAL); s.addColorStop(1, "#0a3a40");
    c.fillStyle = s; c.beginPath(); c.arc(105, 74, 38, 0, 7); c.fill();
    c.save(); c.globalAlpha = .35; c.scale(1, -1); c.translate(0, -H - 92 + 40);
    c.fillStyle = s; c.beginPath(); c.arc(105, 74 - 2, 38, 0, 7); c.fill(); c.restore();
    // luz de neón (magenta) con reflejo nítido
    c.fillStyle = MAG; c.fillRect(170, 20, 6, 70);
    c.fillStyle = "rgba(255,93,177,.45)"; c.fillRect(170, 98, 6, 40);
  }
  const clean = document.createElement("canvas"); clean.width = W; clean.height = H;
  drawScene(clean.getContext("2d"));
  const soft = document.createElement("canvas"); soft.width = W; soft.height = H;
  const sx = soft.getContext("2d"); sx.filter = "blur(5px)"; sx.drawImage(clean, 0, 0);

  let mode = "noisy", auto = true, acc = 0;
  const caption = el.querySelector(".mode-caption");
  const CAPS = {
    noisy: "Pocos rayos por píxel → imagen ruidosa que parpadea",
    manual: "Denoisers manuales → limpia, pero borrosa y con retraso",
    rr: "Ray Reconstruction → un solo modelo de IA: nítida y estable",
  };
  function set(m, byUser) { mode = m; if (byUser) auto = false; markActive(el, m); caption.textContent = CAPS[m]; }
  bindButtons(el, set); set("noisy");

  let prev = null;
  register(el, (dt) => {
    if (auto) { acc += dt; if (acc > 3600) { acc = 0; set(mode === "noisy" ? "manual" : mode === "manual" ? "rr" : "noisy"); } }
    wx.clearRect(0, 0, W, H);
    if (mode === "noisy") {
      wx.drawImage(clean, 0, 0);
      const d = wx.getImageData(0, 0, W, H); const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const n = (Math.random() - .5) * 150 + (Math.random() < .03 ? 140 : 0);
        p[i] = Math.max(0, Math.min(255, p[i] * .8 + n));
        p[i + 1] = Math.max(0, Math.min(255, p[i + 1] * .8 + n));
        p[i + 2] = Math.max(0, Math.min(255, p[i + 2] * .8 + n));
      }
      wx.putImageData(d, 0, 0);
    } else if (mode === "manual") {
      // desenfoque + mezcla con el cuadro anterior (lag/parpadeo suavizado)
      if (prev) { wx.globalAlpha = 1; wx.drawImage(prev, 0, 0); wx.globalAlpha = .18; }
      wx.drawImage(soft, 0, 0); wx.globalAlpha = 1;
    } else {
      wx.drawImage(clean, 0, 0);
    }
    if (!prev) { prev = document.createElement("canvas"); prev.width = W; prev.height = H; }
    prev.getContext("2d").drawImage(work, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(work, 0, 0, W * SC, H * SC);
  });
}

/* ---------- arranque ---------- */
const DEMOS = { jitter: demoJitter, taa: demoTAA, framegen: demoFrameGen, ray: demoRay };

export function initDemos(root) {
  root.querySelectorAll("[data-demo]").forEach((el) => {
    const fn = DEMOS[el.dataset.demo];
    if (fn) fn(el);
  });
}
