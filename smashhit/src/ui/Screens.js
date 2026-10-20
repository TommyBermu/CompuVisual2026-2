/*
    ui/Screens.js
    -------------
    Toda la interfaz que NO es HUD: menú principal, selector de nivel y ajustes.
    Se dibuja como overlay HTML encima del canvas (div #menu).

    Selector de nivel "creativo": una rejilla de tarjetas, cada una pintada con
    el DEGRADADO REAL de la paleta de ese nivel (reutiliza LEVELS de levels.js),
    así se ve a qué ambiente vas a entrar antes de elegirlo.

    Ajustes: volumen de música y de efectos, silenciar, FOV, sombras y
    sensibilidad de disparo. Se guardan en settings.js (localStorage) y el
    AudioManager / Game reaccionan en vivo.

    API usada por Game:
        new Screens(menuEl, { audio, onStart })
        showMenu()  -> muestra el menú principal
        hide()      -> oculta el overlay (al empezar a jugar)
        onStart(levelIndex) -> callback que arranca el juego en ese nivel
*/

import { ambienceFor } from '../levels.js';
import { getSettings, saveSettings } from '../settings.js';
import { CHECKPOINT_COUNT } from '../constants.js';

export default class Screens {
    constructor(menuEl, { audio, onStart, onResume, onExitToMenu }) {
        this.el = menuEl;
        this.audio = audio;
        this.onStart = onStart;
        this.onResume = onResume;
        this.onExitToMenu = onExitToMenu;
        this._render();
    }

    _render() {
        const s = getSettings();
        this.el.innerHTML = `
            <div class="screen" data-view="home">
                <h1 class="title">SMASH&nbsp;HIT</h1>
                <p class="subtitle">un pasillo lineal de color · rompe cristales para no quedarte sin bolas</p>
                <div class="menu-buttons">
                    <button class="btn btn-primary" data-action="play">▶ Jugar</button>
                    <button class="btn" data-action="levels">Elegir checkpoint</button>
                    <button class="btn" data-action="settings">⚙ Configuración</button>
                </div>
            </div>

            <div class="screen hidden" data-view="levels">
                <h2 class="title-sm">Elige un checkpoint</h2>
                <div class="level-grid">
                    ${Array.from({ length: CHECKPOINT_COUNT }, (_, i) => this._levelCard(ambienceFor(i), i)).join('')}
                </div>
                <button class="btn btn-ghost" data-action="back">← Volver</button>
            </div>

            <div class="screen hidden" data-view="settings">
                <h2 class="title-sm">Configuración</h2>
                <div class="settings-list">
                    ${this._slider('musicVolume', 'Música', s.musicVolume)}
                    ${this._slider('sfxVolume', 'Efectos', s.sfxVolume)}
                    ${this._slider('sensitivity', 'Sensibilidad', s.sensitivity, 0.5, 2, 0.1)}
                    ${this._sliderDeg('fov', 'Campo de visión', s.fov)}
                    ${this._toggle('muted', 'Silenciar todo', s.muted)}
                    ${this._toggle('shadows', 'Sombras', s.shadows)}
                </div>
                <button class="btn btn-ghost" data-action="back">← Volver</button>
            </div>

            <div class="screen hidden" data-view="pause">
                <h2 class="title-sm">Pausa</h2>
                <div class="menu-buttons">
                    <button class="btn btn-primary" data-action="resume">▶ Reanudar</button>
                    <button class="btn" data-action="to-menu">Salir al menú</button>
                </div>
                <p class="subtitle">Pulsa ESC para reanudar</p>
            </div>
        `;

        this._bind();
    }

    // Tarjeta de nivel pintada con su paleta real
    _levelCard(level, i) {
        const c = level.colors;
        const bg = `linear-gradient(160deg, ${c.skyTop}, ${c.skyMid} 45%, ${c.skyHorizon} 70%, ${c.skyBottom})`;
        return `
            <button class="level-card" data-level="${i}" style="background:${bg}">
                <span class="level-num">${i}</span>
                <span class="level-name">${level.name}</span>
                <span class="level-speed">${i * 500} m</span>
            </button>
        `;
    }

    _slider(key, label, value, min = 0, max = 1, step = 0.05) {
        const pct = Math.round(((value - min) / (max - min)) * 100);
        return `
            <label class="setting">
                <span class="setting-label">${label}</span>
                <input type="range" data-setting="${key}" min="${min}" max="${max}" step="${step}" value="${value}">
                <span class="setting-value" data-value-for="${key}">${pct}%</span>
            </label>`;
    }

    _sliderDeg(key, label, value) {
        return `
            <label class="setting">
                <span class="setting-label">${label}</span>
                <input type="range" data-setting="${key}" min="55" max="95" step="1" value="${value}">
                <span class="setting-value" data-value-for="${key}">${value}°</span>
            </label>`;
    }

    _toggle(key, label, checked) {
        return `
            <label class="setting setting-toggle">
                <span class="setting-label">${label}</span>
                <input type="checkbox" data-setting="${key}" ${checked ? 'checked' : ''}>
                <span class="switch"></span>
            </label>`;
    }

    _bind() {
        // Navegación entre vistas y acciones
        this.el.querySelectorAll('[data-action]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.audio?.playSfx('ui');
                if (action === 'play') this._start(0);
                else if (action === 'levels') this._show('levels');
                else if (action === 'settings') this._show('settings');
                else if (action === 'back') this._show('home');
                else if (action === 'resume') this.onResume?.();
                else if (action === 'to-menu') this.onExitToMenu?.();
            });
        });

        // Elegir nivel desde las tarjetas
        this.el.querySelectorAll('.level-card').forEach((card) => {
            card.addEventListener('click', () => {
                this.audio?.playSfx('ui');
                this._start(parseInt(card.dataset.level, 10));
            });
        });

        // Sliders
        this.el.querySelectorAll('input[type="range"]').forEach((input) => {
            input.addEventListener('input', () => {
                const key = input.dataset.setting;
                const val = parseFloat(input.value);
                saveSettings({ [key]: val });
                const out = this.el.querySelector(`[data-value-for="${key}"]`);
                if (out) {
                    out.textContent = key === 'fov'
                        ? `${Math.round(val)}°`
                        : `${Math.round(((val - input.min) / (input.max - input.min)) * 100)}%`;
                }
            });
        });

        // Toggles
        this.el.querySelectorAll('input[type="checkbox"]').forEach((input) => {
            input.addEventListener('change', () => {
                saveSettings({ [input.dataset.setting]: input.checked });
                this.audio?.playSfx('ui');
            });
        });
    }

    _show(view) {
        this.el.querySelectorAll('.screen').forEach((sc) => {
            sc.classList.toggle('hidden', sc.dataset.view !== view);
        });
    }

    _start(levelIndex) {
        this.hide();
        this.onStart(levelIndex);
    }

    showMenu() {
        this.el.classList.remove('hidden');
        this._show('home');
    }

    showPause() {
        this.el.classList.remove('hidden');
        this._show('pause');
    }

    hide() {
        this.el.classList.add('hidden');
    }
}
