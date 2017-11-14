
var gl;
var canvas;

var shaderProgram;

// Create a place to store the texture coords for the mesh
var cubeTCoordBuffer;

// Create a place to store terrain geometry
var cubeVertexBuffer;

// Create a place to store the triangles
var cubeTriIndexBuffer;

// Create places to store teapot geometry and triangles
var teapotVertexBuffer;
var teapotTriIndexBuffer;
var teapotNormalBuffer;

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

// Create the normal
var nMatrix = mat3.create();

var mvMatrixStack = [];

// Create a place to store the texture
var frontImage;
var backImage;
var topImage;
var bottomImage;
var rightImage;
var leftImage;

var frontTexture;
var backTexture;
var topTexture;
var bottomTexture;
var rightTexture;
var leftTexture;

// View parameters
var eyePt = vec3.fromValues(0.0,0.0,5.0);
var viewDir = vec3.fromValues(0.0,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

// For animation 
var then =0;
var modelXRotationRadians = degToRad(0);
var modelYRotationRadians = degToRad(0);

/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

/**
 * Sends material information to the shader
 * @param {Float32Array} a diffuse material color
 * @param {Float32Array} a ambient material color
 * @param {Float32Array} a specular material color 
 * @param {Float32} the shininess exponent for Phong illumination
 */
function uploadMaterialToShader(dcolor, acolor, scolor,shiny) {
  gl.uniform3fv(shaderProgram.uniformDiffuseMaterialColor, dcolor);
  gl.uniform3fv(shaderProgram.uniformAmbientMaterialColor, acolor);
  gl.uniform3fv(shaderProgram.uniformSpecularMaterialColor, scolor);
    
  gl.uniform1f(shaderProgram.uniformShininess, shiny);
}
/**
 * Sends light information to the shader
 * @param {Float32Array} loc Location of light source
 * @param {Float32Array} a Ambient light strength
 * @param {Float32Array} d Diffuse light strength
 * @param {Float32Array} s Specular light strength
 */
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}
/**
 * Pushes matrix onto modelview matrix stack
 */
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


/**
 * Pops matrix off of modelview matrix stack
 */
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadProjectionMatrixToShader();
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
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
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
function setupShaders(vshader,fshader) {
  vertexShader = loadShaderFromDOM(vshader);
  fragmentShader = loadShaderFromDOM(fshader);
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  if(vshader == "shader-vs") {
    shaderProgram.texCoordAttribute = gl.getAttribLocation(shaderProgram, "aTexCoord");
    // console.log("Tex coord attrib: ", shaderProgram.texCoordAttribute);
    gl.enableVertexAttribArray(shaderProgram.texCoordAttribute);
    shaderProgram.uniformFace = gl.getUniformLocation(shaderProgram, "uFace");
  }
  
  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  // console.log("Vertex attrib: ", shaderProgram.vertexPositionAttribute);
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    
  if(vshader == "shader-teapot-vs") {
    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
    shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
    shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
    shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    // shaderProgram.uniformDiffuseMaterialColor = gl.getUniformLocation(shaderProgram, "uDiffuseMaterialColor");
    // shaderProgram.uniformAmbientMaterialColor = gl.getUniformLocation(shaderProgram, "uAmbientMaterialColor");
    // shaderProgram.uniformSpecularMaterialColor = gl.getUniformLocation(shaderProgram, "uSpecularMaterialColor");
  
    // shaderProgram.uniformShininess = gl.getUniformLocation(shaderProgram, "uShininess");   
  }  
}

/**
 * Draw a cube based on buffers.
 */
