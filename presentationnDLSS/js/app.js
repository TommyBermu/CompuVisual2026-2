/*
  app.js
  ------
  Motor de la presentación:
   - Renderiza los slides desde slides.js
   - Navegación por botones, teclado, rueda y gestos táctiles
   - Índice (TOC), barra de progreso, pantalla completa
   - Fondo animado propio en <canvas> (campo de flujo con partículas)
  Vanilla JS con módulos ES, sin dependencias (igual que asteroids/smashhit).
*/

import { slides } from "./slides.js";
import { initDemos } from "./demos.js";

/* ---------------- Render de slides ---------------- */
const deck = document.getElementById("deck");

slides.forEach((s, i) => {
  const el = document.createElement("section");
  el.className = "slide " + (s.type || "content");
  el.dataset.index = i;
  el.innerHTML = `<div class="wrap">${s.html}</div>`;
  deck.appendChild(el);
});

initDemos(deck); // mini-demos animadas del Capítulo 2

const slideEls = [...deck.querySelectorAll(".slide")];
const total = slideEls.length;

/* ---------------- Estado y navegación ---------------- */
let current = 0;
const bar = document.getElementById("progress-bar");
const curEl = document.getElementById("cur");
const totalEl = document.getElementById("total");
totalEl.textContent = total;

function show(n, dir = 1) {
  n = Math.max(0, Math.min(total - 1, n));
  if (n === current && slideEls[current].classList.contains("active")) return;

  const prevEl = slideEls[current];
  prevEl.classList.remove("active");
  prevEl.classList.add("leaving");
  setTimeout(() => prevEl.classList.remove("leaving"), 550);

  current = n;
  const el = slideEls[current];
  el.classList.add("active");
  el.scrollTop = 0;

  bar.style.width = ((current + 1) / total) * 100 + "%";
  curEl.textContent = current + 1;
  history.replaceState(null, "", "#" + (current + 1));
}

function next() { show(current + 1, 1); }
function prev() { show(current - 1, -1); }

/* Primer slide (respeta hash si existe) */
const fromHash = parseInt(location.hash.replace("#", ""), 10);
show(Number.isFinite(fromHash) && fromHash >= 1 ? fromHash - 1 : 0);
slideEls[current].classList.add("active");
bar.style.width = ((current + 1) / total) * 100 + "%";
curEl.textContent = current + 1;

/* ---------------- Controles ---------------- */
document.getElementById("next").addEventListener("click", next);
document.getElementById("prev").addEventListener("click", prev);

/* Teclado */
window.addEventListener("keydown", (e) => {
  if (tocOpen && e.key !== "Escape") return;
  switch (e.key) {
    case "ArrowRight":
    case "ArrowDown":
    case " ":
    case "PageDown":
      e.preventDefault(); next(); break;
    case "ArrowLeft":
    case "ArrowUp":
    case "PageUp":
      e.preventDefault(); prev(); break;
    case "Home": e.preventDefault(); show(0); break;
    case "End": e.preventDefault(); show(total - 1); break;
    case "f":
    case "F": toggleFullscreen(); break;
    case "m":
    case "M": toggleToc(); break;
    case "Escape": if (tocOpen) toggleToc(); break;
  }
});

/* Rueda del mouse (con bloqueo para no saltar varios a la vez) */
let wheelLock = false;
deck.addEventListener("wheel", (e) => {
  const el = slideEls[current];
  const scrollable = el.scrollHeight > el.clientHeight + 4;
  // Si el slide tiene scroll propio y no está al borde, deja scrollear.
  if (scrollable) {
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
    if ((e.deltaY > 0 && !atBottom) || (e.deltaY < 0 && !atTop)) return;
  }
  if (wheelLock) return;
  if (Math.abs(e.deltaY) < 18) return;
  wheelLock = true;
  e.deltaY > 0 ? next() : prev();
  setTimeout(() => (wheelLock = false), 700);
}, { passive: true });

/* Gestos táctiles */
let touchX = 0, touchY = 0;
deck.addEventListener("touchstart", (e) => {
  touchX = e.changedTouches[0].clientX;
  touchY = e.changedTouches[0].clientY;
}, { passive: true });
deck.addEventListener("touchend", (e) => {
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) {
    dx < 0 ? next() : prev();
  }
}, { passive: true });

