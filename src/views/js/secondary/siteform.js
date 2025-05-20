const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store();
const Database = require('better-sqlite3')
const inputMask = require('inputmask');
const Position = require('../../../utils/geo/position.js')
const SyncTileSet = require('srtm-elevation').SyncTileSet

let currLang
let currPosition = new Position()

const tiles = require('../../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
let mapPm
let marker
let editSite
let srtmPath = null

const btnCancel = document.getElementById('bt-cancel')
const btnOk = document.getElementById('bt-ok')
const rdTakeoff = document.getElementById('rd-takeoff')
const rdLanding = document.getElementById('rd-landing')
const txAlt = document.getElementById('tx-alt')
const txName = document.getElementById('tx-name')
const txOrient = document.getElementById('tx-orient')
const txZipCode = document.getElementById('tx-zipcode')
const txCity = document.getElementById('tx-city')
const txCountry = document.getElementById('tx-country')
const txComment =  document.getElementById('tx-comment')
const txLatDd = document.getElementById('tx-lat-dd')
const txLongDd = document.getElementById('tx-long-dd')
const txLatDmm = document.getElementById('tx-lat-dmm')
const txLongDmm = document.getElementById('tx-long-dmm')
const txLatDms = document.getElementById('tx-lat-dms')
const txLongDms = document.getElementById('tx-long-dms')

let originWindow = 1

iniForm()

ipcRenderer.on('current-site', (event, currSite) => {    
    editSite = currSite
    // if id > 0 a site is updating from  view site
    // Origin window is main window -> 1
    if (editSite.id > 0) {
        originWindow = 1
        if (editSite.typeSite == "D") {
            rdTakeoff.checked = true
        } else if (editSite.typeSite == "A") {
            rdLanding.checked = true
        } else {
            rdTakeoff.checked = false
            rdLanding.checked = false
        }
        txName.value = editSite.nom
        txAlt.value = editSite.alti
        txOrient.value = editSite.orient
        txZipCode.value = editSite.cp
        txCity.value = editSite.localite
        txCountry.value = editSite.pays
        txComment.value = editSite.comment  
        currPosition.setLatitudeDd(editSite.lat.toFixed(5))
        currPosition.setLongitudeDd(editSite.long.toFixed(5))
        updateCoords(true)
    } else {
        // if id = 0 a new site creation requested by view site Origin window is main window -> 1
        // if id = -2 a new site creation requestes by secondary view nogpsflight Origin window is a modal window -> 2
        if (editSite.id = 0) {
            originWindow = 1
        } else if (editSite.id = -2) {
            originWindow = 2
        }
        rdTakeoff.checked = true
        let defaultLat 
        let settingLat = store.get('finderlat')
        if (settingLat == undefined || settingLat == '') {
            defaultLat = 45.835775
        } else {
            defaultLat = settingLat
        }
        let defaultLong
        let settingLong = store.get('finderlong')
        if (settingLong == undefined || settingLong == '') {
            defaultLong = 6.205428
        } else {
            defaultLong = settingLong
        }
        currPosition.setLatitudeDd(Number(defaultLat).toFixed(5))
        currPosition.setLongitudeDd(Number(defaultLong).toFixed(5))
        updateCoords(true)       
    }        
})


function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile));
            let langjson = JSON.parse(content);
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang);            
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
        log.error('[siteform.js] Error while loading the language file')
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
        ipcRenderer.sendTo(originWindow,'back_siteform', null)
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
    
    // to display default map
    console.log('iniform déroulée')

}

