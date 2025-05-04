const {ipcRenderer} = require('electron')
const Mustache = require('mustache')
const i18n = require('../../lang/gettext.js')()
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const log = require('electron-log')
const { scoringRules } = require('igc-xc-score')

const store = new Store()
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
const settingsList = require('../../settings/settings-list.js')
const scoring = require('../../utils/nav-scoring.js')
const rteread = require('../../utils/geo/rte-read.js')
const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
const mapIcons = tiles.mapIcons
const easyButton = require('leaflet-easybutton')
const myMeasure = require('../../leaflet/measure.js')
const measurePath = require('../../leaflet/leaflet-measure-path.js')
const polyDecorator = require('../../leaflet/leaflet.polylineDecorator.js')
const offsetPolyline = require('leaflet-polylineoffset')
const lineEditable = require('../../leaflet/Leaflet.Editable.js')
const awesomeMarker = require('../../leaflet/leaflet.awesome-markers.min.js')


let checkScoring = document.getElementById('scoredisplay')
let currLang
let mapxc
let currentMap
let mapLat, mapLong
let polyline
let arrowHead = null
let nbMarkers = 0
let scorepointlist = []
let faiSectors = []
let faisectpath = []
let typeparcours = null
let scorelinepath = null
let closingcirclepath = null
let currLeague
let markerPushIcon
let newMarker
let markerList = []
let trackDisplay = false
let thermalDisplay = false
let opt_path = {
    color: 'blue',
    weight: 1.5,
    opacity: 1,
    smoothFactor: 1
}

iniForm()
let locMeasure = new myMeasure()
const scoreGroup = new L.LayerGroup()
const markerGroup = new L.LayerGroup()
const tracksGroup = new L.LayerGroup()
const thermalGroup = new L.LayerGroup()
const tooltip = L.DomUtil.get('tooltip')
let calcScore = true
displayEmptyMap()


function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile))
            let langjson = JSON.parse(content)
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang)
        }
      } catch (error) {
          log.error('[xcnav.js] Error while loading the language file')
      }  
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html()  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    document.getElementById('bt-route').innerHTML = i18n.gettext('Route')
    document.getElementById('bt-route').addEventListener('click', (event) => {callDisk()})
    document.getElementById('bt-track').innerHTML = i18n.gettext('Track')
    document.getElementById('bt-track').addEventListener('click',(event) => {callTrack()})
    document.getElementById("lb-totdist").innerHTML = i18n.gettext('Total distance')+' : '                       
    document.getElementById("lb-duration").innerHTML = i18n.gettext('Duration')+' : '
    document.getElementById("lb-speed").innerHTML = i18n.gettext('Speed')+' (km/h)'
    document.getElementById("lb-scoring").innerHTML = i18n.gettext('Scoring')
    document.getElementById("lb-sc-dist").innerHTML = i18n.gettext('Distance')+' : '  
    document.getElementById("lb-sc-pts").innerHTML = i18n.gettext('Points')+' : '

    document.addEventListener('keyup', (event) => {
        if (event.key === 'Escape') {
            cancelDrawing();
        }
    })
}

$(document).ready(function () {
    let selectedFixedMenu =  store.get('menufixed') 
    if (selectedFixedMenu === 'yes') {
      $("#sidebar").removeClass('active')
      $('#toggleMenu').addClass('d-none')
      document.getElementById("menucheck").checked = true
    }
})
  
function changeMenuState(cbmenu) {
if (cbmenu.checked) {
    $("#sidebar").removeClass('active')
    $('#toggleMenu').addClass('d-none')
    store.set('menufixed','yes') 
} else {
    $("#sidebar").addClass('active')
    $('#toggleMenu').removeClass('d-none')
    store.set('menufixed','no') 
}
}

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName)    // main.js
}

btnMenu.addEventListener('click', (event) => {
    if (btnMenu.innerHTML === "Menu On") {
        btnMenu.innerHTML = "Menu Off"
    } else {
        btnMenu.innerHTML = "Menu On"
    }
    $('#sidebar').toggleClass('active')
})

function displayEmptyMap() {
    $('#div-map').removeClass('d-none')
    defaultMap()
}

