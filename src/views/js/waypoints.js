const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
let menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
const btnSelect = document.getElementById('sel-file')
const btnGps = document.getElementById('sel-gps')
const btnNewSet = document.getElementById('sel-newset')
const btnFlymSD = document.getElementById('imp-gps-flysd')
const btnFlymOld = document.getElementById('imp-gps-flyold')
const btnFlytec20 = document.getElementById('imp-gps-fly20')
const btnFlytec15 = document.getElementById('imp-gps-fly15')
const btnSyride = document.getElementById('imp-gps-syr')
const btnSyrUsb = document.getElementById('imp-gps-syrusb')
const btnRever = document.getElementById('imp-gps-rever')
const btnSkytrax2 = document.getElementById('imp-gps-sky2')
const btnSkytrax3 = document.getElementById('imp-gps-sky3')
const btnOudie = document.getElementById('imp-gps-oud')
const btnCPilot = document.getElementById('imp-gps-cpil')
const btnElement = document.getElementById('imp-gps-elem')
const btnConnect = document.getElementById('imp-gps-conn')
const btnSkydrop = document.getElementById('imp-gps-skydrop')
const statusBar = document.getElementById('status')
const btnNewWayp = document.getElementById('new-wayp')
const txPrefix = document.getElementById('tx-prefix')
let currLang
const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
const easyButton = require('leaflet-easybutton')
const turfHelper = require('@turf/helpers')
const turfbbox = require('@turf/bbox').default
const waypread = require('../../utils/geo/wayp-read.js')
const waypwrite = require('../../utils/geo/wayp-write.js');
const { event } = require('jquery');

let mapwp
let mapLat, mapLong
let arrWayp = []
let arrMarker = []
let wpFilePath = ''
let selectSavingFormat
let selectedGPS = ''

iniForm()

ipcRenderer.on('gpsdump-wplist', (event, result) => {
  simpleHideWating()
  if (result != null) {
    displayWpDisk(result)
  } else {
    i18n.gettext('GpsDump did not return data. Is the waypoints list empty ?')
  }
})  

