const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const dblog = require('../../../utils/db/db-search.js')
const pieGnerator = require('../../../utils/graphic/pie-generator.js')
const configkey  = require ('../../../../config/config.js')
const turfBoolean = require('@turf/boolean-point-in-polygon').default
const turfHelper = require('@turf/helpers')
const checkInternetConnected = require('check-internet-connected')
const listkey = configkey.access

let mainTrack
let anaTrack
let tkoffSite

const tiles = require('../../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps

const Highcharts = require('highcharts')
const myMeasure = require('../../../leaflet/measure.js')
//const useGoogle = require('../../../leaflet/google-leaflet.js')
const layerTree = require('leaflet.control.layers.tree')
const awesomeMarker = require('../../../leaflet/leaflet.awesome-markers.min.js')
const mapSidebar = require('../../../leaflet/sidebar-tabless.js')

const btnClose = document.getElementById('bt-close')
const btnInfos  = document.getElementById('bt-infos')
const btnMeasure  = document.getElementById('bt-mes')

let currlang
let hgChart
let sidebar
let endLatlng 
let startLatlng
let sidebarState
let currLeague
let map
let layerControl
let scoreGroup
let airspGroup
let aipGroup
let geoScore
let currOAFile

iniForm()

let locMeasure = new myMeasure()

ipcRenderer.on('geojson-for-map', (event, [track,analyzedTrack,tkSite]) => {
  mainTrack = track
  anaTrack = analyzedTrack
  tkoffSite = tkSite
  let gliderType
  if (mainTrack.info.gliderType != undefined && mainTrack.info.gliderType != '') {
    gliderType = ' '+i18n.gettext('Glider')+' : '+mainTrack.info.gliderType.trim()
  } else {
    gliderType = ''
  }
  //const winLabel = mainTrack.info.date+' '+i18n.gettext('Glider')+' : '+mainTrack.info.gliderType.trim()
  const winLabel = mainTrack.info.date+gliderType
  document.getElementById('wintitle').innerHTML = winLabel
  buildMap()
  $( "#mnu-scoring a" ).on( "click", function() {
    const selLeague =  $( this ).text()
    $('button[data-toggle="dropdown"]').text(selLeague)
    runXcScore(selLeague)
  })
  if (mainTrack.xcscore != null) displayScoring()
})

function runXcScore(selScoring) {
  if (mainTrack.fixes.length> 0) {
    currLeague = selScoring
    const argsScoring = {
        igcString : mainTrack.igcData,
        league : selScoring
    }
  $('#waiting-spin').removeClass('d-none')
  ipcRenderer.send('ask-xc-score', argsScoring)
  }
}

ipcRenderer.on('xc-score-result', (_, result) => {
  $('#waiting-spin').addClass('d-none')
  mainTrack.xcscore = result
  displayScoring()
})

ipcRenderer.on('check-result', (event, checkResult) => {
  console.log('retour check-result')
  $('#waiting-check').addClass('d-none')
  displayAirCheck(checkResult)
})

function buildMap() {
  // https://stackoverflow.com/questions/54331439/how-to-map-json-object-to-array
	// pour mieux comprendre map : https://www.digitalocean.com/community/tutorials/4-uses-of-javascripts-arraymap-you-should-know-fr
  const arrayAlti = mainTrack.GeoJSON.features[0]['geometry']['coordinates'].map(coord => coord[2])
  // times contained in the GeoJSon are only strings
  // conversion to date object is necessary for Highcharts.dateFormat to work on the x axis
  const arrayHour = mainTrack.GeoJSON.features[0]['properties']['coordTimes'].map(hour => new Date(hour))
  map = L.map('carte').setView([0, 0], 5)

  const defaultMap = store.get('map')
  switch (defaultMap) {
    case 'open':
        baseMaps.OpenTopo.addTo(map)  
        break
      case 'ign':
        baseMaps.IGN.addTo(map)  
        break      
      case 'osm':
        baseMaps.OSM.addTo(map) 
        break
      case 'mtk':
        baseMaps.MTK.addTo(map)  
        break  
      case '4u':
        baseMaps.UMaps.addTo(map)
        break     
      case 'out':
        baseMaps.Outdoor.addTo(map)           
        break           
      default:
        baseMaps.OSM.addTo(map)        
        break   
  }    

  // const openKey = listkey.openaip
  // // origin const openaip_cached_basemap = new L.TileLayer(`https://api.tiles.openaip.net/api/data/airspaces/{z}/{x}/{y}.png?apiKey=${openKey}`, {
  // const openaip_cached_basemap = new L.TileLayer(`https://api.tiles.openaip.net/api/data/openaip/{z}/{x}/{y}.png?apiKey=${openKey}`, {
  //   maxZoom: 14,
  //   minZoom: 4,
  //   detectRetina: true,
  //   format: 'image/png',
  //   transparent: true,
  //   opacity: 1,
  // //  tms: true,    must be removed https://groups.google.com/g/openaip/c/Fg8ED96W7O4
  //   subdomains: '12',
  // })

  let mousemarker = null

  locMeasure.addTo(map)

  const trackOptions = {
    color: 'red',
    weight: 2,
    opacity: 0.85
  }

  const thermOptions = {
    color: 'yellow',
    weight: 6,
    opacity: 0.50
  }

  const glideOptions = {
    color: '#848484',
    weight: 3, 
    dashArray: '10,5', 
    opacity: 1
  }

  map.removeLayer(L.geoJson)
  const geojsonLayer = L.geoJson(mainTrack.GeoJSON,{ style: trackOptions })
  const tracksGroup = new L.LayerGroup()
  tracksGroup.addTo(map)
  tracksGroup.addLayer(geojsonLayer)

  const thermalLayerOption = {
    style: thermOptions, 
    pointToLayer: thermalIcon,
    onEachFeature: createPopThermal // the code comes from a mine of snippet Leaflet https://gist.github.com/geog4046instructor
  }
  const geoThermals =  L.geoJson(anaTrack.geoThermals,thermalLayerOption)
  const thermalGroup = new L.LayerGroup()
  thermalGroup.addLayer(geoThermals)

  const glideLayerOption = {
    style: glideOptions, 
    pointToLayer: glideIcon,
    onEachFeature: createPopGlide
  }
  const geoGlides =  L.geoJson(anaTrack.geoGlides,glideLayerOption)
  const GlidesGroup = new L.LayerGroup()
  GlidesGroup.addLayer(geoGlides)

  const openaip_layer =  new L.LayerGroup()

  openaip_layer.on('add',(e)=>{
    if (typeof aipGroup !== "undefined") {
      map.addLayer(aipGroup)
    } else {
      reqOpenAip()
    }
  })

  openaip_layer.on('remove',(e)=>{
    if (typeof aipGroup !== "undefined") {
      map.removeLayer(aipGroup)
    }
  })


  let mAisrpaces = i18n.gettext('openAIP')
  let mTrack = i18n.gettext('Track')
  let mThermal = i18n.gettext('Thermals')
  let mTrans = i18n.gettext('Transitions')
  let mScore = i18n.gettext('Score')

  let Affichage = {
    [mAisrpaces] : openaip_layer,  
    [mTrack] : tracksGroup,
    [mThermal] : thermalGroup,
    [mTrans]: GlidesGroup,
  }

  layerControl = new L.control.layers(baseMaps,Affichage).addTo(map)
  
  const StartIcon = new L.Icon({
    iconUrl: '../../../leaflet/images/windsock22.png',
    shadowUrl: '../../../leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [0, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  })

  startLatlng = L.latLng(mainTrack.fixes[0].latitude, mainTrack.fixes[0].longitude)
  L.marker(startLatlng,{icon: StartIcon}).addTo(map)

  const EndIcon = new L.Icon({
    iconUrl: '../../../leaflet/images/Arrivee22.png',
    shadowUrl: '../../../leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [4, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  })

  endLatlng = L.latLng(mainTrack.fixes[mainTrack.fixes.length - 1].latitude, mainTrack.fixes[mainTrack.fixes.length - 1].longitude)
  L.marker(endLatlng,{icon: EndIcon}).addTo(map)

  sidebar = L.control.sidebar({
    autopan: false,       // whether to maintain the centered map point when opening the sidebar
    closeButton: true,    // whether t add a close button to the panes
    container: 'sidebar', // the DOM container or #ID of a predefined sidebar container that should be used
    position: 'left',     // left or right
  }).addTo(map)

  buildSidePanels()
  // by default sidebar is open on tab "summary"
  sidebar.open('summary')

  const labelAlt = i18n.gettext('Alt')
  const labelSpeed = i18n.gettext('Spd')
  const labelGround = i18n.gettext('Gnd H')

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
                        posMarker = new L.LatLng(mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][1], mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][0])
                        if (mousemarker == null) {
                          // Le x correspond à l'index, ça tombe bien...
                          // https://gis.stackexchange.com/questions/318400/adding-a-start-and-end-marker-to-a-geojson-linestring                                
                            mousemarker = new L.marker(posMarker).addTo(map)
                        }
                        else {
                            mousemarker.setLatLng(posMarker)
                        }
                      //  info.update(Heure[this.x]+'<br/>Alt : '+altiVal[this.x]+'m<br/>Vz : '+Vario[this.x]+'m/s<br/>Vit : '+Speed[this.x]+' km/h')
                    },
                    click: function () {
                        // On peut préciser un niveau de zoom
                        // On peut utiliser map.setView
                        //console.log('x '+this.x+'  Lat '+mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][1]+' Long '+mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][0])
                       // console.log(arrayHour[this.x])
                        panMarker = new L.LatLng(mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][1], mainTrack.GeoJSON.features[0]['geometry']['coordinates'][this.x][0])
                        map.panTo(panMarker)
                    }
                }
            },
            events: {
                mouseOut: function () {
                    if (mousemarker != null) {
                        map.removeLayer(mousemarker)
                        mousemarker = null
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
              return 'Null'
          }
          let index = this.point.index
          //var tooltip = Heure[index]+'<br/>Alt : '+altiVal[index]+'m<br/>HS : '+groundVal[index]+'m<br/>Vz : '+Vario[index]+'m/s<br/>Vit : '+Speed[index]+' km/h'
          let gndH = ''
          if (anaTrack.elevation[index] != undefined) gndH = arrayAlti[index]- anaTrack.elevation[index]
          tooltip = Highcharts.dateFormat('%H:%M:%S', arrayHour[index])+'<br/>'+labelAlt+' : '+arrayAlti[index]+'m<br/>'+labelGround+' : '+gndH+'m<br/>Vz : '+mainTrack.vz[index].toFixed(2)+'m/s<br/>'+labelSpeed+' : '+mainTrack.speed[index].toFixed(0)+' km/h'
          return tooltip
      },
      crosshairs: true
    },    
    xAxis: {  
      categories: arrayHour,
      labels: {
        formatter: function() {
          return Highcharts.dateFormat('%H:%M', this.value)
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
})

map.on('click',function(e){
  lat = e.latlng.lat
  lon = e.latlng.lng
  let html = ''
  let pointClick = [e.latlng.lng, e.latlng.lat]
  map.eachLayer(function(layer){
    if (layer.hasOwnProperty('feature')) {
      if (layer.feature.hasOwnProperty('properties')) {
        if (layer.feature.geometry.type == 'Polygon') { 
          if (turfBoolean(pointClick, layer.feature)) {
                html += '<i class="fa fa-space-shuttle"></i>&nbsp;'+layer.feature.properties.Class+'&nbsp;&nbsp;['+layer.feature.properties.type+']&nbsp;&nbsp;'
                html += layer.feature.properties.Name+'<br/>'
                html += '<i class="fa fa-arrow-down"></i>&nbsp;'+layer.feature.properties.FloorLabel+'('+layer.feature.properties.Floor+'m )&nbsp;&nbsp;&nbsp;'
                html += '<i class="fa fa-arrow-up"></i>&nbsp;'+layer.feature.properties.CeilingLabel+' ('+layer.feature.properties.Ceiling+'m )</br></br>'
          }
        }
      }
    }    
  })
  if (html != '') {
    map.openPopup(html, e.latlng, {
      offset: L.point(0, -24)
    })
  }
 })

// est ce nécessaire  ? a voir sur un ordi moins rapide
// j'imagine que je l'avais placé pour attendre la création de la carte
  //setTimeout(function(){ map.fitBounds(geojsonLayer.getBounds()); }, 1000);
  // on supprime pour l'instant, on y va sans timeout
  map.fitBounds(geojsonLayer.getBounds())
}

