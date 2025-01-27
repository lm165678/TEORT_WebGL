/**
 * Mesh包含GL渲染需要的数据,其数据由用于包装GL数据块的GLVBO和GLVAO表示。<br/>
 * @author Kkk
 * @date 2021年2月1日16点23分
 */
import ArrayBuf from "./ArrayBuf.js";
import ShaderSource from "./ShaderSource.js";
import Log from "../Util/Log.js";
import SizeOf from "./SizeOf.js";

export default class Mesh {
    // 以下属性表明引擎的Mesh数据块仅支持这些属性(不要设计自定义属性,这样会加大复杂度)
    // 位置属性
    static S_POSITIONS = "positions";
    // 顶点颜色属性
    static S_COLORS = "colors";
    // 法线属性
    static S_NORMALS = "normals";
    // 索引属性
    static S_INDICES = "indices";
    static S_INDICES_32 = "indices";
    // 切线属性
    static S_TANGENTS = "tangents";
    // 最多支持4道uv(正常来说2道已经足够了)
    // uv0
    static S_UV0 = "uv0";
    // uv1
    static S_UV1 = "uv1";
    // uv2
    static S_UV2 = "uv2";
    // uv3
    static S_UV3 = "uv3";
    // skin joint
    static S_JOINTS_0 = "joints_0";
    static S_JOINTS_0_32 = "joints_0";
    // skin weight
    static S_WEIGHTS_0 = "weights_0";
    static S_DATAS = {
        "positions":"positions",
        "colors":"colors",
        "normals":"normals",
        "indices":"indices",
        "tangents":"tangents",
        "uv0":"uv0",
        "uv1":"uv1",
        "uv2":"uv2",
        "uv3":"uv3",
        "joints_0":"joints_0",
        "weights_0":"weights_0"
    };
    // 图元类型
    static S_PRIMITIVE_TRIANGLES = 'triangles';
    static S_PRIMITIVE_LINES = 'lines';

    constructor() {
        this._m_Datas = {};
        this._m_Bufs = {};
        this._m_VAO = null;
        this._m_GL = null;
        this._m_ElementCount = 0;
        this._m_Primitive = Mesh.S_PRIMITIVE_TRIANGLES;
        this._m_DrawPrimitive = null;
        this._m_CurrentLod = 0;
        this._m_DrawLod = 0;
        this._m_LodLevels = {};
        this._m_LodLevelCount = 0;
    }

    /**
     * 设置图元。<br/>
     * @param {String}[primitive 应该为Mesh枚举值之一]
     */
    setPrimitive(primitive){
        // 检查是否为有效的提供的枚举值
        this._m_Primitive = primitive;
        if(this._m_GL){
            switch (this._m_Primitive) {
                case Mesh.S_PRIMITIVE_TRIANGLES:
                    this._m_DrawPrimitive = this._m_GL.TRIANGLES;
                    break;
                case Mesh.S_PRIMITIVE_LINES:
                    this._m_DrawPrimitive = this._m_GL.LINES;
                    break;
            }
        }
    }

    /**
     * 返回当前图元。<br/>
     * @return {string|*}
     */
    getPrimitive(){
        return this._m_Primitive;
    }
    _checkDataType(type){
        if(Mesh.S_DATAS[type]){
            return true;
        }
        else{
            console.error('type is undefined:' + type);
            return false;
        }
    }

    /**
     * 设置Mesh数据。<br/>
     * @param {Number}[type Mesh的数据类型枚举]
     * @param {ArrayBuffer}[data 数据]
     * @param {Object}[options]
     */
    setData(type, data, options){
        if(this._checkDataType(type)){
            if(options && options.level != undefined){
                if(!this._m_Datas[type]){
                    this._m_Datas[type] = {lod:true,datas:[],count:0};
                }
                this._m_Datas[type].count += data.length;
                this._m_Datas[type].datas.push({data, level:options.level, count:data.length});
            }
            else{
                this._m_Datas[type] = data;
            }
        }
        else{
            //根据options来指定参数
            this._m_Datas[type] = data;
        }
    }

    /**
     * 返回Mesh数据。<br/>
     * @param {Number}[type Mesh的数据类型枚举]
     * @return {ArrayBuffer}
     */
    getData(type){
        return this._m_Datas[type];
    }
    _refreshBufLocal(gl, customAttrs){
        // 更新几何属性列表local属性
        let buf = null;
        customAttrs.forEach(attr=>{
            buf = this._m_Bufs[attr.name];
            if(buf){

            }
        });
    }