ipcRenderer.on('gpsdump-wpsent', (event, result) => {
  simpleHideWating()
  // response is an array of ascii codes
  const strResult = String.fromCharCode.apply(null, result)
  alert(strResult)
  const dialogLang = {
    title: '',
    message: i18n.gettext('Checking')+' ?',
    yes : i18n.gettext('Yes'),
    no : i18n.gettext('No')
  }
  ipcRenderer.invoke('yes-no',dialogLang).then((result) => {
    if (result) {
      switch (selectedGPS) {
        case 'FlymasterSD':
          serialGpsRead('FlymasterSD','read')
          break
        case 'FlymasterOld':
          serialGpsRead('FlymasterOld','read')
          break
        case 'Flytec20':
          serialGpsRead('Flytec20','read')
          break      
        case 'Flytec15':
          serialGpsRead('Flytec15','read')
          break       
      }
    } 
  })
})  

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
    document.title = 'Logfly '+store.get('version')
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    btnSelect.innerHTML = i18n.gettext('Select a file')
    btnSelect.addEventListener('click', (event) => {callDisk()})
    btnGps.innerHTML = i18n.gettext('Read GPS')
    btnNewSet.innerHTML = i18n.gettext('Create')
    btnNewSet.addEventListener('click', (event) => {debugEmptyMap()})
    btnFlymSD.addEventListener('click',(event) => {serialGpsRead('FlymasterSD','read')}) 
    btnFlymOld.addEventListener('click',(event) => {serialGpsRead('FlymasterOld','read')})
    btnFlytec15.addEventListener('click',(event) => {serialGpsRead('Flytec15','read')})
    btnFlytec20.addEventListener('click',(event) => {serialGpsRead('Flytec20','read')})
    btnRever.addEventListener('click',(event) => {contactUsbGps('reverlog','downl')})
    btnConnect.addEventListener('click',(event) => {contactUsbGps('connect','downl')})
    btnElement.addEventListener('click',(event) => {contactUsbGps('element','downl')})
    btnSkytrax2.addEventListener('click',(event) => {contactUsbGps('sky2','downl')})
    btnSkytrax3.addEventListener('click',(event) => {contactUsbGps('sky3','downl')})
    btnCPilot.addEventListener('click',(event) => {contactUsbGps('cpilot','downl')})
    btnOudie.addEventListener('click',(event) => {contactUsbGps('oudie','downl')})
    document.getElementById('lb-prefix').innerHTML = i18n.gettext('Turnpoint prefix')
    txPrefix.value = 'WAYPOINT'
    btnNewWayp.innerHTML = i18n.gettext('New')
    btnNewWayp.addEventListener('click', (event) => {addNewWaypoint()})
    $(function(){
      $('#table_id').contextMenu({
          selector: 'tr', 
          callback: function(key, options) {
              let rowIndex = table.row( this ).index()  
              switch (key) {             
                case "Modify":                   
                  updateWaypoint(rowIndex)    
                  break
                case "Delete" : 
                  deleteWaypoint(rowIndex)
                  break           
              }
          },
          items: {          
              "Modify": {name: i18n.gettext("Modify")},
              "Delete": {name: i18n.gettext("Delete")},
          }
      })
  })

  selectSavingFormat = document.createElement("select")
  selectSavingFormat.id = "selsaveformat"
  selectSavingFormat.style.marginLeft = "150px" 
  let introOption = document.createElement("option")
  introOption.value = 'msg'
  introOption.innerHTML = i18n.gettext('Save as')
  selectSavingFormat.appendChild(introOption)
  let oziOption = document.createElement("option")
  oziOption.value ='ozi'
  oziOption.innerHTML = i18n.gettext('Save in Ozi format')
  selectSavingFormat.appendChild(oziOption)
  let cupOption = document.createElement("option")
  cupOption.value ='cup'
  cupOption.innerHTML = i18n.gettext('Save in Cup format')
  selectSavingFormat.appendChild(cupOption)
  let compOption = document.createElement("option")
  compOption.value ='com'
  compOption.innerHTML = i18n.gettext('Save in CompeGPS format')
  selectSavingFormat.appendChild(compOption)
  let gpxOption = document.createElement("option")
  gpxOption.value ='gpx'
  gpxOption.innerHTML = i18n.gettext('Save in GPX format')
  selectSavingFormat.appendChild(gpxOption)
  let kmlOption = document.createElement("option")
  kmlOption.value ='kml'
  kmlOption.innerHTML = i18n.gettext('Save in KML format')
  selectSavingFormat.appendChild(kmlOption)

  selectSavingFormat.addEventListener('change',(event) => {savingRequest()})

  selectSendToGps = document.createElement("select")
  selectSendToGps.id = "selsendgps"
  selectSendToGps.style.marginLeft = "100px" 
  let gpsIntroOption = document.createElement("option")
  gpsIntroOption.value = 'msg'
  gpsIntroOption.innerHTML = i18n.gettext('Send to')
  selectSendToGps.appendChild(gpsIntroOption)
  let flymSDOption = document.createElement("option")
  flymSDOption.value = 'FlymasterSD'
  flymSDOption.innerHTML = i18n.gettext('Send to Flymaster SD')
  selectSendToGps.appendChild(flymSDOption)
  let flymOldOption = document.createElement("option")
  flymOldOption.value = 'FlymasterOld'
  flymOldOption.innerHTML = i18n.gettext('Send to Flymaster Old')
  selectSendToGps.appendChild(flymOldOption)
  let fly20Option = document.createElement("option")
  fly20Option.value = 'Flytec20'
  fly20Option.innerHTML = i18n.gettext('Send to Flytec 6020/30')
  selectSendToGps.appendChild(fly20Option)
  let fly15Option = document.createElement("option")
  fly15Option.value = 'Flytec15'
  fly15Option.innerHTML = i18n.gettext('Send to Flytec 6015')
  selectSendToGps.appendChild(fly15Option)
  let reverOption = document.createElement("option")
  reverOption.value = 'reverlog'
  reverOption.innerHTML = i18n.gettext('Send to Reversale')
  selectSendToGps.appendChild(reverOption)
  let connectOption = document.createElement("option")
  connectOption.value = 'connect'
  connectOption.innerHTML = i18n.gettext('Send to Connect')
  selectSendToGps.appendChild(connectOption)
  let elemOption = document.createElement("option")
  elemOption.value = 'element'
  elemOption.innerHTML = i18n.gettext('Send to Element')
  selectSendToGps.appendChild(elemOption)
  let sky2Option = document.createElement("option")
  sky2Option.value = 'sky2'
  sky2Option.innerHTML = i18n.gettext('Send to Skytraax 2')
  selectSendToGps.appendChild(sky2Option)
  let sky3Option = document.createElement("option")
  sky3Option.value = 'sky3'
  sky3Option.innerHTML = i18n.gettext('Send to Skytraax 3/4')
  selectSendToGps.appendChild(sky3Option)
  let cpilOption = document.createElement("option")
  cpilOption.value = 'cpilot'
  cpilOption.innerHTML = i18n.gettext('Send to Cpilot')
  selectSendToGps.appendChild(cpilOption)
  let oudOption = document.createElement("option")
  oudOption.value = 'oudie'
  oudOption.innerHTML = i18n.gettext('Send to Oudie')
  selectSendToGps.appendChild(oudOption)
  selectSendToGps.addEventListener('change',(event) => {savingGpsRequest()})

  let contentStatus = '<p style="text-align:left;">'
  contentStatus += '   <span class="badge badge-dark">'+i18n.gettext('WAYPOINTS')+'</span><span style="float:right;">'
  contentStatus += i18n.gettext('Display a file content')+', '
  contentStatus += i18n.gettext('Import from a GPS')+', '
  contentStatus += i18n.gettext('Create a new set')+'</span></p></div>'
  displayStatus(contentStatus)