function createPopThermal(feature, layer) {
  let htmlTable = '<table><caption>'+feature.properties.alt_gain+'m - '+feature.properties.avg_climb+'m/s</caption>'                
  htmlTable +='<tr><td>'+i18n.gettext('Altitude gain')+'</td><td>'+feature.properties.alt_gain+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Average climb')+'</td><td>'+feature.properties.avg_climb+'m/s</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Maximum climb')+'</td><td>'+feature.properties.max_climb+'m/s</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Peak climb')+'</td><td>'+feature.properties.peak_climb+'m/s</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Efficiency')+'</td><td>'+feature.properties.efficiency+'%</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Start altitude')+'</td><td>'+feature.properties.start_alt+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Finish altitude')+'</td><td>'+feature.properties.finish_alt+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Start time')+'</td><td>'+feature.properties.start_time+'</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Finish time')+'</td><td>'+feature.properties.finish_time+'</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Duration')+'</td><td>'+feature.properties.duration+'</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude gain')+'</td><td>'+feature.properties.acc_gain+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude loss')+'</td><td>'+feature.properties.acc_loss+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Drift')+'</td><td>'+feature.properties.drift+'</td></tr>'
  htmlTable += '</table>'
 // htmlTable = '<table><caption>1028m - 1,3 m/s</caption><tr><td>Altitude gain</td><td>1028m</td></tr><tr><td>Average climb</td><td>1,3m/s</td></tr><tr><td>Maximum climb</td><td>2,7m/s</td></tr><tr><td>Peak climb</td><td>5,0m/s</td></tr><tr><td>Efficiency</td><td>50%</td></tr><tr><td>Start altitude</td><td>1845m</td></tr><tr><td>Finish altitude</td><td>2873m</td></tr><tr><td>Start time</td><td>13:00:17</td></tr><tr><td>Finish time</td><td>13:13:04</td></tr><tr><td>Duration</td><td>12mn47s</td></tr><tr><td>Accumulated altitude gain</td><td>1081m</td></tr><tr><td>Accumulated altitude loss</td><td>-53m</td></tr><tr><td>Drift</td><td>7,5km/h SW</td></tr></table>'
  layer.bindPopup(htmlTable)
  //layer.bindPopup('<h1>'+feature.properties.alt_gain+'</h1><p>name: '+feature.properties.avg_climb+'</p>')
  
}

