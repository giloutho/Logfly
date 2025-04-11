const leaf = require('leaflet')

const osmlayer = leaf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})

const OpenTopoMap = leaf.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 16,
    attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
})
const ignlayer = leaf.tileLayer('https://data.geopf.fr/wmts?'+
            '&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&TILEMATRIXSET=PM'+
            '&LAYER={ignLayer}&STYLE={style}&FORMAT={format}'+
            '&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}',
            {
	            ignLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
	            style: 'normal',
	            format: 'image/png',
	            service: 'WMTS',
              opacity: 1,
              attribution: 'Carte © IGN/Geoplateforme'
})
const ignSat = leaf.tileLayer("https://data.geopf.fr/wmts?" +
            "&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0" +
            "&STYLE=normal" +
            "&TILEMATRIXSET=PM" +
            "&FORMAT=image/jpeg"+
            "&LAYER=ORTHOIMAGERY.ORTHOPHOTOS"+
            "&TILEMATRIX={z}" +
            "&TILEROW={y}" +
            "&TILECOL={x}",
            {
            minZoom : 0,
            maxZoom : 18,
            attribution : "IGN-F/Geoportail",
            tileSize : 256 // les tuiles du Géooportail font 256x256px
})
const mtklayer = leaf.tileLayer('http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png')
const fouryoulayer = leaf.tileLayer('http://4umaps.eu/{z}/{x}/{y}.png')
const outdoorlayer = leaf.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6f5667c1f2d24e5f84ec732c1dbd032e', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  })

const baseMaps = {
  "OSM": osmlayer,
  "OpenTopo" : OpenTopoMap,
  "IGN" : ignlayer,
  "IGN Sat" : ignSat,
  "MTK" : mtklayer,
  "UMaps" : fouryoulayer,
  "Outdoor" : outdoorlayer,
}

const currentMap = (mapUrl) => {
  let mapType = ''
  if (mapUrl.includes('{ignLayer}')) {
    mapType = 'ign'
  } else if (mapUrl.includes('ORTHOIMAGERY.ORTHO')) {
    mapType = 'ignsat'
  } else if (mapUrl.includes('tile.openstreet')) {
    mapType = 'osm'
  } else if (mapUrl.includes('tile.thunder')) {
    mapType = 'out'
  } else if (mapUrl.includes('4umaps.eu')) {
    mapType = '4u'
  } else if (mapUrl.includes('opentopo')) {
    mapType = 'open'
  } else if (mapUrl.includes('maptoolkit')) {
    mapType = 'mtk'
  } else {
    mapType = 'osm'
  }
  return mapType
}


module.exports = {leaf,baseMaps, currentMap}