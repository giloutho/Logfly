const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const inputMask = require('inputmask')
const Position = require('../../../utils/geo/position.js')
const SyncTileSet = require('srtm-elevation').SyncTileSet

let currLang
let currPosition = new Position()

const tiles = require('../../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
let mapPm
let marker
let editWayp
let currentMap
let defaultZoom
let srtmPath = null

const btnCancel = document.getElementById('bt-cancel')
const btnOk = document.getElementById('bt-ok')
const rdStandard = document.getElementById('rd-std')
const rdTakeoff = document.getElementById('rd-takeoff')
const rdLanding = document.getElementById('rd-landing')
const txLongName =  document.getElementById('tx-longname')
const txShortName =  document.getElementById('tx-shortname')
const txAlt = document.getElementById('tx-alt')
const txLatDd = document.getElementById('tx-lat-dd')
const txLongDd = document.getElementById('tx-long-dd')
const txLatDmm = document.getElementById('tx-lat-dmm')
const txLongDmm = document.getElementById('tx-long-dmm')
const txLatDms = document.getElementById('tx-lat-dms')
const txLongDms = document.getElementById('tx-long-dms')
const waitSrtm = document.getElementById('lb-srtm')

iniForm()

ipcRenderer.on('current-wayp', (event, currWayp) => {    
    editWayp = currWayp
    if (editWayp.new == true) {
        rdStandard.checked = true
    } else {
        rdTakeoff.checked = true
        txAlt.value = editWayp.alti
    }   
    currentMap = editWayp.currMap
    defaultZoom = editWayp.zoom
    txLongName.value = editWayp.longName
    txShortName.value = editWayp.shortName
    currPosition.setLatitudeDd(editWayp.lat)
    currPosition.setLongitudeDd(editWayp.long)
    updateCoords(true)   

})


function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile))
            let langjson = JSON.parse(content)
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang)            
            translateLabels()
        }
        // Srtm path test
        const pathW  = store.get('pathWork')
        let pathSrtm =  path.join(pathW,'Srtm') 
        if (fs.existsSync(pathSrtm)) {
            srtmPath = pathSrtm
        } else {
            try {
                fs.mkdirSync(pathSrtm)
                srtmPath = pathSrtm
            } catch (error) {
                log.error('[fullmap-compute] unable to create '+pathSrtm)
            }            
        }    
    } catch (error) {
        log.error('[waypform.js] Error in iniForm()')
    }  

    const maskAlt = new Inputmask({
        mask: '9{1,4}'
     })
    maskAlt.mask(txAlt)

    const maskLatDd = new Inputmask({
        mask: '[-]9{1,2}.9{5}'        
     })
    maskLatDd.mask(txLatDd)

    const maskLongDd = new Inputmask({
        mask: '[-]9{1,3}.9{5}'
     })
    maskLongDd.mask(txLongDd)

    const maskLatDmm = new Inputmask({
        mask: '9{1,2}°[M]9.9{1,4}\'D',
        definitions: {
            D: {
                validator: '[nN|sS]',
                cardinality: 1,
                casing: 'upper'
            },
            M: {
                validator: '[0-5]',
                cardinality: 1
            },
        }
     })
    maskLatDmm.mask(txLatDmm)

    const maskLongDmm = new Inputmask({
        mask: '9{1,3}°M[9].9{1,4}\'D',
        definitions: {
            D: {
                validator: '[eE|wW]',
                cardinality: 1,
                casing: 'upper'
            },
            M: {
                validator: '[0-5]',
                cardinality: 1
            }          
        }
     })
    maskLongDmm.mask(txLongDmm)

    const maskLatDms = new Inputmask({
     mask: '9{1,2}°M9\'M9.99"D',
        definitions: {
            D: {
                validator: '[nN|sS]',
                cardinality: 1,
                casing: 'upper'
            },
            M: {
                validator: '[0-5]',
                cardinality: 1
            }
        }
    })
     maskLatDms.mask(txLatDms)

     const maskLongDms = new Inputmask({
        mask: '9{1,3}°M9\'M9.99"D',
        definitions: {
            D: {
                validator: '[eE|wW]',
                cardinality: 1,
                casing: 'upper'
            },
            M: {
                validator: '[0-5]',
                cardinality: 1
            }
        }
    })
     maskLongDms.mask(txLongDms)
    // pour la suite voir https://stackoverflow.com/questions/53954508/jquery-inputmask-latitude-longitude-validation-and-masking
    // avec les "definitions"
    btnCancel.addEventListener('click',(event)=>{
        ipcRenderer.sendTo(1,'back_waypform', null)
        window.close()
    })  
    btnOk.addEventListener('click',(event)=>{validFields()}) 
    
    $("#tx-lat-dd").on('change', function(){    
        const degrees = txLatDd.value.replaceAll('_','')
        if (degrees != '') {
            currPosition.setLatitudeDd((degrees*1).toFixed(5))
            updateCoords(true)
        }
        console.log(txName.value.toUpperCase())
    })
    $("#tx-long-dd").on('change', function(){    
        const degrees = txLongDd.value.replaceAll('_','')
        if (degrees != '') {        
            currPosition.setLongitudeDd((degrees*1).toFixed(5))
            updateCoords(true)
        }
    })

    $("#tx-lat-dmm").on('change', function(){    
        const rawLat = txLatDmm.value.replaceAll('_','')
        if (rawLat != '') {
            //45°56.789N
            let parts = rawLat.split(/[^\d\w]+/)
            const degrees = parts[0]
            let  minutes = parts[1] != null && parts[1] != '' ? parts[1] : 0
            let  decminutes = parts[2] != null && parts[2] != '' ? parts[2] : 0
            let minanddec = minutes+'.'+decminutes
            let  direction = parts[3] != null & parts[3] != '' ? parts[3] : 'N'
            if (degrees != null & degrees != '' ) {
                currPosition.setLatitudeDMm(degrees, minanddec, direction) 
                updateCoords(true)
            }
        }
    })

    $("#tx-long-dmm").on('change', function(){    
        const rawLong = txLongDmm.value.replaceAll('_','')
        if (rawLong != '') {
            //106°56.789E
            let parts = rawLat.split(/[^\d\w]+/)
            const degrees = parts[0]
            let  minutes = parts[1] != null && parts[1] != '' ? parts[1] : 0
            let  decminutes = parts[2] != null && parts[2] != '' ? parts[2] : 0
            let minanddec = minutes+'.'+decminutes
            let  direction = parts[3] != null & parts[3] != '' ? parts[3] : 'E'
            if (degrees != null & degrees != '' ) {
                currPosition.setLongitudeDMm(degrees, minanddec, direction) 
                updateCoords(true)
            }
        }
    })    

    $("#tx-lat-dms").on('change', function(){    
        const rawLat = txLatDms.value.replaceAll('_','')
        if (rawLat != '') {
            //45°51'11.16''N
            // parts Array ["45","51","11","16","N"]
            let parts = rawLat.split(/[^\d\w]+/)
            const degrees = parts[0]
            let  minutes = parts[1] != null && parts[1] != '' ? parts[1] : 0
            let secondInt = parts[2] != null && parts[2] != '' ? parts[2] : 0  
            let secondDec = parts[3] != null && parts[3] != '' ? parts[3] : 0  
            let  seconds = secondInt+'.'+secondDec         
            let  direction = parts[4] != null & parts[4] != '' ? parts[4] : 'N'            
            if (degrees != null & degrees != '' ) {
                currPosition.setLatitudeDMS(degrees,minutes,seconds,direction)
                updateCoords(true)
            }
        }
    }) 

    $("#tx-long-dms").on('change', function(){    
        const rawLong = txLongDms.value.replaceAll('_','')
        if (rawLong != '') {
            //105°56'32''W
            let parts = rawLong.split(/[^\d\w]+/)
            const degrees = parts[0]
            let  minutes = parts[1] != null && parts[1] != '' ? parts[1] : 0
            let secondInt = parts[2] != null && parts[2] != '' ? parts[2] : 0  
            let secondDec = parts[3] != null && parts[3] != '' ? parts[3] : 0  
            let  seconds = secondInt+'.'+secondDec     
            let  direction = parts[4] != null & parts[4] != '' ? parts[4] : 'E'            
            if (degrees != null & degrees != '' ) {
                currPosition.setLongitudeDMS(degrees,minutes,seconds,direction)
                updateCoords(true)
            }
        }
    })     
}