function defaultMap() {
    if (mapxc != null) {
      mapxc.off()
      mapxc.remove()
    }
    let defLong = store.get('finderlong')
    let defLat = store.get('finderlat')
    mapLat = defLat != undefined && defLat != '' ? defLat : 45.8326  // Mont Blanc
    mapLong = defLong != undefined && defLong != '' ? defLong : 6.865  // Mont Blanc
    mapxc = L.map('mapid', {editable: true}).setView([mapLat, mapLong], 12)

    layerControl = new L.control.layers(baseMaps).addTo(mapxc)
    const defaultMap = store.get('map')
    setCurrentMap(defaultMap)
    locMeasure.addTo(mapxc)
    markerPushIcon = L.AwesomeMarkers.icon({icon: 'fa-bullseye', markerColor: 'darkblue', prefix: 'fa', iconColor: 'white'}) 
    // define an array of easy buttons to build a toolbar
    let arrButtons = [ 
        L.easyButton( '<img src="../../assets/img/Mesure.png">', function(control){
            locMeasure._toggleMeasure()}, i18n.gettext('Measure')),
          L.easyButton( '<img src="../../assets/img/center.png">', function(control){
            centerPolyline()}, i18n.gettext('Displays all map segments')),
          L.easyButton( '<img src="../../assets/img/path.png">', function(control){
            polyline = mapxc.editTools.startPolyline()
          }, i18n.gettext('Draw a route')),
          L.easyButton( 'fa fa-map-marker fa-2x', function(control){
            newMarker = mapxc.editTools.startMarker(null, {icon: markerPushIcon})}, i18n.gettext('Create a new marker')),          
          L.easyButton( '<img src="../../assets/img/trash.png">', function(control){
            clearRoute(true)
          }, i18n.gettext('Remove map segments')),
          L.easyButton( '<img src="../../assets/img/save_bw.png">', function(control){
            displaySaveOptions(true)
           // saveRoute(true)
          }, i18n.gettext('Save route'))
    ]
    L.easyBar(arrButtons).addTo(mapxc)

    const kk7layer = L.tileLayer('https://thermal.kk7.ch/tiles/skyways_all_all/{z}/{x}/{y}.png?src=' + window.location.hostname, {
        attribution: 'thermal.kk7.ch <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/">CC-BY-NC-SA>/a>',
        maxNativeZoom: 13,
        tms: true,
        opacity: 0.3
      })
    
    const kk7Group = new L.LayerGroup()
    kk7Group.addLayer(kk7layer)
    layerControl.addOverlay(kk7Group, "Thermal.kk7.ch")
    
    scoreGroup.addTo(mapxc)
    layerControl.addOverlay(scoreGroup, i18n.gettext('Score'))

    mapxc.on('baselayerchange', function (e) {
      currentMap = tiles.currentMap(e.layer._url)
    })
    mapxc.on('editable:vertex:new', function (e) {
        polyline.showMeasurements()
        polyline.updateMeasurements()
        displayFeatures()
        addArrow()
    })

    // To avoid recalculating the score
    mapxc.on('editable:middlemarker:mousedown', function (e) {
        modifLine = true   
    })
    
    mapxc.on('editable:vertex:dragend', function (e) {
        modifLine = false
        polyline.showMeasurements()
        polyline.updateMeasurements()
        addArrow()
        displayFeatures()
    })
    
    mapxc.on('editable:vertex:deleted', function (e) {
        modifLine = false
        polyline.showMeasurements()
        polyline.updateMeasurements()
        addArrow()
        displayFeatures()
    })

    // enable to continue the line by a control/command clic on the last point
    mapxc.on('editable:vertex:ctrlclick editable:vertex:metakeyclick', function (e) {
        e.vertex.continue();
    })

    // tootip management
    // mapxc.on('editable:drawing:start', addTooltip)
    // mapxc.on('editable:drawing:end', removeTooltip)
    // mapxc.on('editable:drawing:click', updateTooltip)

    mapxc.on('editable:drawing:commit', (evt) => {
        if (evt.layer instanceof L.Marker) {
            console.log(`markerList.length = ${markerList.length}`)
            if (markerList.length < 1) {
                markerGroup.addTo(mapxc)
                layerControl.addOverlay(markerGroup, i18n.gettext('Waypoints'))
            }
            markerList.push(newMarker)
            console.log(newMarker)
            let markerid = markerList.length - 1
            let markerPopup = '<div class="btn-group-vertical">'
            markerPopup +=  "<button class='btn btn-danger btn-sm' onclick=\"deletepoint('" + markerid + "')\">Delete</button>"
            markerPopup += '</div>'
            newMarker.bindPopup(markerPopup)
            markerGroup.addLayer(newMarker)
        }
     })

    iniLeague()
    mapxc.on("moveend", function() {drawFAISectors()})
}

// https://github.com/Leaflet/Leaflet.Editable/issues/158
// To stop drawing with escape key
const cancelDrawing = (event) => {
	if (mapxc.editTools.drawing()) {
		mapxc.editTools.stopDrawing();
		if (event) {
			event.preventDefault();
		}
	}
}

