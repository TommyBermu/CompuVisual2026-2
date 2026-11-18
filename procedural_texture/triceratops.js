// se usó editor.p5js.org
// R para reiniciar el patron

let myModel;
let texImg;
let TEX = 140;
let gridA, gridB, nextA, nextB;

let dA = 1.0;
let dB = 0.5;
let feed = 0.055;
let kill = 0.062;
const dt = 1.0;
const STEPS = 1;

let palettes = [
    { name: "B/N", a: [255, 255, 255], b: [0, 0, 0] },
    { name: "Fuego", a: [255, 230, 150], b: [140, 20, 0] },
    { name: "Oceano", a: [220, 245, 255], b: [10, 40, 90] },
    { name: "Selva", a: [230, 255, 200], b: [20, 70, 30] },
    { name: "Neon", a: [40, 0, 60], b: [0, 255, 180] },
];
let paletteIdx = 0;

let presets = [
    { name: "Laberinto", f: 0.055, k: 0.062 },
    { name: "Coral", f: 0.0545, k: 0.062 },
    { name: "Mitosis", f: 0.0367, k: 0.0649 },
    { name: "Puntos", f: 0.03, k: 0.062 },
];

let feedSlider, killSlider, shinySlider, lightCheckbox;
let resSlider;
let lightsOn = true;

function preload() {
    myModel = loadModel("triceratops.obj", true);
}

function setup() {
    createCanvas(680, 480, WEBGL);
    noStroke();
    buildUI();
    initGrids();
}

function buildUI() {
    createP("Patrones:").style("margin", "6px 0 2px 0");
    for (const p of presets) {
        createButton(p.name).mousePressed(() => {
            feed = p.f; kill = p.k;
            feedSlider.value(feed); killSlider.value(kill);
            initGrids();
        });
    }

    createP("Paleta:").style("margin", "10px 0 2px 0");
    for (let i = 0; i < palettes.length; i++) {
        const idx = i;
        createButton(palettes[i].name).mousePressed(() => { paletteIdx = idx; });
    }

    createP("Feed:").style("margin", "10px 0 0 0");
    feedSlider = createSlider(0.01, 0.1, feed, 0.0005);
    feedSlider.style("width", "200px");
    feedSlider.input(() => { feed = feedSlider.value(); });

    createP("Kill:").style("margin", "6px 0 0 0");
    killSlider = createSlider(0.045, 0.07, kill, 0.0005);
    killSlider.style("width", "200px");
    killSlider.input(() => { kill = killSlider.value(); });

    createP("Brillo:").style("margin", "6px 0 0 0");
    shinySlider = createSlider(1, 300, 100, 1);
    shinySlider.style("width", "200px");

    createP("Resolucion:").style("margin", "6px 0 0 0");
    resSlider = createSlider(60, 260, TEX, 20);
    resSlider.style("width", "200px");
    resSlider.changed(() => { TEX = resSlider.value(); initGrids(); });

    lightCheckbox = createCheckbox(" Iluminacion", true);
    lightCheckbox.style("margin-top", "6px");
    lightCheckbox.changed(() => { lightsOn = lightCheckbox.checked(); });

    createButton("Reiniciar (R)").mousePressed(initGrids).style("margin-top", "8px");
}

function initGrids() {
    texImg = createImage(TEX, TEX);
    gridA = new Array(TEX);
    gridB = new Array(TEX);
    nextA = new Array(TEX);
    nextB = new Array(TEX);
    for (let x = 0; x < TEX; x++) {
        gridA[x] = new Float32Array(TEX);
        gridB[x] = new Float32Array(TEX);
        nextA[x] = new Float32Array(TEX);
        nextB[x] = new Float32Array(TEX);
        for (let y = 0; y < TEX; y++) {
            gridA[x][y] = 1.0;
            gridB[x][y] = 0.0;
        }
    }
    seedRandomSpots(60, 2);
}

function seedRandomSpots(count, radius) {
    for (let s = 0; s < count; s++) {
        const cx = floor(random(radius, TEX - radius));
        const cy = floor(random(radius, TEX - radius));
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const x = cx + i, y = cy + j;
                if (x >= 0 && x < TEX && y >= 0 && y < TEX) {
                    gridB[x][y] = 1.0;
                }
            }
        }
    }
}

function reactionDiffusion() {
    for (let x = 1; x < TEX - 1; x++) {
        const gAx = gridA[x], gBx = gridB[x];
        const gAxm = gridA[x - 1], gAxp = gridA[x + 1];
        const gBxm = gridB[x - 1], gBxp = gridB[x + 1];
        const nAx = nextA[x], nBx = nextB[x];
        for (let y = 1; y < TEX - 1; y++) {
            const a = gAx[y];
            const b = gBx[y];

            const lapA = -a +
                0.2 * (gAxm[y] + gAxp[y] + gAx[y - 1] + gAx[y + 1]) +
                0.05 * (gAxm[y - 1] + gAxm[y + 1] + gAxp[y - 1] + gAxp[y + 1]);

            const lapB = -b +
                0.2 * (gBxm[y] + gBxp[y] + gBx[y - 1] + gBx[y + 1]) +
                0.05 * (gBxm[y - 1] + gBxm[y + 1] + gBxp[y - 1] + gBxp[y + 1]);

            const abb = a * b * b;
            let na = a + (dA * lapA - abb + feed * (1 - a)) * dt;
            let nb = b + (dB * lapB + abb - (kill + feed) * b) * dt;

            nAx[y] = na < 0 ? 0 : na > 1 ? 1 : na;
            nBx[y] = nb < 0 ? 0 : nb > 1 ? 1 : nb;
        }
    }
    let tA = gridA; gridA = nextA; nextA = tA;
    let tB = gridB; gridB = nextB; nextB = tB;
}

function updateTexture() {
    const pal = palettes[paletteIdx];
    const ca = pal.a, cb = pal.b;
    texImg.loadPixels();
    let idx = 0;
    for (let y = 0; y < TEX; y++) {
        for (let x = 0; x < TEX; x++) {
            let t = gridA[x][y] - gridB[x][y];
            t = t < 0 ? 0 : t > 1 ? 1 : t;
            texImg.pixels[idx] = cb[0] + (ca[0] - cb[0]) * t;
            texImg.pixels[idx + 1] = cb[1] + (ca[1] - cb[1]) * t;
            texImg.pixels[idx + 2] = cb[2] + (ca[2] - cb[2]) * t;
            texImg.pixels[idx + 3] = 255;
            idx += 4;
        }
    }
    texImg.updatePixels();
}

function draw() {
    for (let i = 0; i < STEPS; i++) reactionDiffusion();
    updateTexture();

    background(40);
    orbitControl();

    if (lightsOn) {
        ambientLight(60);
        directionalLight(255, 255, 255, 0.4, 0.6, -0.8);
        pointLight(200, 200, 255, 150, -150, 300);
        specularMaterial(255);
        shininess(shinySlider.value());
    }

    rotateZ(PI);
    rotateY(HALF_PI + frameCount / 100);
    scale(2.2);

    texture(texImg);
    model(myModel);
}

function keyPressed() {
    if (key === 'r' || key === 'R') initGrids();
}
