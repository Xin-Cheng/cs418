/**
 * @author Xin Cheng <xcheng11@illinois.edu>
 */
// Code adapted from https://courses.engr.illinois.edu/cs418/fa2017/

var gl;
var canvas;
var shaderProgram;

// Create places to store vertex positions
var blueVertexPositionBuffer;
var orangeVertexPositionBuffer;


// Create places to store vertex colors
var blueColorBuffer;
var orangeColorBuffer;

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
// Data of vertex positions
 var blueVertices = [
  -0.90,0.95,0.00,-0.90,0.64,0.00,0.88,0.95,0.00,-0.90,0.64,0.00,0.88,0.95,0.00,0.88,0.64,0.00,-0.72,0.64,0.00,-0.72,-0.31,0.00,-0.34,0.64,0.00,-0.72,-0.31,0.00,-0.34,0.64,0.00,-0.34,-0.31,0.00,0.32,0.64,0.00,0.32,-0.31,0.00,0.71,0.64,0.00,0.32,
  -0.31,0.00,0.71,0.64,0.00,0.71,-0.31,0.00,-0.34,0.38,0.00,-0.34,-0.06,0.00,-0.19,0.38,0.00,-0.34,-0.06,0.00,-0.19,0.38,0.00,-0.19,-0.06,0.00,0.17,0.38,0.00,0.17,-0.06,0.00,0.32,0.38,0.00,0.17,-0.06,0.00,0.32,0.38,0.00,0.32,-0.06,0.00
];
var orangeVertices = [
  -0.72,-0.38,0.00,-0.72,-0.50,0.00,-0.60,-0.38,0.00,-0.72,-0.50,0.00,-0.60,-0.38,0.00,-0.60,-0.58,0.00,-0.46,-0.38,0.00,-0.46,-0.66,0.00,-0.34,-0.38,0.00,-0.46,-0.66,0.00,-0.34,-0.38,0.00,-0.34,-0.74,0.00,-0.20,-0.38,0.00,-0.20,-0.83,0.00,-0.08,-0.38,0.00,
  -0.20,-0.83,0.00,-0.08,-0.38,0.00,-0.08,-0.91,0.00,0.06,-0.38,0.00,0.06,-0.91,0.00,0.18,-0.38,0.00,0.06,-0.91,0.00,0.18,-0.38,0.00,0.18,-0.83,0.00,0.32,-0.38,0.00,0.32,-0.74,0.00,0.45,-0.38,0.00,0.32,-0.74,0.00,0.45,-0.38,0.00,0.45,-0.66,0.00,0.58,-0.38,0.00,
  0.58,-0.58,0.00,0.71,-0.38,0.00,0.58,-0.58,0.00,0.71,-0.38,0.00,0.71,-0.50,0.00  
];
function setupBuffers() {
  // Fill position buffers with their position data respectively
  blueVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, blueVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(blueVertices), gl.STATIC_DRAW);
  blueVertexPositionBuffer.itemSize = 3;
  blueVertexPositionBuffer.numberOfItems = 30;
  
  orangeVertexPositionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, orangeVertexPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(orangeVertices), gl.STATIC_DRAW);
  orangeVertexPositionBuffer.itemSize = 3;
  orangeVertexPositionBuffer.numberOfItems = 36;

  // Color data
  var blue = [0.07, 0.16, 0.29, 1.0];
  var orange = [0.91, 0.29, 0.22, 1.0];
  var blueColors = [];
  var orangeColors = [];
  for(var i = 0; i < 36; i++) {
    if(i < 30) {
      blueColors = blueColors.concat(blue);
    }
    orangeColors = orangeColors.concat(orange);
  }

  // Fill the color buffers with their color data respectively
  blueColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, blueColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(blueColors), gl.STATIC_DRAW);
  blueColorBuffer.itemSize = 4;
  blueColorBuffer.numItems = 30;

  orangeColorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, orangeColorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(orangeColors), gl.STATIC_DRAW);
  orangeColorBuffer.itemSize = 4;
  orangeColorBuffer.numItems = 36;
}

/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() {
  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  mat4.identity(mvMatrix);

  // Draw orange bands of the badge
  gl.bindBuffer(gl.ARRAY_BUFFER, orangeVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
    orangeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, orangeColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
    orangeColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, orangeVertexPositionBuffer.numberOfItems);

  // Draw blue part of the badge
  mat4.rotateY(mvMatrix, mvMatrix, degToRad(rotAngle));
  gl.bindBuffer(gl.ARRAY_BUFFER, blueVertexPositionBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute,
    blueVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, blueColorBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexColorAttribute,
    blueColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

  setMatrixUniforms();
  gl.drawArrays(gl.TRIANGLES, 0, blueVertexPositionBuffer.numberOfItems);
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

  // Animation that does not use a uniform affine transformation
  lastTime = timeNow;
  sinscalar += 0.1;
  gl.bindBuffer(gl.ARRAY_BUFFER, orangeVertexPositionBuffer);
  var newVertices = [];
  for(var i = 0; i < 36 * 3; i+=3) {
    var point = [orangeVertices[i] , orangeVertices[i+1] + Math.sin(sinscalar+orangeVertices[i])*0.05,  0.0];
    newVertices = newVertices.concat(point);
  }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(newVertices), gl.STATIC_DRAW);
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

