/**
 * 检查ring是不是bbox的四个顶点
 * @param {Array.<L/>Point>} ring 点集
 * @param {L/Bounds} bbox 边界
 * @return {boolean} 如果ring表示bbox的外边几何,则返回true
 */
var isRingBbox = function (ring, bbox) {
    //ring的长度不等于4,则肯定不是bbox的四个顶点
    if (ring.length !== 4) {
        return false;
    }

    var p, sumX = 0, sumY = 0;

    for (p = 0; p < 4; p++) {
        //任意点的x,y肯定与是xmin,xmax或是ymin,ymax,如果不是肯定不是bbox的四个顶点
        if ((ring[p].x !== bbox.min.x && ring[p].x !== bbox.max.x) ||
            (ring[p].y !== bbox.min.y && ring[p].y !== bbox.max.y)) {
            return false;
        }

        sumX += ring[p].x;
        sumY += ring[p].y;

        //bins[Number(ring[p].x === bbox.min.x) + 2 * Number(ring[p].y === bbox.min.y)] = 1;
    }

    //检查是否2个点都是左上角这样的清除
    return sumX === 2 * (bbox.min.x + bbox.max.x) && sumY === 2 * (bbox.min.y + bbox.max.y);
};

var ExtendMethods = {

    /**
     * 获取合并后的点集
     * @param {Array.<L/Polygon>} polygons 面集合
     * @return {Array.<Array.<Array.<L/LatLng>>>} 合并后的点集
     */
    _toMercGeometry: function (polygons) {
        var res = [];
        for (let i = 0; i < polygons.length; i++) {
            let latlngs = polygons[i].getLatLngs();

            if (!(latlngs[0] instanceof Array)) {
                latlngs = [[latlngs]];
            } else if (!(latlngs[0][0] instanceof Array)) {
                latlngs = [latlngs];
            }
            res = res.concat(latlngs);
        }

        var res2 = [];

        for (let i = 0; i < res.length; i++) {
            var rings = [];
            for (let j = 0; j < res[i].length; j++) {
                var ring = [];
                for (let k = 0; k < res[i][j].length; k++) {
                    ring.push(this._map.project(res[i][j][k], 0));
                }
                rings.push(ring);
            }
            res2.push(rings);
        }
        return res2;
    },

    /**
     * 计算合并后的点集与边界
     * @return {Array.<Array.<Array.<L/LatLng>>>} 合并后的点集
     */
    _getOriginalMercBoundary: function () {
        //已经计算过直接返回结果
        if (this._mercBoundary) {
            return this._mercBoundary;
        }

        var compomentBbox, c;
        //只是坐标数组
        this._mercBoundary = this._toMercGeometry(this.options.polygons);

        //计算边界
        this._mercBbox = new L.Bounds();
        for (c = 0; c < this._mercBoundary.length; c++) {
            compomentBbox = new L.Bounds(this._mercBoundary[c][0]);
            this._mercBbox.extend(compomentBbox.min);
            this._mercBbox.extend(compomentBbox.max);
        }

        return this._mercBoundary;
    },

    /**
     * 获取被瓦片裁切后的几何图形,提高效率
     * @param {}
     */
    _getClippedGeometry: function (geom, bounds) {

        var clippedGeom = [],
            clippedComponent,
            clippedExternalRing,
            clippedHoleRing,
            iC, iR;

        for (iC = 0; iC < geom.length; iC++) {
            clippedComponent = [];
            clippedExternalRing = L.PolyUtil.clipPolygon(geom[iC][0], bounds);
            if (clippedExternalRing.length === 0) {
                continue;
            }

            clippedComponent.push(clippedExternalRing);

            for (iR = 1; iR < geom[iC].length; iR++) {
                clippedHoleRing = L.PolyUtil.clipPolygon(geom[iC][iR], bounds);
                if (clippedHoleRing.length > 0) {
                    clippedComponent.push(clippedHoleRing);
                }
            }
            clippedGeom.push(clippedComponent);
        }

        if (clippedGeom.length === 0) { //we are outside of all multipolygon components
            return { isOut: true };
        }

        for (iC = 0; iC < clippedGeom.length; iC++) {
            if (isRingBbox(clippedGeom[iC][0], bounds)) {
                //inside exterior rings and no holes
                if (clippedGeom[iC].length === 1) {
                    return { isIn: true };
                }
            } else { //intersects exterior ring
                return { geometry: clippedGeom };
            }

            for (iR = 1; iR < clippedGeom[iC].length; iR++) {
                //inside exterior ring, but have intersection with a hole
                if (!isRingBbox(clippedGeom[iC][iR], bounds)) {
                    return { geometry: clippedGeom };
                }
            }
        }

        //we are inside all holes in geometry
        return { isOut: true };
    },

    /**
     * 计算原始边界与tile边界的关系
     * @return {Object} 相离:{isOut: true} ,几何图形包含瓦片:{isIn: true}，相交:{geometry: <LatLng[][][]>}
     */
    _getTileGeometry: function (x, y, z, skipIntersectionCheck) {
        //没有传入几何图形,默认为包含
        if (!this.options.polygons) {
            return { isIn: true };
        }
        //缓存索引
        var cacheID = x + ":" + y + ":" + z;
        var zCoeff = Math.pow(2, z - this.options.zoomOffset),
            parentState,
            cache = this._boundaryCache;
        //如果有缓存则,读取缓存
        if (cache[cacheID]) {
            return cache[cacheID];
        }
        var mercBoundary = this._getOriginalMercBoundary(),  //合并后的边界
            ts = this.options.tileSize,  
            tileBbox = new L.Bounds(new L.Point(x * ts / zCoeff, y * ts / zCoeff), new L.Point((x + 1) * ts / zCoeff, (y + 1) * ts / zCoeff));//瓦片边界
        //如果瓦片边界与几何边界不相交->必定相离
        if (!skipIntersectionCheck && !tileBbox.intersects(this._mercBbox)) {
            return { isOut: true };
        }
        //zoom==0时，返回合并后图形
        if (z === 0) {
            cache[cacheID] = { geometry: mercBoundary };
            return cache[cacheID];
        }

        parentState = this._getTileGeometry(Math.floor(x / 2), Math.floor(y / 2), z - 1, true);
        if (parentState.isOut || parentState.isIn) {
            return parentState;
        }
        cache[cacheID] = this._getClippedGeometry(mercBoundary, tileBbox);
        return cache[cacheID];
    },

    _drawTileInternal: function (canvas, tilePoint, url, callback) {
        var zoom = this._getZoomForUrl(),
            state = this._getTileGeometry(tilePoint.x, tilePoint.y, zoom);

        if (this.options.mode == "show" && (state.isIn == undefined && state.geometry == undefined)) {
            callback();
            return;
        }

        if (this.options.mode == "clip" && (state.isOut == undefined && state.geometry == undefined)) {
            callback();
            return;
        }
        var ts = this.options.tileSize,
            tileX = ts * tilePoint.x,
            tileY = ts * tilePoint.y,
            zCoeff = Math.pow(2, zoom - this.options.zoomOffset),
            ctx = canvas.getContext('2d'),
            imageObj = new Image();

        var setPattern = function () {
            var c, r, p,
                pattern,
                geom;

            if (state.geometry) {
                geom = state.geometry;
                ctx.beginPath();

                for (c = 0; c < geom.length; c++) {
                    for (r = 0; r < geom[c].length; r++) {
                        if (geom[c][r].length === 0) {
                            continue;
                        }

                        ctx.moveTo(geom[c][r][0].x * zCoeff - tileX, geom[c][r][0].y * zCoeff - tileY);
                        for (p = 1; p < geom[c][r].length; p++) {
                            ctx.lineTo(geom[c][r][p].x * zCoeff - tileX, geom[c][r][p].y * zCoeff - tileY);
                        }
                    }
                }
                if (this.options.mode == "clip") {
                    ctx.fillStyle = "rgba(0,0,0,1)";
                    ctx.fill();
                    ctx.globalCompositeOperation = 'source-out';
                } else {
                    ctx.clip();
                }
            }

            pattern = ctx.createPattern(imageObj, "repeat");
            ctx.beginPath();
            ctx.rect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = pattern;
            ctx.fill();
            callback();
        }.bind(this);

        if (this.options.crossOrigin) {
            imageObj.crossOrigin = '';
        }

        imageObj.onload = function () {
            //TODO: implement correct image loading cancelation
            canvas.complete = true; //HACK: emulate HTMLImageElement property to make happy L.TileLayer
            setTimeout(setPattern, 0); //IE9 bug - black tiles appear randomly if call setPattern() without timeout
        }

        imageObj.src = url;
    }
};

