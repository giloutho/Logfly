var {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log')
const Store = require('electron-store')
const { scoringRules } = require('igc-xc-score')
const elemMap = require('../../utils/leaflet/littlemap-build.js')
const store = new Store()
const typeScoring = scoringRules
const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
let mapPm

let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
const btnFullmap = document.getElementById('fullmap')
let btnFlyxc = document.getElementById('flyxc')

let currLang

let track
let currIgcText

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
        let template = $(templates).filter('#temp-menu').html();  
        let rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    document.getElementById('tx_1').innerHTML = i18n.gettext('There are no flights in the logbook')
    document.getElementById('tx_2').innerHTML = i18n.gettext('Use the import option to fill the logbook')
    document.getElementById('tx_3').innerHTML = i18n.gettext('You can play with this demo track around the Mont Blanc') 
    $('button[data-toggle="dropdown"]').text(i18n.gettext('Scoring'))   
    Object.keys(typeScoring).forEach(function(key, index) {
      $('#mnu-scoring').append(`<a class="dropdown-item" href="#">${key}</a>`)
    })
    $( "#mnu-scoring a" ).on( "click", function() {
      const selLeague =  $( this ).text()
      $('button[data-toggle="dropdown"]').text(selLeague)    
      runXcScore(selLeague)
    })    
    igcDisplay()
}

ipcRenderer.on('xc-score-result', (_, result) => {
  track.xcscore = result    
  $('#waiting-spin').addClass('d-none')
  $('button[data-toggle="dropdown"]').text(i18n.gettext('Scoring'))   
  displayFullMap()   
})

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
  displayFullMap()   
})  

  btnFlyxc.addEventListener('click', (event) => { 
    displayFlyxc()
  })


function igcDisplay() {
    const demoPath = path.join(path.dirname(__dirname), '../../ext_resources','demo.igc')
    currIgcText = fs.readFileSync(demoPath, 'utf8')    
    try {
      track = ipcRenderer.sendSync('read-igc', currIgcText)  // process-main/igc/igc-read.js.js
      if (track.fixes.length> 0) {
        mapIgc(track)
      } else {
        displayStatus(track.info.parsingError)
      }        
    } catch (error) {
      displayStatus('Error '+' : '+error)      
    }      
  }

  function mapIgc(track) {
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
      let resUpload = ipcRenderer.sendSync('upload-igc', currIgcText)  // process-main/igc/igc-read.js.js
      if (resUpload == null) {
        displayStatus('Download failed')
        log.error('[displayFlyxc] Download failed')
      } else {
        if (resUpload.includes('OK')) {
          // response is OK:20220711135317_882.igc
          let igcUrl = resUpload.replace( /^\D+/g, ''); // replace all leading non-digits with nothing
     //     store.set('igcVisu',igcUrl)
          let disp_flyxc = ipcRenderer.send('display-flyxc', igcUrl)   // process-main/maps/flyxc-display.js
        } else {
          log.error('[displayFlyxc] '+resUpload)
          displayStatus(resUpload)
        }
      }
    }
  }

  function displayFullMap() {
    if (track !== undefined)  {
      if (track.fixes.length> 0) {    
        // functionnal code
        displayWait()
        // Code OK
        let disp_map = ipcRenderer.send('display-maplog', track)   // process-main/maps/fullmap-display.js
        // Just for try 29 08 22 try wit fullmap-compute
        //let disp_map = ipcRenderer.send('compute-map', track)   // process-main/maps/fullmap-compute.js
      } else {
        log.error('Full map not displayed -> track decoding error  '+track.info.parsingError)
        let err_title = i18n.gettext("Program error")
        let err_content = i18n.gettext("Decoding problem in track file")
        ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
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

  function displayStatus(content) {
    document.getElementById('status').innerHTML = i18n.gettext(content)
    $('#status').show(); 
  }

  function displayWait() {
    $('#div_text').removeClass('d-block')
    $('#div_text').addClass('d-none')
    $('#div_waiting').addClass('d-block')
  }

  ipcRenderer.on('remove-waiting-gif', (event, result) => {
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
    $('#div_text').addClass('d-block')
  })