/* 
* a priori not used
*/
function openNav() {
  // https://stackoverflow.com/questions/4787527/how-to-find-the-width-of-a-div-using-vannilla-javascript
  // http://jsfiddle.net/juxy42ev/    -> Toggle sidebar
  let screenWidth = document.getElementById('graphe').offsetWidth
  document.getElementById("sideNavigation").style.width = "260px"
  document.getElementById("carte").style.marginLeft = "260px"
  document.getElementById("carte").style.width = screenWidth - 260 + 'px'
  document.getElementById("graphe").style.marginLeft = "260px"
  document.getElementById('graphe').style.width = screenWidth - 260 + 'px'
  hgChart.reflow()
  $('.leaflet-control-layers-selector')[9].click()   // see line 722 index is modified for 8 and 9
  $('.leaflet-control-layers-selector')[10].click()
}

function createPopGlide(feature, layer) {
  let htmlTable = '<table><caption>'+feature.properties.distance+'km - ['+feature.properties.avg_glide+'] '+feature.properties.avg_speed+'km/h</caption>'                
  htmlTable +='<tr><td>'+i18n.gettext('Altitude change')+'</td><td>'+feature.properties.alt_change+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Average descent')+'</td><td>'+feature.properties.avg_descent+'m/s</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Distance')+'</td><td>'+feature.properties.distance+'km</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Average glide ratio')+'</td><td>'+feature.properties.avg_glide+':1</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Average speed')+'</td><td>'+feature.properties.avg_speed+'km/h</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Start altitude')+'</td><td>'+feature.properties.start_alt+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Finish altitude')+'</td><td>'+feature.properties.finish_alt+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Start time')+'</td><td>'+feature.properties.start_time+'</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Finish time')+'</td><td>'+feature.properties.finish_time+'</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Duration')+'</td><td>'+feature.properties.duration+'</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude gain')+'</td><td>'+feature.properties.acc_gain+'m</td></tr>'
  htmlTable += '<tr><td>'+i18n.gettext('Accumulated altitude loss')+'</td><td>'+feature.properties.acc_loss+'m</td></tr>'
  htmlTable += '</table>'
 // htmlTable = '<table><caption>1028m - 1,3 m/s</caption><tr><td>Altitude gain</td><td>1028m</td></tr><tr><td>Average climb</td><td>1,3m/s</td></tr><tr><td>Maximum climb</td><td>2,7m/s</td></tr><tr><td>Peak climb</td><td>5,0m/s</td></tr><tr><td>Efficiency</td><td>50%</td></tr><tr><td>Start altitude</td><td>1845m</td></tr><tr><td>Finish altitude</td><td>2873m</td></tr><tr><td>Start time</td><td>13:00:17</td></tr><tr><td>Finish time</td><td>13:13:04</td></tr><tr><td>Duration</td><td>12mn47s</td></tr><tr><td>Accumulated altitude gain</td><td>1081m</td></tr><tr><td>Accumulated altitude loss</td><td>-53m</td></tr><tr><td>Drift</td><td>7,5km/h SW</td></tr></table>'
  layer.bindPopup(htmlTable)
  //layer.bindPopup('<h1>'+feature.properties.alt_gain+'</h1><p>name: '+feature.properties.avg_climb+'</p>')
  
}