//  callDebugFile()
}

function callDebugFile() {
 // let debugPath = '/Users/gil/Documents/Logfly/Balises/Bpo2017_SeeYou.cup'
  let debugPath = '/Users/gil/Documents/Logfly/Balises/us-open-test.cup'
  //let debugPath = '/Users/gil/Documents/Logfly/Balises/Dolomity-CompeGPS.wpt'
  //let debugPath = '/Users/gil/Documents/Logfly/Balises/mgt2024.gpx'
  //let debugPath = '/Users/gil/Documents/Logfly/Balises/us-open-paragliding-2023.kml'
  displayWpDisk(debugPath)
}

function callDisk() {
  const selectedFile = ipcRenderer.sendSync('open-file',store.get('pathWork'))
  if(selectedFile.fullPath != null) {
    displayWpDisk(selectedFile.fullPath)
  }
}

function debugEmptyMap() {
    displayEmptyMap()
}

function contactUsbGps(typeGPS, action) {
  let gpsStatus
  switch (typeGPS) {
    case 'reverlog':
      gpsStatus = '<strong>Reversale '+i18n.gettext('waypoints folder')+' [WPTS]: </strong>'
      break;  
    case 'connect':
      gpsStatus = '<strong>GPS Connect '+i18n.gettext('waypoints folder')+' [waypoints] : </strong>'   
      break;  
    case 'element' :
      gpsStatus = '<strong>GPS Element '+i18n.gettext('waypoints folder')+' [waypoints]: </strong>'     
      break;                     
    case 'sky2' :
      gpsStatus = '<strong>GPS Skytraax 2 '+i18n.gettext('waypoints folder')+' [waypoints]: </strong>'
      break;
    case 'sky3' :
      gpsStatus = '<strong>GPS Skytraax 3/4 '+i18n.gettext('waypoints folder')+' [waypoints]: </strong>'
      break;     
    case 'cpilot' : 
      gpsStatus = '<strong>GPS C-Pilot '+i18n.gettext('waypoints folder')+' [waypoints]: </strong>'
      break; 
    case 'oudie':
      gpsStatus = '<strong>GPS Oudie '+i18n.gettext('waypoints folder')+'[Waypoints] : </strong>'
      break;   
    case 'skydrop' :
      gpsStatus = '<strong>GPS Skydrop '+i18n.gettext('waypoints folder')+' : </strong>'
      break;
    case 'syrideusb':
      gpsStatus = '<strong>GPS Syride via Usb '+i18n.gettext('waypoints folder')+' : </strong>'
      break;          
  }
  simpleWaiting()
  ipcRenderer.invoke('check-usb-gps',typeGPS).then((resultUsb) => {   
    simpleHideWating() 
    if (resultUsb.pathWayp != null) {    
      switch (action) {
        case 'downl':
          const selectedFile = ipcRenderer.sendSync('open-file',resultUsb.pathWayp)
          if(selectedFile.fullPath != null) {
            displayWpDisk(selectedFile.fullPath) 
          }
          break;
        case 'send' :  
          sendUsbGps(typeGPS,resultUsb)
          break;
      }
    } else {
          // let errorMsg
          simpleHideWating()
          let btnCancel = document.createElement("input")   // must be input not button
          btnCancel.type = "button"
          btnCancel.name = "cancel" 
          btnCancel.style.marginLeft = "50px"  
          btnCancel.value=i18n.gettext("OK")
          btnCancel.className="btn btn-secondary btn-sm"
          btnCancel.onclick = function () {
            displayWpSatus()   
          }
          let msg = '<span class="badge badge-danger even-larger-badge" style="margin-left:300px" >'+gpsStatus+' '+i18n.gettext('Not found')+'</span>'
          displayStatus(msg)
          statusBar.appendChild(btnCancel)   
      }
  })     
}

