/*
    ui/HUD.js
    ---------
    HUD en HTML/CSS por encima del canvas (div #hud). Más simple que dibujar
    dentro de la escena 3D.

    Paso 1: nivel + distancia, y un cartel "Nivel N" al cambiar de nivel.
    Más adelante: bolas restantes y puntuación.
*/

export default class HUD {
    constructor(hudElement) {
        hudElement.innerHTML = `
            <div class="hud-top">
                <span class="hud-level"></span>
                <span class="hud-distance"></span>
            </div>
            <div class="hud-banner"></div>
        `;
        this.levelEl = hudElement.querySelector('.hud-level');
        this.distanceEl = hudElement.querySelector('.hud-distance');
        this.bannerEl = hudElement.querySelector('.hud-banner');
        this._bannerTimer = null;
    }

    setLevel(level, total) {
        this.levelEl.textContent = `Nivel ${level}/${total}`;
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
}
