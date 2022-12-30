const leaf = require('leaflet')

const osmlayer = leaf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
})

const OpenTopoMap = leaf.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 16,
    attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
})
const ignlayer = leaf.tileLayer('https://wxs.ign.fr/{ignApiKey}/geoportail/wmts?'+
'&REQUEST=GetTile&SERVICE=WMTS&VERSION=1.0.0&TILEMATRIXSET=PM'+
'&LAYER={ignLayer}&STYLE={style}&FORMAT={format}'+
'&TILECOL={x}&TILEROW={y}&TILEMATRIX={z}',
{
  ignApiKey: 'pratique',
  ignLayer: 'GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2',
  style: 'normal',
  format: 'image/png',
  service: 'WMTS',
});
const mtklayer = leaf.tileLayer('http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png');
const fouryoulayer = leaf.tileLayer('http://4umaps.eu/{z}/{x}/{y}.png');
const outdoorlayer = leaf.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6f5667c1f2d24e5f84ec732c1dbd032e', {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  });    

const baseMaps = {
  "OSM": osmlayer,
  "OpenTopo" : OpenTopoMap,
  "IGN" : ignlayer,
  "MTK" : mtklayer,
  "UMaps" : fouryoulayer,
  "Outdoor" : outdoorlayer,
};


module.exports = {leaf,baseMaps}