function displayMap() {
    if (mapPm != null) {
        mapPm.off();
        mapPm.remove();
      }
      mapPm = L.map('mapid').setView([currPosition.latitude,currPosition.longitude], 12)
      L.control.layers(baseMaps).addTo(mapPm)
      const defaultMap = store.get('map')
      switch (defaultMap) {
        case 'open':
          baseMaps.OpenTopo.addTo(mapPm)  
          currentMap = 'open'
          break
        case 'ign':
          baseMaps.IGN.addTo(mapPm)  
          currentMap = 'ign'
          break      
        case 'sat':
          baseMaps.Satellite.addTo(mapPm)  
          currentMap = 'sat'
          break        
        case 'osm':
          baseMaps.OSM.addTo(mapPm) 
          currentMap = 'osm'
          break
        case 'mtk':
          baseMaps.MTK.addTo(mapPm)  
          currentMap = 'mtk'
          break  
        case 'esri':
          baseMaps.EsriTopo.addTo(mapPm)
          currentMap = 'esri'
          break     
        case 'out':
          baseMaps.Outdoor.addTo(mapPm)   
          currentMap = 'out'        
          break           
        default:
          baseMaps.OSM.addTo(mapPm)  
          currentMap = 'osm'  
          break         
      }    

    let violetIcon = new L.Icon({
    iconUrl: '../../../leaflet/images/marker-icon-violet.png',
    shadowUrl: '../../../leaflet/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
    });

    marker = L.marker([currPosition.latitude,currPosition.longitude],{icon: violetIcon, draggable: true}).addTo(mapPm)
    marker.bindPopup(i18n.gettext('Wait for the digital elevation file to download'))

    marker.on('dragend', ondragend)

    function ondragend() {
        // console.log(marker.getLatLng().lat.toFixed(4))
        // console.log(marker.getLatLng().lng.toFixed(4))   
        currPosition.setLatitudeDd(marker.getLatLng().lat.toFixed(5))
        currPosition.setLongitudeDd(marker.getLatLng().lng.toFixed(5))
        updateCoords(false)        
        getElevation()
    }
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
    });    
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
    if (txName.value == '' || txName.value == null) {
        alert(i18n.gettext('Name must not be null'))
    } else {
        editSite.nom = txName.value.toUpperCase()
        const latDd = txLatDd.value.replaceAll('_','')
        if(latDd == '' || latDd == null || latDd == '0.00000') {
            alert(i18n.gettext('Latitude must not be null'))
        } else {
            editSite.lat = latDd
            const longDd = txLongDd.value.replaceAll('_','')
            if(longDd == '' || longDd == null || longDd == '0.00000') {
                alert(i18n.gettext('Longitude must not be null'))
            } else {
                editSite.long = longDd
                editSite.localite = txCity.value.toUpperCase()
                editSite.cp = txZipCode.value.toUpperCase()
                editSite.pays= txCountry.value.toUpperCase()
                if (rdTakeoff.checked == true) {        
                    editSite.typeSite = "D"
                } else {
                    editSite.typeSite = "A"
                }
                editSite.orient= txOrient.value.toUpperCase()
                if (txAlt.value == '') {
                    editSite.alti= '0'
                } else {
                    editSite.alti= txAlt.value
                }                
                editSite.comment= document.getElementById('tx-comment').value
                const updateDate = new Date()
                editSite.update = updateDate.getFullYear()+'-'+String((updateDate.getMonth()+1)).padStart(2, '0')+'-'+String(updateDate.getDate()).padStart(2, '0') 
                dbUpdate()     
                ipcRenderer.sendTo(originWindow,'back_siteform', editSite)
                window.close()              
            }
        }
    }    
}

function dbUpdate() {
    const db = new Database(store.get('dbFullPath'))
    if (db.open) {
        try {
            if (editSite.id > 0) {
                const stmtUp =  db.prepare('UPDATE Site SET S_Nom=?, S_Localite=?, S_CP=?, S_Pays=?, S_Type=?, S_Orientation=?, S_Alti=?, S_Latitude=?, S_Longitude=?, S_Commentaire=?, S_Maj=? WHERE S_ID =?')                  
                const updSite = stmtUp.run(editSite.nom, editSite.localite, editSite.cp, editSite.pays, editSite.typeSite, editSite.orient, editSite.alti, editSite.lat, editSite.long, editSite.comment, editSite.update, editSite.id)            
                editSite.newsite = false
                console.log('update ok')
            } else {
                const stmtAdd = db.prepare('INSERT INTO Site (S_Nom,S_Localite,S_CP,S_Pays,S_Type,S_Orientation,S_Alti,S_Latitude,S_Longitude,S_Commentaire,S_Maj) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
                const addSite = stmtAdd.run(editSite.nom, editSite.localite, editSite.cp, editSite.pays, editSite.typeSite, editSite.orient, editSite.alti, editSite.lat, editSite.long, editSite.comment, editSite.update)            
           //     if (addSite == 1) {
                    // addSite.changes must return 1 for one row added successfully
                    editSite.id = addSite.lastInsertRowid
                    editSite.newsite = true
          //      }
            }           
        } catch (error) {
            alert(i18n.gettext('Problem while updating the logbook'))
            log.error('[siteform.js/dbUpadte] error : '+error)  
        }        
    } else {
        alert(i18n.gettext('Problem while updating the logbook'))
        log.error('[siteform.js/dbUpadte] db not open')  
    }   
}

function translateLabels() {
    document.getElementById('lb-take-off').innerHTML = i18n.gettext("Take off")
    document.getElementById('lb-landing').innerHTML = i18n.gettext("Landing")
    document.getElementById('rd-landing').checked = true
    document.getElementById('lb-alt').innerHTML = i18n.gettext("Alt")+' (m)'
    document.getElementById('lb-name').innerHTML = i18n.gettext("Name")
    document.getElementById('lb-orient').innerHTML = i18n.gettext("Orientation")
    document.getElementById('lb-zipcode').innerHTML = i18n.gettext("ZIP code")
    document.getElementById('lb-city').innerHTML = i18n.gettext("City")
    document.getElementById('lb-country').innerHTML = i18n.gettext("Country")
    document.getElementById('lb-lat-dd').innerHTML = i18n.gettext("Latitude")
    document.getElementById('lb-long-dd').innerHTML = i18n.gettext("Longitude")
    document.getElementById('lb-lat-dmm').innerHTML = i18n.gettext("Latitude")
    document.getElementById('lb-long-dmm').innerHTML = i18n.gettext("Longitude")
    document.getElementById('lb-lat-dms').innerHTML = i18n.gettext("Latitude")
    document.getElementById('lb-long-dms').innerHTML = i18n.gettext("Longitude")
    document.getElementById('lb-comment').innerHTML = i18n.gettext("Comment")
    document.getElementById('lb-move').innerHTML = i18n.gettext("Move marker to change coordinates")
    btnCancel.innerHTML = i18n.gettext('Cancel')
}