function iniForm() {
  try {    
    currLang = store.get('lang')
    if (currLang != undefined && currLang != 'en') {
        currLangFile = currLang+'.json'
        let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile))
        let langjson = JSON.parse(content)
        i18n.setMessages('messages', currLang, langjson)
        i18n.setLocale(currLang)
    }
  } catch (error) {
      log.error('[fullmap.js] Error while loading the language file')
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
  let myIcon
  if (feature.properties.best_thermal) {
    myIcon = L.AwesomeMarkers.icon({icon: 'fa-thumbs-up', markerColor: 'darkblue', prefix: 'fa', iconColor: 'white'})
  } else {
    myIcon = L.AwesomeMarkers.icon({icon: 'fa-cloud-upload', markerColor: 'blue', prefix: 'fa', iconColor: 'white'}) 
  }
  return L.marker(latlng, { icon: myIcon })
}

// from https://gist.github.com/geog4046instructor/80ee78db60862ede74eacba220809b64
function glideIcon (feature, latlng) {
  let myIcon
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

  sidebar.addPanel({
    id:   'score',
    tab:  '<i class="fa fa-gear"></i>',
    title: i18n.gettext('Score'),
    pane: fillSidebarScoring()
  })     

  sidebar.addPanel({
    id:   'check',
    tab:  '<i class="fa fa-gear"></i>',
    title: i18n.gettext('Checking'),
    pane: fillSidebarChecking()
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
  const dateTkoff = new Date(mainTrack.GeoJSON.features[0].properties.coordTimes[0])  // to get local time
  // getMonth returns integer from 0(January) to 11(December)
  const dTkOff = String(dateTkoff.getDate()).padStart(2, '0')+'/'+String((dateTkoff.getMonth()+1)).padStart(2, '0')+'/'+dateTkoff.getFullYear()     
  const hTkoff =  Highcharts.dateFormat('%H:%M:%S',dateTkoff)
  const dateLand = new Date(mainTrack.GeoJSON.features[0].properties.coordTimes[mainTrack.GeoJSON.features[0].properties.coordTimes.length - 1])
 // const dateLand = new Date(mainTrack.fixes[mainTrack.fixes.length - 1].timestamp)
  const hLand = Highcharts.dateFormat('%H:%M:%S',dateLand)    
  const durationFormatted = new Date(mainTrack.stat.duration*1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0]
  const arrTakeOff = tkoffSite.split("*")
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

function fillSidebarScoring() {
  let htmlText = fillSidebarButtons()
  htmlText += '<br><br>'
  htmlText += '<div style="margin-top: 20px;">'

  htmlText += '<div class="d-flex align-items-center">'
  htmlText += '     <button class="btn btn-outline-secondary dropdown-toggle" type="button" data-toggle="dropdown" id="dd-scoring">score</button>'                      
  htmlText += '     <div class="dropdown-menu" id="mnu-scoring">'
  htmlText += '         <a class="dropdown-item" href="#">FFVL</a>'
  htmlText += '         <a class="dropdown-item" href="#">XContest</a>'
  htmlText += '         <a class="dropdown-item" href="#">FAI</a>'
  htmlText += '         <a class="dropdown-item" href="#">FAI-Cylinders</a>'
  htmlText += '         <a class="dropdown-item" href="#">FAI-OAR</a>'
  htmlText += '         <a class="dropdown-item" href="#">FAI-OAR2</a>'
  htmlText += '         <a class="dropdown-item" href="#">XCLeague</a>'
  htmlText += '     </div>'
  //htmlText += '     <button type="button" class="btn-danger btn-sm mr-3" onclick="displayScoring()">'+i18n.gettext('Scoring')+'</button>'
  htmlText += '     <div class="spinner-border text-danger ml-auto d-none" role="status" id="waiting-spin">'
  htmlText += '        <span class="sr-only">Loading...</span>'
  htmlText += '     </div>'
  //htmlText += '     </div>'
  htmlText += '</div>'
  htmlText += '<br><br>'
  htmlText += '<div id="score_table" class="d-none"><table>'
  htmlText += '    <tbody>'
  htmlText += '      <tr><td>'+i18n.gettext('League')+'</td><td id="sc-league"></td></tr>'     
  htmlText += '      <tr><td>'+i18n.gettext('Best possible')+'</td><td id="sc-best"></td></tr>'      
  htmlText += '      <tr><td id="sc-course"></td><td id="sc-distance"></td></tr>'  
  htmlText += '      <tr><td>'+i18n.gettext('Multiplier')+'</td><td id="sc-multi"></td></tr>' 
  htmlText += '      <tr><td id ="sc-leg1"></td><td id="sc-legd1"></td></tr>' 
  htmlText += '      <tr><td id ="sc-leg2"></td><td id="sc-legd2"></td></tr>' 
  htmlText += '      <tr><td id ="sc-leg3"></td><td id="sc-legd3"></td></tr>' 
  htmlText += '      <tr><td id ="sc-leg4"></td><td id="sc-legd4"></td></tr>' 
  htmlText += '      <tr><td id ="sc-leg5"></td><td id="sc-legd5"></td></tr>' 
  htmlText += '    </tbody>'
  htmlText += '  </table></div>'

  return htmlText  
}

function fillSidebarChecking() {
  let htmlText = fillSidebarButtons()
  htmlText += '<br><br>'
  htmlText += '<div style="margin-top: 20px;">'
  htmlText += '<div class="d-flex align-items-center">'
  htmlText += '     <button type="button" class="btn-light btn-sm mr-3" onclick="checkAirspace()">'+i18n.gettext('Select an airspace file')+'</button>'
  htmlText += '     <div id="check-file" class="d-none" style="font-size:16px;">Bazile_last.txt</div>'
  htmlText += '     <div class="spinner-border text-danger ml-auto d-none" role="status" id="waiting-check">'
  htmlText += '        <span class="sr-only">Loading...</span>'
  htmlText += '     </div>'
  htmlText += '</div>'
  htmlText += '<br><br>'
  htmlText += '<div id="check-result" class="d-none" style="font-size:16px;"></div>'
  htmlText += '<br>'
  htmlText += '<div class="d-flex align-items-center">'
  htmlText += '     <button type="button" class="btn-light btn-sm mr-3" onclick="dlBazile()">'+i18n.gettext('Download Bazile')+'</button>'
  htmlText += '     <div class="spinner-border text-danger ml-auto d-none" role="status" id="waiting-check">'
  htmlText += '        <span class="sr-only">Loading...</span>'
  htmlText += '     </div>'
  htmlText += '</div>'
    htmlText += '<br>'
  htmlText += '<div class="d-flex align-items-center">'
  htmlText += '     <button type="button" class="btn-light btn-sm mr-3" onclick="checkOpenAip()">'+i18n.gettext('OpenAIP online')+'</button>'
  htmlText += '     <div class="spinner-border text-danger ml-auto d-none" role="status" id="waiting-check">'
  htmlText += '        <span class="sr-only">Loading...</span>'
  htmlText += '     </div>'
  htmlText += '</div>'

  return htmlText  
}


function fillSidebarSummary() {
  
  let percThermals = Math.round(anaTrack.percThermals*100)
  let percGlides = Math.round(anaTrack.percGlides*100)
  let percDives = Math.round(anaTrack.percDives*100)
  let percVarious = Math.round(100-(percThermals+percGlides+percDives))

  let data  = []
  let color = []
  data.push({ value: percThermals })
  color.push('#F6BB42')
  data.push({ value: percGlides })
  color.push('#8CC152')
  data.push({ value: percVarious })
  color.push('#DA4453')
  if (percDives > 0) {
    data.push({ value: percDives })
    color.push('#967ADC')
  }
  const centerX = 125
  const centerY = 125
  const radius = 105
  let mysvg = ''
  let arr = pieGnerator.pie(centerX, centerY, radius, data)
  for (let i = 0; i < arr.length; i++) {
      let item = arr[i]  
      mysvg +=`<g transform="${item.transform}"><path d="${item.d}" fill="${color[i]}" /><text fill="white" font-size="14" ${item.text}">${item.value}%</text></g>`
  }

  let htmlText = fillSidebarButtons()
  htmlText +='<br>'
  htmlText += '<div style="text-align: center"><svg id="onePieDiv" width="250" height="250">'
  htmlText += mysvg
  htmlText += '</svg></div>'
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
    efficiencyColor = '00C0F4'   
    htmlIcon = '<i class="fa fa-hand-peace-o" aria-hidden="true"></i>' 
  } else {
    efficiencyColor = 'FF6600'
    htmlIcon = '<i class="fa fa-thumbs-o-down" aria-hidden="true"></i>'
  }
  const avgThermalClimb = (Math.round(anaTrack.avgThermalClimb * 100) / 100).toFixed(2)
  let avgTransSpeed =  (Math.round(anaTrack.avgTransSpeed * 100) / 100).toFixed(0)
  const  h = Math.floor(anaTrack.extractTime / 3600)
  const m = Math.floor(anaTrack.extractTime % 3600 / 60)
  const s = Math.floor(anaTrack.extractTime % 3600 % 60)
  const hDisplay = h > 0 ? h + (h == 1 ? "h" : "h") : ""
  const mDisplay = m > 0 ? m + (m == 1 ? "mn" : "mn") : ""
  const sDisplay = s > 0 ? s + (s == 1 ? "s" : "s") : ""
  let hExtractTime = hDisplay + mDisplay + sDisplay    
  htmlText +='<p style="font-size:16px;">'+i18n.gettext('Avg th efficiency')+'&nbsp;&nbsp;<span style="margin-right:10px; font-size:14px;background-color: #'+efficiencyColor+'; color: white;">&nbsp;&nbsp;'+Math.ceil(anaTrack.avgThermalEffi)+'%</span>'+htmlIcon+'<br>'
  htmlText += i18n.gettext('Avg thermal climb')+'&nbsp;&nbsp;'+avgThermalClimb+'&nbsp;m/s<br>'
  htmlText += i18n.gettext('Max gain')+'&nbsp;&nbsp;'+anaTrack.bestGain+' m<br>'
  htmlText += i18n.gettext('Extraction time')+'&nbsp;&nbsp;'+hExtractTime+'<br>'
  htmlText += i18n.gettext('Avg transition speed')+'&nbsp;&nbsp;'+avgTransSpeed+'&nbsp;km/h<br>'
  htmlText += i18n.gettext('Max speed')+'&nbsp;&nbsp;'+mainTrack.stat.maxspeed+' km/h<br>' 
  htmlText += i18n.gettext('Alt max GPS')+'&nbsp;&nbsp;'+mainTrack.stat.maxalt.gps+'m&nbsp;&nbsp;&nbsp;'
  htmlText += '<span style="margin-left:10px">'+i18n.gettext('Min GPS Alt')+'&nbsp;&nbsp;'+mainTrack.stat.minialt.gps+'m&nbsp;&nbsp;&nbsp</span><br>'  
  htmlText += i18n.gettext('Max climb')+'&nbsp;&nbsp;'+mainTrack.stat.maxclimb+' m/s&nbsp;&nbsp;&nbsp;' 
  htmlText += '<span style="margin-left:10px">'+i18n.gettext('Max sink')+'&nbsp;&nbsp;'+mainTrack.stat.maxsink+' m/s&nbsp;&nbsp;&nbsp;<br>' 
  htmlText +='</p>'

  return htmlText
}
/**
 * We keep this code just in case... 
 * We have not been able to inject it without error in the div leaflet-sidebar-content
 * The problem is that there is no specific div to receive the highchart object
 */
function hightchartSummary() {
  let percThermals = Math.round(anaTrack.percThermals*100)
  let percGlides = Math.round(anaTrack.percGlides*100)
  let percDives = Math.round(anaTrack.percDives*100)
  let percVarious = Math.round(100-(percThermals+percGlides+percDives))
  const summaryData = new Array(percThermals, percGlides, percDives, percVarious)

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
          //     return Math.round(this.percentage*100)/100 + ' %'
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
        break
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
          break    
      case 'G':
        // Glide
        //lineCatIcon = '<td><i class="fa fa-arrow-right fa-2x"></i></td>' 
       // lineCatIcon = '<td><i class="fa fa-arrow-right"></i></td>' 
        lineCatIcon = '<td><a href="javascript:void(0)" onclick="displaySegment('+cr.coords+')"><i class="fa fa-arrow-right"></i> '+i18n.gettext('Glide')+'</td>'
        lineTime = '<td>'+cr.time+'</td>'
        lineElapsed = '<td>'+cr.elapsed+'</td>'
        lineAlt = '<td>'+cr.alt+'</td>'
        lineInfo = '<td>[+'+cr.data1+'km '+cr.data2+'km/h]</td>'     
        break            
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
        break
        }
    //htmlText += '      <tr>'+lineCatIcon+lineTime+lineElapsed+lineAlt+lineInfo+'</tr>'     
    htmlText += '      <tr>'+lineTime+lineElapsed+lineAlt+lineCatIcon+lineInfo+'</tr>'     
  }
  htmlText += '    </tbody>'
  htmlText += '  </table></div>'

  return htmlText
}

