/*
    ui/HUD.js
    ---------
    HUD en HTML/CSS por encima del canvas (div #hud). Más simple que dibujar
    dentro de la escena 3D.

    Nivel + bolas restantes (grande, al centro) + distancia, y un cartel
    "Nivel N" al cambiar de nivel.

    Poderes (systems/PowerUps.js): bajo las bolas, una "pastilla" por poder
    activo con su color, los segundos que le quedan y una barrita; y un
    cartel propio (de su color) al activarse uno.

    Puntuación (arriba a la derecha, bajo la distancia): número + insignia del
    combo "xN" con una barrita de progreso hacia el siguiente multiplicador.
    Al sumar puntos sale un "+N" pequeño que sube y se desvanece junto al
    marcador (no en el centro, para no tapar la mira) y el número da un pulso.
*/

// Tope de "+N" en pantalla a la vez (si se rompen muchos cristales seguidos)
const MAX_POPUPS = 5;

export default class HUD {
    constructor(hudElement) {
        hudElement.innerHTML = `
            <div class="hud-top">
                <span class="hud-level"></span>
                <span class="hud-balls"></span>
                <span class="hud-distance"></span>
            </div>
            <div class="hud-powers"></div>
            <div class="hud-score">
                <span class="hud-score-value">0</span>
                <span class="hud-combo"><b class="hud-combo-mult">x1</b><i class="hud-combo-bar"><i></i></i></span>
                <div class="hud-popups"></div>
            </div>
            <div class="hud-banner"></div>
            <div class="hud-power-banner"></div>
            <div class="hud-damage"></div>
        `;
        this.levelEl = hudElement.querySelector('.hud-level');
        this.ballsEl = hudElement.querySelector('.hud-balls');
        this.distanceEl = hudElement.querySelector('.hud-distance');
        this.bannerEl = hudElement.querySelector('.hud-banner');
        this.damageEl = hudElement.querySelector('.hud-damage');
        this.powersEl = hudElement.querySelector('.hud-powers');
        this.powerBannerEl = hudElement.querySelector('.hud-power-banner');
        this.scoreEl = hudElement.querySelector('.hud-score-value');
        this.comboEl = hudElement.querySelector('.hud-combo');
        this.comboMultEl = hudElement.querySelector('.hud-combo-mult');
        this.comboBarEl = hudElement.querySelector('.hud-combo-bar > i');
        this.popupsEl = hudElement.querySelector('.hud-popups');
        this._shownScore = -1;
        this._shownMult = 0;
        this._bannerTimer = null;
        this.root = hudElement;
        this.hide();
    }

    show() {
        this.root.style.display = '';
    }

    hide() {
        this.root.style.display = 'none';
        this.popupsEl.replaceChildren(); // que no queden "+N" de la partida anterior
    }

    setLevel(checkpoint, total) {
        this.levelEl.textContent = `Checkpoint ${checkpoint}/${total}`;
    }

    setBalls(n) {
        this.ballsEl.textContent = n;
        this.ballsEl.classList.toggle('empty', n === 0);
    }

    setDistance(meters) {
        this.distanceEl.textContent = `${Math.floor(meters)} m`;
    }

    // Marcador: { score, multiplier, progress } (lo avisa systems/Score.js).
    // Solo toca el DOM si algo cambió (se llama cada frame por la distancia).
    setScore({ score, multiplier, progress }) {
        if (score !== this._shownScore) {
            this._shownScore = score;
            this.scoreEl.textContent = score.toLocaleString('es');
        }
        if (multiplier !== this._shownMult) {
            if (multiplier > this._shownMult && this._shownMult > 0) this._restartAnim(this.comboEl, 'bump');
            this._shownMult = multiplier;
            this.comboMultEl.textContent = `x${multiplier}`;
            this.comboEl.dataset.level = multiplier; // el color sube con el combo (CSS)
        }
        this.comboBarEl.style.width = `${Math.round(progress * 100)}%`;
    }

    // "+N" que sube junto al marcador. kind = 'crystal' | 'powerup' |
    // 'checkpoint' | 'finish' | 'combo' (cambia el color, ver CSS).
    popScore(points, kind = 'crystal', multiplier = 1) {
        const text = kind === 'combo' ? `¡Combo x${multiplier}!` : `+${points.toLocaleString('es')}`;
        const el = document.createElement('span');
        el.className = `hud-popup ${kind}`;
        el.textContent = text;
        // Varios a la vez (combo + cristal, checkpoint...) se apilan hacia abajo
        const now = performance.now();
        this._popSlot = now - (this._lastPopAt ?? -Infinity) < 300 ? (this._popSlot + 1) % MAX_POPUPS : 0;
        this._lastPopAt = now;
        el.style.top = `${6 + this._popSlot * 22}px`;
        el.addEventListener('animationend', () => el.remove());
        this.popupsEl.appendChild(el);
        while (this.popupsEl.childElementCount > MAX_POPUPS) this.popupsEl.firstElementChild.remove();
        if (points > 0) this._restartAnim(this.scoreEl, 'pulse');
    }

    // Vuelve a lanzar una animación CSS de una clase (aunque ya estuviera puesta)
    _restartAnim(el, cls) {
        el.classList.remove(cls);
        void el.offsetWidth; // fuerza reflow para reiniciar la animación
        el.classList.add(cls);
    }

    // Cartel grande en el centro que desaparece solo
    showBanner(text, ms = 1800) {
        this.bannerEl.textContent = text;
        this.bannerEl.classList.add('visible');
        clearTimeout(this._bannerTimer);
        this._bannerTimer = setTimeout(() => this.bannerEl.classList.remove('visible'), ms);
    }

    // Poderes activos: [{ name, color, remaining, duration }] (ver PowerUps.list)
    setPowers(list) {
        this.powersEl.innerHTML = list.map((p) => {
            const fill = Math.min(1, p.remaining / p.duration) * 100;
            return `<div class="hud-power" style="--power:${p.color}">
                <span class="hud-power-name">${p.name}</span>
                <span class="hud-power-time">${p.remaining.toFixed(1)}s</span>
                <div class="hud-power-bar"><i style="width:${fill.toFixed(1)}%"></i></div>
            </div>`;
        }).join('');
    }

    // Cartel del poder recién activado, con su color
    showPower(text, color, ms = 1500) {
        this.powerBannerEl.textContent = text;
        this.powerBannerEl.style.setProperty('--power', color);
        this.powerBannerEl.classList.add('visible');
        clearTimeout(this._powerTimer);
        this._powerTimer = setTimeout(() => this.powerBannerEl.classList.remove('visible'), ms);
    }

    // Marco rojo de daño (animación de muerte)
    showDamage() {
        this.damageEl.classList.add('visible');
    }

    hideDamage() {
        this.damageEl.classList.remove('visible');
    }

    // Destello rojo breve (al chocar con un cristal, sin ser game over)
    flashDamage() {
        this.damageEl.classList.add('flash');
        clearTimeout(this._flashTimer);
        this._flashTimer = setTimeout(() => this.damageEl.classList.remove('flash'), 220);
    }
}