function old_deletepoint(markerid) {
    mapxc.closePopup()
    markerGroup.removeLayer(markerList[markerid])
    for (let i=0; i<markerList.length; i++) {
       // console.log(`markerList[${i}] ${markerList[i]}  markerid ${markerid}`)   
        if (markerList[i] == markerid) {
          markerList.splice(i, 1);
         // console.log('splice -> markerList.length '+markerList.length)
          break;
        }
    }
//    console.log('markerList.length '+markerList.length)
    if (markerList.length < 1) {
        console.log('length = 0')
        mapxc.removeLayer(markerGroup)
    }
}

function deletepoint(markerid) {
    mapxc.closePopup()
    markerGroup.removeLayer(markerList[markerid])
    for (let i=0; i<markerList.length; i++) {
       // console.log(`markerList[${i}] ${markerList[i]}  markerid ${markerid}`)   
        if (i == markerid) {
          markerList[i] = null
         // console.log('splice -> markerList.length '+markerList.length)
          break;
        }
    }
}

function setCurrentMap(defaultMap) {
    switch (defaultMap) {
      case 'open':
        baseMaps.OpenTopo.addTo(mapxc)  
        currentMap = 'open'
        break
      case 'ign':
        baseMaps.IGN.addTo(mapxc)  
        currentMap = 'ign'
        break      
      case 'osm':
        baseMaps.OSM.addTo(mapxc) 
        currentMap = 'osm'
        break
      case 'mtk':
        baseMaps.MTK.addTo(mapxc)  
        currentMap = 'mtk'
        break  
      case '4u':
        baseMaps.UMaps.addTo(mapxc)
        currentMap = '4u'
        break     
      case 'out':
        baseMaps.Outdoor.addTo(mapxc)   
        currentMap = 'out'        
        break           
      default:
        baseMaps.OSM.addTo(mapxc)  
        currentMap = 'osm'  
        break     
    }
  }
  
function centerPolyline() {
    if (polyline.getLatLngs().length > 0) {
        mapxc.fitBounds(polyline.getBounds())
    } else {
        alert(i18n.gettext('No segments on the map'))
    }   
}

/*  Add arrows to plyline segments with https://github.com/bbecquet/Leaflet.PolylineDecorator
*   a good explanation in https://stackoverflow.com/questions/78119661/how-to-add-arrow-marked-lines-in-leaflet-map-to-indicate-direction-from-one-loca */
function addArrow() {
    if (arrowHead) {
        arrowHead.removeFrom(mapxc) 
    }
    arrowHead = L.polylineDecorator(polyline, {
        patterns: [{
            offset: 25,
            repeat: 100,
            symbol: L.Symbol.arrowHead({
              pixelSize: 12,
              pathOptions: {
                fillOpacity: 1,
                weight: 0
              }
            })
          }]
      }).addTo(mapxc);
}

function displaySaveOptions(withMarkers) {
    let routeSet = []
    if (polyline) {
        let latlngs = polyline.getLatLngs()
        let arrRoute = []
        for (let i = 0; i < latlngs.length; i++) {
            let coord = {
                lat : latlngs[i].lat,
                lng : latlngs[i].lng,
            }
            arrRoute.push(coord)
        }
        routeSet.push(arrRoute)
        if (withMarkers) {
            let arrMarker = []
            for (let i=0; i<markerList.length; i++) {
                if (markerList[i] == null) {
                    continue
                }
                let latlng = markerList[i].getLatLng()
                let coord = {
                    lat : latlng.lat,
                    lng : latlng.lng,
                }
                arrMarker.push(coord)
            }
            routeSet.push(arrMarker)
        } 
        ipcRenderer.send('display-xc-save', routeSet)    // process-main/modal-win/xcnav-save.js 
    }     
}

