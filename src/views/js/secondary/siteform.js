const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store();
const inputMask = require('inputmask');
const Position = require('../../../utils/geo/position.js')

let currLang
let currPosition = new Position()

const tiles = require('../../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
let mapPm
let editSite

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

iniForm()

ipcRenderer.on('current-site', (event, currSite) => {    
    editSite = currSite
    if (editSite.id > 0) {
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
        rdTakeoff.checked = true
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
        mapPm.off();
        mapPm.remove();
      }
      mapPm = L.map('mapid').setView([currPosition.latitude,currPosition.longitude], 12)
      L.control.layers(baseMaps).addTo(mapPm)
      const defaultMap = store.get('map')
      switch (defaultMap) {
        case 'open':
          baseMaps.OpenTopo.addTo(mapPm)  
          break;
        case 'ign':
          baseMaps.IGN.addTo(mapPm)  
          break;      
        case 'osm':
          baseMaps.OSM.addTo(mapPm) 
          break;
        case 'mtk':
          baseMaps.MTK.addTo(mapPm)  
          break;  
        case '4u':
          baseMaps.UMaps.addTo(mapPm)
          break;     
        case 'out':
          baseMaps.Outdoor.addTo(mapPm)           
          break;           
        default:
          baseMaps.OSM.addTo(mapPm)        
          break;         
      }    

    let violetIcon = new L.Icon({
    iconUrl: '../../../leaflet/images/marker-icon-violet.png',
    shadowUrl: '../../../leaflet/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
    });

    const marker = L.marker([currPosition.latitude,currPosition.longitude],{icon: violetIcon, draggable: true}).addTo(mapPm)

    marker.on('dragend', ondragend)

    function ondragend() {
        // console.log(marker.getLatLng().lat.toFixed(4))
        // console.log(marker.getLatLng().lng.toFixed(4))   
        currPosition.setLatitudeDd(marker.getLatLng().lat.toFixed(5))
        currPosition.setLongitudeDd(marker.getLatLng().lng.toFixed(5))
        updateCoords(false)        
    }
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
                editSite.alti= txAlt.value
                editSite.comment= document.getElementById('tx-comment').value
                const updateDate = new Date()
                editSite.update = updateDate.getFullYear()+'-'+String((updateDate.getMonth()+1)).padStart(2, '0')+'-'+String(updateDate.getDate()).padStart(2, '0') 
                dbUpdate()                
            }
        }
    }    
}

function dbUpdate() {
    let db = require('better-sqlite3')(store.get('dbFullPath'))
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
                    alert(editSite.id)
                    editSite.newsite = true
          //      }
            } 
            winClose(true)                
        } catch (error) {
            alert(i18n.gettext('Problem while updating the logbook'))
            log.error('[siteform.js/dbUpadte] error : '+error)  
            winClose(false)  
        }        
    } else {
        alert(i18n.gettext('Problem while updating the logbook'))
        log.error('[siteform.js/dbUpadte] db not open')  
        winClose(false) 
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

function winClose(update) {
    if (update) {
        // https://stackoverflow.com/questions/40251411/communication-between-2-browser-windows-in-electron
        // The number in sendTo is the ID of the window. Windows in electron are numbered automatically 
        // in ascending order from what I've noticed. This means that first window you create has an ID of 1, 
        // the second window has an ID of 2 and so on...
        ipcRenderer.sendTo(1, "back_siteform", editSite)
    } else {
        // pour debug
        ipcRenderer.sendTo(1, "back_siteform", editSite)
    }
    window.close()
}