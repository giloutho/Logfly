const {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const elemMap = require('../../utils/leaflet/littlemap-build.js')
const store = new Store()
const tiles = require('../../leaflet/tiles.js')
const moment = require('moment')
const momentDurationFormatSetup = require('moment-duration-format')
const { scoringRules } = require('igc-xc-score')
const typeScoring = scoringRules
const L = tiles.leaf
const baseMaps = tiles.baseMaps
let mapPm

let menuFill = require('../../views/tpl/sidebar.js')


let currLang
let track
let currIgcText

const btnSelect = document.getElementById('sel-track')
let btnMenu = document.getElementById('toggleMenu')
const btnFullmap = document.getElementById('fullmap')
let btnFlyxc = document.getElementById('flyxc')

ipcRenderer.on('xc-score-result', (_, result) => {
  track.xcscore = result    
  $('#waiting-spin').addClass('d-none')
  $('button[data-toggle="dropdown"]').text(i18n.gettext('Scoring'))   
  displayFullMap(track)   
})

iniForm()

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
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    document.getElementById('lg-track-name').innerHTML = i18n.gettext('File name')
    document.getElementById('lg-track-path').innerHTML = i18n.gettext('Path')
    document.getElementById('lg-date').innerHTML = i18n.gettext('Date')
    document.getElementById('lg-duration').innerHTML = i18n.gettext('Duration')
    document.getElementById('lg-points').innerHTML = i18n.gettext('Points')
    btnSelect.innerHTML = i18n.gettext('Select a track')
    btnSelect.addEventListener('click', (event) => {callDisk()})
    $('button[data-toggle="dropdown"]').text(i18n.gettext('Scoring'))   
    Object.keys(typeScoring).forEach(function(key, index) {
      $('#mnu-scoring').append(`<a class="dropdown-item" href="#">${key}</a>`)
    })
    $( "#mnu-scoring a" ).on( "click", function() {
      const selLeague =  $( this ).text()
      $('button[data-toggle="dropdown"]').text(selLeague)    
      runXcScore(selLeague)
    })
}

function callDisk() {
  const selectedFile = ipcRenderer.sendSync('open-file','')
  if(selectedFile.fullPath != null) {
    if (selectedFile.fileExt == 'IGC') {
      displayIgc(selectedFile)
    } else if (selectedFile.fileExt == 'GPX') {
      displayGpx(selectedFile)
    } else {
      alert(i18n.gettext('Invalid Track'))
    }
  }  
}

function displayGpx(trackFile) {
  hideStatus()
  const trackPath = trackFile.fullPath
  const gpxString = fs.readFileSync(trackPath, 'utf8') 
  try {
    // gpx-read.js calls first gpx-to-igc
    // if gpx-to-igc returns a valid igc string, gps-read calls IGCDecoder
    // and finally returns a valid track 
    track = ipcRenderer.sendSync('read-gpx', gpxString)  // process-main/gpx/gpx-read.js
    if (track.fixes.length> 0) {
      updateInfos(trackFile)
      mapIgc(track)
    } else {
      displayStatus(track.info.parsingError)
    }        
  } catch (error) {
    displayStatus('Error '+' : '+error)      
  }  
}

function displayIgc(trackFile) {
  hideStatus()
  const trackPath = trackFile.fullPath
  const igcString = fs.readFileSync(trackPath, 'utf8')  
  try {
    track = ipcRenderer.sendSync('read-igc', igcString)  // process-main/igc/igc-read.js.js
    if (track.fixes.length> 0) {
      updateInfos(trackFile)
      mapIgc(track)
    } else {
      displayStatus(track.info.parsingError)
    }        
  } catch (error) {
    displayStatus('Error '+' : '+error)      
  }      
}