function sendUsbGps(typeGPS,resultUsb) {
  switch (typeGPS) {
    case 'reverlog':
      if (resultUsb.pathWayp != null && fs.existsSync(resultUsb.pathWayp)) { 
        waypwrite.writeOzi(arrWayp, '@'+resultUsb.pathWayp)
      }
      break     
    case 'connect':
      if (resultUsb.pathWayp != null && fs.existsSync(resultUsb.pathWayp)) { 
        waypwrite.writeCompe(arrWayp, '@'+resultUsb.pathWayp)
      }
      break  
    case 'element':
      if (resultUsb.pathWayp != null && fs.existsSync(resultUsb.pathWayp)) { 
        waypwrite.writeOzi(arrWayp, '@'+resultUsb.pathWayp)
      }
      break          
    case 'sky2':
      if (resultUsb.pathWayp != null && fs.existsSync(resultUsb.pathWayp)) { 
        waypwrite.writeCompe(arrWayp, '@'+resultUsb.pathWayp)
      }
      break     
    case 'sky3':
      if (resultUsb.pathWayp != null && fs.existsSync(resultUsb.pathWayp)) { 
        waypwrite.writeCompe(arrWayp, '@'+resultUsb.pathWayp)
      }
      break     
    case 'cpilot':
      if (resultUsb.pathWayp != null && fs.existsSync(resultUsb.pathWayp)) { 
        waypwrite.writeCompe(arrWayp, '@'+resultUsb.pathWayp)
      }
      break
    case 'oudie':
      if (resultUsb.pathWayp != null && fs.existsSync(resultUsb.pathWayp)) { 
        waypwrite.writeCup(arrWayp, '@'+resultUsb.pathWayp)
      }
      break   
  }
}


/* function callUsbGps(typeGPS) {
  let gpsStatus
  switch (typeGPS) {
    case 'reverlog':
      gpsStatus = '<strong>Reversale '+i18n.gettext('waypoints folder')+' : </strong>'
      break;  
    case 'connect':
      gpsStatus = '<strong>GPS Connect '+i18n.gettext('waypoints folder')+' : </strong>'   
      break;  
    case 'element' :
      gpsStatus = '<strong>GPS Element '+i18n.gettext('waypoints folder')+' : </strong>'     
      break;                     
    case 'sky2' :
      gpsStatus = '<strong>GPS Skytraax 2 '+i18n.gettext('waypoints folder')+' : </strong>'
      break;
    case 'sky3' :
      gpsStatus = '<strong>GPS Skytraax 3/4 '+i18n.gettext('waypoints folder')+' : </strong>'
      break;     
    case 'cpilot' : 
      gpsStatus = '<strong>GPS C-Pilot '+i18n.gettext('waypoints folder')+' : </strong>'
      break; 
    case 'oudie':
      gpsStatus = '<strong>GPS Oudie '+i18n.gettext('waypoints folder')+' : </strong>'
      break;   
    case 'skydrop' :
      gpsStatus = '<strong>GPS Skydrop '+i18n.gettext('waypoints folder')+' : </strong>'
      break;
    case 'syrideusb':
      gpsStatus = '<strong>GPS Syride via Usb '+i18n.gettext('waypoints folder')+' : </strong>'
      break;          
  }
  simpleWaiting()
  ipcRenderer.invoke('check-usb-gps',typeGPS).then((resultUsb) => {   
    if (resultUsb.pathWayp != null) {    
        simpleHideWating()  
        const selectedFile = ipcRenderer.sendSync('open-file',resultUsb.pathWayp)
        if(selectedFile.fullPath != null) {
          displayWpDisk(selectedFile.fullPath) 
        }  
      } else {
          // let errorMsg
          simpleHideWating()
          let btnCancel = document.createElement("input")   // must be input not button
          btnCancel.type = "button"
          btnCancel.name = "cancel" 
          btnCancel.style.marginLeft = "50px"  
          btnCancel.value=i18n.gettext("OK")
          btnCancel.className="btn btn-secondary btn-sm"
          btnCancel.onclick = function () {
            displayWpSatus()   
          }
          let msg = '<span class="badge badge-danger even-larger-badge" style="margin-left:300px" >'+gpsStatus+' '+i18n.gettext('Not found')+'</span>'
          displayStatus(msg)
          statusBar.appendChild(btnCancel)   
      }
  })     
} */

