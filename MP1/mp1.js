var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;


// Create a place to store vertex colors
var vertexColorBuffer;

var mvMatrix = mat4.create();
var rotAngle = 0;
var lastTime = 0;


/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}


/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
  return degrees * Math.PI / 180;
}


/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i = 0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch (e) { }
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);

  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }

  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }

  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

/**
 * Setup the fragment and vertex shaders
 */
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");

  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
  gl.enableVertexAttribArray(shaderProgram.vertexColorAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");

}

/**
 * Populate buffers with data
 */
var triangleVertices = [
  -0.90,0.95,0.00,
  -0.90,0.64,0.00,
  0.88,0.95,0.00,
  -0.90,0.64,0.00,
  0.88,0.95,0.00,
  0.88,0.64,0.00,
  -0.72,0.64,0.00,
  -0.72,-0.31,0.00,
  -0.34,0.64,0.00,
  -0.72,-0.31,0.00,
  -0.34,0.64,0.00,
  -0.34,-0.31,0.00,
  0.32,0.64,0.00,
  0.32,-0.31,0.00,
  0.71,0.64,0.00,
  0.32,-0.31,0.00,
  0.71,0.64,0.00,
  0.71,-0.31,0.00,
  -0.34,0.38,0.00,
  -0.34,-0.06,0.00,
  -0.19,0.38,0.00,
  -0.34,-0.06,0.00,
  -0.19,0.38,0.00,
  -0.19,-0.06,0.00,
  0.17,0.38,0.00,
  0.17,-0.06,0.00,
  0.32,0.38,0.00,
  0.17,-0.06,0.00,
  0.32,0.38,0.00,
  0.32,-0.06,0.00,
  -0.72,-0.38,0.00,
  -0.72,-0.50,0.00,
  -0.60,-0.38,0.00,
  -0.72,-0.50,0.00,
  -0.60,-0.38,0.00,
  -0.60,-0.58,0.00,
  -0.46,-0.38,0.00,
  -0.46,-0.66,0.00,
  -0.34,-0.38,0.00,
  -0.46,-0.66,0.00,
  -0.34,-0.38,0.00,
  -0.34,-0.74,0.00,
  -0.20,-0.38,0.00,
  -0.20,-0.83,0.00,
  -0.08,-0.38,0.00,
  -0.20,-0.83,0.00,
  -0.08,-0.38,0.00,
  -0.08,-0.91,0.00,
  0.06,-0.38,0.00,
  0.06,-0.91,0.00,
  0.18,-0.38,0.00,
  0.06,-0.91,0.00,
  0.18,-0.38,0.00,
  0.18,-0.83,0.00,
  0.32,-0.38,0.00,
  0.32,-0.74,0.00,
  0.45,-0.38,0.00,
  0.32,-0.74,0.00,
  0.45,-0.38,0.00,
  0.45,-0.66,0.00,
  0.58,-0.38,0.00,
  0.58,-0.58,0.00,
  0.71,-0.38,0.00,
  0.58,-0.58,0.00,
  0.71,-0.38,0.00,
  0.71,-0.50,0.00  
];
function setupBuffers() {
  vertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var number = 6*11;
  // Fill in the position data of badge
  
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = number;

  vertexColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

  // Build colors
  var blue = [0.07, 0.16, 0.29, 1.0];
  var orange = [0.91, 0.29, 0.22, 1.0];
  var colors = [];
  for(var i = 0; i < 66; i++) {
    if (i < 30) {
      colors = colors.concat(blue);
    }
    else {
      colors = colors.concat(orange);
    }
  }

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  vertexColorBuffer.itemSize = 4;
  vertexColorBuffer.numItems = number;
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  mat4.identity(mvMatrix);
  mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle));
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
    vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
    vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, vertexPositionBuffer.numberOfItems);
}

/**
 * Animation to be called from tick. Updates globals and performs animation for each tick.
 */
var sinscalar = 0;
function animate() {
  var timeNow = new Date().getTime();
  if (lastTime != 0) {
    var elapsed = timeNow - lastTime;
    rotAngle = (rotAngle + 1.0) % 360;
  }
  lastTime = timeNow;
  sinscalar += 0.1;
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
  var newVertices = [];
  for(var i = 0; i < 66 * 3; i+=3) {
    var point = [triangleVertices[i] , triangleVertices[i+1] + Math.sin(sinscalar+triangleVertices[i])*0.5,  0.0];
    newVertices = newVertices.concat(point);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(newVertices), gl.STATIC_DRAW);
  vertexPositionBuffer.itemSize = 3;
  vertexPositionBuffer.numberOfItems = 66;
}

/**
 * Startup function called from html code to start program.
 */
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  // Set clear color to white, fully opaque
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  tick();
}

/**
 * Tick called for every animation frame.
 */
function tick() {
  requestAnimFrame(tick);
  draw();
  animate();
}

