# Leaflet-Clip
Leaflet-Clip 是基于leaflet 开源项目 解决对地图 实现单个区域或多个区域单独展示效果，且能够实现裁剪或显示任意多边形的切片图层。

This template should help get you started developing with Vue 3 in Vite.


## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## 示例
```
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
        mode: type.value // 裁剪类型 【show、 clip】
      }).addTo(mapInstance.value);
  }
}
```
## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```