function displayWpDisk(currFilePath) {
  let readWayp = waypread.readFile(currFilePath)
  if (Array.isArray(readWayp)) {
    if (readWayp.length > 0) {
      wpFilePath = currFilePath
      $('#div-map').removeClass('d-none')
      defaultMap()
      arrWayp.length = 0
      arrMarker.length = 0
      for (let i = 0; i < readWayp.length; i++) {
        const wp = readWayp[i]
        let currWayp = {
          new : true,
          typeWayp : '',
          longName : wp.desc,
          shortName : wp.name,
          alti : wp.alt,
          lat : wp.lat,  
          long : wp.long,
          rowNumber : 0,
          arrayIdx : wp.index  // LITIGIEUX à vérifier si c'est index du fichier ou index du tableau
        }
        arrWayp.push(currWayp)
        let contentPop = wp.desc+'<BR>'
        contentPop += i18n.gettext('Altitude')+' : '+wp.alt+' m<BR>'
        contentPop += i18n.gettext('Latitude')+' : '+wp.lat+'<BR>'
        contentPop += i18n.gettext('Longitude')+' : '+wp.long+'<BR>'
        // Code utilisé pour une éventuelle recherche sur la datatable
        //const newWp = L.marker([wp.lat,wp.long],{title: i.toString()}).bindPopup(contentPop).on('click', markerOnClick)
        const newWp = L.marker([wp.lat,wp.long],{title: i.toString()}).bindPopup(contentPop)
        arrMarker[wp.index] = newWp
        mapwp.addLayer(arrMarker[wp.index])
      }
      displayWpSatus()
  
      tableStandard()
      displayAll()
    } else {
      alert(i18n.gettext('No points decoded on'+' '+currFilePath))
    }
  } else {
    alert(i18n.gettext('No points decoded on'+' '+currFilePath))
  }
}


/* Code gardé pour mémoire 
* Les différents essais sont un échec
* L'index du tableau n'est pas corrélé à l'index de ligne dans la table
* car la table est triée alphabétiquement
* le search fonctionne mais rafraichit la table aavec la seule ligne contenant VEYRIER GARE
*/
function markerOnClick(e)
{
  alert("hi. you clicked the marker at " + e.target.options.title)
  //$('#table_id').DataTable().search('VEYRIER GARE').draw();
  let indexes = $('#table_id').DataTable()
  .rows( (idx, data, node) => {
    if (data[2] === 'VEYRIER GARE') {
      return true;
    }
    return false;
  })
  .indexes()
  console.log({indexes})
  // const idxTable = parseInt(e.target.options.title)
  // if (selectedLine > -1) {
  //   $('#table_id').DataTable().rows(selectedLine).deselect();
  // }
  // $('#table_id').DataTable().rows(idxTable).select()
  // //const displayIndex = $('#table_id').DataTable().rows( { order: 'applied', search: 'applied' } ).indexes().indexOf( this.index() ); // where `this` is the `row()` - for example in `rows().every(...)`
  // const pageSize = $('#table_id').DataTable().page.len();
  // $('#table_id').DataTable().page( parseInt( idxTable / pageSize, 10 ) ).draw( false )
  // selectedLine = idxTable
}


function displayEmptyMap() {
  wpFilePath = i18n.gettext('Not saved')+'...'
  $('#div-map').removeClass('d-none')
  arrWayp.length = 0
  arrMarker.length = 0
  defaultMap()
  displayWpSatus()
  tableStandard()
  
}

function serialGpsRead(gpsModel,typeRequest){
  let gpsCom = []
  let msg

  ipcRenderer.invoke('ports-list').then((result) => {
    if (result instanceof Array) { 
      switch (gpsModel) {
        case 'FlymasterSD':
          msg = '[Import Flymaster SD]  '  
          break;      
        case 'FlymasterOld':
          msg = '[Import Flymaster Old]  '  
          break;             
        case 'Flytec20':
          msg = '[Import Flytec/Brau 6020-30 ]  '  
          break;  
        case 'Flytec15':
          msg = '[Import Flytec 6015/Brau IQ]  '  
          break;             
      }      
      log.info(msg+result.length+' ports detected')
      for (let i = 0; i < result.length; i++) {                
        if (typeof result[i].manufacturer != 'undefined') {
          console.log('manufacturer : '+result[i].manufacturer)
          const regexProlif = /prolific/i
          const regexFlym = /flymas/i
          const regexFlymOld = /FTDI/i
          if (result[i].manufacturer.search(regexProlif) >= 0) {
            // Dès Logfly5, on avait un problème avec Flytec
            // deux ports dev/cu.usbserial et dev/cu.usbserial-1440 apparaissent
            // plantage si on utilise cu.usbserial alors que cela fonctionne avec cu.usbserial-1440            
            // FIXME pour debugging  if en dur pour le 6015   
            // on avait donc fait un if
            //  if (result[i].path.includes('-')) {
            // Il semblerait qu'avec serialport un seul port apparaisse
            // usbserial-1440 sur macOS 12.6   usbserial sur macOS.10.11
              gpsReq =  {
                'chip': result[i].manufacturer,
                'model': gpsModel,
                'port': result[i].path
              }          
              gpsCom.push(gpsReq)                            
              log.info(msg+' Prolific manufacturer detected on '+result[i].path)
           // }
          } else if (result[i].manufacturer.search(regexFlym) >= 0) {
            gpsReq =  {
              'chip': result[i].manufacturer,
              'model': gpsModel,
              'port': result[i].path
            }          
            gpsCom.push(gpsReq)
            log.info(msg+' Flymaster manufacturer detected on '+result[i].path)
          } else if (result[i].manufacturer.search(regexFlymOld) >= 0) {
            gpsReq =  {
              'chip': result[i].manufacturer,
              'model': gpsModel,
              'port': result[i].path
            }          
            gpsCom.push(gpsReq)
            log.info(msg+' FTDI manufacturer detected on '+result[i].path+' (Flymaster Old)')            
          }
        }
      }
    } else {
      log.error(ms+' No serial port found')
    }
    if (gpsCom.length > 0) {      
      switch (typeRequest) {
        case 'read':
          callWaypList(gpsCom)  
          break;      
        case 'send' :
          callWaypSend(gpsCom)
        default:
          break;
      }
    } else {
      let btnCancel = document.createElement("input")   // must be input not button
      btnCancel.type = "button"
      btnCancel.name = "cancel" 
      btnCancel.style.marginLeft = "50px"  
      btnCancel.value=i18n.gettext("OK")
      btnCancel.className="btn btn-secondary btn-sm"
      btnCancel.onclick = function () {
        displayWpSatus()   
      }
      let msg = '<span class="badge badge-danger even-larger-badge" style="margin-left:300px" >'+i18n.gettext('No usable serial port detected')+'</span>'
      displayStatus(msg)
      statusBar.appendChild(btnCancel)
    }
  })
}

