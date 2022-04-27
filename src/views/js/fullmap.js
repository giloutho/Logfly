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
var awesomeMarker = require('../../leaflet/leaflet.awesome-markers.min.js')

iniForm()

var btnClose = document.getElementById('bt-close')

btnClose.addEventListener('click',(event) => {
    window.close()
})

ipcRenderer.on('geojson-for-map', (event, track) => {
  console.log('Track points : '+track.fixes.length)
  console.log('Offset UTC : '+track.info.offsetUTC)

  anaTrack.compute(track.fixes) 
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
  var outdoorlayer = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6f5667c1f2d24e5f84ec732c1dbd032e', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
  var googleLayer = new L.Google('TERRAIN');
  var googleSat = new L.Google('SATELLITE');

  OpenTopoMap.addTo(map);

  var baseMaps = {
      "OpenTopo" : OpenTopoMap,
      "OSM": osmlayer,
      "MTK" : mtklayer,
      "4UMaps" : fouryoulayer,
      "Outdoor" : outdoorlayer,
      "Google Terrain" : googleLayer,
      "Google Sat" : googleSat
  };

  var openaip_cached_basemap = new L.TileLayer("http://{s}.tile.maps.openaip.net/geowebcache/service/tms/1.0.0/openaip_basemap@EPSG%3A900913@png/{z}/{x}/{y}.png", {
    maxZoom: 14,
    minZoom: 4,
    tms: true,
    detectRetina: true,
    subdomains: '12',
    format: 'image/png',
    transparent: true
  });


  var mousemarker = null;

  var locMeasure = new myMeasure()

  locMeasure.addTo(map);

  var trackOptions = {
    color: 'red',
    weight: 2,
    opacity: 0.85
  };

  var thermOptions = {
    color: 'yellow',
    weight: 6,
    opacity: 0.50
  };
  map.removeLayer(L.geoJson);
 //   original
 // var geojsonLayer = L.geoJson(track.GeoJSON,{ style: trackOptions}).addTo(map)
 // modifié
  var geojsonLayer = L.geoJson(track.GeoJSON,{ style: trackOptions })
  // code proviuent d'une mine de snippet Leaflet https://gist.github.com/geog4046instructor
  var thermalLayerOption = {
    style: thermOptions, 
    pointToLayer: thermalIcon,
    onEachFeature: createPopThermal
  }
  var geoThermals =  L.geoJson(anaTrack.geoThermals,thermalLayerOption);
  //var geoThermals =  L.geoJson(anaTrack.geoThermals,{ style: thermOptions, onEachFeature: createPopThermal})
  var geoGlides =  L.geoJson(anaTrack.geoGlides,{ color: '#848484',weight: 3, dashArray: '10,5', opacity: 1 , onEachFeature: createPopGlide})
  var tracksGroup = new L.LayerGroup();
  tracksGroup.addTo(map);
  tracksGroup.addLayer(geojsonLayer);

  var thermalGroup = new L.LayerGroup();
  thermalGroup.addLayer(geoThermals);
  var GlidesGroup = new L.LayerGroup();
  GlidesGroup.addLayer(geoGlides);

  let mAisrpaces = i18n.gettext('Airspaces');
  console.log('mAisrpaces = '+mAisrpaces)
  let mTrack = i18n.gettext('Track');
  let mThermal = i18n.gettext('Thermals');
  let mTrans = i18n.gettext('Transitions');
  //ES6 introduces computed property names -> var myObj = {[a]: b};
  var Affichage = {
    [mAisrpaces] : openaip_cached_basemap,  
    [mTrack] : tracksGroup,
    [mThermal] : thermalGroup,
    [mTrans]: GlidesGroup,
  };

  L.control.layers(baseMaps,Affichage).addTo(map);
  
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
// est ce nécessaire  ? a voir sur un ordi moins rapide
// j'imagine que je l'avais placé pour attendre la création de la carte
  //setTimeout(function(){ map.fitBounds(geojsonLayer.getBounds()); }, 1000);
  // on supprime pour l'instant, on y va sans timeout
  map.fitBounds(geojsonLayer.getBounds());
}

function createPopThermal(feature, layer) {
  let htmlTable = '<table><caption>'+feature.properties.alt_gain+'m - '+feature.properties.avg_climb+'m/s</caption>';                
  htmlTable +='<tr><td>'+i18n.gettext('Altitude gain')+'</td><td>'+feature.properties.alt_gain+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Average climb')+'</td><td>'+feature.properties.avg_climb+'m/s</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Maximum climb')+'</td><td>'+feature.properties.max_climb+'m/s</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Peak climb')+'</td><td>'+feature.properties.peak_climb+'m/s</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Efficiency')+'</td><td>'+feature.properties.efficiency+'%</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Start altitude')+'</td><td>'+feature.properties.start_alt+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Finish altitude')+'</td><td>'+feature.properties.finish_alt+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Start time')+'</td><td>'+feature.properties.start_time+'</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Finish time')+'</td><td>'+feature.properties.finish_time+'</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Duration')+'</td><td>'+feature.properties.duration+'</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude gain')+'</td><td>'+feature.properties.acc_gain+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude loss')+'</td><td>'+feature.properties.acc_loss+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Drift')+'</td><td>'+feature.properties.drift+'</td></tr>';
  htmlTable += '</table>';
 // htmlTable = '<table><caption>1028m - 1,3 m/s</caption><tr><td>Altitude gain</td><td>1028m</td></tr><tr><td>Average climb</td><td>1,3m/s</td></tr><tr><td>Maximum climb</td><td>2,7m/s</td></tr><tr><td>Peak climb</td><td>5,0m/s</td></tr><tr><td>Efficiency</td><td>50%</td></tr><tr><td>Start altitude</td><td>1845m</td></tr><tr><td>Finish altitude</td><td>2873m</td></tr><tr><td>Start time</td><td>13:00:17</td></tr><tr><td>Finish time</td><td>13:13:04</td></tr><tr><td>Duration</td><td>12mn47s</td></tr><tr><td>Accumulated altitude gain</td><td>1081m</td></tr><tr><td>Accumulated altitude loss</td><td>-53m</td></tr><tr><td>Drift</td><td>7,5km/h SW</td></tr></table>';
  layer.bindPopup(htmlTable);
  //layer.bindPopup('<h1>'+feature.properties.alt_gain+'</h1><p>name: '+feature.properties.avg_climb+'</p>');
  
}