function clearRoute(mode) {
    if (mode) {
        if (polyline) {
            polyline.removeFrom(mapxc) 
            resetLegend()
        }
        if (arrowHead) {
            arrowHead.removeFrom(mapxc) 
        }
    } else {
        document.getElementById("lb-sc-dist").innerHTML = i18n.gettext('Distance')+' : '  
        document.getElementById('val-sc-pts').innerHTML = '0'
        document.getElementById('val-totdist').innerHTML = '0'
    }
    if (scorelinepath) {
        scoreGroup.removeLayer(scorelinepath)
    }
    if (closingcirclepath) {
        scoreGroup.removeLayer(closingcirclepath)
    }
    faiSectors = []
    if (faisectpath) {
        faisectpath.forEach(sectpath => scoreGroup.removeLayer(sectpath))
    }
    if (scorepointlist) {
        for (let i=0; i<scorepointlist.length; i++){
            scoreGroup.removeLayer(scorepointlist[i])
        }
        scorepointlist = []
    }
    if (markerList.length > 0) {       
        for (let i=0; i<markerList.length; i++) {
            if (markerList[i] == null) {
                continue
            }   
            markerGroup.removeLayer(markerList[i])
        }
        markerList = []
        layerControl.removeLayer(markerGroup)
        mapxc.removeLayer(markerGroup)
    }
    if (trackDisplay) {
        const arrtracks = tracksGroup.getLayers()
        layerControl.removeLayer(tracksGroup)
        if (arrtracks.length > 0) {
            for (let i=0; i<arrtracks.length; i++) {
                tracksGroup.removeLayer(arrtracks[i])
            }   
        }
        layerControl.removeLayer(tracksGroup)
        trackDisplay = false
    }
    if (thermalDisplay) {
        const arrthermals = thermalGroup.getLayers()
        layerControl.removeLayer(thermalGroup)
        if (arrthermals.length > 0) {
            for (let i=0; i<arrthermals.length; i++) {
                thermalGroup.removeLayer(arrthermals[i])
            }   
        }
        layerControl.removeLayer(thermalGroup)
        thermalDisplay = false
    }
}

function loadRoute() {
    const selectedFile = ipcRenderer.sendSync('open-file',store.get('pathWork'))
    if(selectedFile.fullPath != null) {
        //displayWpDisk(selectedFile.fullPath)
    }
}

function callDisk() {``
  const selectedFile = ipcRenderer.sendSync('open-file',store.get('pathWork'))
  if(selectedFile.fullPath != null) {
    clearRoute()
    displayRteDisk(selectedFile.fullPath)
  }
}

function displayRteDisk(currFilePath) {
    let resParsing = rteread.readFile(currFilePath)
    try {
        let latlngs = []
        let wptAsRoute = false
        if (Array.isArray(resParsing.rte)) {
            if (resParsing.rte.length > 0) {
                for (let i = 0; i < resParsing.rte.length; i++) {
                    const item = resParsing.rte[i]
                    let latlngItem = L.latLng(item.lat, item.long)
                    latlngs.push(latlngItem)
                }

            } else if (Array.isArray(resParsing.wayp)) {
                if (resParsing.wayp.length > 0) {
                    // This is a route which has been recorded like a set of waypoints
                    wptAsRoute = true
                    for (let i = 0; i < resParsing.wayp.length; i++) {
                        const item = resParsing.wayp[i]
                        let latlngItem = L.latLng(item.lat, item.long)
                        latlngs.push(latlngItem)
                    }
                }
            }
            if (latlngs.length > 0) {
                polyline = L.polyline(latlngs).addTo(mapxc)
                polyline.enableEdit()
                mapxc.fitBounds(polyline.getBounds())
                polyline.showMeasurements()
                polyline.updateMeasurements()
                addArrow()
                displayFeatures()
            } else {
                alert(i18n.gettext('No points decoded'))
            }
        } else {
            log.error('[xcnav.js] parsing result is not an array')
        }
        if (Array.isArray(resParsing.wayp) && wptAsRoute == false) {
            loadMarkers(resParsing.wayp)
        } 
    } catch (error) {
        log.error('[xcnav.js] displayRteDisk : '+error)
    }
}

function callTrack() {
    const selectedFile = ipcRenderer.sendSync('open-file','')
    if(selectedFile.fullPath != null) {
      if (selectedFile.fileExt == 'IGC') {
        callIgc(selectedFile.fullPath)
      } else if (selectedFile.fileExt == 'GPX') {
        callGpx(selectedFile.fullPath)
      } else {
        alert(i18n.gettext('Invalid Track'))
      }
    }  
  }

function callIgc(trackPath) {
  const igcString = fs.readFileSync(trackPath, 'utf8')  
  try {
    track = ipcRenderer.sendSync('read-igc', igcString)  // process-main/igc/igc-read.js
    if (track.fixes.length> 0) {
        displayTrack(track)
    } else {
      alert(track.info.parsingError)
    }        
  } catch (error) {
    alert('Error '+' : '+error)      
  }   
} 

function callGpx(trackPath) {
    const gpxString = fs.readFileSync(trackPath, 'utf8') 
    try {
    // gpx-read.js calls first gpx-to-igc
    // if gpx-to-igc returns a valid igc string, gps-read calls IGCDecoder
    // and finally returns a valid track 
    track = ipcRenderer.sendSync('read-gpx', gpxString)  // process-main/gpx/gpx-read.js
    if (track.fixes != undefined && track.fixes.length> 0) {
        displayTrack(track)
    } else {
        if (track.info != undefined) {
            alert(track.info.parsingError)
        } else {
            alert('Track returned undefined')
        }
    }        
    } catch (error) {
        alert('Error '+' : '+error)      
    }  
}

