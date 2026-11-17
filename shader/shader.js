// poner este código en https://editor.p5js.org/

let sh;
let img;
let nearS, farS;
let nearLabel, farLabel;

let vert = `
  precision highp float;
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  varying vec2 vTex;
  
  void main() {
    vTex = aTexCoord;
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
  }
`;

let frag = `
  precision mediump float;
  varying vec2 vTex;
  uniform sampler2D uTex;
  uniform vec4 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  
  void main() {
    vec4 c = texture2D(uTex, vTex);
    float fog = smoothstep(fogNear, fogFar, gl_FragCoord.z);
    gl_FragColor = mix(c, fogColor, fog);
  }
`;

function setup() {
    createCanvas(700, 450, WEBGL);
    noStroke();
    sh = createShader(vert, frag);

    // textura simple pq me da pereza hacer otra
    img = createGraphics(64, 64);
    img.background(255);
    img.fill(50, 120, 255);
    img.rect(0, 0, 32, 32);
    img.rect(32, 32, 32, 32);

    nearS = createSlider(0, 1, 0.9, 0.001);
    nearS.position(80, height + 10);
    nearLabel = createP("Fog near");
    nearLabel.position(10, height - 5);

    farS = createSlider(0, 1, 0.983, 0.001);
    farS.position(80, height + 40);
    farLabel = createP("Fog far");
    farLabel.position(10, height + 25);
}

function draw() {
    background(204, 230, 255);

    perspective(PI / 3, width / height, 1, 2000);
    camera(0, 0, 2, 0, 0, 0, 0, 1, 0);

    shader(sh);
    sh.setUniform("uTex", img);
    sh.setUniform("fogColor", [0.8, 0.9, 1, 1]);
    sh.setUniform("fogNear", nearS.value());
    sh.setUniform("fogFar", farS.value());

    let t = millis() / 1000;

    for (let i = 0; i <= 40; i++) {
        push();
        translate(-2 + i * 1.1, 0, -i * 1.4);
        rotateX(t + i * 0.1);
        rotateY(t + i * 0.1);
        box(1);
        pop();
    }
}