function displayMap() {
    if (mapPm != null) {
        mapPm.off()
        mapPm.remove()
      }
      mapPm = L.map('mapid').setView([currPosition.latitude,currPosition.longitude], defaultZoom)
      L.control.layers(baseMaps).addTo(mapPm)
      const defaultMap = currentMap
      switch (defaultMap) {
        case 'open':
          baseMaps.OpenTopo.addTo(mapPm)  
          break
        case 'ign':
          baseMaps.IGN.addTo(mapPm)  
          break      
        case 'osm':
          baseMaps.OSM.addTo(mapPm) 
          break
        case 'mtk':
          baseMaps.MTK.addTo(mapPm)  
          break  
        case '4u':
          baseMaps.UMaps.addTo(mapPm)
          break     
        case 'out':
          baseMaps.Outdoor.addTo(mapPm)           
          break           
        default:
          baseMaps.OSM.addTo(mapPm)        
          break         
      }    

    let violetIcon = new L.Icon({
    iconUrl: '../../../leaflet/images/marker-icon-violet.png',
    shadowUrl: '../../../leaflet/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
    })

    marker = L.marker([currPosition.latitude,currPosition.longitude],{icon: violetIcon, draggable: true}).addTo(mapPm)
    marker.bindPopup(i18n.gettext('Wait for the digital elevation file to download'))

    marker.on('dragend', ondragend)

    function ondragend() {
        // console.log(marker.getLatLng().lat.toFixed(4))
        // console.log(marker.getLatLng().lng.toFixed(4))   
        currPosition.setLatitudeDd(marker.getLatLng().lat.toFixed(5))
        currPosition.setLongitudeDd(marker.getLatLng().lng.toFixed(5))
        updateCoords(false)        
        // test elevation 
        getElevation()
    }

    mapPm.on('baselayerchange', function (e) {
        currentMap = tiles.currentMap(e.layer._url)
    })
}

