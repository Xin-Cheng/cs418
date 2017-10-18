/**
 * @author Xin Cheng <xcheng11@illinois.edu>
 * Code adapted from https://courses.engr.illinois.edu/cs418/fa2017/
 */
//-------------------------------------------------------------------------

/**
 * Iteratively generate terrain from numeric inputs
 * @param {number} n
 * @param {number} minX Minimum X value
 * @param {number} maxX Maximum X value
 * @param {number} minY Minimum Y value
 * @param {number} maxY Maximum Y value
 * @param {Array} vertexArray Array that will contain vertices generated
 * @param {Array} faceArray Array that will contain faces generated
 * @param {Array} normalArray Array that will contain normals generated
 * @return {number}
 */
function terrainFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray,normalArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(minY+deltaY*i);
           vertexArray.push(0);
           
           // Initialize normal array with zero
           normalArray.push(0);
           normalArray.push(0);
           normalArray.push(0);
       }

    var numT=0;
    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+1);
           faceArray.push(vid+n+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+1+n+1);
           faceArray.push(vid+n+1);
           numT+=2;
       }

    // Perform diamond square algorithm to set z values of each vertex
    // Initialize coner value to random value
    vertexArray[convertCoordinate(0, 0, n)] = Math.random();
    vertexArray[convertCoordinate(0, n, n)] = Math.random();
    vertexArray[convertCoordinate(n, 0, n)] = Math.random();
    vertexArray[convertCoordinate(n, n, n)] = Math.random();
    diamondSquare(n, n, vertexArray, 1);
    normalizeHeight(vertexArray);
    // Compute pervertex normal   
    computePerVertexNormal(vertexArray, faceArray, normalArray);

    return numT;
}

/**
 * Generates line values from faces in faceArray
 * @param {Array} faceArray array of faces for triangles
 * @param {Array} lineArray array of normals for triangles, storage location after generation
 */
function generateLinesFromIndexedTriangles(faceArray,lineArray)
{
    numTris=faceArray.length/3;
    for(var f=0;f<numTris;f++)
    {
        var fid=f*3;
        lineArray.push(faceArray[fid]);
        lineArray.push(faceArray[fid+1]);
        
        lineArray.push(faceArray[fid+1]);
        lineArray.push(faceArray[fid+2]);
        
        lineArray.push(faceArray[fid+2]);
        lineArray.push(faceArray[fid]);
    }
}

/**
 * Compute the height value of each vertex using diamond square algorithm
 * @param {number} step step of each iteration
 * @param {number} gridSize grid size: 2^n
 * @param {Array} vertexArray array that contains vertices generated
 * @param {number} scale sale for random number
 */
function diamondSquare(step, gridSize, vertexArray, scale)
{
    if(step == 1) {return;}
    var halfStep = step/2;
    // diamond step
    for(var i = step; i <= gridSize; i+=step)
    {
        for(var j = step; j <= gridSize; j+=step)
        {
            var index = convertCoordinate(i-halfStep, j-halfStep, gridSize);
            var topLeft = convertCoordinate(i-step, j-step, gridSize);
            var topRight = convertCoordinate(i-step, j, gridSize);
            var bottomLeft = convertCoordinate(i, j-step, gridSize);
            var bottomRight = convertCoordinate(i, j, gridSize);
            vertexArray[index] = (vertexArray[topLeft] + vertexArray[topRight] + vertexArray[bottomLeft] + vertexArray[bottomRight])/4 + Math.random()*scale;
        }
    }
    // square step
    var count = 0;
    for(var i = 0; i <= gridSize; i+=halfStep)
    {
        var j = count % 2 == 0 ? halfStep : 0; 
        for(; j <= gridSize; j+=step)
        {
            index = convertCoordinate(i, j, gridSize);
            var corner = 0;
            var top = convertCoordinate(i-halfStep, j, gridSize);
            var topValue = 0;
            if(top >= 0 && top < vertexArray.length && isInSameColumn(top, index, gridSize)){ topValue = vertexArray[top]; corner++; }
            var right = convertCoordinate(i, j+halfStep, gridSize);
            var rightValue = 0;
            if(right >= 0 && right < vertexArray.length && isInSameRow(right, index, gridSize)){ rightValue = vertexArray[right]; corner++; }
            var bottom = convertCoordinate(i+halfStep, j, gridSize);
            var bottomValue = 0;
            if(bottom >= 0 && bottom < vertexArray.length && isInSameColumn(bottom, index, gridSize)){ bottomValue = vertexArray[bottom]; corner++; }
            var left = convertCoordinate(i, j-halfStep, gridSize);
            var leftValue = 0;
            if(left >= 0 && left < vertexArray.length && isInSameRow(left, index, gridSize)){ leftValue = vertexArray[left]; corner++; }
            vertexArray[index] = (topValue + rightValue + bottomValue + leftValue)/corner + Math.random()*scale;
        }
        count++;
    }
    diamondSquare(halfStep, gridSize, vertexArray, scale*0.5);
}

function convertCoordinate(row, column, gridSize)
{
    return row*(gridSize+1)*3+(column+1)*3-1;
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
}

/**
 * Generate a random number
 * @return {number}
 */
function randomNumber()
{
    return Math.random();
}
/**
 * Check if two point are in the same row
 * @param {number} first the index of first vertex
 * @param {number} second the index of second vertex
 * @param {number} gridSize grid size
 * @return {Boolean}
 */
function isInSameRow(first, second, gridSize)
{
    return Boolean(Math.floor(first/((gridSize+1)*3)) == Math.floor(first/((gridSize+1)*3)));
}
/**
 * Check if two point are in the same column
 * @param {number} first the index of first vertex
 * @param {number} second the index of second vertex
 * @param {number} gridSize grid size
 * @return {Boolean}
 */
function isInSameColumn(first, second, gridSize)
{
    return Boolean(first%((gridSize+1)*3) == second%((gridSize+1)*3));
}

/**
 * Normalize the height value
 * @param {Array} vertexArray array that contains vertices generated
 */
function normalizeHeight(vertexArray)
{
    // Find the minimum and maximum value of height
    var min = Number.MAX_VALUE;
    var max = Number.MIN_VALUE;
    for(var i = 0; i < vertexArray.length-2; i+=3)
    {
        if(vertexArray[i+2] < min) {min = vertexArray[i+2];}
        if(vertexArray[i+2] > max) {max = vertexArray[i+2];}
    }

    // Normalize height value
    var diff = max - min;
    for(var i = 0; i < vertexArray.length-2; i+=3)
    {
        vertexArray[i+2] = (vertexArray[i+2] - min)/diff;
    }
}
