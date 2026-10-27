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
*/

export default class HUD {
    constructor(hudElement) {
        hudElement.innerHTML = `
            <div class="hud-top">
                <span class="hud-level"></span>
                <span class="hud-balls"></span>
                <span class="hud-distance"></span>
            </div>
            <div class="hud-powers"></div>
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
        this._bannerTimer = null;
        this.root = hudElement;
        this.hide();
    }

    show() {
        this.root.style.display = '';
    }

    hide() {
        this.root.style.display = 'none';
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