L.TileLayer.Clip = L.TileLayer.extend({

    options: {
        polygons: null,
        mode: "clip"
    },
    includes: ExtendMethods,
    initialize: function (url, options) {
        L.TileLayer.prototype.initialize.call(this, url, options);
        this._boundaryCache = {}; //cache index "x:y:z"
        this._mercBoundary = null;
        this._mercBbox = null;

    },
    createTile: function (coords, done) {
        var tile = document.createElement('canvas'),
            url = this.getTileUrl(coords);
        tile.width = tile.height = this.options.tileSize;
        this._drawTileInternal(tile, coords, url, L.bind(done, null, null, tile));

        return tile;
    },

    /**
     * 设置显示模式
     * @param {string} mode 显示模式
     * @return {Object} this
     */
    setMode(mode) {
        this.options.mode = mode;
        this.redraw();
        return this;
    },

    /**
     * 获取显示模式
     * @return {string} 显示模式
     */
    getMode(){
        return this.options.mode;
    },

    /**
     * 设置多边形集合
     * @param {Array.<L/Polygon>} polygons 多边形集合
     * @return {Object} this
     */
    setPolygons(polygons){
        this.options.polygons=polygons;
        this.redraw();
        return this;
    },

    /**
     * 获取多边形集合
     * @return {Array.<L/Polygon>} 多边形几何
     */
    getPolygons(){
        return this.options.polygons;
    }

});


export default L.TileLayer.clip = function (url, options) {
    return new L.TileLayer.Clip(url, options);
};