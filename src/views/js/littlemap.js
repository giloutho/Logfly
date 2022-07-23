const {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const L = require('leaflet');

let mapPm

// provisoire pour mise au point
const elemMap = require('../../process-main/maps/littlemap-compute.js')



iniForm()

function iniForm() {
    try {
      //  initmapBasic(47.294,4.926,13)
        const tempFileName = './doc/symphonia.igc'
        const igcString = fs.readFileSync(tempFileName, 'utf8')
        const mapTrack = elemMap.buildMapElements(igcString)
        console.log(mapTrack.ready+' '+mapTrack.flDate+' '+mapTrack.flToffTime+' '+mapTrack.glider)
        buildMap(mapTrack)
      } catch (err) {
        console.log('Error reading file '+err)
      }      
}

function initmapBasic(viewlat,viewlon,viewzoom) {
    mapBasic = L.map('mapid').setView([viewlat,viewlon], viewzoom);
  
    const tile_layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
    tile_layer.addTo(mapBasic); 
    tile_layer.on("load",function() { console.log("Basique -> all visible tiles have been loaded") });
    console.log('initialisation OK')
}


function buildMap(mapTrack) {
  mapPm = L.map('mapid').setView([0, 0], 5);

  var tile_layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          });
  tile_layer.addTo(mapPm); 

  const geojsonLayer = L.geoJson(mapTrack.trackjson,{ style: mapTrack.trackOptions}).addTo(mapPm)
  mapPm.fitBounds(geojsonLayer.getBounds());
  
  const StartIcon = new L.Icon(mapTrack.startIcon)
  const startLatlng = L.latLng(mapTrack.startLatlng)
  L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm);

  const EndIcon = new L.Icon(mapTrack.endIcon)
  const endLatlng = L.latLng(mapTrack. endLatlng)
  L.marker(endLatlng,{icon: EndIcon}).addTo(mapPm);

  const info = L.control({position: 'bottomright'});

  info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'map-info'); // create a div with a class "map-info"
      this.update();
      return this._div;
  };

  // method that we will use to update the control based on feature properties passed
  info.update = function () {
      this._div.innerHTML = '';
      this._div.innerHTML += mapTrack.flDate+'<br>'
      this._div.innerHTML += 'Take off :'+mapTrack.flToffTime+'<br>'
      this._div.innerHTML += mapTrack.glider
      this._div.innerHTML += mapTrack.maxAlti
      this._div.innerHTML += mapTrack.maxVario
  };

  info.addTo(mapPm);  

}