function displayTrack(track) {
    try {
        const anatrack = ipcRenderer.sendSync('ask-analyze', track.fixes)  // process-main/igc/igc-run-analyzer.js
        displayThermals(track, anatrack.thermals)
        let trackOptions = {
            color: 'red',
            weight: 2,
            opacity: 0.85
        }
        let pilotName = 'Unknown'
        if (track.info.pilot != undefined && track.info.pilot != null && track.info.pilot != '') {
            pilotName = track.info.pilot
        }
        const geojsonLayer = L.geoJson(track.GeoJSON,{ style: trackOptions})
        if (!trackDisplay) {
            tracksGroup.addTo(mapxc)
            layerControl.addOverlay(tracksGroup, i18n.gettext('Tracks'))
            trackDisplay = true
        }
        tracksGroup.addLayer(geojsonLayer)
        mapxc.fitBounds(geojsonLayer.getBounds())
    } catch (error) {
      alert('Error '+' : '+error)      
    }   
  } 

function displayThermals(track, anaThermals) {
    let thGeoJson = { 
        "type": "Feature", 
        "properties": {
            "name": "Thermals",
            "desc": ""
        },
        "geometry": 
            { "type": "MultiPoint", 
            "coordinates": []
            } 
    }
    let thCoord = []
    for (let i = 0; i < anaThermals.length; i++) {
        const thermalSegment = anaThermals[i]
        for (let k = thermalSegment.idxStart; k < thermalSegment.idxEnd+1; k++) {
            thCoord.push([track.fixes[k].longitude,track.fixes[k].latitude])
        }
    }
    let thStyle = {
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
    thGeoJson.geometry.coordinates = thCoord
    let thLayerPoints =  L.geoJson(thGeoJson,{
        style : thStyle,
        pointToLayer: function(f, latlng) {return L.circleMarker(latlng,geojsonMarkerOptions)}
    })
    if (!thermalDisplay) {
        thermalGroup.addTo(mapxc)
        layerControl.addOverlay( thermalGroup, i18n.gettext('Thermals'))
        thermalDisplay = true
    }
    thermalGroup.addLayer(thLayerPoints)
}

// from array of latlngs, use Leaflet's function distanceTo(lastpoint)
async function displayFeatures() {
    const latlngs = polyline.getLatLngs()
    let trkdistance = 0
    nbMarkers = 0
    let lastpoint = latlngs[0]
    // Iterate the polyline's latlngs
    for (let i = 0; i < latlngs.length; i++) {
        trkdistance += latlngs[i].distanceTo(lastpoint)
        lastpoint = latlngs[i]
        nbMarkers++
    }
    trkdistance = trkdistance / 1000
    legendFields = getLegend()
    legendFields.totaldistance = trkdistance
    let speed = legendFields.speed
    const timeInHours =  trkdistance/ speed
    legendFields.hours = timeInHours
    legendFields.totaldistance = trkdistance
    if (nbMarkers > 1 && calcScore) {
        const argsScoring = {
            route : latlngs,
            speed : speed,
            league : currLeague
        }
        let result = await scoring.navscoring(argsScoring)
        legendFields.score = result.scoreinfo.score
        legendFields.coeff = i18n.gettext('Points')+' ['+result.flightcoeff+' x km]'
        legendFields.distance = result.scoreinfo.distance
        legendFields.name = result.flightname
        updateLegend(legendFields)
        displayScoring(result)
    } else {
        updateLegend(legendFields)
    }
}

function loadMarkers(arrMarkers) {
    markerList = []
    for (let i = 0; i < arrMarkers.length; i++) {
        const item = arrMarkers[i]
        let latlngItem = L.latLng(item.lat, item.long)
        let newMarker = new L.Marker(latlngItem)
        markerList.push(newMarker)
        let markerid = markerList.length - 1
        let markerPopup = '<div class="btn-group-vertical">'
        markerPopup +=  "<button class='btn btn-danger btn-sm' onclick=\"deletepoint('" + markerid + "')\">Delete</button>"
        markerPopup += '</div>'
        newMarker.bindPopup(markerPopup)
        markerGroup.addLayer(newMarker)
    }
    if (markerList.length > 0) {
        markerGroup.addTo(mapxc)
        layerControl.addOverlay(markerGroup, i18n.gettext('Waypoints'))
    }
}

function getLegend() {
    const totalHours = durationToHours(document.getElementById('val-duration').innerHTML)
    const legendFields = {
        hours : totalHours,
        distance : Number(document.getElementById('val-sc-dist').innerHTML),
        name : document.getElementById('lb-sc-dist').innerHTML,
        coeff : document.getElementById('lb-sc-pts').innerHTML,
        score : document.getElementById('val-sc-pts').innerHTML,
        totaldistance : Number(document.getElementById('val-totdist').innerHTML),
        speed : document.getElementById('inputspeed').value
    }
    return legendFields
}

function updateLegend(legendFields) {    
    const timeInMinutes = legendFields.hours * 60
    const hours = Math.floor(timeInMinutes / 60)
    const minutes = Math.floor(timeInMinutes % 60) 
    const legendDuration = hours + ':' + (minutes < 10 ? '0' : '') + minutes
    document.getElementById('val-duration').innerHTML = legendDuration
    document.getElementById('val-sc-dist').innerHTML = legendFields.distance.toFixed(1).toString()
    document.getElementById('lb-sc-dist').innerHTML = legendFields.name
    document.getElementById('val-sc-pts').innerHTML = legendFields.score
    document.getElementById('lb-sc-pts').innerHTML = legendFields.coeff
    document.getElementById('val-totdist').innerHTML = legendFields.totaldistance.toFixed(1).toString()
}

function resetLegend() {
    document.getElementById('val-duration').innerHTML = '0:00'
    document.getElementById('val-sc-dist').innerHTML = '0'
    document.getElementById('inputspeed').value = 20
    document.getElementById('lb-sc-dist').innerHTML = i18n.gettext('Open distance')
    document.getElementById('val-sc-pts').innerHTML = '0'
    document.getElementById('lb-sc-pts').innerHTML = i18n.gettext('Points')
    document.getElementById('val-totdist').innerHTML = '0'
}

function tryDrawStartCylinder(startInfo) {
    if (closingcirclepath) {
        scoreGroup.removeLayer(closingcirclepath)
    }
    try {
       let rule = scoringRules[currLeague].find(sr => sr.name == startInfo.name)
        if (typeof rule.closingDistance !== 'function') {
            // we try to find the closing rule with the largest radius
            let rules = scoringRules[currLeague].filter(r => typeof r.closingDistance === 'function').sort((a,b) => b.closingDistance(startInfo.distance, {'scoring':b})-a.closingDistance(startInfo.distance, {'scoring':a}))
            if (rules.length <= 0) return
            rule = rules[0]
        }
        let radius = rule.closingDistance(startInfo.distance, {'scoring':rule}) * 1000
        let circle = calccircle(startInfo.center, radius)
        closingcirclepath = new L.Polyline(circle, {...opt_path, color: 'yellow', fill : 'yellow'})
        scoreGroup.addLayer(closingcirclepath)
    } catch (error) {
        console.log('tryDrawStartCylinder error' +error)
    }
}

function displayScoring(xcscore) {
    if (scorelinepath) {
        scoreGroup.removeLayer(scorelinepath)
    }
    if (scorepointlist) {
        for (let i=0; i<scorepointlist.length; i++){
            scoreGroup.removeLayer(scorepointlist[i])
        }
        scorepointlist = []
    }
    faiSectors = []
    if (Array.isArray(xcscore.scoreinfo.tp)) {
        typeparcours = xcscore.flighttype
        let tps = xcscore.scoreinfo.tp
        // Triangle case
        if (xcscore.scoreinfo.cp) {
            let tmpmarker = L.marker([xcscore.scoreinfo.cp.in.y, xcscore.scoreinfo.cp.in.x], {icon: mapIcons.scstart})
            scoreGroup.addLayer(tmpmarker.bindPopup("Start"))
        //    tmpmarker.addTo(mapxc).bindPopup("Start")
            scorepointlist.push(tmpmarker)
            const startInfo = {
                name : xcscore.flightname,
                distance : xcscore.scoreinfo.distance,
                center : [xcscore.scoreinfo.cp.in.y, xcscore.scoreinfo.cp.in.x]
            }
            tryDrawStartCylinder(startInfo)
        } else if (xcscore.scoreinfo.ep) {
            // Free distance case
            let tmpmarker = L.marker([xcscore.scoreinfo.ep.start.y, xcscore.scoreinfo.ep.start.x], {icon: mapIcons.scstart})
            scoreGroup.addLayer(tmpmarker.bindPopup("Start"))
         //   tmpmarker.addTo(mapxc).bindPopup("Start")
            scorepointlist.push(tmpmarker)
            const startInfo = {
                name : xcscore.flightname,
                distance : xcscore.scoreinfo.distance,
                center : [xcscore.scoreinfo.ep.start.y, xcscore.scoreinfo.ep.start.x]
            }
            tryDrawStartCylinder(startInfo)
        }
        // with tps turnpoints array, we draw the score line
        for (let i=0; i<tps.length; i++) {
            let markertp = L.marker([tps[i].y, tps[i].x], {icon: mapIcons.sctp})
            scoreGroup.addLayer(markertp.bindPopup("TP "+(i+1)))
       //     markertp.addTo(mapxc).bindPopup("TP "+(i+1))
            scorepointlist.push(markertp)
            faiSectors.push(tps[i])
          //  console.log(`push in faisectors : y=${tps[i].y} x=${tps[i].x}`)
        }
        if (xcscore.scoreinfo.cp) {
            let tmpmarker = L.marker([xcscore.scoreinfo.cp.out.y, xcscore.scoreinfo.cp.out.x], {icon: mapIcons.scend})
            scoreGroup.addLayer(tmpmarker.bindPopup("Finish"))
          //  tmpmarker.addTo(mapxc).bindPopup("Finish")
            scorepointlist.push(tmpmarker)
        } else if (xcscore.scoreinfo.ep) {
            let tmpmarker = L.marker([xcscore.scoreinfo.ep.finish.y, xcscore.scoreinfo.ep.finish.x], {icon: mapIcons.scend})
            scoreGroup.addLayer(tmpmarker.bindPopup("Finish"))
        //    tmpmarker.addTo(mapxc).bindPopup("Finish")
            scorepointlist.push(tmpmarker)
        }
        // we can build the polyline  
        scorelinepath = new L.Polyline(scorepointlist.map(pt => pt.getLatLng()), {
            color: 'red',
            weight: 3,
            opacity: 0.5,
            smoothFactor: 1,
            offset: 5
        })
        scoreGroup.addLayer(scorelinepath)
    }
    drawFAISectors()
}

/* ******************* UI functions ******************** */

function drawFAISectors() {
    if (faisectpath) {
        faisectpath.forEach(sectpath => scoreGroup.removeLayer(sectpath))
    }
    if (faiSectors.length != 3  || (typeparcours != 'tri' && typeparcours != 'fai')) {
        return
    }
    
    let pixels = faiSectors.map(pt => mapxc.latLngToContainerPoint(L.latLng(pt.y, pt.x)))
    if ((pixels[0].x == pixels[1].x && pixels[0].y == pixels[1].y) ||
        (pixels[1].x == pixels[2].x && pixels[1].y == pixels[2].y) ||
        (pixels[0].x == pixels[2].x && pixels[0].y == pixels[2].y)) return
    faisectpath = []
    faisectpath.push(new L.Polyline(faiSector([pixels[0], pixels[1], pixels[2]]), {...opt_path, color: 'green', fill : 'green'}))
    faisectpath.push(new L.Polyline(faiSector([pixels[1], pixels[2], pixels[0]]), {...opt_path, color: 'blue', fill : 'blue'}))
    faisectpath.push(new L.Polyline(faiSector([pixels[2], pixels[0], pixels[1]]), {...opt_path, color: 'red', fill : 'red'}))
    faisectpath.forEach(sectpath => scoreGroup.addLayer(sectpath))
}

function iniLeague() {
    const selectLeague = document.getElementById("sel-league")
    setLeagues = settingsList.getLeagues()
    for (let index in setLeagues ) {
        const _league = setLeagues[index]
        selectLeague.options[selectLeague.options.length] = new Option(_league.val, _league.key)
    } 
    let selectedLeague = store.get('league')
    if (selectedLeague == '' || selectedLeague == null) selectedLeague = 'FR'
    selectLeague.value = selectedLeague  
    currLeague = selectLeague.options[selectLeague.selectedIndex].text
}

function changeLeague() {    
    const selectLeague = document.getElementById("sel-league")
    const newLeague = selectLeague.options[selectLeague.selectedIndex].text
    if (newLeague != currLeague) {
        currLeague = newLeague
        displayFeatures()
    }
}

function withScore() {
    const showScore = calcScore
    if (checkScoring.checked) {    
        calcScore = true
        if (!showScore) displayFeatures()
    } else {
        calcScore = false
        if (showScore) clearRoute(false)
    }
}

function decSpeed() {
    const selSpeed = document.getElementById('inputspeed')
    const value = Number(selSpeed.value)
    if (value > 1) {
        const newSpeed = value - 1
        selSpeed.value = newSpeed
        legendFields = getLegend()
        const timeInHours =  legendFields.totaldistance / newSpeed
        legendFields.hours = timeInHours
        updateLegend(legendFields)
    }
}

function incSpeed() {
    const selSpeed = document.getElementById('inputspeed')
    const value = Number(selSpeed.value)
    const newSpeed = value + 1
    selSpeed.value = newSpeed    
    legendFields = getLegend()
    const timeInHours =  legendFields.totaldistance / newSpeed
    legendFields.hours = timeInHours
    updateLegend(legendFields)
}

function addTooltip (e) {
    L.DomEvent.on(document, 'mousemove', moveTooltip);
    tooltip.innerHTML = 'Click on the map to start a line.';
    tooltip.style.display = 'block';
}

function removeTooltip (e) {
    tooltip.innerHTML = '';
    tooltip.style.display = 'none';
    L.DomEvent.off(document, 'mousemove', moveTooltip);
}

function moveTooltip (e) {
    tooltip.style.left = e.clientX + 20 + 'px';
    tooltip.style.top = e.clientY - 10 + 'px';
}

function updateTooltip (e) {
    if (e.layer.editor._drawnLatLngs.length < e.layer.editor.MIN_VERTEX) {
        tooltip.innerHTML = 'Click on the map to continue line.';
    }
    else {
        tooltip.innerHTML = 'Click on last point to finish line.';
    }
}

/* **************** Comptuting functions ********************* */

function faiSector(pixels) {
    let flip = isClockwise(pixels) ? 1 : -1
    let delta = {'x':pixels[1].x - pixels[0].x, 'y':pixels[1].y - pixels[0].y}
    let theta = flip * Math.atan2(delta.y, delta.x)
    let cos_theta = Math.cos(theta)
    let sin_theta = Math.sin(theta)
    let a, b, x, y
    let c = Math.sqrt(delta.x * delta.x + delta.y * delta.y)
    let result = []
    for (ap = 28; ap < 44; ++ap) {
      a = c * ap / 28.0
      b = c * (72.0 - ap) / 28.0
      x = (b * b + c * c - a * a) / (2 * c)
      y = Math.sqrt(b * b - x * x)
      result.push({'x':pixels[0].x + x * cos_theta - y * sin_theta, 'y':pixels[0].y + flip * (x * sin_theta + y * cos_theta)})
    }
    for (cp = 28; cp < 44; ++cp) {
      a = c * (72.0 - cp) / cp
      b = c * 28.0 / cp
      x = (b * b + c * c - a * a) / (2 * c)
      y = Math.sqrt(b * b - x * x)
      result.push({'x':pixels[0].x + x * cos_theta - y * sin_theta, 'y':pixels[0].y + flip * (x * sin_theta + y * cos_theta)})
    }
    for (cp = 44; cp >= 28; --cp) {
      a = c * 28.0 / cp
      b = c * (72.0 - cp) / cp
      x = (b * b + c * c - a * a) / (2 * c)
      y = Math.sqrt(b * b - x * x)
      result.push({'x':pixels[0].x + x * cos_theta - y * sin_theta, 'y':pixels[0].y + flip * (x * sin_theta + y * cos_theta)})
    }
    let bounds = mapxc.getBounds()
    let maxsize = mapxc.latLngToContainerPoint(L.latLng(bounds.getSouth(), bounds.getEast()))
    return result.map(function(pixel) {
        pixel.x = Math.min(maxsize.x, Math.max(0, pixel.x))
        pixel.y = Math.min(maxsize.y, Math.max(0, pixel.y))
        return mapxc.containerPointToLatLng(pixel)
    })
}

function durationToHours(duration) {
    const [hours, minutes] = duration.split(':').map(Number)
    return hours + minutes / 60
}

function calccircle(center, radius) {
    center = center.map(p => toRad(p))
    let error = 0.1
    let decimation = Math.ceil(Math.PI / Math.acos((radius - error) / (radius + error)))
    let coords = []
    for (let i = 0; i < decimation + 1; i++) {
      let coord = coord_at(center, -2 * Math.PI * i / decimation, radius + error)
      coords.push(coord.map(p => toDeg(p)))
    }
    return coords
}

function toRad(lat) {
    return lat*(Math.PI/180)
}

function toDeg(lat) {
    return lat*(180/Math.PI)
  }

function coord_at(center, theta, d) {
    const R = 6371000
    let lat = Math.asin(Math.sin(center[0]) * Math.cos(d / R) + Math.cos(center[0]) * Math.sin(d / R) * Math.cos(theta))
    let lon = center[1] + Math.atan2(Math.sin(theta) * Math.sin(d / R) * Math.cos(center[0]), Math.cos(d / R) - Math.sin(center[0]) * Math.sin(center[0]))
    return [lat, lon]
}

function isClockwise(pixels) {
    return ((pixels[1].y - pixels[0].y) * (pixels[2].x - pixels[0].x) - (pixels[2].y - pixels[0].y) * (pixels[1].x - pixels[0].x)) < 0
}
