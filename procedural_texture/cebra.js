let myModel, myTexture, shaders, sh;

function setup() {
  createCanvas(680, 480, WEBGL);
  
  myModel = loadModel("model.obj", true);
  myTexture = loadImage("texture.jpg");
  
  shaders = [
    createShader(vert, pixelFrag),
    createShader(vert, edgeFrag),
    createShader(vert, tvFrag),
    createShader(vert, customFrag)
  ]
  sh = shaders[shaders.length-1];
  
  noStroke();
}

function draw() {
  background(128);
  orbitControl();
  
  rotateX(PI/2);
  rotateZ(-PI/4 + frameCount/100);
  
  scale(1.7);
  
  // texture(myTexture);
  shader(sh);
  sh.setUniform("sTexture", myTexture);
  sh.setUniform("uResolution", [width, height]);
  sh.setUniform("uMouse", [mouseX, mouseY]);
  sh.setUniform("uTime", frameCount / 100);
  model(myModel);
}

function keyPressed(){
  const index = parseInt(key) - 1;
  if (index >=0 && index < shaders.length){
    sh = shaders[index];
  }
}

const vert = `
  precision highp float;
  
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  
  varying vec2 vTexCoord;
  
  void main(){
    vTexCoord = aTexCoord;
    
    gl_Position = uProjectionMatrix
     * uModelViewMatrix
     * vec4(aPosition, 1.0);
  }
`;

const pixelFrag = `
  precision highp float;
  
  uniform sampler2D sTexture;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  
  varying vec2 vTexCoord;
  
  void main(){
    float size = uMouse.x / 50.0;
    vec2 uv = floor(vTexCoord * uResolution / size)
      * size / uResolution;
    
    vec4 col = texture2D(sTexture, uv);
    gl_FragColor = col; 
  }
`;

const edgeFrag = `
  precision highp float;
  
  uniform sampler2D sTexture;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  
  varying vec2 vTexCoord;
  
  void main(){
    float kernel[9];
    for (int i=0; i<9; i++){
      kernel[i] = -1.0;
    }
    kernel[4] = 8.0;
    
    vec2 offset[9];
    for (int i=-1; i<=1; i++){
      for (int j=-1; j<=1; j++){
        offset[(i+1)*3 + j+1] = vec2(i, j);
      }
    }
    
    vec4 col = vec4(0.0);
    for (int i=0; i<9; i++){
      col += kernel[i]
        * texture2D(sTexture,
            vTexCoord + offset[i] / uResolution);
    }
    
    float threshold = uMouse.x / uResolution.x;
    col.rgb = vec3((col.r + col.g + col.b) / 3.0);
    col = step(threshold, col);
    
    gl_FragColor = col;
  }
`;

const tvFrag = `
  precision highp float;
  
  uniform sampler2D sTexture;
  uniform float uTime;
  uniform vec2 uMouse;
  uniform vec2 uResolution;
  
  varying vec2 vTexCoord;
  
  void main(){
    vec3 col = texture2D(sTexture, vTexCoord).rgb;
    col = vec3(col.r + col.g + col.b) / 3.0;
    
    float noise = fract(
      sin(gl_FragCoord.y * 100.0 + uTime));
    col.rgb += (noise - 0.5)
      * (uMouse.x / uResolution.x) * 2.0;
    
    gl_FragColor = vec4(col, 1.0); 
  }
`;

const customFrag = `
  precision highp float;
  
  void main(){
    gl_FragColor = vec4(1.0);
  }
`;