function changeScoring() {
  map.removeLayer(geoScore)
  const currColor = getColor()
  geoScore =  L.geoJson(mainTrack.xcscore,{ 
    style: function(feature) {
      return {
        stroke: true,
        color: currColor,
        weight: 4
      }
    },
    onEachFeature: onEachFeature
  })
  scoreGroup.addLayer(geoScore)
  displayScoring()
}

function displayScoring() {

  // first we make if(map.hasLayer(scoreGroup)){
  // no problems with MLac and Windows
  // Error with Linux
  if (typeof scoreGroup !== "undefined") {
    map.removeLayer(scoreGroup)
  }
  const result = JSON.parse(JSON.stringify(mainTrack.xcscore))
  currLeague = result.league
  document.getElementById("sc-league").innerHTML = result.league
  document.getElementById("sc-best").innerHTML = result.score+' pts'
  document.getElementById("sc-course").innerHTML = result.course
  document.getElementById("sc-distance").innerHTML = result.distance+' km'
  document.getElementById("sc-multi").innerHTML = result.multiplier
  const scoreLegs = result.legs
  for (let i = 0; i < scoreLegs.length; i++) {
    const leg = scoreLegs[i]
    switch (i) {
      case 0:
        document.getElementById("sc-leg1").innerHTML = leg.name
        document.getElementById("sc-legd1").innerHTML = leg.d+' km'
        break
      case 1:
        document.getElementById("sc-leg2").innerHTML = leg.name
        document.getElementById("sc-legd2").innerHTML = leg.d+' km'
        break
      case 2:
        document.getElementById("sc-leg3").innerHTML = leg.name
        document.getElementById("sc-legd3").innerHTML = leg.d+' km'
        break
      case 3:
        document.getElementById("sc-leg4").innerHTML = leg.name
        document.getElementById("sc-legd4").innerHTML = leg.d+' km'
      break
      case 4:
        document.getElementById("sc-leg5").innerHTML = leg.name
        document.getElementById("sc-legd5").innerHTML = leg.d+' km'
      break
    }
   }
  $('#score_table').removeClass('d-none')
  const currColor = getColor()
  geoScore =  L.geoJson(mainTrack.xcscore,{ 
      style: function(feature) {
        return {
          stroke: true,
          color: currColor,
          weight: 4
        }
      },
      onEachFeature: onEachFeature
  })
  scoreGroup = new L.LayerGroup()
  scoreGroup.addTo(map)
  scoreGroup.addLayer(geoScore)
  layerControl.addOverlay(scoreGroup, i18n.gettext('Score'))
  sidebar.open('score')
}

