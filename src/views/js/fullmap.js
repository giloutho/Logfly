var {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store();

const dblog = require('../../utils/db/db-search.js')
const pieGnerator = require('../../utils/graphic/pie-generator.js')

let mainTrack
let anaTrack
let tkoffSite

var L = require('leaflet');
var Highcharts = require('highcharts');
var myMeasure = require('../../leaflet/measure.js')
var useGoogle = require('../../leaflet/google-leaflet.js')
var layerTree = require('leaflet.control.layers.tree')
var awesomeMarker = require('../../leaflet/leaflet.awesome-markers.min.js')
var mapSidebar = require('../../leaflet/sidebar-tabless.js')
var hgChart
var sidebar
var endLatlng 
var startLatlng

iniForm()

var btnClose = document.getElementById('bt-close')
btnClose.addEventListener('click',(event) => {
    ipcRenderer.send('hide-waiting-gif',null)
    window.close()
})

var btnInfos  = document.getElementById('bt-infos')
btnInfos.addEventListener('click',(event) => {
  sidebar.open('infos');
})

var btnMail  = document.getElementById('bt-mail')
btnMail.addEventListener('click',(event) => {
  testdb();
})

ipcRenderer.on('geojson-for-map', (event, [track,analyzedTrack,tkSite]) => {
  mainTrack = track
  anaTrack = analyzedTrack
  tkoffSite = tkSite
  buildMap()
})

function buildMap() {

  // https://stackoverflow.com/questions/54331439/how-to-map-json-object-to-array
	// pour mieux comprendre map : https://www.digitalocean.com/community/tutorials/4-uses-of-javascripts-arraymap-you-should-know-fr
  const arrayAlti = mainTrack.GeoJSON.features[0]['geometry']['coordinates'].map(coord => coord[2]);
  // les heures contenues dans le GeoJSon ne sont que des strings
  // la conversion en date est nécessaire pour que Highcharts.dateFormat fonctionne sur l'axe des x
  var arrayHour = mainTrack.GeoJSON.features[0]['properties']['coordTimes'].map(hour => new Date(hour));

  console.log('array Alti taille : '+arrayAlti.length+' Elevation : '+anaTrack.elevation.length)

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

  var ignlayer = L.tileLayer('https://wxs.ign.fr/{ignApiKey}/geoportail/wmts?'+
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

  OpenTopoMap.addTo(map);

  var baseMaps = {
      "OpenTopo" : OpenTopoMap,
      "IGN" : ignlayer,
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

  var glideOptions = {
    color: '#848484',
    weight: 3, 
    dashArray: '10,5', 
    opacity: 1
  };

  map.removeLayer(L.geoJson);
  var geojsonLayer = L.geoJson(mainTrack.GeoJSON,{ style: trackOptions })
  var tracksGroup = new L.LayerGroup();
  tracksGroup.addTo(map);
  tracksGroup.addLayer(geojsonLayer);

  var thermalLayerOption = {
    style: thermOptions, 
    pointToLayer: thermalIcon,
    onEachFeature: createPopThermal // code proviuent d'une mine de snippet Leaflet https://gist.github.com/geog4046instructor
  }
  var geoThermals =  L.geoJson(anaTrack.geoThermals,thermalLayerOption);
  var thermalGroup = new L.LayerGroup();
  thermalGroup.addLayer(geoThermals);

  var glideLayerOption = {
    style: glideOptions, 
    pointToLayer: glideIcon,
    onEachFeature: createPopGlide
  }
  var geoGlides =  L.geoJson(anaTrack.geoGlides,glideLayerOption)
  var GlidesGroup = new L.LayerGroup();
  GlidesGroup.addLayer(geoGlides);

  let mAisrpaces = i18n.gettext('Airspaces');
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

  startLatlng = L.latLng(mainTrack.fixes[0].latitude, mainTrack.fixes[0].longitude)
  L.marker(startLatlng,{icon: StartIcon}).addTo(map);

  var EndIcon = new L.Icon({
    iconUrl: '../../leaflet/images/Arrivee22.png',
    shadowUrl: '../../leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [4, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  });

  endLatlng = L.latLng(mainTrack.fixes[mainTrack.fixes.length - 1].latitude, mainTrack.fixes[mainTrack.fixes.length - 1].longitude)
  L.marker(endLatlng,{icon: EndIcon}).addTo(map);

  sidebar = L.control.sidebar({
    autopan: false,       // whether to maintain the centered map point when opening the sidebar
    closeButton: true,    // whether t add a close button to the panes
    container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
    position: 'left',     // left or right
  }).addTo(map);

  buildSidePanels()
  sidebar.open('infos');

  console.log(anaTrack.elevation[0]+1000)

  hgChart = new Highcharts.Chart({
    chart: {      
  //  type: 'line',
    renderTo: 'graphe',
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
                        posMarker = new L.LatLng(mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][1], mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][0]);
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
                        console.log('x '+this.x+'  Lat '+mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][1]+' Long '+mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][0])
                        console.log(arrayHour[this.x])
                        panMarker = new L.LatLng(mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][1], mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][0]);
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
        },
        areaspline: {
          fillOpacity: 0.5,
          threshold: 9000
        }
    },
    tooltip: {
      formatter: function (tooltip) {
          if (this.point.isNull) {
              return 'Null';
          }
          var index = this.point.index;
          //var tooltip = Heure[index]+'<br/>Alt : '+altiVal[index]+'m<br/>HS : '+groundVal[index]+'m<br/>Vz : '+Vario[index]+'m/s<br/>Vit : '+Speed[index]+' km/h';
          var tooltip = Highcharts.dateFormat('%H:%M:%S', arrayHour[index])+'<br/>Alt : '+arrayAlti[index]+'m<br/>Vz : '+mainTrack.vz[index].toFixed(2)+'m/s<br/>Vit : '+mainTrack.speed[index].toFixed(0)+' km/h'
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

    series: [
      {
        showInLegend: false,
        type: 'line',
        data: arrayAlti
      },      
      {  
        showInLegend: false,
        type: 'area',
        color: '#D2691E',
        data: anaTrack.elevation
      }      
    ]
});
// est ce nécessaire  ? a voir sur un ordi moins rapide
// j'imagine que je l'avais placé pour attendre la création de la carte
  //setTimeout(function(){ map.fitBounds(geojsonLayer.getBounds()); }, 1000);
  // on supprime pour l'instant, on y va sans timeout
  map.fitBounds(geojsonLayer.getBounds());

  // test div sidebar
  document.getElementById('summarygil').innerHTML = 'coucou Gil'
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

function openNav() {
  // https://stackoverflow.com/questions/4787527/how-to-find-the-width-of-a-div-using-vannilla-javascript
  // http://jsfiddle.net/juxy42ev/    -> Toggle sidebar
  let screenWidth = document.getElementById('graphe').offsetWidth
  console.log('OpenNav largeur '+screenWidth)
  document.getElementById("sideNavigation").style.width = "260px";
  document.getElementById("carte").style.marginLeft = "260px";
  document.getElementById("carte").style.width = screenWidth - 260 + 'px';
 // console.log('avant '+document.getElementById('graphe').offsetWidth)
  document.getElementById("graphe").style.marginLeft = "260px";
//  console.log('avant '+document.getElementById('graphe').style.width)
 //  document.getElementById('graphe').style.width = '1353px';
  document.getElementById('graphe').style.width = screenWidth - 260 + 'px';
 // console.log('après '+document.getElementById('graphe').style.offsetWidth)
  console.log('reflow : '+hgChart.reflow);
  hgChart.reflow();
  $('.leaflet-control-layers-selector')[9].click();
  $('.leaflet-control-layers-selector')[10].click();
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
  let myIcon;
  if (feature.properties.best_thermal) {
    myIcon = L.AwesomeMarkers.icon({icon: 'fa-thumbs-up', markerColor: 'darkblue', prefix: 'fa', iconColor: 'white'})
  } else {
    myIcon = L.AwesomeMarkers.icon({icon: 'fa-cloud-upload', markerColor: 'blue', prefix: 'fa', iconColor: 'white'}) 
  }
  return L.marker(latlng, { icon: myIcon })
}

// from https://gist.github.com/geog4046instructor/80ee78db60862ede74eacba220809b64
function glideIcon (feature, latlng) {
  let myIcon;
  if (feature.properties.glideToRight) {
    myIcon = L.AwesomeMarkers.icon({icon: 'fa-angle-right', markerColor: 'red', prefix: 'fa', iconColor: 'white'})
  } else {
    myIcon = L.AwesomeMarkers.icon({icon: 'fa-angle-left', markerColor: 'red', prefix: 'fa', iconColor: 'white'}) 
  }
  return L.marker(latlng, { icon: myIcon })
}

function buildSidePanels()
{

  sidebar.addPanel({
    id:   'infos',
    tab:  '<i class="fa fa-gear"></i>',
    title: i18n.gettext('General information'),
    pane: fillSidebarInfo()
  })  

  sidebar.addPanel({
    id:   'summary',
    tab:  '<i class="fa fa-gear"></i>',
    title: i18n.gettext('Summary'),
    pane: fillSidebarSummary()
  })
  
  sidebar.addPanel({
    id:   'pathway',
    tab:  '<i class="fa fa-gear"></i>',
    title: i18n.gettext('Pathway'),
    pane: fillSidebarPathway()
  }) 
}

// voir https://stackoverflow.com/questions/1519271/what-is-the-best-way-to-override-an-existing-css-table-rule qui fait la différence
// entre la classe et l'application à une id de table

function fillSidebarInfo() {

  let flightDate
  const dateTkoff = new Date(mainTrack.fixes[0].timestamp)
  const dTkOff = String(dateTkoff.getDay()).padStart(2, '0')+'/'+String(dateTkoff.getMonth()).padStart(2, '0')+'/'+dateTkoff.getFullYear()      
  const hTkoff = String(dateTkoff.getHours()).padStart(2, '0')+':'+String(dateTkoff.getMinutes()).padStart(2, '0')
  const dateLand = new Date(mainTrack.fixes[mainTrack.fixes.length - 1].timestamp);
  const hLand = String(dateLand.getHours()).padStart(2, '0')+':'+String(dateLand.getMinutes()).padStart(2, '0')+':'+String(dateLand.getSeconds()).padStart(2, '0');     
  const durationFormatted = new Date(mainTrack.stat.duration*1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
  const arrTakeOff = tkoffSite.split("*");
  let formattedSite
  if (arrTakeOff.length > 1)
    formattedSite = arrTakeOff[0]+' ('+arrTakeOff[1]+')'
  else
    formattedSite = tkoffSite
  let trackSecurity = i18n.gettext('No')
  if (mainTrack.info.security !== null) 
  {
    if (mainTrack.info.security.toString() == (null || ""))
      trackSecurity = i18n.gettext('No')
    else 
      trackSecurity = i18n.gettext('Yes')
  }
  let htmlText = fillSidebarButtons()
  htmlText += '<div><table>'
  htmlText += '    <tbody>'
  htmlText += '      <tr><td>'+i18n.gettext('Date')+'</td><td>'+mainTrack.info.date+'</td></tr>'      
  htmlText += '      <tr><td>'+i18n.gettext('Pilot')+'</td><td>'+mainTrack.info.pilot+'</td></tr>'  
  htmlText += '      <tr><td>'+i18n.gettext('Glider')+'</td><td>'+mainTrack.info.gliderType+'</td></tr>'  
  htmlText += '      <tr><td>'+i18n.gettext('Duration')+'</td><td>'+durationFormatted+'</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Take off')+'</td><td>'+hTkoff+'</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('GPS alt')+'</td><td>'+mainTrack.fixes[0].gpsAltitude+' m</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Site')+'</td><td>'+formattedSite+'</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Landing')+'</td><td>'+hLand+'</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('GPS alt')+'</td><td>'+mainTrack.fixes[mainTrack.fixes.length - 1].gpsAltitude+' m</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('City')+'</td><td></td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Max GPS alt')+'</td><td>'+mainTrack.stat.maxalt.gps+' m</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Min GPS alt')+'</td><td>'+mainTrack.stat.minialt.gps+' m</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Max climb')+'</td><td>'+mainTrack.stat.maxclimb+' m/s</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Max sink')+'</td><td>'+mainTrack.stat.maxsink+' m/s</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Max gain')+'</td><td>'+anaTrack.bestGain+' m</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Max speed')+'</td><td>'+mainTrack.stat.maxspeed+' km/h</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Best transition')+'</td><td>'+(anaTrack.bestGlide/1000).toFixed(2)+' km</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Points')+'</td><td>'+mainTrack.fixes.length+'</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Range')+'</td><td>'+mainTrack.stat.interval+' s</td></tr>' 
  htmlText += '      <tr><td>'+i18n.gettext('Size')+'</td><td>'+mainTrack.stat.distance.toFixed(2)+' km</td></tr>'   
  htmlText += '      <tr><td>'+i18n.gettext('Signature')+'</td><td>'+trackSecurity+'</td></tr>' 
  htmlText += '    </tbody>'
  htmlText += '  </table></div>'

  return htmlText
}


function fillSidebarSummary() {
  
  let percThermals = Math.round(anaTrack.percThermals*100);
  let percGlides = Math.round(anaTrack.percGlides*100)
  let percDives = Math.round(anaTrack.percDives*100)
  let percVarious = Math.round(100-(percThermals+percGlides+percDives))
  console.log('% thermal : '+percThermals+'  % glides : '+percGlides+'  % dives : '+percDives)

  let data  = [];
  let color = [];
  data.push({ value: percThermals });
  color.push('#F6BB42');
  data.push({ value: percGlides });
  color.push('#8CC152');
  data.push({ value: percVarious });
  color.push('#DA4453');
  if (percDives > 0) {
    data.push({ value: percDives });
    color.push('#967ADC');
  }
  var centerX = 200;
  var centerY = 200;
  var radius = 180;
  let mysvg = '';
  let arr = pieGnerator.pie(centerX, centerY, radius, data);
  for (var i = 0; i < arr.length; i++) {
      var item = arr[i];
      mysvg +=`<g transform="${item.transform}"><path d="${item.d}" fill="${color[i]}" /><text fill="white" font-size="25" ${item.text}">${item.value}%</text></g>`;
  }
  console.log(mysvg);

  let htmlText = fillSidebarButtons()
  htmlText +='<br><br><br><br>'
  htmlText += '<svg id="onePieDiv" width="400" height="400">';
  htmlText += mysvg;
  htmlText += '</svg>';

  // test div preexistante
  htmlText += '<div id="summarygil"></div>';

  // htmlText +='<svg height="300" width="300" viewBox="0 0 100 100">' 
  // htmlText +='<circle r="100" cx="10" cy="10" fill="white" />'
  // htmlText +='<circle r="100" cx="10" cy="10" fill="bisque" />'
  // htmlText +='<svg height="400" width="400">'
  // htmlText +='<circle cx="200" cy="200" r="190" stroke="black" stroke-width="3" fill="red" />'
  // htmlText +='</svg>'

  // htmlText +='<svg height="200" width="200">' 
  // htmlText +='<path d="M 100 0 A 100 100 0 0 1 186.6 150 L 100 100 L 100 0 Z" class=\'type0\'/>'
  // htmlText +='<path d="M 186.6 150 A 100 100 0 1 1 100 0 L 100 100 L 186.6 150 Z" class=\'type1\'/>'
  // htmlText +='</svg>'

  return htmlText
}

function fillSidebarPathway() {
  let lineCatIcon 
  let lineTime
  let lineElapsed
  let lineAlt
  let lineInfo
  let climb2dec
  let htmlText = fillSidebarButtons()
  htmlText += '<div><table style="width: 100%;margin-top: 100px;">'
  htmlText += '    <tbody>'
  // header
  htmlText += '      <tr><td>'+i18n.gettext('Time')+'</td><td>'+i18n.gettext('Elapsed')+'</td><td>'+i18n.gettext('Alt')+'</td><td><td></tr>'
  lineInfo = '<td></td>'
  for (let cr of anaTrack.course) {
    switch (cr.category) {
      case 'K':
        // Take Off
        //lineCatIcon = '<td><i class="fa fa-paper-plane fa-2x"></i></td>' 
       // lineCatIcon = '<td><i class="fa fa-paper-plane"></i></td>' 
        lineCatIcon = '<td><a href="javascript:void(0)" onclick="displayTakeOff()"><i class="fa fa-paper-plane"></i> '+i18n.gettext('Take off')+'</a></td>'
        lineTime = '<td>'+cr.time+'</td>'
        lineElapsed = '<td>00:00</td>'
        lineAlt = '<td>'+cr.alt+'</td>'
      //  lineInfo = '<td>'+i18n.gettext('Take off')+'</td>'
        lineInfo = '<td></td>'
        break;
      case 'T':
          // Thermal
          //lineCatIcon = '<td><i class="fa fa-cloud-upload fa-2x"></i></td>' 
         // lineCatIcon = '<td><i class="fa fa-cloud-upload"></i></td>' 
          lineCatIcon = '<td><a href="javascript:void(0)" onclick="displaySegment('+cr.coords+')"><i class="fa fa-cloud-upload"></i> '+i18n.gettext('Thermal')+'</a></td>'
          lineTime = '<td>'+cr.time+'</td>'
          lineElapsed = '<td>'+cr.elapsed+'</td>'
          lineAlt = '<td>'+cr.alt+'</td>'
          climb2dec = (Math.round(cr.data2 * 100) / 100).toFixed(2)
          lineInfo = '<td>[+'+cr.data1+'m '+climb2dec+'m/s]</td>'    
          console.log(cr.coords)  
          break;    
      case 'G':
        // Glide
        //lineCatIcon = '<td><i class="fa fa-arrow-right fa-2x"></i></td>' 
       // lineCatIcon = '<td><i class="fa fa-arrow-right"></i></td>' 
        lineCatIcon = '<td><a href="javascript:void(0)" onclick="displaySegment('+cr.coords+')"><i class="fa fa-arrow-right"></i> '+i18n.gettext('Glide')+'</td>'
        lineTime = '<td>'+cr.time+'</td>'
        lineElapsed = '<td>'+cr.elapsed+'</td>'
        lineAlt = '<td>'+cr.alt+'</td>'
        lineInfo = '<td>[+'+cr.data1+'km '+cr.data2+'km/h]</td>'     
        break;            
      case 'L':
        // Landing
       // lineCatIcon = '<td><i class="fa fa-flag fa-2x"></i></td>' 
      //  lineCatIcon = '<td><i class="fa fa-flag"></i></td>' 
       // lineCatIcon = '<td><i class="fa fa-flag"></i> '+i18n.gettext('Landing')+'</td>'
        lineCatIcon = '<td><a href="javascript:void(0)" onclick="displayLanding()"><i class="fa fa-flag"></i> '+i18n.gettext('Landing')+'</a></td>'

        lineTime = '<td>'+cr.time+'</td>'
        lineElapsed = '<td>'+cr.elapsed+'</td>'
        lineAlt = '<td>'+cr.alt+'</td>'
        //lineInfo = '<td>'+i18n.gettext('Landing')+'</td>'
        lineInfo = '<td></td>'
        break;
        }
    //htmlText += '      <tr>'+lineCatIcon+lineTime+lineElapsed+lineAlt+lineInfo+'</tr>'     
    htmlText += '      <tr>'+lineTime+lineElapsed+lineAlt+lineCatIcon+lineInfo+'</tr>'     
  }
  htmlText += '    </tbody>'
  htmlText += '  </table></div>'

  return htmlText
}

function fillSidebarButtons() {
  let htmlText = '<br>'
  htmlText += '<div class="btn-toolbar pull-left">'
  htmlText += ' <button type="button" class="btn-secondary btn-sm mr-3" onclick="sidebar.open(\'infos\')">'+i18n.gettext('General')+'</button>'
  htmlText += ' <button type="button" class="btn-success btn-sm mr-3" onclick="sidebar.open(\'summary\')">'+i18n.gettext('Summary')+'</button>'
 // htmlText += ' <button type="button" class="btn-warning btn-sm" onclick="sidebar.open(\'pathway\')">'+i18n.gettext('Pathway')+'</button>'
  htmlText += ' <button type="button" class="btn-warning btn-sm" onclick="openPathway()">'+i18n.gettext('Pathway')+'</button>'
  htmlText += '</div>'
  return htmlText
}


// Display Thermals
function openPathway() {
  $('.leaflet-control-layers-selector')[10].click();
  $('.leaflet-control-layers-selector')[11].click();
  sidebar.open('pathway')
}


// Centering on takeoff
function displayTakeOff() {
    map.fitBounds([startLatlng]);      
  } 

// Centering on landing
function displayLanding() {
  map.fitBounds([endLatlng]);      
}    

// Display a segment of the track
function displaySegment(lat1,long1,lat2,long2) {
  map.fitBounds([[lat1, long1],[lat2, long2]]);      
}   

function testdb() {
  console.log(dblog.searchSiteInDb(45.85314, 6.2228, false));
}