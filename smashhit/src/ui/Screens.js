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

    Récord: el menú principal muestra la mejor puntuación guardada
    (records.js) y, al morir o terminar, la vista de RESULTADOS enseña la
    puntuación de la partida, sus datos, el récord y "¡Nuevo récord!" si se
    batió, con botones Reintentar (mismo checkpoint) y Menú.

    API usada por Game:
        new Screens(menuEl, { audio, onStart })
        showMenu()  -> muestra el menú principal (con el récord al día)
        showResults(result) -> pantalla de fin de partida (ver _fillResults)
        hide()      -> oculta el overlay (al empezar a jugar)
        onStart(levelIndex, mode) -> callback que arranca el juego en ese nivel
                                     y modo ('normal' | 'sinPerder')

    Modos: "▶ Jugar" y "Elegir checkpoint" son el modo normal; "∞ Sin perder"
    abre el mismo selector de checkpoint pero en el modo de bolas infinitas
    (objetivo: puntos). this.pickMode guarda para qué modo se está eligiendo.
    Cada modo tiene su récord (records.js) y los resultados dicen el modo.
*/

import { ambienceFor } from '../levels.js';
import { OBSTACLE_NAMES } from '../obstacles/index.js';
import { getSettings, saveSettings } from '../settings.js';
import { getRecords } from '../records.js';
import { ACHIEVEMENTS, getUnlockedIds } from '../achievements.js';
import { CHECKPOINT_COUNT, FOG_DENSITY_SCALE } from '../constants.js';

// Texto del deslizador de niebla: % respecto a la densidad por defecto
const fogLabel = (v) => `${Math.round((v / FOG_DENSITY_SCALE) * 100)}%`;

// Nombre de cada modo de juego (menú, resultados, HUD)
export const MODE_LABELS = { normal: 'Modo normal', sinPerder: 'Sin perder' };