function updateInfos(trackFile) {
  document.getElementById('tx-track-name').value = trackFile.fileName
  document.getElementById('tx-track-path').value = trackFile.directoryName
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

btnFullmap.addEventListener('click', (event) => {  
    if (track !== undefined)  {
      if (track.fixes.length> 0) {    
        // functionnal code
        displayWait()
        let disp_map = ipcRenderer.send('display-maplog', track)   // process-main/maps/fullmaplog-disp.js
      } else {
        log.error('Full map not displayed -> track decoding error  '+track.info.parsingError)
        let err_title = i18n.gettext("Program error")
        let err_content = i18n.gettext("Decoding problem in track file")
        ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
      } 
    }     
  })  

  btnFlyxc.addEventListener('click', (event) => { 
    displayFlyxc()
  })

  function mapIgc(track) {
    // update left infos
    document.getElementById('tx-date').value = track.info.date 
    const duration = moment.duration(track.stat.duration,'seconds').format("h[h]m[mn]")
    document.getElementById('tx-duration').value = duration
    document.getElementById('tx-points').value = track.fixes.length
    $('#div-infos').removeClass('d-none')
    $('#div-map').removeClass('d-none')

    // build map
    const mapTrack = elemMap.buildElements(track)
    if (mapPm != null) {
      mapPm.off();
      mapPm.remove();
    }
    mapPm = L.map('mapid').setView([0, 0], 5)
    L.control.layers(baseMaps).addTo(mapPm)
    baseMaps.OSM.addTo(mapPm)   // default is osm

    const geojsonLayer = L.geoJson(mapTrack.trackjson,{ style: mapTrack.trackOptions}).addTo(mapPm)
    mapPm.fitBounds(geojsonLayer.getBounds());

    const StartIcon = new L.Icon(mapTrack.startIcon)
    const startLatlng = L.latLng(mapTrack.startLatlng.lat,mapTrack.startLatlng.long)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm);

    const EndIcon = new L.Icon(mapTrack.endIcon)
    const endLatlng = L.latLng(mapTrack.endLatlng.lat,mapTrack.endLatlng.long)
    L.marker(endLatlng,{icon: EndIcon}).addTo(mapPm);

    const info = L.control({position: 'bottomright'});

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'map-info'); // create a div with a class "map-info"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    info.update = function () {
        this._div.innerHTML = '';
        this._div.innerHTML += mapTrack.flDate+'<br>'
        this._div.innerHTML += mapTrack.infoGlider
        this._div.innerHTML += mapTrack.maxAlti
        this._div.innerHTML += mapTrack.maxVario
    };

    info.addTo(mapPm);  

  }

  function displayFlyxc() {
    if (track !== undefined && track.fixes.length> 0) {  
      let resUpload = ipcRenderer.sendSync('upload-igc', track.igcData)  // process-main/igc/igc-read.js.js
      if (resUpload.includes('OK')) {
        // response is OK:20220711135317_882.igc
        let igcUrl = resUpload.replace( /^\D+/g, '') // replace all leading non-digits with nothing
       //     store.set('igcVisu',igcUrl)
        let disp_flyxc = ipcRenderer.send('display-flyxc', igcUrl)   // process-main/maps/flyxc-display.js
      } else {
        displayStatus('Download failed')
        if (resUpload == null) {
          log.error('[displayFlyxc] Download failed')
        } else {
            log.error('[displayFlyxc] '+resUpload)
        }      
      }
    }
  }

  function runXcScore(selScoring) { 
    $('#waiting-spin').removeClass('d-none')
    try {
      if (track.fixes.length> 0) {
        const argsScoring = {
            igcString : track.igcData,
            league : selScoring
        }
      // si on envoit avec ipcRenderer.sendSync, la div-waiting n'est pas affichée
      ipcRenderer.send('ask-xc-score', argsScoring)   
      } else {
        alert(error)
      }        
    } catch (error) {
      alert(error)      
    }     
  }

function displayFullMap(track) {
    if (track !== undefined)  {
        if (track.fixes.length> 0) {    
          let disp_map = ipcRenderer.send('display-maplog', track)   // process-main/maps/fullmaplog-disp.js
        } else {
          alert('Error  '+track.info.parsingError)
        } 
      }         
}

  function displayStatus(content) {
    document.getElementById('status').innerHTML = i18n.gettext(content)
    $('#status').show(); 
  }

  function hideStatus() {
    if ($('#status').show().is(":visible")) $('#status').hide()  
  }

  function displayWait() {
    $('#div-infos').addClass('d-none')
    $('#div_waiting').addClass('d-block')
  }

  ipcRenderer.on('remove-waiting-gif', (event, result) => {
    $('#div-infos').removeClass('d-none')
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
  })