function fillSidebarButtons() {
  let htmlText = '<br>'
  htmlText += '<div class="btn-toolbar pull-left">'
  htmlText += ' <button type="button" class="btn-success btn-sm mr-1" onclick="sidebar.open(\'summary\')">'+i18n.gettext('Summary')+'</button>'
  htmlText += ' <button type="button" class="btn-warning btn-sm mr-1" onclick="openPathway()">'+i18n.gettext('Pathway')+'</button>'
  htmlText += ' <button type="button" class="btn-secondary btn-sm mr-1" onclick="sidebar.open(\'infos\')">'+i18n.gettext('General')+'</button>'
  htmlText += ' <button type="button" class="btn-primary btn-sm mr-1" onclick="sidebar.open(\'score\')">'+i18n.gettext('Score')+'</button>'
  htmlText += ' <button type="button" class="btn-info btn-sm" onclick="sidebar.open(\'check\')"><i class="fa fa-plane"></i>&nbsp;'+i18n.gettext('Check')+'</button>'
  htmlText += '</div>'
  return htmlText
}

function onEachFeature(feature, layer) {
  // does this feature have a property named popupContent?
  if (feature.properties && feature.properties.popupContent) {
      layer.bindPopup(feature.properties.popupContent)
  }
}


function getColor() {
  let selColor
  switch (currLeague) {
    case 'FFVL':
      selColor = 'yellow'
      break
    case 'XContest':
      selColor = 'fuchsia'
      break
    case 'FAI':
      selColor = 'darkorange'
      break
    case 'FAI-Cylinders':
      selColor = 'skyblue'
      break
    case 'FAI-OAR':
      selColor = 'yellowgreen'
      break
    case 'FAI-OAR2':
      selColor = 'sienna'
      break
    case 'XCLeague' :
      selColor = 'lawngreen'
      break 
    default:
      selColor = 'yellow'
      break
  }
  return selColor
}

// Display Thermals
function openPathway() {
  $('.leaflet-control-layers-selector')[8].click()
  $('.leaflet-control-layers-selector')[9].click()
  sidebar.open('pathway')
}


