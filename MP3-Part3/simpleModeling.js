/**
 * @author Xin Cheng <xcheng11@illinois.edu>
 * Code adapted from https://courses.engr.illinois.edu/cs418/fa2017/
 */
//-------------------------------------------------------------------------
function planeFromIteration(n, minX,maxX,minY,maxY, vertexArray, faceArray)
{
    var deltaX=(maxX-minX)/n;
    var deltaY=(maxY-minY)/n;
    for(var i=0;i<=n;i++)
       for(var j=0;j<=n;j++)
       {
           vertexArray.push(minX+deltaX*j);
           vertexArray.push(maxY-deltaY*i);
           vertexArray.push(0);
       }

    for(var i=0;i<n;i++)
       for(var j=0;j<n;j++)
       {
           var vid = i*(n+1) + j;
           faceArray.push(vid);
           faceArray.push(vid+(n+1));
           faceArray.push(vid+1);
           
           faceArray.push(vid+1);
           faceArray.push(vid+(n+1));
           faceArray.push((vid+1) +(n+1));
       }
    //console.log(vertexArray);
    //console.log(faceArray);
}

//-------------------------------------------------------------------------

function pushVertex(v, vArray)
{
 for(i=0;i<3;i++)
 {
     vArray.push(v[i]);
 }  
}

//-------------------------------------------------------------------------
function divideTriangle(a,b,c,numSubDivs, vertexArray)
{
    if (numSubDivs>0)
    {
        var numT=0;
        var ab =  vec4.create();
        vec4.lerp(ab,a,b,0.5);
        var ac =  vec4.create();
        vec4.lerp(ac,a,c,0.5);
        var bc =  vec4.create();
        vec4.lerp(bc,b,c,0.5);
        
        numT+=divideTriangle(a,ab,ac,numSubDivs-1, vertexArray);
        numT+=divideTriangle(ab,b,bc,numSubDivs-1, vertexArray);
        numT+=divideTriangle(bc,c,ac,numSubDivs-1, vertexArray);
        numT+=divideTriangle(ab,bc,ac,numSubDivs-1, vertexArray);
        return numT;
    }
    else
    {
        // Add 3 vertices to the array
        
        pushVertex(a,vertexArray);
        pushVertex(b,vertexArray);
        pushVertex(c,vertexArray);
        return 1;
        
    }   
}

//-------------------------------------------------------------------------
function planeFromSubdivision(n, minX,maxX,minY,maxY, vertexArray)
{
    var numT=0;
    var va = vec4.fromValues(minX,minY,0,0);
    var vb = vec4.fromValues(maxX,minY,0,0);
    var vc = vec4.fromValues(maxX,maxY,0,0);
    var vd = vec4.fromValues(minX,maxY,0,0);
    
    numT+=divideTriangle(va,vb,vd,n, vertexArray);
    numT+=divideTriangle(vb,vc,vd,n, vertexArray);
    return numT;
    
}

//-----------------------------------------------------------
function sphDivideTriangle(a,b,c,numSubDivs, vertexArray,normalArray,tangentArray,bitangentArray)
{
    if (numSubDivs>0)
    {
        var numT=0;
        
        var ab =  vec4.create();
        vec4.lerp(ab,a,b,0.5);
        vec4.normalize(ab,ab);
        
        var ac =  vec4.create();
        vec4.lerp(ac,a,c,0.5);
        vec4.normalize(ac,ac);
        
        var bc =  vec4.create();
        vec4.lerp(bc,b,c,0.5);
        vec4.normalize(bc,bc);
        
        numT+=sphDivideTriangle(a,ab,ac,numSubDivs-1, vertexArray, normalArray,tangentArray,bitangentArray);
        numT+=sphDivideTriangle(ab,b,bc,numSubDivs-1, vertexArray, normalArray,tangentArray,bitangentArray);
        numT+=sphDivideTriangle(bc,c,ac,numSubDivs-1, vertexArray, normalArray,tangentArray,bitangentArray);
        numT+=sphDivideTriangle(ab,bc,ac,numSubDivs-1, vertexArray, normalArray,tangentArray,bitangentArray);
        return numT;
    }
    else
    {
        // Add 3 vertices to the array
        
        pushVertex(a,vertexArray);
        pushVertex(b,vertexArray);
        pushVertex(c,vertexArray);
        
        //normals are the same as the vertices for a sphere
        
        pushVertex(a,normalArray);
        pushVertex(b,normalArray);
        pushVertex(c,normalArray);

        // Calculate tangent for each vertex
        var u1 = a[0];
        var u2 = b[0];
        var u3 = c[0];

        var v1 = a[1];
        var v2 = b[1];
        var v3 = c[1];

        var p2_p1 = vec4.create();
        vec4.subtract(p2_p1, b, a);
        var p3_p1 = vec4.create();
        vec4.subtract(p2_p1, c, a);

        var tangent = vec4.create();
        var first = vec4.create();
        vec4.scale(first, p2_p1, v3-v1);
        var second = vec4.create();
        vec4.scale(second, p3_p1, v2-v1);
        vec4.subtract(tangent, first, second);
        vec4.scale(tangent, tangent, ((u2-u1)*(v3-v1))-((v2-v1)*(u3-u1)));
        vec4.normalize(tangent,tangent);

        var bitangent = vec4.create();
        vec4.scale(first, p2_p1, u3-u1);
        vec4.scale(second, p3_p1, u2-u1);
        vec4.subtract(bitangent, first, second);
        vec4.scale(bitangent, bitangent, ((v2-v1)*(u3-u1))-((u2-u1)*(v3-v1)));
        vec4.normalize(bitangent,bitangent);
        
        // And add tangents and bitangents to array
        pushVertex(tangent,tangentArray);
        pushVertex(tangent,tangentArray);
        pushVertex(tangent,tangentArray);

        pushVertex(bitangent,bitangentArray);
        pushVertex(bitangent,bitangentArray);
        pushVertex(bitangent,bitangentArray);
        
        return 1;
        
    }   
}

//-------------------------------------------------------------------------
function sphereFromSubdivision(numSubDivs, vertexArray, normalArray, tangentArray, bitangentArray)
{
    var numT=0;
    var a = vec4.fromValues(0.0,0.0,-1.0,0);
    var b = vec4.fromValues(0.0,0.942809,0.333333,0);
    var c = vec4.fromValues(-0.816497,-0.471405,0.333333,0);
    var d = vec4.fromValues(0.816497,-0.471405,0.333333,0);
    
    numT+=sphDivideTriangle(a,b,c,numSubDivs, vertexArray, normalArray, tangentArray, bitangentArray);
    numT+=sphDivideTriangle(d,c,b,numSubDivs, vertexArray, normalArray, tangentArray, bitangentArray);
    numT+=sphDivideTriangle(a,d,b,numSubDivs, vertexArray, normalArray, tangentArray, bitangentArray);
    numT+=sphDivideTriangle(a,c,d,numSubDivs, vertexArray, normalArray, tangentArray, bitangentArray);
    return numT;
}