function drawCube(){
  var size = 2;
  var count = 6;
  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
  // Set the texture coordinates attribute for the vertices.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);
  gl.vertexAttribPointer(shaderProgram.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
  // Specify the texture to map onto the faces.
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, frontTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler0"), 0);
  gl.uniform1f(shaderProgram.uniformFace, 0.0);
  // Draw the cube.
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0*size);

  // Back
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, backTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler1"), 1);
  gl.uniform1f(shaderProgram.uniformFace, 1.0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 6*size);

  // Top
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, topTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler2"), 2);
  gl.uniform1f(shaderProgram.uniformFace, 2.0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 12*size);

  // Bottom
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, bottomTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler3"), 3);
  gl.uniform1f(shaderProgram.uniformFace, 3.0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 18*size);

  // Right
  gl.activeTexture(gl.TEXTURE4);
  gl.bindTexture(gl.TEXTURE_2D, rightTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler4"), 4);
  gl.uniform1f(shaderProgram.uniformFace, 4.0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 24*size);

  // Left
  gl.activeTexture(gl.TEXTURE5);
  gl.bindTexture(gl.TEXTURE_2D, leftTexture);
  gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler5"), 5);
  gl.uniform1f(shaderProgram.uniformFace, 5.0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 30*size);
}

/**
 * Draws a teapot from the teapot buffer
 */
function drawTeapot() {
  gl.polygonOffset(0,0);
  // Bind vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, teapotVertexBuffer.itemSize, gl.FLOAT, false, 0, 0);
 
  // Bind normal buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, teapotNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);   
     
  //Draw 
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
  gl.drawElements(gl.TRIANGLES, teapotTriIndexBuffer.numItems, gl.UNSIGNED_SHORT,0);  
}

/**
 * handle orbiting
 */
var xdir = 0;
var ydir = 0;
var zdir = 0;

function orbit(value, id) {
  if(id == "xrange")
    xdir += value;
  if(id == "yrange")
    ydir += value;
  if(id == "zrange")
    zdir += value;
}
/**
 * Draw call that applies matrix transformations to cube
 */
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(85), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);
 
    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);  

      // draw teapot
      setupShaders("shader-teapot-vs", "shader-teapot-fs");
      mvPushMatrix();
      // mat4.identity(mvMatrix);
      vec3.set(transformVec,0.1,0.0,4.5);
      
      mat4.translate(mvMatrix, mvMatrix,transformVec);
  
      var scaler = 0.1;
      mat4.scale(mvMatrix,mvMatrix, [scaler, -scaler, scaler]);

      mat4.rotateX(mvMatrix,mvMatrix,degToRad(xdir));
      mat4.rotateY(mvMatrix,mvMatrix,degToRad(ydir));
      mat4.rotateZ(mvMatrix,mvMatrix,degToRad(zdir));
 
      
      uploadLightsToShader([20,20,20],[1.0,1.0,1.0],[0.79,0.88,1.0],[1.0,1.0,1.0]);
      // uploadMaterialToShader([R,G,B],[R,G,B],[1.0,1.0,1.0],shiny);
  
      uploadNormalMatrixToShader(); 
      setMatrixUniforms();  
      if(isLoaded) {
        drawTeapot();
      }
      // quaternion = quat.fromEuler(quaternion, 0.0, 0.0, 0.0);
      mvPopMatrix();
    
    // draw skybox
    setupShaders("shader-vs", "shader-fs");
    mvPushMatrix();
    vec3.set(transformVec,0.0,0.0,5.0);
    mat4.translate(mvMatrix, mvMatrix,transformVec);

    setMatrixUniforms();    
    drawCube();
    mvPopMatrix();
}

/**
 * Animation to be called from tick. Updates global rotation values.
 */
function animate() {
    if (then==0)
    {
        then = Date.now();
    }
    else
    {
        now=Date.now();
        // Convert to seconds
        now *= 0.001;
        // Subtract the previous time from the current time
        var deltaTime = now - then;
        // Remember the current time for the next frame.
        then = now;

        //Animate the rotation
        modelXRotationRadians += 1.2 * deltaTime;
        modelYRotationRadians += 0.7 * deltaTime;  
    }
}

/**
 * Creates texture for application to cube.
 */
function setupTextures() {
  frontImage = new Image();
  backImage = new Image();
  topImage = new Image();
  bottomImage = new Image();
  rightImage = new Image();
  leftImage = new Image();

  frontTexture = gl.createTexture();
  backTexture = gl.createTexture();
  topTexture = gl.createTexture();
  bottomTexture = gl.createTexture();
  rightTexture = gl.createTexture();
  leftTexture = gl.createTexture();

  fillTexture(frontImage, frontTexture, "images/pos-z.png");
  fillTexture(backImage, backTexture, "images/neg-z.png");
  fillTexture(topImage, topTexture, "images/pos-y.png");
  fillTexture(bottomImage, bottomTexture, "images/neg-y.png");
  fillTexture(rightImage, rightTexture, "images/pos-x.png");
  fillTexture(leftImage, leftTexture, "images/neg-x.png");
}

function fillTexture(image, texture, src) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // Fill the texture with a 1x1 blue pixel.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
              new Uint8Array([0, 0, 255, 255]));
  image.onload = function() { handleTextureLoaded(image, texture); }
  image.src = src;
}
/**
 * @param {number} value Value to determine whether it is a power of 2
 * @return {boolean} Boolean of whether value is a power of 2
 */
function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

/**
 * Texture handling. Generates mipmap and sets texture parameters.
 * @param {Object} image Image for cube application
 * @param {Object} texture Texture for cube application
 */