// Centering on takeoff
function displayTakeOff() {
    map.fitBounds([startLatlng])      
  } 

// Centering on landing
function displayLanding() {
  map.fitBounds([endLatlng])      
}    

// Display a segment of the track
function displaySegment(lat1,long1,lat2,long2) {
  map.fitBounds([[lat1, long1],[lat2, long2]])      
}   

// ****************** openAIP section *********************
async function reqOpenAip() {
    if (navigator.offLine) {
      alert(i18n.gettext('No Internet connection'))  
    } else {
      const airspaces = await downloadAirspaces()
      // debugging
         // const filejson = path.join('/Users/gil/Documents/Flyxc', 'openaip.json');
          //fs.writeFileSync(filejson, JSON.stringify(airspaces))
        // end debugging
      const nbDownl = airspaces.length
      if (Array.isArray(airspaces)) {
          ipcRenderer.invoke('openaip',airspaces,true).then((totalGeoJson) => {      
              const nbAip = totalGeoJson.length        
              if (nbAip > 0) {
                  displayAip(totalGeoJson) 
              } else {
                const noAip = i18n.gettext('No airspace involved')+'/ '+nbDownl+' '+i18n.gettext('received')
                alert(noAip)
              }
              // debugging
              // const filename = path.join('/Users/gil/Documents/Flyxc', 'geoaip.json')
              // fs.writeFileSync(filename, JSON.stringify(totalGeoJson))
          })
      } 
  }
}

async function checkOpenAip() {
  if (navigator.offLine) {
    alert(i18n.gettext('No Internet connection'))  
  } else {
    const airspaces = await downloadAirspaces()
    const nbDownl = airspaces.length
    if (Array.isArray(airspaces)) {
      let checkRequest = {
        jsonaip : airspaces,
        track : mainTrack,
        ground : anaTrack.elevation
      }
      currOAFile = ''
      $('#waiting-check').removeClass('d-none')
      ipcRenderer.invoke('check-aip',checkRequest).then((checkResult) => {     
        $('#waiting-check').addClass('d-none')
        displayAirCheck(checkResult)       
      })
      // const checking = ipcRenderer.send('check-aip', checkRequest)
    } 
  }
}

async function downloadAirspaces() {
  const openAipKey = listkey.openaip
  const bbox = mainTrack.GeoJSON.features[0].properties.bbox
  const airspaces = []
  let delayMs = 10
  let page = 1
  let totalPages = 1
  const openAip_Url = `https://api.core.openaip.net/api/airspaces?page=${page}&limit=1000&bbox=${bbox}&apiKey=${openAipKey}`
  log.info(openAip_Url)
  while (page <= totalPages) {       
      try {
        //console.log(`fetching page ${page}/${totalPages}`)
        const response = await fetch(openAip_Url)
        // Delay to avoid too many requests.
        await new Promise((resolve) => setTimeout(resolve, delayMs))
        if (response.ok) {
          const info = await response.json()
          totalPages = info.totalPages
          airspaces.push(...info.items)
          page++
          delayMs = 10        
        } else {
          delayMs *= 2
          console.error(`HTTP status ${response.status}`)
        }
      } catch (e) {
        console.error(`Error`, e)
      }
    }
    return airspaces
}

function displayAip(totalGeoJson) {
  if (typeof aipGroup !== "undefined") {
    map.removeLayer(aipGroup)
  }
  aipGroup = new L.LayerGroup()
  for (let index = 0; index < totalGeoJson.length; index++) {
    const element = totalGeoJson[index]
   console.log(element.properties.Name+' '+element.properties.id)
    //let airSpace = L.geoJson(element,{ style: styleAip, onEachFeature: aipPopup})
    let airSpace = new L.geoJson(element,{ style: styleAip})
    aipGroup.addLayer(airSpace)
  }  
  aipGroup.addTo(map)
}



// ****************** Openair section **************************

function checkAirspace() {
  const selectedFile = ipcRenderer.sendSync('open-file','')
  if(selectedFile.fullPath != null) {    
     // runFile(selectedFile.fullPath,selectedFile.fileName)           
     $('#waiting-check').removeClass('d-none')
     let content = fs.readFileSync(selectedFile.fullPath, 'utf8')
     let checkRequest = {
      oaText : content, 
      track : mainTrack,
      ground : anaTrack.elevation
    }
    currOAFile = selectedFile.fileName
    const checking = ipcRenderer.send('check-open', checkRequest)
  }  
}