function getElevation() {
    $('#lb-srtm').removeClass('d-none')
    marker.openPopup()
    let minLat = mapPm.getBounds().getSouth()
    let maxLat = mapPm.getBounds().getNorth()
    let minLng = mapPm.getBounds().getWest()
    let maxLng = mapPm.getBounds().getEast()
    let tileset = new SyncTileSet(srtmPath, [minLat, minLng], [maxLat, maxLng], function(err) {
        $('#lb-srtm').addClass('d-none')
        if (err) {
            marker.bindPopup(i18n.gettext('Altitude not found, input manually...'))
        } else {
            // arrayElevation.push(Math.round(tileset.getElevation([l[0], l[1]])))  
            let ele = Math.round(tileset.getElevation([currPosition.latitude,currPosition.longitude]))
            txAlt.value = ele
            mapPm.closePopup()
        }
    }, {
        // un peu chaud ... Cela ne fonctionnait plus le 27 08 22
        // upgrade version 2.1.2
        // cette issue https://github.com/rapomon/srtm-elevation/issues/3
        //  évoque le problème ou il répond que la nasa fonctionne mal
        // on change le provider        
        // provider: "https://srtm.fasma.org/{lat}{lng}.SRTMGL3S.hgt.zip",
        // username: null,
        // password: null        
        username: 'logfly_user',
        password: 'Logfly22'
    })
}