    /**
     * 更新数据列表<br/>
     * @param {Object}[gl]
     * @private
     */
    _updateBound(gl){
        this._m_GL = gl;
        if(this._m_Datas){
            if(!this._m_VAO){
                this._m_VAO = gl.createVertexArray();
            }
            for(let key in this._m_Datas){
                switch (key) {
                    case Mesh.S_POSITIONS:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_POSITION, 3, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_COLORS:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_COLOR, 4, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_NORMALS:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_NORMAL, 3, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_TANGENTS:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_TANGENT, 4, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_INDICES:
                        if(this._m_Datas[key].lod){
                            let datas = this._m_Datas[key].datas;
                            let data = new Uint16Array(this._m_Datas[key].count);
                            let max = 0;
                            let _max = 0;
                            for(let i = 0,j = 0;i < datas.length;i++){
                                this._m_LodLevels[datas[i].level] = {lod:j, count:datas[i].count};
                                this._m_LodLevelCount++;
                                for(let t = 0,os = _max == 0 ? 0 : _max + 1;t < datas[i].data.length;t++){
                                    data[j++] = os + datas[i].data[t];
                                    max = Math.max(datas[i].data[t] + os, max);
                                }
                                _max = max;
                                max = 0;
                            }
                            this._m_CurrentLod = -1;
                            this.lod(0);
                            ArrayBuf.setIndicesBuf(gl, this._m_VAO, gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
                        }
                        else{
                            this._m_ElementCount = this._m_Datas[key].length;
                            ArrayBuf.setIndicesBuf(gl, this._m_VAO, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this._m_Datas[key]), gl.STATIC_DRAW);
                        }
                        break;
                    case Mesh.S_INDICES_32:
                        if(this._m_Datas[key].lod){
                            let datas = this._m_Datas[key].datas;
                            let data = new Uint32Array(this._m_Datas[key].count);
                            let max = 0;
                            let _max = 0;
                            for(let i = 0,j = 0;i < datas.length;i++){
                                this._m_LodLevels[datas[i].level] = {lod:j, count:datas[i].count};
                                this._m_LodLevelCount++;
                                for(let t = 0,os = _max == 0 ? 0 : _max + 1;t < datas[i].data.length;t++){
                                    data[j++] = os + datas[i].data[t];
                                    max = Math.max(datas[i].data[t] + os, max);
                                }
                                _max = max;
                                max = 0;
                            }
                            this._m_CurrentLod = -1;
                            this.lod(0);
                            ArrayBuf.setIndicesBuf(gl, this._m_VAO, gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
                        }
                        else{
                            this._m_ElementCount = this._m_Datas[key].length;
                            ArrayBuf.setIndicesBuf(gl, this._m_VAO, gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(this._m_Datas[key]), gl.STATIC_DRAW);
                        }
                        break;
                    case Mesh.S_UV0:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_UV0, 2, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_UV1:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_UV1, 2, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_UV2:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_UV2, 2, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_UV3:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_UV3, 2, gl.FLOAT, 0, 0);
                        break;
                    case Mesh.S_JOINTS_0:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Uint16Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_JOINT_0, 4, gl.UNSIGNED_SHORT, 0, 0);
                        break;
                    case Mesh.S_JOINTS_0_32:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Uint32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_JOINT_0, 4, gl.UNSIGNED_INT, 0, 0);
                        break;
                    case Mesh.S_WEIGHTS_0:
                        ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_WEIGHT_0, 4, gl.FLOAT, 0, 0);
                        break;
                    default:
                        //自定义,由于自定义的属性在没有绑定着色器之前,是无法显式知道属性位置的,所以需要在绑定着色器后,设定属性位置。
                        // ArrayBuf.setVertexBuf(gl, this._m_VAO, gl.ARRAY_BUFFER, new Float32Array(this._m_Datas[key]), gl.STATIC_DRAW, ShaderSource.S_NORMAL, 3, gl.FLOAT, this._m_Datas[key].length, 0);
                        break;
                }
            }
            switch (this._m_Primitive) {
                case Mesh.S_PRIMITIVE_TRIANGLES:
                    this._m_DrawPrimitive = this._m_GL.TRIANGLES;
                    break;
                case Mesh.S_PRIMITIVE_LINES:
                    this._m_DrawPrimitive = this._m_GL.LINES;
                    break;
            }
        }
    }

    /**
     * 绘制该Mesh。<br/>
     * 由内部引擎调用，通常不应该手动调用。<br/>
     * @param {WebGL}[gl]
     */
    draw(gl){
        gl.bindVertexArray(this._m_VAO);
        gl.drawElements(this._m_DrawPrimitive, this._m_ElementCount, gl.UNSIGNED_SHORT, this._m_DrawLod);
    }

    /**
     * 设置该Mesh渲染使用的细节层次。<br/>
     * @param {Number}[lod]
     */
    lod(lod){
        if(this._m_CurrentLod == lod)return;
        if(this._m_LodLevels[lod] != null){
            this._m_CurrentLod = lod;
            this._m_ElementCount = this._m_LodLevels[this._m_CurrentLod].count;
            this._m_DrawLod = this._m_LodLevels[this._m_CurrentLod].lod * SizeOf.sizeof(SizeOf.S_UNSIGNED_SHORT);
        }
        else{
            Log.error('lod level ' + lod + '对于当前Mesh无效!');
        }
    }

    /**
     * 返回细节层次级别数量。<br/>
     * @return {Number}
     */
    getLodLevelCount(){
        return this._m_LodLevelCount;
    }

    /**
     * 返回指定细节层次级别对应的图元数量。<br/>
     * 如果该细节层次级别超过有效级别范围,则返回0。<br/>
     * @param {Number}[lod]
     * @return {Number}
     */
    getLodPrimitiveCount(lod){
        if(this._m_LodLevels[lod] != null){
            let drawCount = this._m_LodLevels[lod].count;
            switch (this._m_Primitive) {
                case Mesh.S_PRIMITIVE_TRIANGLES:
                    return drawCount / 3;
                    break;
                case Mesh.S_PRIMITIVE_LINES:
                    return drawCount / 2;
                    break;
            }
        }
        else{
            Log.error('lod level ' + lod + '对于当前Mesh无效!');
        }
        return 0;
    }

}
