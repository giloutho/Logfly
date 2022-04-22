var {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store();

const IGCAnalyzer = require('../../utils/igc-analyzer.js')
const anaTrack = new IGCAnalyzer()

var L = require('leaflet');
var Highcharts = require('highcharts');
var myMeasure = require('../../leaflet/measure.js')
var useGoogle = require('../../leaflet/google-leaflet.js')
var layerTree = require('leaflet.control.layers.tree')

iniForm()

var btnClose = document.getElementById('bt-close')

btnClose.addEventListener('click',(event) => {
    window.close()
})

ipcRenderer.on('geojson-for-map', (event, track) => {
  console.log('Track points : '+track.fixes.length)
  console.log('Offset UTC : '+track.info.offsetUTC)

  anaTrack.compute(track.fixes) 
  console.log('thermals.length : '+anaTrack.thermals.length)
  let percThermals = Number(+anaTrack.percThermals).toLocaleString(undefined,{style: 'percent', minimumFractionDigits:0}); 
  let percGlides = Number(+anaTrack.percGlides).toLocaleString(undefined,{style: 'percent', minimumFractionDigits:0}); 
  let percDives = Number(+anaTrack.percDives).toLocaleString(undefined,{style: 'percent', minimumFractionDigits:0}); 
  console.log('% thermal : '+percThermals+'  % glides : '+percGlides+'  % dives : '+percDives)
  buildMap(track)
})

function buildMap(track) {

  // https://stackoverflow.com/questions/54331439/how-to-map-json-object-to-array
	// pour mieux comprendre map : https://www.digitalocean.com/community/tutorials/4-uses-of-javascripts-arraymap-you-should-know-fr
  const arrayAlti = track.GeoJSON.features[0]['geometry']['coordinates'].map(coord => coord[2]);
  // les heures contenues dans le GeoJSon ne sont que des strings
  // la conversion en date est nécessaire pour que Highcharts.dateFormat fonctionne sur l'axe des x
  var arrayHour = track.GeoJSON.features[0]['properties']['coordTimes'].map(hour => new Date(hour));

  map = L.map('carte').setView([0, 0], 5);


  var osmlayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});
  var OpenTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 16,
      attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  });
  var mtklayer = L.tileLayer('http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png');
  var fouryoulayer = L.tileLayer('http://4umaps.eu/{z}/{x}/{y}.png');

  var googleLayer = new L.Google('TERRAIN');
  var googleSat = new L.Google('SATELLITE');

 // OpenTopoMap.addTo(map);

  var baseMaps = {
      "OSM": osmlayer,
      "OpenTopo" : OpenTopoMap,
      "MTK" : mtklayer,
      "4UMaps" : fouryoulayer,
      "Google Terrain" : googleLayer,
      "Google Sat" : googleSat
  };

  var mousemarker = null;

  var locMeasure = new myMeasure()

  locMeasure.addTo(map);

  osmlayer.addTo(map)

  L.control.layers(baseMaps).addTo(map);

  var trackOptions = {
    color: 'red',
    weight: 2,
    opacity: 0.85
  };
  map.removeLayer(L.geoJson);
  var geojsonLayer = L.geoJson(track.GeoJSON,{ style: trackOptions}).addTo(map)
  map.fitBounds(geojsonLayer.getBounds());
  
  var StartIcon = new L.Icon({
    iconUrl: '../../leaflet/images/windsock22.png',
    shadowUrl: '../../leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [0, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  });

  var startLatlng = L.latLng(track.fixes[0].latitude, track.fixes[0].longitude)
  L.marker(startLatlng,{icon: StartIcon}).addTo(map);

  var EndIcon = new L.Icon({
    iconUrl: '../../leaflet/images/Arrivee22.png',
    shadowUrl: '../../leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [4, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  });

  var endLatlng = L.latLng(track.fixes[track.fixes.length - 1].latitude, track.fixes[track.fixes.length - 1].longitude)
  L.marker(endLatlng,{icon: EndIcon}).addTo(map);

  var chart = new Highcharts.Chart({
    chart: {      
    type: 'line',
    renderTo: 'graphe'
    },
    title: {
        text: ''
    },
    subtitle: {
        text: ''
    },
    plotOptions: {
        series: {
            marker: {
                // Sinon le point est dessiné pour les petites séries
                enabled: false
            },
            point: {
                events: {
                    mouseOver: function () {
                        posMarker = new L.LatLng(track.GeoJSON.features[0]['geometry']['coordinates'][this.x][1], track.GeoJSON.features[0]['geometry']['coordinates'][this.x][0]);
                        if (mousemarker == null) {
                          // Le x correspond à l'index, ça tombe bien...
                          // https://gis.stackexchange.com/questions/318400/adding-a-start-and-end-marker-to-a-geojson-linestring                                
                            mousemarker = new L.marker(posMarker).addTo(map);
                        }
                        else {
                            mousemarker.setLatLng(posMarker);
                        }
                      //  info.update(Heure[this.x]+'<br/>Alt : '+altiVal[this.x]+'m<br/>Vz : '+Vario[this.x]+'m/s<br/>Vit : '+Speed[this.x]+' km/h');
                    },
                    click: function () {
                        // On peut préciser un niveau de zoom
                        // On peut utiliser map.setView
                        console.log('x '+this.x+'  Lat '+track.GeoJSON.features[0]['geometry']['coordinates'][this.x][1]+' Long '+track.GeoJSON.features[0]['geometry']['coordinates'][this.x][0])
                        console.log(arrayHour[this.x])
                        panMarker = new L.LatLng(track.GeoJSON.features[0]['geometry']['coordinates'][this.x][1], track.GeoJSON.features[0]['geometry']['coordinates'][this.x][0]);
                        map.panTo(panMarker);
                    }
                }
            },
            events: {
                mouseOut: function () {
                    if (mousemarker != null) {
                        map.removeLayer(mousemarker);
                        mousemarker = null;
                    }
                }
            }
        }
    },
    tooltip: {
      formatter: function (tooltip) {
          if (this.point.isNull) {
              return 'Null';
          }
          var index = this.point.index;
          //var tooltip = Heure[index]+'<br/>Alt : '+altiVal[index]+'m<br/>HS : '+groundVal[index]+'m<br/>Vz : '+Vario[index]+'m/s<br/>Vit : '+Speed[index]+' km/h';
          var tooltip = Highcharts.dateFormat('%H:%M:%S', arrayHour[index])+'<br/>Alt : '+arrayAlti[index]+'m<br/>Vz : '+track.vz[index].toFixed(2)+'m/s<br/>Vit : '+track.speed[index].toFixed(0)+' km/h'
          return tooltip;
      },
      crosshairs: true
    },    
    xAxis: {  
      categories: arrayHour,
      labels: {
        formatter: function() {
          return Highcharts.dateFormat('%H:%M', this.value);
        }
      },       

    },

    yAxis: {
        title: {
            text: 'Altitude'
        },
        labels: {
            format: '{value} m'
        }
    },

    series: [{
      showInLegend: false,
      data: arrayAlti
    }]
});
}

function iniForm() {
  try {    
    let currLang = store.get('lang')
    let currLangFile = currLang+'.json'
    let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
    let langjson = JSON.parse(content);
    i18n.setMessages('messages', currLang, langjson)
    i18n.setLocale(currLang);
  } catch (error) {
    log.error('Error while loading the language file')
  }
  document.getElementById('bt-close').innerHTML = i18n.gettext('Close')
 
}
