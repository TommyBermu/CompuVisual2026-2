/*
    core/Renderer.js
    ----------------
    Capa VISUAL (Three.js). No sabe nada de física.
    Responsabilidad: crear la escena, la cámara, las luces y el WebGLRenderer,
    y dibujar un frame cuando se le pide.

    Iluminación:
        - Cielo: un degradado pintado en un <canvas> usado como textura
            equirectangular (FONDO). Una copia se usa como ENTORNO
            (scene.environment), así los materiales metálicos/cristales reflejan el cielo.
        - HemisphereLight: luz ambiente (color del cielo arriba, del suelo abajo).
        - DirectionalLight: el "sol" bajo, delante del jugador, con sombras.
            Como la cámara avanza, el sol y su sombra la siguen (followCamera).
        - Fog: niebla del color del horizonte para esconder dónde se genera el pasillo.

    Cada nivel tiene su paleta (levels.js). setTheme() inicia una transición y
    update() va mezclando (lerp) los colores viejos con los nuevos frame a frame.
*/

import * as THREE from 'three';
import { CAMERA_FOV, CAMERA_HEIGHT } from '../constants.js';

// Colores de la paleta que maneja el Renderer (los del pasillo los usa Tunnel.js)
const THEME_KEYS = ['skyTop', 'skyMid', 'skyHorizon', 'skyBottom', 'fog', 'sun', 'hemiSky', 'hemiGround'];

export default class Renderer {
    constructor(container) {
        // Escena
        this.scene = new THREE.Scene();
        // Proporción 2:1 (equirectangular). OJO: Three calcula el tamaño de los
        // reflejos con el ANCHO / 4; si el canvas es muy angosto los reflejos salen negros.
        this.skyCanvas = document.createElement('canvas');
        this.skyCanvas.width = 512;
        this.skyCanvas.height = 256;
        this.sky = this._canvasToSkyTexture(this.skyCanvas);
        this.scene.background = this.sky;
        this.scene.fog = new THREE.Fog(0xffffff, 40, 130);

        // Cámara: mira hacia -Z
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 400);
        this.camera.position.set(0, CAMERA_HEIGHT, 0);
        this.camera.lookAt(0, CAMERA_HEIGHT, -1);

        // Renderer WebGL
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // colores más "cinematográficos"
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        // Luces
        this.hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 0.9);
        this.scene.add(this.hemi);

        this.sun = new THREE.DirectionalLight(0xffffff, 2);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        const s = this.sun.shadow.camera; // zona que cubre la sombra alrededor de la cámara
        s.left = -15; s.right = 15; s.top = 15; s.bottom = -15; s.near = 1; s.far = 80;
        this.scene.add(this.sun, this.sun.target);
        this.followCamera();

        // Estado de la paleta: colores actuales + transición en curso
        this.theme = {};
        THEME_KEYS.forEach((k) => { this.theme[k] = new THREE.Color(); });
        this.sunIntensity = 2;
        this.transition = null;

        // Redimensionado
        window.addEventListener('resize', () => this.onResize());
    }

    // Cambiar a la paleta de un nivel. duration = 0 -> cambio instantáneo.
    setTheme(colors, sunIntensity, duration = 0) {
        const to = {};
        THEME_KEYS.forEach((k) => { to[k] = new THREE.Color(colors[k]); });

        if (duration <= 0) {
            THEME_KEYS.forEach((k) => this.theme[k].copy(to[k]));
            this.sunIntensity = sunIntensity;
            this._applyTheme();
            this._updateEnvironment();
            this.transition = null;
            return;
        }

        const from = {};
        THEME_KEYS.forEach((k) => { from[k] = this.theme[k].clone(); });
        this.transition = {
            from, to, duration, t: 0,
            fromIntensity: this.sunIntensity, toIntensity: sunIntensity,
        };
    }

    // Avanza la transición de colores (llamar cada frame)
    update(delta) {
        const tr = this.transition;
        if (!tr) return;

        tr.t = Math.min(tr.t + delta / tr.duration, 1);
        const k = tr.t * tr.t * (3 - 2 * tr.t); // smoothstep: arranca y termina suave
        THEME_KEYS.forEach((key) => this.theme[key].lerpColors(tr.from[key], tr.to[key], k));
        this.sunIntensity = THREE.MathUtils.lerp(tr.fromIntensity, tr.toIntensity, k);
        this._applyTheme();

        if (tr.t >= 1) {
            this._updateEnvironment(); // los reflejos se recalculan solo al final (es más caro)
            this.transition = null;
        }
    }

    // Copiar los colores actuales a niebla, luces y cielo
    _applyTheme() {
        const t = this.theme;
        this.scene.fog.color.copy(t.fog);
        this.hemi.color.copy(t.hemiSky);
        this.hemi.groundColor.copy(t.hemiGround);
        this.sun.color.copy(t.sun);
        this.sun.intensity = this.sunIntensity;
        this._drawSky(this.skyCanvas);
        this.sky.needsUpdate = true;
    }

    // Degradado vertical: la mitad de la imagen es el horizonte (textura equirectangular)
    _drawSky(canvas) {
        const t = this.theme;
        const ctx = canvas.getContext('2d');
        const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
        g.addColorStop(0.0, '#' + t.skyTop.getHexString());
        g.addColorStop(0.35, '#' + t.skyMid.getHexString());
        g.addColorStop(0.5, '#' + t.skyHorizon.getHexString());
        g.addColorStop(1.0, '#' + t.skyBottom.getHexString());
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    _canvasToSkyTexture(canvas) {
        const tex = new THREE.CanvasTexture(canvas);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
    }

    // Three.js precalcula los reflejos del entorno una sola vez por textura,
    // así que para que cambien hay que darle una textura nueva.
    _updateEnvironment() {
        const canvas = document.createElement('canvas');
        canvas.width = this.skyCanvas.width;
        canvas.height = this.skyCanvas.height;
        this._drawSky(canvas);
        if (this.scene.environment) this.scene.environment.dispose();
        this.scene.environment = this._canvasToSkyTexture(canvas);
    }

    // El sol se queda en la misma posición RELATIVA a la cámara (bajo, delante y a un lado).
    followCamera() {
        const c = this.camera.position;
        this.sun.position.set(c.x + 8, c.y + 12, c.z - 25);
        this.sun.target.position.set(c.x, 0, c.z - 10);
    }

    add(mesh) {
        this.scene.add(mesh);
    }

    remove(mesh) {
        this.scene.remove(mesh);
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