function createPopGlide(feature, layer) {
  let htmlTable = '<table><caption>'+feature.properties.distance+'km - ['+feature.properties.avg_glide+'] '+feature.properties.avg_speed+'km/h</caption>';                
  htmlTable +='<tr><td>'+i18n.gettext('Altitude change')+'</td><td>'+feature.properties.alt_change+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Average descent')+'</td><td>'+feature.properties.avg_descent+'m/s</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Distance')+'</td><td>'+feature.properties.distance+'km</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Average glide ratio')+'</td><td>'+feature.properties.avg_glide+':1</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Average speed')+'</td><td>'+feature.properties.avg_speed+'km/h</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Start altitude')+'</td><td>'+feature.properties.start_alt+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Finish altitude')+'</td><td>'+feature.properties.finish_alt+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Start time')+'</td><td>'+feature.properties.start_time+'</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Finish time')+'</td><td>'+feature.properties.finish_time+'</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Duration')+'</td><td>'+feature.properties.duration+'</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude gain')+'</td><td>'+feature.properties.acc_gain+'m</td></tr>';
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude loss')+'</td><td>'+feature.properties.acc_loss+'m</td></tr>';
  htmlTable += '</table>';
 // htmlTable = '<table><caption>1028m - 1,3 m/s</caption><tr><td>Altitude gain</td><td>1028m</td></tr><tr><td>Average climb</td><td>1,3m/s</td></tr><tr><td>Maximum climb</td><td>2,7m/s</td></tr><tr><td>Peak climb</td><td>5,0m/s</td></tr><tr><td>Efficiency</td><td>50%</td></tr><tr><td>Start altitude</td><td>1845m</td></tr><tr><td>Finish altitude</td><td>2873m</td></tr><tr><td>Start time</td><td>13:00:17</td></tr><tr><td>Finish time</td><td>13:13:04</td></tr><tr><td>Duration</td><td>12mn47s</td></tr><tr><td>Accumulated altitude gain</td><td>1081m</td></tr><tr><td>Accumulated altitude loss</td><td>-53m</td></tr><tr><td>Drift</td><td>7,5km/h SW</td></tr></table>';
  layer.bindPopup(htmlTable);
  //layer.bindPopup('<h1>'+feature.properties.alt_gain+'</h1><p>name: '+feature.properties.avg_climb+'</p>');
  
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

// from https://gist.github.com/geog4046instructor/80ee78db60862ede74eacba220809b64
function thermalIcon (feature, latlng) {
  // si on le désire on peut récuperer une properties pour customiser l'icône genre plus gros thermique ou plus grosse transition
  //console.log('feature.properties.avg_climb = '+feature.properties.avg_climb)
  let myIcon = L.AwesomeMarkers.icon({icon: 'fa-cloud-upload', markerColor: 'blue', prefix: 'fa', iconColor: 'white'}) 
  return L.marker(latlng, { icon: myIcon })
}
