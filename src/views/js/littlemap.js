const {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const L = require('leaflet');
const Store = require('electron-store')
const elemMap = require('../../utils/leaflet/littlemap-build.js')
let currLang
let igcText

let mapPm
const store = new Store()
try {    
    currLang = store.get('lang')
    if (currLang != undefined && currLang != 'en') {
        currLangFile = currLang+'.json'
        let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
        let langjson = JSON.parse(content);
        i18n.setMessages('messages', currLang, langjson)
        i18n.setLocale(currLang);
    }
  } catch (error) {
      log.error('[littlemap.js] Error while loading the language file')
  }  
let btnClose = document.getElementById('bt-close')
btnClose.innerHTML = i18n.gettext('Close')
btnClose.addEventListener('click',(event) => {
    window.close()
})

let btnExport = document.getElementById('bt-export')
btnExport.innerHTML = i18n.gettext('Export')
btnExport.addEventListener('click',(event) => {
    exportIgc()
})

ipcRenderer.on('little-map-elements', (event, igcString) => {
    const mapTrack = elemMap.buildMapElements(igcString)
    if (mapTrack.ready) {
        igcText = igcString
        buildMap(mapTrack)
    } else {
        Alert(i18n.gettext('An error occurred during the map generation'))
    }
})

function exportIgc() {
    const exportResult = ipcRenderer.sendSync('save-igc',igcText)
    if ( exportResult.indexOf('Error') !== -1) {
        alert(i18n.gettext('Error while exporting data'))      
    } else {
        alert(i18n.gettext('Successful operation'))
    }
}

//  Gardée pur tests éventuels
// try {
//     //  initmapBasic(47.294,4.926,13)
//     const tempFileName = './doc/symphonia.igc'
//     const igcString = fs.readFileSync(tempFileName, 'utf8')
//     const mapTrack = elemMap.buildMapElements(igcString)
//     buildMap(mapTrack)
//     } catch (err) {
//     console.log('Error reading file '+err)
//     }      


//  Gardée pur tests éventuels
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
    console.log('Build start : '+mapTrack.startLatlng.lat+' '+mapTrack.endLatlng.lat)
    winLabel = mapTrack.flDate+' '+i18n.gettext('Duration')+' : '+mapTrack.flDuration+' '+i18n.gettext('Pilot')+' : '+mapTrack.pilot.trim()+' '+mapTrack.lbGlider.trim()
    document.getElementById('wintitle').innerHTML = winLabel
    mapPm = L.map('mapid').setView([0, 0], 5);

    var tile_layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
    tile_layer.addTo(mapPm); 

    const geojsonLayer = L.geoJson(mapTrack.trackjson,{ style: mapTrack.trackOptions}).addTo(mapPm)
    mapPm.fitBounds(geojsonLayer.getBounds());
    
    const StartIcon = new L.Icon(mapTrack.startIcon)
    const startLatlng = L.latLng(mapTrack.startLatlng.lat,mapTrack.startLatlng.long)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm);

    const EndIcon = new L.Icon(mapTrack.endIcon)
    const endLatlng = L.latLng(mapTrack.endLatlng.lat,mapTrack.endLatlng.long)
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
        this._div.innerHTML += mapTrack.infoGlider
        this._div.innerHTML += mapTrack.maxAlti
        this._div.innerHTML += mapTrack.maxVario
    };

    info.addTo(mapPm);  

}