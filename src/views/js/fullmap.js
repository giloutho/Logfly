const {ipcRenderer} = require('electron')
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

const L = require('leaflet');
const Highcharts = require('highcharts');
const myMeasure = require('../../leaflet/measure.js')
const useGoogle = require('../../leaflet/google-leaflet.js')
const layerTree = require('leaflet.control.layers.tree')
const awesomeMarker = require('../../leaflet/leaflet.awesome-markers.min.js')
const mapSidebar = require('../../leaflet/sidebar-tabless.js')

const btnClose = document.getElementById('bt-close')
const btnInfos  = document.getElementById('bt-infos')
const btnMeasure  = document.getElementById('bt-mes')

let currlang
let hgChart
let sidebar
let endLatlng 
let startLatlng
let sidebarState

iniForm()

let locMeasure = new myMeasure()

ipcRenderer.on('geojson-for-map', (event, [track,analyzedTrack,tkSite]) => {
  mainTrack = track
  anaTrack = analyzedTrack
  tkoffSite = tkSite
  const winLabel = mainTrack.info.date+' '+i18n.gettext('Glider')+' : '+mainTrack.info.gliderType.trim()
  document.getElementById('wintitle').innerHTML = winLabel
  buildMap()
})

function buildMap() {

  // https://stackoverflow.com/questions/54331439/how-to-map-json-object-to-array
	// pour mieux comprendre map : https://www.digitalocean.com/community/tutorials/4-uses-of-javascripts-arraymap-you-should-know-fr
  const arrayAlti = mainTrack.GeoJSON.features[0]['geometry']['coordinates'].map(coord => coord[2]);
  // times contained in the GeoJSon are only strings
  // conversion to date object is necessary for Highcharts.dateFormat to work on the x axis
  const arrayHour = mainTrack.GeoJSON.features[0]['properties']['coordTimes'].map(hour => new Date(hour));
  map = L.map('carte').setView([0, 0], 5);


  const osmlayer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'});
  const OpenTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 16,
      attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  });
  const mtklayer = L.tileLayer('http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png');
  const fouryoulayer = L.tileLayer('http://4umaps.eu/{z}/{x}/{y}.png');
  const outdoorlayer = L.tileLayer('https://{s}.tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=6f5667c1f2d24e5f84ec732c1dbd032e', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });
  const googleLayer = new L.Google('TERRAIN');
  const googleSat = new L.Google('SATELLITE');

  const ignlayer = L.tileLayer('https://wxs.ign.fr/{ignApiKey}/geoportail/wmts?'+
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

  const baseMaps = {
      "OpenTopo" : OpenTopoMap,
      "IGN" : ignlayer,
      "OSM": osmlayer,
      "MTK" : mtklayer,
      "4UMaps" : fouryoulayer,
      "Outdoor" : outdoorlayer,
      "Google Terrain" : googleLayer,
      "Google Sat" : googleSat
  };

  const openaip_cached_basemap = new L.TileLayer("http://{s}.tile.maps.openaip.net/geowebcache/service/tms/1.0.0/openaip_basemap@EPSG%3A900913@png/{z}/{x}/{y}.png", {
    maxZoom: 14,
    minZoom: 4,
    tms: true,
    detectRetina: true,
    subdomains: '12',
    format: 'image/png',
    transparent: true
  });


  let mousemarker = null;

  locMeasure.addTo(map);

  const trackOptions = {
    color: 'red',
    weight: 2,
    opacity: 0.85
  };

  const thermOptions = {
    color: 'yellow',
    weight: 6,
    opacity: 0.50
  };

  const glideOptions = {
    color: '#848484',
    weight: 3, 
    dashArray: '10,5', 
    opacity: 1
  };

  map.removeLayer(L.geoJson);
  const geojsonLayer = L.geoJson(mainTrack.GeoJSON,{ style: trackOptions })
  const tracksGroup = new L.LayerGroup();
  tracksGroup.addTo(map);
  tracksGroup.addLayer(geojsonLayer);

  const thermalLayerOption = {
    style: thermOptions, 
    pointToLayer: thermalIcon,
    onEachFeature: createPopThermal // the code comes from a mine of snippet Leaflet https://gist.github.com/geog4046instructor
  }
  const geoThermals =  L.geoJson(anaTrack.geoThermals,thermalLayerOption);
  const thermalGroup = new L.LayerGroup();
  thermalGroup.addLayer(geoThermals);

  const glideLayerOption = {
    style: glideOptions, 
    pointToLayer: glideIcon,
    onEachFeature: createPopGlide
  }
  const geoGlides =  L.geoJson(anaTrack.geoGlides,glideLayerOption)
  const GlidesGroup = new L.LayerGroup();
  GlidesGroup.addLayer(geoGlides);

  let mAisrpaces = i18n.gettext('Airspaces');
  let mTrack = i18n.gettext('Track');
  let mThermal = i18n.gettext('Thermals');
  let mTrans = i18n.gettext('Transitions');
  const Affichage = {
    [mAisrpaces] : openaip_cached_basemap,  
    [mTrack] : tracksGroup,
    [mThermal] : thermalGroup,
    [mTrans]: GlidesGroup,
  };

  L.control.layers(baseMaps,Affichage).addTo(map);
  
  const StartIcon = new L.Icon({
    iconUrl: '../../leaflet/images/windsock22.png',
    shadowUrl: '../../leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [0, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  });

  startLatlng = L.latLng(mainTrack.fixes[0].latitude, mainTrack.fixes[0].longitude)
  L.marker(startLatlng,{icon: StartIcon}).addTo(map);

  const EndIcon = new L.Icon({
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
  // by default sidebar is open on tab "summary"
  sidebar.open('summary');

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
                        //console.log('x '+this.x+'  Lat '+mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][1]+' Long '+mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][0])
                       // console.log(arrayHour[this.x])
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
          let index = this.point.index;
          //var tooltip = Heure[index]+'<br/>Alt : '+altiVal[index]+'m<br/>HS : '+groundVal[index]+'m<br/>Vz : '+Vario[index]+'m/s<br/>Vit : '+Speed[index]+' km/h';
          tooltip = Highcharts.dateFormat('%H:%M:%S', arrayHour[index])+'<br/>Alt : '+arrayAlti[index]+'m<br/>Vz : '+mainTrack.vz[index].toFixed(2)+'m/s<br/>Vit : '+mainTrack.speed[index].toFixed(0)+' km/h'
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
  document.getElementById("sideNavigation").style.width = "260px";
  document.getElementById("carte").style.marginLeft = "260px";
  document.getElementById("carte").style.width = screenWidth - 260 + 'px';
  document.getElementById("graphe").style.marginLeft = "260px";
  document.getElementById('graphe').style.width = screenWidth - 260 + 'px';
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
    currLang = store.get('lang')
    if (currLang != undefined && currLang != 'en') {
        currLangFile = currLang+'.json'
        let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
        let langjson = JSON.parse(content);
        i18n.setMessages('messages', currLang, langjson)
        i18n.setLocale(currLang);
    }
  } catch (error) {
      log.error('[problem.js] Error while loading the language file')
  }  
 // btnClose.innerHTML = i18n.gettext('Close')
  btnClose.addEventListener('click',(event) => {
      ipcRenderer.send('hide-waiting-gif',null)
      window.close()
  })  
  btnInfos.innerHTML = i18n.gettext('Hide analysis')
  btnInfos.addEventListener('click',(event) => {
    // sidebarState is updated by sidebar events: opening, closing defined on buildSidePanels()
    if (sidebarState) {
      sidebar.close()
      sidebarState = false
    } else {
      sidebar.open('summary')
      sidebarState = true
    }
  })  
  btnMeasure.innerHTML = i18n.gettext('Measure')
  btnMeasure.addEventListener('click',(event) => {
    locMeasure._toggleMeasure()
  })
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

  sidebar.addPanel({
    id:   'infos',
    tab:  '<i class="fa fa-gear"></i>',
    title: i18n.gettext('General information'),
    pane: fillSidebarInfo()
  })    

  sidebar.on('closing', function(e) {
    sidebarState = false
    btnInfos.innerHTML = i18n.gettext('Show analysis')
  })

  sidebar.on('opening', function(e) {
    sidebarState = true
    btnInfos.innerHTML = i18n.gettext('Hide analysis')
  })

}

// voir https://stackoverflow.com/questions/1519271/what-is-the-best-way-to-override-an-existing-css-table-rule qui fait la différence
// entre la classe et l'application à une id de table

function fillSidebarInfo() {

  let flightDate
  const dateTkoff = new Date(mainTrack.fixes[0].timestamp)
  // getMonth returns integer from 0(January) to 11(December)
  const dTkOff = String(dateTkoff.getDate()).padStart(2, '0')+'/'+String((dateTkoff.getMonth()+1)).padStart(2, '0')+'/'+dateTkoff.getFullYear()     
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
  const centerX = 125;
  const centerY = 125;
  const radius = 105;
  let mysvg = '';
  let arr = pieGnerator.pie(centerX, centerY, radius, data);
  for (let i = 0; i < arr.length; i++) {
      let item = arr[i];  
      mysvg +=`<g transform="${item.transform}"><path d="${item.d}" fill="${color[i]}" /><text fill="white" font-size="14" ${item.text}">${item.value}%</text></g>`;
  }

  let htmlText = fillSidebarButtons()
  htmlText +='<br>'
  htmlText += '<div style="text-align: center;"><svg id="onePieDiv" width="250" height="250">';
  htmlText += mysvg;
  htmlText += '</svg></div>';
  htmlText +='<p align="center"><span style="margin-left:10px;font-size:16px;background-color:  #F6BB42; color: white;">&nbsp;&nbsp;&nbsp;'+i18n.gettext('Thermal')+'&nbsp;&nbsp;'+percThermals+'&nbsp;%&nbsp;&nbsp;&nbsp;</span>'
  htmlText +='<span style="margin-left:10px;font-size:16px;background-color:  #8CC152; color: white;">&nbsp;&nbsp;&nbsp;'+i18n.gettext('Glide')+'&nbsp;&nbsp;'+percGlides+'&nbsp;%&nbsp;&nbsp;&nbsp;</span>'
  htmlText +='</p>'
  htmlText +='<p align="center"><span style="font-size:16px;background-color: #DA4453; color: white;">&nbsp;&nbsp;&nbsp;'+i18n.gettext('Various')+'&nbsp;&nbsp;'+percVarious+'&nbsp;%&nbsp;&nbsp;&nbsp;</span>'
  htmlText +='<span style="margin-left:10px;font-size:16px;background-color:  #967ADC; color: white;">&nbsp;&nbsp;&nbsp;'+i18n.gettext('Dive')+'&nbsp;&nbsp;'+percDives+'&nbsp;%&nbsp;&nbsp;&nbsp;</span>'
  htmlText +='</p>'

  let efficiencyColor = '000000'
  let htmlIcon = ''
  if (anaTrack.avgThermalEffi > 69) {
    efficiencyColor = '66FF66'
    htmlIcon = '<i class="fa fa-thumbs-up" aria-hidden="true"></i>'
  } else if (anaTrack.avgThermalEffi > 49) {
    efficiencyColor = 'FFFF00'   
    htmlIcon = '<i class="fa fa-hand-peace-o" aria-hidden="true"></i>' 
  } else {
    efficiencyColor = 'FF6600'
    htmlIcon = '<i class="fa fa-thumbs-o-down" aria-hidden="true"></i>'
  }
  const avgThermalClimb = (Math.round(anaTrack.avgThermalClimb * 100) / 100).toFixed(2)
  let avgTransSpeed =  (Math.round(anaTrack.avgTransSpeed * 100) / 100).toFixed(0)
  const  h = Math.floor(anaTrack.extractTime / 3600);
  const m = Math.floor(anaTrack.extractTime % 3600 / 60);
  const s = Math.floor(anaTrack.extractTime % 3600 % 60);
  const hDisplay = h > 0 ? h + (h == 1 ? "h" : "h") : "";
  const mDisplay = m > 0 ? m + (m == 1 ? "mn" : "mn") : "";
  const sDisplay = s > 0 ? s + (s == 1 ? "s" : "s") : "";
  let hExtractTime = hDisplay + mDisplay + sDisplay;    
  htmlText +='<p style="font-size:16px;">'+i18n.gettext('Avg th efficiency')+'&nbsp;&nbsp;<span style="margin-right:10px; font-size:14px;background-color: #'+efficiencyColor+'; color: white;">&nbsp;&nbsp;'+Math.ceil(anaTrack.avgThermalEffi)+'%</span>'+htmlIcon+'<br>'
  htmlText += i18n.gettext('Avg thermal climb')+'&nbsp;&nbsp;'+avgThermalClimb+'&nbsp;m/s<br>'
  htmlText += i18n.gettext('Max gain')+'&nbsp;&nbsp;'+anaTrack.bestGain+' m<br>'
  htmlText += i18n.gettext('Extraction time')+'&nbsp;&nbsp;'+hExtractTime+'<br>'
  htmlText += i18n.gettext('Avg transition speed')+'&nbsp;&nbsp;'+avgTransSpeed+'&nbsp;km/h<br>'
  htmlText += i18n.gettext('Max speed')+'&nbsp;&nbsp;'+mainTrack.stat.maxspeed+' km/h<br>' 
  htmlText += i18n.gettext('Alt max GPS')+'&nbsp;&nbsp;'+mainTrack.stat.maxalt.gps+'m&nbsp;&nbsp;&nbsp'
  htmlText += '<span style="margin-left:10px">'+i18n.gettext('Min GPS Alt')+'&nbsp;&nbsp;'+mainTrack.stat.minialt.gps+'m&nbsp;&nbsp;&nbsp</span><br>'  
  htmlText += i18n.gettext('Max climb')+'&nbsp;&nbsp;'+mainTrack.stat.maxclimb+' m/s&nbsp;&nbsp;&nbsp' 
  htmlText += '<span style="margin-left:10px">'+i18n.gettext('Max sink')+'&nbsp;&nbsp;'+mainTrack.stat.maxsink+' m/s&nbsp;&nbsp;&nbsp<br>' 
  htmlText +='</p>'

  return htmlText
}
/**
 * We keep this code just in case... 
 * We have not been able to inject it without error in the div leaflet-sidebar-content
 * The problem is that there is no specific div to receive the highchart object
 */
function hightchartSummary() {
  let percThermals = Math.round(anaTrack.percThermals*100);
  let percGlides = Math.round(anaTrack.percGlides*100)
  let percDives = Math.round(anaTrack.percDives*100)
  let percVarious = Math.round(100-(percThermals+percGlides+percDives))
  const summaryData = new Array(percThermals, percGlides, percDives, percVarious);

  pieChart = new Highcharts.Chart({

    chart: {
      type: 'pie',
      renderTo: 'summarygil',
  },
  title: {
      text: 'Synthèse'
  },
  tooltip: {
     // pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
  },
  plotOptions: {
    series: {
      dataLabels: {
          enabled: true,
          // formatter: function() {
          //     return Math.round(this.percentage*100)/100 + ' %';
          // },
          format: '<b>{point.name}</b><br> {point.percentage:.1f} %',
          distance: -50,
          color:'white'
      }
    }
  },
  series: [{
    data: [{
        name: 'Thermiques',
        y: percThermals,
        sliced: true,
        selected: true
    }, {
        name: 'Transitions',
        y: percGlides
    },  {
        name: 'Divers',
        y: percVarious
    }]
  }], 
  })
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
  htmlText += ' <button type="button" class="btn-success btn-sm mr-3" onclick="sidebar.open(\'summary\')">'+i18n.gettext('Summary')+'</button>'
  htmlText += ' <button type="button" class="btn-warning btn-sm mr-3" onclick="openPathway()">'+i18n.gettext('Pathway')+'</button>'
  htmlText += ' <button type="button" class="btn-secondary btn-sm" onclick="sidebar.open(\'infos\')">'+i18n.gettext('General')+'</button>'
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