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
    vertexArray[2] = randomNumber();
    vertexArray[vertexArray.length - 1] = randomNumber();
    vertexArray[3*n-1] = randomNumber();
    vertexArray[vertexArray.length+2-3*n] = randomNumber();
    diamondSquare(0, vertexArray.length-1, n + 1, n + 1, vertexArray, 1);
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
 * @param {number} topLeft the index of top left coner
 * @param {number} bottomRight the index of bottom right coner
 * @param {number} size grid size
 * @param {Array} vertexArray array that contains vertices generated
 * @param {number} scale sale for random number
 */
function diamondSquare(topLeft, bottomRight, size, gridSize, vertexArray, scale)
{
    if(size == 2)
    {
        return;
    }
    
    var tlIndex = topLeft + 2;
    var trIndex = topLeft + 3*size -1;
    var blIndex = bottomRight-(3*size-1)+2;
    var brIndex = bottomRight;
    var mid = (2*topLeft + 2*bottomRight)/4 + 1;
    // Perform diamond step
    vertexArray[mid] = (vertexArray[tlIndex]+vertexArray[brIndex]+vertexArray[trIndex]+vertexArray[blIndex])/4+randomNumber()*scale;
    // Perform square step
    // Top
    var topIndex = (2*topLeft + size*3 + 1)/2;
    var topTopValue = 0;
    var ttIndex = 2*topIndex - mid;
    if(ttIndex >= 0 && ttIndex < vertexArray.length && isInSameColumn(ttIndex, topIndex, gridSize))
    {
        topTopValue = vertexArray[ttIndex];
    }
    vertexArray[topIndex] = (topTopValue+vertexArray[trIndex]+vertexArray[mid]+vertexArray[tlIndex])/4+randomNumber()*scale;   
    // Right
    var rightIndex = (topLeft + size*3 - 1 + bottomRight)/2;
    var rightRightValue = 0;
    var rrIndex = 2*mid - rightIndex;
    if(rrIndex >= 0 && rrIndex < vertexArray.length && isInSameRow(rrIndex, rightIndex, gridSize))
    {
        rightRightValue = vertexArray[rrIndex];
    }
    vertexArray[rightIndex] = (vertexArray[trIndex]+rightRightValue+vertexArray[brIndex]+vertexArray[mid])/4+randomNumber()*scale;
    // Bottom
    var bottomIndex = (2*bottomRight-(3*size-1))/2 + 1;
    var bottomBottomValue = 0;
    var bbIndex = 2*mid - bottomIndex;
    if(bbIndex >= 0 && bbIndex < vertexArray.length && isInSameColumn(bbIndex, bottomIndex, gridSize))
    {
        bottomBottomValue = vertexArray[bbIndex];
    }
    vertexArray[bottomIndex] = (vertexArray[mid]+vertexArray[brIndex]+bottomBottomValue+vertexArray[blIndex])/4+randomNumber()*scale;
    // Left
    var leftIndex = (topLeft+bottomRight-(3*size-1))/2 + 2;
    var leftLeftValue = 0;
    var llIndex = 2*mid - leftIndex;
    if(llIndex >=0 && llIndex < vertexArray.length && isInSameRow(llIndex, leftIndex, gridSize))
    {
        leftLeftValue = vertexArray[llIndex];
    }
    vertexArray[leftIndex] = (vertexArray[tlIndex]+vertexArray[mid]+vertexArray[blIndex]+leftLeftValue)/4+randomNumber()*scale;
    
    // Apply diamond square algorithm recursively
    var reducer = 1.6;
    diamondSquare(topLeft, mid, (size+1)/2, gridSize, vertexArray, scale/reducer);
    diamondSquare(topIndex - 2, rightIndex, (size+1)/2, gridSize, vertexArray, scale/reducer);
    diamondSquare(leftIndex - 2, bottomIndex, (size+1)/2, gridSize, vertexArray, scale/reducer);
    diamondSquare(mid - 2, bottomRight, (size+1)/2, gridSize, vertexArray, scale/reducer);
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
    return Boolean(Math.floor(first/(gridSize*3)) == Math.floor(first/(gridSize*3)));
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
    return Boolean(first%(gridSize*3) == second%(gridSize*3));
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