/* Pantalla completa */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

/* ---------------- Índice (TOC) ---------------- */
const toc = document.getElementById("toc");
const tocList = document.getElementById("toc-list");
let tocOpen = false;

slides.forEach((s, i) => {
  const li = document.createElement("li");
  if (s.chapter) li.className = "chap";
  const b = document.createElement("button");
  b.textContent = s.title || `Slide ${i + 1}`;
  b.addEventListener("click", () => { show(i); toggleToc(); });
  li.appendChild(b);
  tocList.appendChild(li);
});

function toggleToc() {
  tocOpen = !tocOpen;
  toc.classList.toggle("hidden", !tocOpen);
}
document.getElementById("toc-btn").addEventListener("click", toggleToc);
document.getElementById("toc-close").addEventListener("click", toggleToc);
toc.addEventListener("click", (e) => { if (e.target === toc) toggleToc(); });

/* Ocultar la pista tras unos segundos */
setTimeout(() => {
  const h = document.getElementById("hint");
  if (h) h.style.transition = "opacity 1s", h.style.opacity = "0";
}, 7000);

/* =========================================================
   Fondo animado: campo de flujo con partículas.
   Estilo propio — líneas finas teal/magenta que fluyen
   siguiendo un ruido suave, con leve reacción al mouse.
   ========================================================= */
const bg = document.getElementById("bg");
const ctx = bg.getContext("2d");
let W, H, parts = [];
const COLORS = ["#3ad6c4", "#41b6ff", "#ff5db1"];
const mouse = { x: 0.5, y: 0.5 };

function resize() {
  W = bg.width = innerWidth * devicePixelRatio;
  H = bg.height = innerHeight * devicePixelRatio;
  bg.style.width = innerWidth + "px";
  bg.style.height = innerHeight + "px";
  const count = Math.round((innerWidth * innerHeight) / 14000);
  parts = Array.from({ length: Math.min(160, count) }, () => spawn());
}
function spawn() {
  return {
    x: Math.random() * W,
    y: Math.random() * H,
    v: 0.3 + Math.random() * 0.9,
    c: COLORS[(Math.random() * COLORS.length) | 0],
    life: 0,
    max: 200 + Math.random() * 300,
  };
}

/* Campo de flujo pseudo-aleatorio (ruido barato basado en seno) */
function angleAt(x, y, t) {
  const nx = x * 0.0012, ny = y * 0.0012;
  return (
    Math.sin(nx + t * 0.2) * 1.4 +
    Math.cos(ny - t * 0.15) * 1.4 +
    Math.sin((nx + ny) * 0.8 + t * 0.1) +
    (mouse.x - 0.5) * 1.2
  );
}

let t0 = 0;
function frame(ts) {
  const t = ts * 0.001;
  // estela: pintamos un velo oscuro semitransparente en vez de limpiar
  ctx.fillStyle = "rgba(7,9,15,0.12)";
  ctx.fillRect(0, 0, W, H);

  for (const p of parts) {
    const a = angleAt(p.x, p.y, t);
    const spd = p.v * devicePixelRatio;
    const nxp = p.x + Math.cos(a) * spd;
    const nyp = p.y + Math.sin(a) * spd;

    ctx.strokeStyle = p.c;
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1 * devicePixelRatio;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(nxp, nyp);
    ctx.stroke();

    p.x = nxp;
    p.y = nyp;
    p.life++;

    if (p.x < 0 || p.x > W || p.y < 0 || p.y > H || p.life > p.max) {
      Object.assign(p, spawn());
    }
  }
  ctx.globalAlpha = 1;
  requestAnimationFrame(frame);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (e) => {
  mouse.x = e.clientX / innerWidth;
  mouse.y = e.clientY / innerHeight;
});

// Respeta usuarios que prefieren menos movimiento
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
resize();
if (!reduce) {
  requestAnimationFrame(frame);
} else {
  // fondo estático sutil
  ctx.fillStyle = "#07090f";
  ctx.fillRect(0, 0, W, H);
}