function handleTextureLoaded(image, texture) {
  console.log("handleTextureLoaded, image = " + image);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,gl.UNSIGNED_BYTE, image);
  // Check if the image is a power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
     // Yes, it's a power of 2. Generate mips.
     gl.generateMipmap(gl.TEXTURE_2D);
     gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
     console.log("Loaded power of 2 texture");
  } else {
     // No, it's not a power of 2. Turn of mips and set wrapping to clamp to edge
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
     gl.texParameteri(gl.TETXURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
     console.log("Loaded non-power of 2 texture");
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
}


/**
 * Sets up buffers for teapot.
 */
/**
 * Populate buffers with data
 */
var teapotVertices = [];
var teapotFaces = [];
var teapotNormals = [];
var vertexNumber = 0;
var faceNumer = 0;
var isLoaded = false;
function parseObjData(teapotData) {
  var dataArray = Array.from(teapotData).join('').split('\n');
  var size = dataArray.length;
  for(var i = 0; i < size; i++) {
    var linValue = dataArray[i].split(' '); 
    var value;
    if (linValue[0] == "v") {
      vertexNumber++;
      value = linValue.slice(1, 4)
      for(var j = 0; j < 3; j++) {value[j] = parseFloat(value[j]);}
      teapotVertices = teapotVertices.concat(value);
      teapotNormals.push(0);
      teapotNormals.push(0);
      teapotNormals.push(0);
      // console.log(value.toString());
    } else if(linValue[0] == "f") {
      faceNumer++;
      value = linValue.slice(2, 5)
      for(var j = 0; j < 3; j++) {value[j] = parseInt(value[j])-1;}
      teapotFaces = teapotFaces.concat(value);
    }
  }
  isLoaded = true;
  setupTeapotBuffers();
  console.log(faceNumer);
  // console.log(teapotFaces.toString());
  computePerVertexNormal(teapotVertices, teapotFaces, teapotNormals);
}

/**
 * Compute per-vertex normals
 * @param {Array} vertexArray array that contains vertices generated
 * @param {Array} faceArray array of faces for triangles
 * @param {Array} normalArray array of normals for triangles
 */
function computePerVertexNormal(vertexArray, faceArray, normalArray)
{
    for(var i = 0; i < faceArray.length-2; i+=3)
    {
        var firstV = vec3.fromValues(vertexArray[faceArray[i]*3],vertexArray[faceArray[i]*3+1],vertexArray[faceArray[i]*3+2]);
        var secondV = vec3.fromValues(vertexArray[faceArray[i+1]*3],vertexArray[faceArray[i+1]*3+1],vertexArray[faceArray[i+1]*3+2]);
        var thirdV = vec3.fromValues(vertexArray[faceArray[i+2]*3],vertexArray[faceArray[i+2]*3+1],vertexArray[faceArray[i+2]*3+2]);

        // Calculate normal
        var normal = vec3.create();
        var v1 = vec3.create();
        var v2 = vec3.create();
        vec3.subtract(v1, secondV, firstV);
        vec3.subtract(v2, thirdV, firstV);
        vec3.cross(normal, v1, v2);

        // Add normal to each vertex
        for(var j=0; j<3; j++)
        {
            normalArray[faceArray[i+j]*3] += normal[0];
            normalArray[faceArray[i+j]*3+1] += normal[1];
            normalArray[faceArray[i+j]*3+2] += normal[2];
        }
    }

    // Normalize the normal vector
    for(var i=0; i<normalArray.length-2; i+=3)
    {
        var normal = vec3.create();
        vec3.normalize(normal, vec3.fromValues(normalArray[i], normalArray[i+1], normalArray[i+2]));
        normalArray[i] = normal[0];
        normalArray[i+1] = normal[1];
        normalArray[i+2] = normal[2];
    }
    console.log(normalArray);
    console.log(normalArray.length);
}

/**
 * Sets up buffers for teapot and Populate buffers with data
 */
function setupTeapotBuffers() {
  // Create a buffer for the teapot's vertices.
  teapotVertexBuffer = gl.createBuffer();
  // Select the teapotVertexBuffer as the one to apply vertex operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, teapotVertexBuffer);
  // Now pass the list of vertices into WebGL to build the shape.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotVertices), gl.STATIC_DRAW);
  teapotVertexBuffer.itemSize = 3;
  teapotVertexBuffer.numItems = vertexNumber;

  // Build the element array buffer; this specifies the indices into the vertex array for each face's vertices.
  teapotTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, teapotTriIndexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(teapotFaces), gl.STATIC_DRAW);
  teapotTriIndexBuffer.itemSize = 1;
  teapotTriIndexBuffer.numItems = faceNumer;

  // Build the normal buffer
  teapotNormalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, teapotNormalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(teapotNormals), gl.STATIC_DRAW);
  teapotNormalBuffer.itemSize = 3;
  teapotNormalBuffer.numItems = vertexNumber;
  console.log('cdd');
}
/**
 * Sets up buffers for cube and Populate buffers with data
 */
function setupBuffers() {
  // Create a buffer for the cube's vertices.
  cubeVertexBuffer = gl.createBuffer();
  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  // Now create an array of vertices for the cube.

  var vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,

    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,

    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,

    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,

    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,

    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Map the texture onto the cube's faces.
  cubeTCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeTCoordBuffer);

  var textureCoordinates = [
    // Front
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Back
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,    
    0.0,  0.0,
    // Top
    0.0,  1.0,
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    // Bottom
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    // Right
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0,
    0.0,  0.0,
    // Left
    0.0,  0.0,
    1.0,  0.0,
    1.0,  1.0,
    0.0,  1.0
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates),
                gl.STATIC_DRAW);

  // Build the element array buffer; this specifies the indices
  // into the vertex array for each face's vertices.

  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}


/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  setupBuffers();
  setupTextures();
  readTextFile("teapot_0.obj", parseObjData);  
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