function callWaypList(gpsCom) {
  clearScreen()
  simpleWaiting()
  const waypList = ipcRenderer.send('wayplist', gpsCom)   // process-main/gps-wayp/gpsdump-read.js
}

function callWaypSend(gpsCom) {
  // Prerequisite: saving a file in Ozi format
  const tempPath = store.get('pathWork')
  if (tempPath != null && fs.existsSync(tempPath)) { 
    const fullTempPath = path.join(tempPath,'wptemp.wpt')
    waypwrite.writeOzi(arrWayp, fullTempPath)
    if (fs.existsSync(fullTempPath)) {    
      simpleWaiting()
      const waypSend = ipcRenderer.send('waypsend', gpsCom,fullTempPath)   // process-main/gps-wayp/gpsdump-read.js
    }
  }
}

ipcRenderer.on('back_waypform', (_, updateWayp) => { 
  if (updateWayp.new) {
    arrWayp.push(updateWayp)
    updateWayp.arrayIdx = arrWayp.length - 1
    addRow(updateWayp)
    displayWpSatus()
  } else {
    const rowIndex = updateWayp.rowNumber
    const arrayIndex = updateWayp.arrayIdx
    table.cell(rowIndex,2).data(updateWayp.longName)
    table.cell(rowIndex,0).data(updateWayp.shortName)
    table.cell(rowIndex,1).data(updateWayp.alti)
    table.cell(rowIndex,3).data(updateWayp.lat)
    table.cell(rowIndex,4).data(updateWayp.long)
    console.log('arrayIdx '+updateWayp.arrayIdx)
    // Original marker is removed
    mapwp.removeLayer(arrMarker[updateWayp.arrayIdx])
    // il faudra le sélectionner comme dans sites si liste longue
  }
  let contentPop = updateWayp.longName+'<BR>'
  contentPop += i18n.gettext('Altitude')+' : '+updateWayp.alti+' m<BR>'
  contentPop += i18n.gettext('Latitude')+' : '+updateWayp.lat+'<BR>'
  contentPop += i18n.gettext('Longitude')+' : '+updateWayp.long+'<BR>'
  const newWp = L.marker([updateWayp.lat,updateWayp.long]).bindPopup(contentPop)
  arrMarker[updateWayp.arrayIdx] = newWp
  mapwp.addLayer(arrMarker[updateWayp.arrayIdx])
  mapwp.setView([updateWayp.lat, updateWayp.long], 12)
})

function defaultMap() {
    if (mapwp != null) {
      mapwp.off()
      mapwp.remove()
    }
    let defLong = store.get('finderlong')
    let defLat = store.get('finderlat')
    mapLat = defLat != undefined && defLat != '' ? defLat : 45.8326  // Mont Blanc
    mapLong = defLong != undefined && defLong != '' ? defLong : 6.865  // Mont Blanc
    mapwp = L.map('mapid').setView([mapLat, mapLong], 12)

    L.control.layers(baseMaps).addTo(mapwp)
    const defaultMap = store.get('map')
    switch (defaultMap) {
      case 'open':
        baseMaps.OpenTopo.addTo(mapwp)  
        break
      case 'ign':
        baseMaps.IGN.addTo(mapwp)  
        break      
      case 'osm':
        baseMaps.OSM.addTo(mapwp) 
        break
      case 'mtk':
        baseMaps.MTK.addTo(mapwp)  
        break  
      case '4u':
        baseMaps.UMaps.addTo(mapwp)
        break     
      case 'out':
        baseMaps.Outdoor.addTo(mapwp)           
        break           
      default:
        baseMaps.OSM.addTo(mapwp)        
        break     
    }
    let bboxButton = L.easyButton( 'fa-plus-square-o', function(control){
      displayAll()
    }, i18n.gettext('Display all waypoints'))
    bboxButton.addTo(mapwp)
}