function updateCoords(updateMap) {
    console.log({currPosition})
    if (currPosition.latitude < 0) {        
        txLatDd.value = '-'+Number(currPosition.latitude).toFixed(5)
    } else {
        // Number function is necessary otherwise an error is triggered :
        // currPosition.latMin_mm.toFixed(4) is not a function
        txLatDd.value = Number(currPosition.latitude).toFixed(5) 
    }
    const fmtLatMinMm = String(Number(currPosition.latMin_mm).toFixed(4)).padStart(7, '0')
    txLatDmm.value = currPosition.latDegres+'°'+fmtLatMinMm+'\''+currPosition.hemisphere
    const fmtLatSecMs = String(Number(currPosition.latSec_ms).toFixed(2)).padStart(5,'0')
    txLatDms.value = currPosition.latDegres+'°'+String(currPosition.latMin_ms).padStart(2,0)+'\''+fmtLatSecMs+'\'\''+currPosition.hemisphere

    if (currPosition.longitude < 0) {        
        txLongDd.value = '-'+Number(currPosition.longitude).toFixed(5)
    } else {
        // Number necessary function otherwise an error is triggered 
        // currPosition.latMin_mm.toFixed(4) is not a function
        txLongDd.value = Number(currPosition.longitude).toFixed(5) 
    }
    const fmtLongMinMm = String(Number(currPosition.longMin_mm).toFixed(4)).padStart(7, '0')
    txLongDmm.value = currPosition.longDegres+'°'+fmtLongMinMm+'\''+currPosition.meridian
    const fmtLongSecMs = String(Number(currPosition.longSec_ms).toFixed(2)).padStart(5,'0')
    txLongDms.value = currPosition.longDegres+'°'+String(currPosition.longMin_ms).padStart(2,0)+'\''+fmtLongSecMs+'\'\''+currPosition.meridian

    if (updateMap) displayMap()
}

function validFields() {
    if (txLongName.value == '' || txLongName.value == null) {
        alert(i18n.gettext('Name must not be null'))
    } else if (txShortName.value == '' || txShortName.value == null){

    } 
    else {
        editWayp.longName = txLongName.value.toUpperCase()
        editWayp.shortName = txShortName.value.toUpperCase()
        const latDd = txLatDd.value.replaceAll('_','')
        if(latDd == '' || latDd == null || latDd == '0.00000') {
            alert(i18n.gettext('Latitude must not be null'))
        } else {
            editWayp.lat = latDd
            const longDd = txLongDd.value.replaceAll('_','')
            if(longDd == '' || longDd == null || longDd == '0.00000') {
                alert(i18n.gettext('Longitude must not be null'))
            } else {
                editWayp.long = longDd
                if (rdStandard.checked == true) {
                    editWayp.typeWayp = "S"
                } else if (rdTakeoff.checked == true) {        
                    editWayp.typeWayp = "D"
                } else {
                    editWayp.typeSite = "A"
                }
                if (txAlt.value == '') {
                    editWayp.alti= '0'
                } else {
                    editWayp.alti= txAlt.value
                } 
                editWayp.currMap = currentMap
                editWayp.zoom = mapPm.getZoom()
                ipcRenderer.sendTo(1,"back_waypform", editWayp)
                window.close()                           
            }
        }
    }    
}

function translateLabels() {
    document.getElementById('lb-std').innerHTML = i18n.gettext("Standard")
    document.getElementById('lb-take-off').innerHTML = i18n.gettext("Take off")
    document.getElementById('lb-landing').innerHTML = i18n.gettext("Landing")
    document.getElementById('rd-landing').checked = true
    document.getElementById('lb-alt').innerHTML = i18n.gettext("Alt")+' (m)'
    document.getElementById('lb-lat-dd').innerHTML = i18n.gettext("Latitude")
    document.getElementById('lb-long-dd').innerHTML = i18n.gettext("Longitude")
    document.getElementById('lb-lat-dmm').innerHTML = i18n.gettext("Latitude")
    document.getElementById('lb-long-dmm').innerHTML = i18n.gettext("Longitude")
    document.getElementById('lb-lat-dms').innerHTML = i18n.gettext("Latitude")
    document.getElementById('lb-long-dms').innerHTML = i18n.gettext("Longitude")
    document.getElementById('lb-move').innerHTML = i18n.gettext("Move marker to change coordinates")
    waitSrtm.innerHTML = i18n.gettext('Wait for the digital elevation file to download')
    btnCancel.innerHTML = i18n.gettext('Cancel')
}