<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import L from 'leaflet'
import LClip from '@/utils/leaflet-TileLayer-Clip.js'

const mapInstance = ref(null)
const type = ref<string>('init')

const options: any = [{
  label: '原地图',
  value: 'init'
}, {
  label: '展示指定区域地图',
  value: 'show'
}, {
  label: '展示裁剪地图',
  value: 'clip'
}]


onMounted(() => {
  // 获取中国地图geo数据
  fetch('http://localhost:5173/src/components/geo/china.json').then(response => response.json()).then((ChinaGeo) => {
    mapInstance.value && mapInstance.value.remove()
    initMap({ lat: 29.538971, lng: 106.524179, zoom: 5, ChinaGeo })
  })
})

watch(() => type.value, (val: any) => {
  removeLayer()
  fetch('http://localhost:5173/src/components/geo/china.json').then(response => response.json()).then((ChinaGeo) => {
    initMap({ lat: 29.538971, lng: 106.524179, zoom: 5, ChinaGeo })
  })
})
/**
 * 
 * @param param
 * 
 *  lat 纬度 
 *  lng 经度
 *  zoom 缩放
 *  ChinaGeo 中国geo 数据也可替换为单独省、市、县
 * 
 */

function initMap({ lat, lng, zoom, ChinaGeo }: { lat: string | number, lng: string | number, zoom: string | number, ChinaGeo: any }) {
  mapInstance.value = L.map('map', {
    zoom: zoom,
    crs: L.CRS.EPSG3857,
    center: [lat, lng],
  })
  if (['init'].includes(type.value)) {
    L.tileLayer(
      'https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
      , {
        attribution: '© Your Tile Service Provider'
      }).addTo(mapInstance.value);
  }
  if (['show', 'clip'].includes(type.value)) {
    const cityGeo = ChinaGeo.features.find((city: any) => city.properties.adcode === 500000) // 重庆截图展示
    let geoJSONClip: any = L.geoJSON(cityGeo)
    LClip(
      'https://webrd03.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}'
      , {
        polygons: [geoJSONClip.getLayers()[0]], //[]
        name: "重庆地图", // 名称
        maxZoom: 17, // 设置最大缩放比例
        tileSize: 256,
        zoom: zoom, // 缩放值
        zoomOffset: 0, // 缩放偏移量
        mode: type.value // 裁剪类型  【show、 clip】
      }).addTo(mapInstance.value);
  }
}

function removeLayer () {
  mapInstance.value.eachLayer(function (layer: any) {
        mapInstance.value.removeLayer(layer)
  });
  mapInstance.value && mapInstance.value.remove()
}
function handleChange (val: string) {
  type.value = val
}
</script>

<template>
  <el-select v-model="type" placeholder="请选择" :onChange="handleChange" style="width: 200px;">
    <el-option v-for="item in options" :key="item.value" :label="item.label" :value="item.value">
    </el-option>
  </el-select>
  <div class="box">
    <div id="map" class="map" style="height: 500px; weight: 500px;"></div>
  </div>
</template>
<style scoped>
.box {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 50px;
}

.map {
  border: 1px solid red;
  height: 800px;
  width: 800px;
}

.leaflet-container {
  background-image: linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)),
    url('@/assets/images/layout-bgi.jpg');
  background-color: rgba($color: #000000, $alpha: 0.5);
  background-size: 200% 200%;
  background-position-x: 50%;
  background-position-y: 77%;
}

.leaflet-container .leaflet-tile-pane img {
  filter: grayscale(100%) invert(92%) sepia(8%) hue-rotate(180deg) saturate(1550%) brightness(100%) contrast(100%) !important;
}

.leaflet-map-pane .leaflet-tile-pane canvas {
  filter: grayscale(100%) invert(92%) sepia(8%) hue-rotate(180deg) saturate(1550%) brightness(100%) contrast(100%) !important;
}
</style>