function tableStandard() {
    $('#div-left').removeClass('d-none')
    if ($.fn.DataTable.isDataTable('#table_id')) {
        $('#table_id').DataTable().clear().destroy()
    }
    const dataTableOption = {
        data: arrWayp, 
        autoWidth : false,
        columns: [           
            { title : i18n.gettext('Short'), data: 'shortName' },
            { title : i18n.gettext('Alt'), data: 'alti' },
            { title : i18n.gettext('Name'), data: 'longName' },
            { title : 'Lat', data: 'lat' },
            { title : 'Long', data: 'long' },  
            { title : 'ArrayIdx', data: 'arrayIdx' },          
        ],
        columnDefs : [
            { "width": "25%", "targets": 0 },
            { "width": "15%", "targets": 1 },
            { "width": "60%", "targets": 2 },
            { "targets": 3, "visible": false, "searchable": false },     
            { "targets": 4, "visible": false, "searchable": false },
            { "targets": 5, "visible": false, "searchable": false } 
        ], 
        bInfo : false,          // hide "Showing 1 to ...  row selected"
        lengthChange : false,   // hide "show x lines"  end user's ability to change the paging display length 
       // searching : false,      // hide search abilities in table
        dom: 'lrtip',
       // ordering: false,        // Sinon la table est triée et écrase le tri sql mais ds ce cas addrow le met à la fin
        pageLength: 12,         // ce sera à calculer avec la hauteur de la fenêtre
        pagingType : 'full',
        language: {             // cf https://datatables.net/examples/advanced_init/language_file.html
            paginate: {
            first: '<<',
            last: '>>',
            next: '>', // or '→'
            previous: '<' // or '←' 
            },
            zeroRecords: " "   // to avoid "No data available in table"
        },     
        select: true,            // Activation du plugin select        
    }
    table = $('#table_id').DataTable(dataTableOption )
    table.on( 'select', function ( e, dt, type, indexes ) {
      if ( type === 'row' ) {   
          centerOnMarker(dt.row(indexes).data().arrayIdx)   
      }        
    })
}

function centerOnMarker(arrayIndex) {
  let latLngs = [ arrMarker[arrayIndex].getLatLng() ]
  let markerBounds = L.latLngBounds(latLngs);
  mapwp.fitBounds(markerBounds)
}

function addRow(newWayp) {
  table.row.add(newWayp).draw(false);
}

function updateWaypoint(rowIndex) { 
  let currWayp = {
    new : false,
    typeWayp : '',
    longName : table.cell(rowIndex,2).data(),
    shortName : table.cell(rowIndex,0).data(),
    alti : table.cell(rowIndex,1).data(),
    lat : table.cell(rowIndex,3).data(),  
    long : table.cell(rowIndex,4).data(),
    arrayIdx : table.cell(rowIndex,5).data(),
    rowNumber : rowIndex
  }
  const callForm = ipcRenderer.send('display-wayp-form', currWayp)   // process-main/modal-win/waypform-display.js  
}

function addNewWaypoint() {
  const centerMap = mapwp.getCenter()  
  const numPoint = arrWayp.length+1
  let prefix = txPrefix.value
  let subPrefix
  if (prefix != null && prefix != '') {
      if (prefix.length > 2)
          subPrefix = prefix.substring(0, 3);
      else
          subPrefix = "WPT";
  } else {
      prefix = "WAYPOINT";
      subPrefix = "WPT";
  }
  let currWayp = {
    new : true,
    typeWayp : '',
    longName : prefix+' '+numPoint.toString().padStart(3, '0'),
    shortName : subPrefix+numPoint.toString().padStart(3, '0'),
    alti : 0,
    lat : centerMap.lat,  
    long : centerMap.lng,
    rowNumber : 0,
    arrayIdx : 0
  }
  const callForm = ipcRenderer.send('display-wayp-form', currWayp)   // process-main/modal-win/waypform-display.js
}