export default class Screens {
    constructor(menuEl, { audio, onStart, onResume, onExitToMenu }) {
        this.el = menuEl;
        this.audio = audio;
        this.onStart = onStart;
        this.onResume = onResume;
        this.onExitToMenu = onExitToMenu;
        this.lastStart = 0; // checkpoint de la última partida (para "Reintentar")
        this.lastMode = 'normal'; // modo de la última partida (para "Reintentar")
        this.pickMode = 'normal'; // modo con el que arrancan las tarjetas del selector
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
                    <button class="btn" data-action="play-nolose" title="Bolas infinitas: cada bola cuesta puntos, los bonus dan puntos">∞ Sin perder</button>
                    <button class="btn" data-action="levels">Elegir checkpoint</button>
                    <button class="btn" data-action="achievements">Logros</button>
                    <button class="btn" data-action="settings">⚙ Configuración</button>
                </div>
                <div class="record-card" data-record></div>
            </div>

            <div class="screen hidden" data-view="achievements">
                <h2 class="title-sm">Logros y Desbloqueables</h2>
                <div class="achievements-container">
                    <div class="achievements-grid" data-achievements-list></div>
                </div>
                <button class="btn btn-ghost" data-action="back">← Volver</button>
            </div>

            <div class="screen hidden" data-view="results">
                <h2 class="title-sm" data-res="title"></h2>
                <div class="result-mode" data-res="mode"></div>
                <div class="new-record hidden" data-res="new">¡Nuevo récord!</div>
                <div class="result-score" data-res="score"></div>
                <div class="result-stats" data-res="stats"></div>
                <div class="result-record" data-res="record"></div>
                <div class="menu-buttons">
                    <button class="btn btn-primary" data-action="retry">↻ Reintentar</button>
                    <button class="btn" data-action="home">Menú</button>
                </div>
            </div>

            <div class="screen hidden" data-view="levels">
                <h2 class="title-sm" data-levels-title>Elige un checkpoint</h2>
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
                    ${this._sliderFog(s.fogScale)}
                    ${this._rewardSelect('ballSkin', 'Apariencia de bola', s.ballSkin, 'skin')}
                    ${this._rewardSelect('ballTrail', 'Estela de bola', s.ballTrail, 'trail')}
                    <button class="btn btn-ghost reward-preview-button" data-action="reward-preview">Visualizar bolas y estelas</button>
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

            <div class="screen hidden" data-view="reward-preview">
                <h2 class="title-sm">Galería de bolas y estelas</h2>
                <p class="subtitle">Aquí puedes probar visualmente todas las recompensas, aunque aún estén bloqueadas.</p>
                <div class="reward-gallery">
                    <div class="reward-gallery-section">
                        <h3>Apariencias</h3>
                        <div class="reward-cards">${this._previewCards('skin')}</div>
                    </div>
                    <div class="reward-gallery-section">
                        <h3>Estelas</h3>
                        <div class="reward-cards">${this._previewCards('trail')}</div>
                    </div>
                </div>
                <button class="btn btn-ghost" data-action="settings">← Volver a configuración</button>
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
                <span class="level-obstacles">${level.obstacles.map((t) => OBSTACLE_NAMES[t]).join(' · ')}</span>
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

    // Niebla: 0.3 = casi sin niebla (se ve lejos) .. 3 = muy cerrada. Se muestra
    // como % respecto al valor por defecto (100% = como está pensado el juego).
    _sliderFog(value) {
        return `
            <label class="setting">
                <span class="setting-label">Niebla</span>
                <input type="range" data-setting="fogScale" min="0.3" max="3" step="0.1" value="${value}">
                <span class="setting-value" data-value-for="fogScale">${fogLabel(value)}</span>
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
                else if (action === 'play-nolose') this._showLevels('sinPerder');
                else if (action === 'levels') this._showLevels('normal');
                else if (action === 'achievements') this._showAchievements();
                else if (action === 'settings') this._showSettings();
                else if (action === 'reward-preview') this._show('reward-preview');
                else if (action === 'back') this._show('home');
                else if (action === 'home') this.showMenu();
                else if (action === 'retry') this._start(this.lastStart, this.lastMode);
                else if (action === 'resume') this.onResume?.();
                else if (action === 'to-menu') this.onExitToMenu?.();
            });
        });

        // Elegir nivel desde las tarjetas
        this.el.querySelectorAll('.level-card').forEach((card) => {
            card.addEventListener('click', () => {
                this.audio?.playSfx('ui');
                this._start(parseInt(card.dataset.level, 10), this.pickMode);
            });
        });

        // Sliders
        this.el.querySelectorAll('input[type="range"]').forEach((input) => {
            input.addEventListener('input', () => {
                const key = input.dataset.setting;
                const val = parseFloat(input.value);
                saveSettings({ [key]: val });
                // Probar el volumen de efectos con un vidrio (como mucho ~6 por segundo)
                if (key === 'sfxVolume' && performance.now() - (this._preview || 0) > 150) {
                    this._preview = performance.now();
                    this.audio?.playSfx('glass', { size: 0.3, intensity: 0.6 });
                }
                const out = this.el.querySelector(`[data-value-for="${key}"]`);
                if (out) {
                    if (key === 'fov') out.textContent = `${Math.round(val)}°`;
                    else if (key === 'fogScale') out.textContent = fogLabel(val);
                    else out.textContent = `${Math.round(((val - input.min) / (input.max - input.min)) * 100)}%`;
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

        this.el.querySelectorAll('select[data-setting]').forEach((input) => {
            input.addEventListener('change', () => saveSettings({ [input.dataset.setting]: input.value }));
        });

        this.el.querySelectorAll('[data-preview-type]').forEach((card) => {
            card.addEventListener('click', () => {
                this.el.querySelectorAll('[data-preview-type]').forEach((item) => item.classList.remove('selected'));
                card.classList.add('selected');
                this.audio?.playSfx('ui');
            });
        });
    }

    _showSettings() {
        this._refreshRewardSelects();
        this._show('settings');
    }

    _rewardSelect(key, label, value, type) {
        const unlocked = new Set(getUnlockedIds());
        const options = type === 'skin'
            ? [{ id: 'default', name: 'Predeterminada' }]
            : [{ id: 'none', name: 'Sin estela' }];
        for (const achievement of ACHIEVEMENTS) {
            if (achievement.reward?.type === type && unlocked.has(achievement.id)) {
                options.push({ id: achievement.reward.id, name: achievement.reward.name });
            }
        }
        const selected = options.some((option) => option.id === value) ? value : options[0].id;
        return `
            <label class="setting">
                <span class="setting-label">${label}</span>
                <select data-setting="${key}">${options.map((option) => `
                    <option value="${option.id}" ${option.id === selected ? 'selected' : ''}>${option.name}</option>
                `).join('')}</select>
            </label>`;
    }

    _previewCards(type) {
        const items = type === 'skin'
            ? [
                ['default', 'Predeterminada'], ['silver', 'Plata'], ['bronze', 'Bronce'],
                ['amethyst', 'Amatista'], ['gold', 'Oro'], ['emerald', 'Esmeralda'],
                ['sapphire', 'Zafiro'], ['diamond', 'Diamante'],
            ]
            : [['none', 'Sin estela'], ['rainbow', 'Arcoíris'], ['ghost', 'Fantasma']];
        return items.map(([id, name]) => `
            <button class="reward-card" data-preview-type="${type}" data-preview-id="${id}">
                <span class="preview-ball preview-${type} preview-${id}"></span>
                <strong>${name}</strong>
                <small>Vista previa</small>
            </button>
        `).join('');
    }

    _refreshRewardSelects() {
        const settings = getSettings();
        for (const [key, label, type] of [
            ['ballSkin', 'Apariencia de bola', 'skin'],
            ['ballTrail', 'Estela de bola', 'trail'],
        ]) {
            const old = this.el.querySelector(`select[data-setting="${key}"]`);
            if (!old) continue;
            const wrapper = old.closest('.setting');
            const replacement = document.createRange().createContextualFragment(
                this._rewardSelect(key, label, settings[key], type),
            );
            wrapper.replaceWith(replacement);
        }
        this.el.querySelectorAll('select[data-setting]').forEach((input) => {
            input.addEventListener('change', () => saveSettings({ [input.dataset.setting]: input.value }));
        });
    }

    _show(view) {
        this.el.classList.remove('hidden');
        this.el.querySelectorAll('.screen').forEach((sc) => {
            sc.classList.toggle('hidden', sc.dataset.view !== view);
        });
    }

    // Selector de checkpoint para un modo: las tarjetas arrancan en ese modo
    _showLevels(mode) {
        this.pickMode = mode;
        this.el.querySelector('[data-levels-title]').textContent = mode === 'sinPerder'
            ? `${MODE_LABELS.sinPerder} · elige un checkpoint`
            : 'Elige un checkpoint';
        this._show('levels');
    }

    _showAchievements() {
        const unlocked = getUnlockedIds();
        const list = this.el.querySelector('[data-achievements-list]');
        list.innerHTML = ACHIEVEMENTS.map((a) => {
            const isDone = unlocked.includes(a.id);
            const reward = a.reward ? `<div class="achievement-reward">Recompensa: ${a.reward.name}</div>` : '';
            return `
                <div class="achievement-item ${isDone ? 'unlocked' : 'locked'}">
                    <div class="achievement-status">${isDone ? '✓' : '🔒'}</div>
                    <div class="achievement-info">
                        <strong>${a.title}</strong>
                        <p>${a.desc}</p>
                        ${isDone ? reward : ''}
                    </div>
                </div>
            `;
        }).join('');
        this._show('achievements');
    }

    _start(levelIndex, mode = 'normal') {
        this.lastStart = levelIndex;
        this.lastMode = mode;
        this.hide();
        this.onStart(levelIndex, mode);
    }

    showMenu() {
        this._fillRecord();
        this.el.classList.remove('hidden');
        this._show('home');
    }

    // Tarjeta del récord en el menú principal (el del modo "Sin perder", aparte)
    _fillRecord() {
        const r = getRecords('normal');
        const card = this.el.querySelector('[data-record]');
        const np = getRecords('sinPerder');
        const nolose = np.score > 0
            ? `<span class="record-extra">${MODE_LABELS.sinPerder}: ${fmt(np.score)}</span>`
            : '';
        if (r.score <= 0) {
            card.innerHTML = `<span class="record-label">Récord</span><span class="record-empty">aún sin récord: ¡juega una partida!</span>${nolose}`;
            return;
        }
        const reach = r.checkpoint >= 1 ? ` · checkpoint ${r.checkpoint} desde el inicio` : '';
        card.innerHTML = `
            <span class="record-label">Récord</span>
            <span class="record-score">${fmt(r.score)}</span>
            <span class="record-extra">mejor recorrido ${fmt(r.distance)} m${reach}</span>${nolose}`;
    }

    /*
        Fin de partida. result = {
            title,                              // '¡Sin bolas!' / '¡Recorrido completado!'
            score, distance, crystals, bestMultiplier, checkpoint,
            mode,                               // 'normal' | 'sinPerder'
            newScore,                           // ¿batió el récord de puntuación (de su modo)?
            records,                            // récords de ese modo ya actualizados
        }
    */
    showResults(result) {
        this._fillResults(result);
        this.el.classList.remove('hidden');
        this._show('results');
    }

    _fillResults(r) {
        const q = (k) => this.el.querySelector(`[data-res="${k}"]`);
        q('title').textContent = r.title;
        q('mode').textContent = MODE_LABELS[r.mode] || MODE_LABELS.normal;
        q('new').classList.toggle('hidden', !r.newScore);
        q('score').textContent = fmt(r.score);
        q('stats').innerHTML = [
            ['Distancia', `${fmt(r.distance)} m`],
            ['Cristales', fmt(r.crystals)],
            ['Mejor combo', `x${r.bestMultiplier}`],
            ['Checkpoint', r.checkpoint],
        ].map(([k, v]) => `<span><small>${k}</small>${v}</span>`).join('');
        q('record').textContent = r.newScore
            ? `Mejor recorrido: ${fmt(r.records.distance)} m`
            : `Récord: ${fmt(r.records.score)} · mejor recorrido ${fmt(r.records.distance)} m`;
    }

    showPause() {
        this.el.classList.remove('hidden');
        this._show('pause');
    }

    hide() {
        this.el.classList.add('hidden');
    }
}

// Número con separador de miles (12 345)
function fmt(n) {
    return Math.floor(n).toLocaleString('es');
}