function displayAirCheck(checkResult) {
  if (typeof airspGroup !== "undefined") {
    map.removeLayer(airspGroup)
    $('#check-result').addClass('d-none')
    $('#check-file').addClass('d-none')
  }
  let nbBadPoints = 0
  let cr = '<br>'
  let report = ''
  if (checkResult.insidePoints.length > 0 &&  checkResult.airGeoJson.length > 0) {
   // airspGroup = new L.LayerGroup()
    airspGroup = new L.FeatureGroup()
    report += '<p><span style="background-color: #F6BB42; color: white;">&nbsp;&nbsp;&nbsp;'
    report += i18n.gettext('Airspaces involved')+'&nbsp;&nbsp;&nbsp;&nbsp;</span><br>'
    // airspaces GeoJson added to the map 
    for (let index = 0; index < checkResult.airGeoJson.length; index++) {
      const element = checkResult.airGeoJson[index]
      report += element.properties.Name+cr
      airSpace = L.geoJson(element,{ style: styleAirsp, onEachFeature: airSpPopup })
      airspGroup.addLayer(airSpace)
    }
    report += '</p>'
    // Bad points GeoJson
    let badGeoJson = { 
      "type": "Feature", 
      "properties": {
        "name": "Airspace checking",
        "desc": ""
      },
      "geometry": 
        { "type": "MultiPoint", 
          "coordinates": []
        } 
    }
    let badCoord = []
    for (let index = 0; index < checkResult.insidePoints.length; index++) {
      nbBadPoints++
      const idxBad = checkResult.insidePoints[index]
      badCoord.push([mainTrack.fixes[idxBad].longitude,mainTrack.fixes[idxBad].latitude])
    }
    let badStyle = {
      'color': "#FFFF00",
      'weight': 2,
      'opacity': 1
    }  
    let geojsonMarkerOptions = {
      radius: 3,
      fillColor: "#ff7800",
      color: "#000",
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    }
    badGeoJson.geometry.coordinates = badCoord
    badLayerPoints =  L.geoJson(badGeoJson,{
      style : badStyle,
      pointToLayer: function(f, latlng) {return L.circleMarker(latlng,geojsonMarkerOptions)}
    })
    airspGroup.addLayer(badLayerPoints)
    airspGroup.addTo(map)
    layerControl.addOverlay( airspGroup, i18n.gettext('Checking'))
    map.fitBounds(airspGroup.getBounds())
    report += '<p><span style="background-color: #DA4453; color: white;"> &nbsp;&nbsp;&nbsp;'
    report += i18n.gettext('violation(s)')+' : '+nbBadPoints+' '+i18n.gettext('points')+'&nbsp;&nbsp;&nbsp;&nbsp;</span></p>'
    report += '<i>'+i18n.gettext('Click on an airspace to display the description')+'</i>'
  } else {
    report += '<span style="font-size:16px;background-color: #009900; color: white;">&nbsp;&nbsp;&nbsp;'
    report += i18n.gettext('No violations in the selected airspace file')
    report += '&nbsp;&nbsp;&nbsp;</span>'

    // test
   // airspGroup = new L.LayerGroup()
    airspGroup = new L.FeatureGroup()
    // checked airspaces GeoJson added to the map 
    for (let index = 0; index < checkResult.airGeoJson.length; index++) {
      const element = checkResult.airGeoJson[index]
      airSpace = L.geoJson(element,{ style: styleAirsp, onEachFeature: airSpPopup })
      airspGroup.addLayer(airSpace)
      airspGroup.addTo(map)
      layerControl.addOverlay( airspGroup, i18n.gettext('Checking'))
      map.fitBounds(airspGroup.getBounds())
    }
    // fin test


  }
  showAirspReport(report)
}

function dlBazile() {
  $('#waiting-check').removeClass('d-none')
    
  const memBazile = store.get('urlairspace')
  const defBazile = 'http://pascal.bazile.free.fr/paraglidingFolder/divers/GPS/OpenAir-Format/files/LastVers_ff-French-outT.txt'
  let baziUrl    
  if (memBazile != undefined && memBazile != 'undefined' && memBazile != '') {
      baziUrl = memBazile
  } else {
      baziUrl = 'http://pascal.bazile.free.fr/paraglidingFolder/divers/GPS/OpenAir-Format/files/LastVers_ff-French-outT.txt'
      store.set('urlairspace',baziUrl)
  } 
  const config = {
      timeout: 5000, 
      retries: 3,
      domain: baziUrl
  }
  checkInternetConnected(config)
      .then((result) => {
          ipcRenderer.send('dl-file-progress', baziUrl)
      })
      .catch((ex) => {
          alert(i18n.gettext('Server or url problem'))
      })  
}

ipcRenderer.on("dl-complete", (event, fullPathFile) => {
    if(fullPathFile != null) {     
      let content = fs.readFileSync(fullPathFile, 'utf8')
      let checkRequest = {
        oaText : content, 
        track : mainTrack,
        ground : anaTrack.elevation
      }
      currOAFile = ''
      const checking = ipcRenderer.send('check-open', checkRequest)      
    }      
})

function showAirspReport(content) {
  // document.getElementById('mod-title').innerHTML = i18n.gettext('Checking')+' : '+currOAFile
  // document.getElementById('mod-body').innerHTML = content
  // $('#modalCheck').modal('show')
  $('#check-result').removeClass('d-none')
  $('#check-file').removeClass('d-none')
  document.getElementById("check-file").innerHTML = currOAFile
  document.getElementById("check-result").innerHTML = content
}

function airSpPopup(feature, layer) {
  if (feature.properties) {
      layer.bindPopup('<b>Class : '+feature.properties.Class+'</b><BR/>'+feature.properties.Name+'<BR/>Floor : '+feature.properties.Floor+'<BR/>Ceiling : '+feature.properties.Ceiling+'<BR/>'+feature.properties.Comment)
  }
}

function aipPopup(feature, layer) {
  if (feature.properties) {
      let popupMsg = '<b>Class : '+feature.properties.Class+'</b><BR/>'+feature.properties.Name
      popupMsg += '<BR/>Floor : '+feature.properties.Floor+'  '+feature.properties.FloorLabel
      popupMsg += '<BR/>Ceiling : '+feature.properties.Ceiling+'  '+feature.properties.CeilingLabel
      layer.bindPopup(popupMsg)
  }
}


function styleAip(feature) {
  return{      
    fillColor: feature.properties.Color,
    fillOpacity: 0.4,
    weight: 1,
    opacity: 1,
    color: 'white'
  }
}

function styleAirsp(feature){
  return{      
      fillColor: getColorAirsp(feature.properties.Cat),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: 0.4
  }
}

function getColorAirsp(a){
  return  a>22 ? '#999999':   
          a>21 ? '#999999':
          a>20 ? '#FFCC00':
          a>19 ? '#5B900A':
          a>18 ? '#00FF00':
          a>17 ? '#66CCFF':
          a>16 ? '#FF9999':            
          a>15 ? '#FF00FF':
          a>14 ? '#000000':
          a>13 ? '#9999CC':
          a>12 ? '#99FFFF':
          a>11 ? '#FFFF00':
          a>10 ? '#19BFBF':   
          a>9 ? '#7FBC58':
          a>8 ? '#A47A11':
          a>7 ? '#900A68':
          a>6 ? '#4B0A90':
          a>5 ? '#FFCCCC':
          a>4 ? '#FF0000':            
          a>3 ? '#0000FF':
          a>2 ? '#1971BF':
          a>1 ? '#FFCCCC':
          a>0 ? '#FE9A2E':                                                 
          '#9999CC' 
}