function deleteWaypoint(rowIndex) {
  let selectedIdx = table.cell(rowIndex,5).data()
  for (let i = 0; i < arrMarker.length; i++) {
    mapwp.removeLayer(arrMarker[i])    
  }
  arrWayp.splice(selectedIdx,1)
  arrMarker.splice(selectedIdx,1)
  console.log(arrWayp.length)
  // il faut remettre les index à jour
  for (let i = 0; i < arrWayp.length; i++) {
    arrWayp[i].arrayIdx = i
    arrMarker[i].arrayIdx = i
  }
  // On fait un reset de la table
  tableStandard()
  for (let i = 0; i < arrMarker.length; i++) {
    mapwp.addLayer(arrMarker[i])    
  }
  displayAll()
}

function displayAll() {
  if (arrMarker.length > 0) {
    try {
      let waypPoints = arrWayp.map(point => [point.long,point.lat] )
      let multiPt = turfHelper.multiPoint(waypPoints)
      const waypBbox = turfbbox(multiPt)
      let corner1 = L.latLng(waypBbox[1], waypBbox[0])
      let corner2 = L.latLng(waypBbox[3], waypBbox[2])
      mapwp.fitBounds([corner1, corner2])
    } catch (error) {
      alert('Bad bounding box computing')
    }
  }
}

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

btnMenu.addEventListener('click', (event) => {
    if (btnMenu.innerHTML === "Menu On") {
        btnMenu.innerHTML = "Menu Off";
    } else {
        btnMenu.innerHTML = "Menu On";
    }
    $('#sidebar').toggleClass('active');
})

function savingRequest() {
  let selectedFormat = document.getElementById("selsaveformat").value
  switch (selectedFormat) {
    case 'ozi':
      waypwrite.writeOzi(arrWayp, '')
      break
    case 'cup':
      waypwrite.writeCup(arrWayp, '', '')
      break
    case 'com':
      waypwrite.writeCompe(arrWayp, '', '')
      break      
    case 'gpx':
      waypwrite.writeGpx(arrWayp, '', '')
      break     
    case 'kml':
      waypwrite.writeKml(arrWayp, '', '')
      break             
  }
  document.getElementById("selsaveformat").value = 'msg'
}

function savingGpsRequest() {
  const dialogLang = {
    title: '',
    message: i18n.gettext('GPS ready [Old Waypoints possibly erased]')+'',
    yes : i18n.gettext('Yes'),
    no : i18n.gettext('No')
  }
  ipcRenderer.invoke('yes-no',dialogLang).then((result) => {
    if (result) {
      selectedGPS = document.getElementById("selsendgps").value
      switch (selectedGPS) {
        case 'FlymasterSD':
          serialGpsRead('FlymasterSD','send')
          break
        case 'FlymasterOld':
          serialGpsRead('FlymasterOld','send')
          break
        case 'Flytec20':
          serialGpsRead('Flytec20','send')
          break      
        case 'Flytec15':
          serialGpsRead('Flytec15','send')
          break       
        case 'reverlog':
            contactUsbGps(selectedGPS,'send')
          break     
        case 'connect':
          contactUsbGps(selectedGPS,'send')
          break  
        case 'element':
          contactUsbGps(selectedGPS,'send')
          break          
        case 'sky2':
          contactUsbGps(selectedGPS,'send')
          break     
        case 'sky3':
          contactUsbGps(selectedGPS,'send')
          break     
        case 'cpilot':
          contactUsbGps(selectedGPS,'send')
          break
        case 'oudie':
          contactUsbGps(selectedGPS,'send')
          break                                                                                
      } 
      document.getElementById("selsendgps").value = 'msg'     
    } else {
      document.getElementById("selsendgps").value = 'msg'
    } 
  })
}

function displayWpSatus() {
  let contentStatus = wpFilePath
  let nbWayp = arrWayp.length
  contentStatus += '   <span class="badge badge-info">'+nbWayp+'  '+i18n.gettext('waypoints')+'</span> '
  displayStatus(contentStatus)
  if (nbWayp > 0) {
    statusBar.appendChild(selectSavingFormat)
    statusBar.appendChild(selectSendToGps)
  }
  $('#status').show() 
}

function displayStatus(content) {
  document.getElementById('status').innerHTML = content
  $('#status').show() 
}

function hideStatus() {
  if ($('#status').show().is(":visible")) $('#status').hide()  
}

function simpleWaiting() {
  $('#waiting-spin').removeClass('d-none')   
}

function simpleHideWating() {
  $('#waiting-spin').addClass('d-none')
}

function clearScreen() {
  $('#div-map').addClass('d-none')
  $('#div-left').addClass('d-none')
  displayStatus('<span class="badge badge-danger" style="margin-left:300px" >'+i18n.gettext('Loading in progress')+'</span> ')
}