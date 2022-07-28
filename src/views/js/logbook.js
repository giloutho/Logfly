var {ipcRenderer} = require('electron')
var L = require('leaflet');
var Mustache = require('mustache')
var i18n = require('../../lang/gettext.js')()

const path = require('path');
const fs = require('fs');
const Store = require('electron-store')
let webOk = require("internet-available");
let store = new Store(); 
let db = require('better-sqlite3')(store.get('dbFullPath'))
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')

var mapPm
var table
let currIdFlight
let currIgcText
var track
var btnFullmap = document.getElementById('fullmap')
let btnScoring = document.getElementById('scoring')
let btnFlyxc = document.getElementById('flyxc')

iniForm()

function iniForm() {
  const currLang = store.get('lang')
  i18n.setMessages('messages', currLang, store.get('langmsg'))
  i18n.setLocale(currLang)
  let menuOptions = menuFill.fillMenuOptions(i18n)
  $.get('../../views/tpl/sidebar.html', function(templates) { 
      var template = $(templates).filter('#temp-menu').html();  
      var rendered = Mustache.render(template, menuOptions)
    //  console.log(template)
      document.getElementById('target-sidebar').innerHTML = rendered
  })
  document.getElementById("txt-download").innerHTML = i18n.gettext("Downloading digital elevation data")
  document.getElementById('bt-search').innerHTML = i18n.gettext('Search')
  document.getElementById('fullmap').innerHTML = i18n.gettext('Full screen map')
  document.getElementById('scoring').innerHTML = i18n.gettext('Scoring')
  document.getElementById('dropdownMenuButton').innerHTML = i18n.gettext('Sites')
  document.getElementById('site-rename').innerHTML = i18n.gettext('Rename site')
  document.getElementById('site-form').innerHTML = i18n.gettext('Site form')
  document.getElementById('site-change').innerHTML = i18n.gettext('Change site')

  $(function(){
    $('#table_id').contextMenu({
        selector: 'tr', 
        callback: function(key, options) {
            switch (key) {
              case "Comment" : 
                var m = "clicked: " + key + " on " + $(this).text();
                alert(m); 
                break                
              case "Change": 
                break
              case "Glider" :
                break
              case "Day" :
                break
              case "Delete" : 
                break
              case "Export" : 
                break
            }
        },
        items: {
            "Comment" : {name: i18n.gettext('Comment')},            
            "Change": {name: i18n.gettext("Change glider")},
            "Glider": {name: i18n.gettext("Glider flight time")},
            "Day": {name: i18n.gettext("Photo of the day")},
            "Delete": {name: i18n.gettext("Delete")},
            "Export": {name: i18n.gettext("Export")},
        }
    });
});
  
}

tableStandard()

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

btnScoring.addEventListener('click', (event) => {  
  console.log('clic scoring')
  // $('#div_table').removeClass('d-block')
  // $('#div_table').addClass('d-none')
  // $('#div_waiting').addClass('d-block')
  hideStatus()
})

btnFlyxc.addEventListener('click', (event) => { 
  //ipcRenderer.send("changeWindow", 'flyxc');    
  // webOk({
  //   // Provide maximum execution time for the verification
  //   timeout: 3000,
  //   // If it tries 5 times and it fails, then it will throw no internet
  //   retries: 3
  // }).then(() => {
  //   ipcRenderer.send('error-dialog',['Internet', 'Internet Ok'])  
  // }).catch(() => {
  //   ipcRenderer.send('error-dialog',['Internet', 'Internet non disponible'])  
  // });
  // ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
  //displayStatus('Decoding problem in track file')  
  displayFlyxc()
})


btnFullmap.addEventListener('click', (event) => {  
  displayWait()
  if (track.fixes.length> 0) {    
    // functionnal code
    let disp_map = ipcRenderer.send('display-map', track)   // process-main/maps/fullmap-display.js
    // try wit fullmap-compute
    //let disp_map = ipcRenderer.send('compute-map', track)   // process-main/maps/fullmap-compute.js
  } else {
    log.error('Full map not displayed -> track decoding error  '+track.info.parsingError)
    let err_title = i18n.gettext("Program error")
    let err_content = i18n.gettext("Decoding problem in track file")
    ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
  }      
})  

function displayFlyxc() {
  if (track.fixes.length> 0) {  
    console.log('demande transfert')
    let resUpload = ipcRenderer.sendSync('upload-igc', currIgcText)  // process-main/igc/igc-read.js.js
    if (resUpload == null) {
      displayStatus('Download failed')
    } else {
      console.log('resUpload '+resUpload)
      if (resUpload.includes('OK')) {
        // response is OK:20220711135317_882.igc
        let igcUrl = resUpload.replace( /^\D+/g, ''); // replace all leading non-digits with nothing
        console.log('igcUrl : '+igcUrl)
        store.set('igcVisu',igcUrl)
        callPage('flyxc')
        // displayStatus(igcUrl)
      } else {
        // response is error = ...
        displayStatus(resUpload)
      }
    }
    console.log('Transfert terminé')
  }
}

function tableStandard() {
let start = performance.now();
let msgdbstate  
if ($.fn.DataTable.isDataTable('#table_id')) {
    $('#table_id').DataTable().clear().destroy()
}
if (db.open) {
    const stmt = db.prepare('SELECT COUNT(*) FROM Vol')
    let countFlights = stmt.get()
    // on récupére la valeur avec counFlights['COUNT(*)']
    msgdbstate = (`Connected : ${countFlights['COUNT(*)']} flights`);
    const flstmt = db.prepare('SELECT V_ID, strftime(\'%d-%m-%Y\',V_date) AS Day, strftime(\'%H:%M\',V_date) AS Hour, V_sDuree, V_Site, V_Engin FROM Vol ORDER BY V_Date DESC').all()    
    var dataTableOption = {
    data: flstmt, 
    autoWidth : false,
    columns: [
        { title : 'Id', data: 'V_ID' },
        { title : i18n.gettext('Date'), data: 'Day' },
        { title : i18n.gettext('Time'), data: 'Hour' },
        { title : 'Duration', data: 'V_sDuree' },
        { title : 'Site', data: 'V_Site' },
        { title : i18n.gettext('Glider'), data: 'V_Engin' }        
    ],      
    columnDefs : [
        { "targets": 0, "visible": false, "searchable": false },     // On cache la première colonne, celle de l'ID
        { "width": "13%", "targets": 1 },
        { "width": "7%", "targets": 2 },
        { "width": "10%", "targets": 3 },
        { "width": "30%", className: "text-nowrap", "targets": 4 },
        { "width": "30%", "targets": 5 },
    ],      
    bInfo : false,          // hide "Showing 1 to ...  row selected"
    lengthChange : false,   // hide "show x lines"  end user's ability to change the paging display length 
    searching : false,      // hide search abilities in table
    ordering: false,        // Sinon la table est triée et écrase le tri sql
    pageLength: 12,         // ce sera à calculer avec la hauteur de la fenêtre
    pagingType : 'full',
    language: {             // cf https://datatables.net/examples/advanced_init/language_file.html
        paginate: {
        first: '<<',
        last: '>>',
        next: '>', // or '→'
        previous: '<' // or '←' 
        }
    },     
    select: true             // Activation du plugin select
    }
    table = $('#table_id').DataTable(dataTableOption )
    table.on( 'select', function ( e, dt, type, indexes ) {
        if ( type === 'row' ) {
        //console.log('e : '+e+' dt : '+dt+' type : '+type+' indexes :'+indexes)
        // from https://datatables.net/forums/discussion/comment/122884/#Comment_122884
        currIdFlight = dt.row({selected: true}).data().V_ID
            readIgc(currIdFlight)
        }
    } );
    table.row(':eq(0)').select();    // Sélectionne la première lmigne
    $('#table_id').removeClass('d-none')



} else {
    msgdbstate = 'db connection error'
}


let timeTaken = performance.now()-start;
console.log(`Operation took ${timeTaken} milliseconds`);   
}

function readIgc(igcID) {
    hideStatus()
    if (db.open) {
      let req ='SELECT V_IGC FROM Vol WHERE V_ID = ?'
      try {
        const stmt = db.prepare(req)
        const selIgc = stmt.get(igcID)
        if (selIgc.V_IGC === undefined) {
          displayStatus('Not found') 
        } else {
          currIgcText = selIgc.V_IGC
          igcDisplay(currIgcText)
        }
      } catch (err) {
        displayStatus('Database error')        
      }
    }
  }
  
  function igcDisplay(stringIgc) {
    try {
      track = ipcRenderer.sendSync('read-igc', stringIgc)  // process-main/igc/igc-read.js.js
      console.log('JSON.stringify(track.GeoJSON)')
      console.log(JSON.stringify(track.stat.thermals))
      if (track.fixes.length> 0) {
        console.log('Track points : '+track.fixes.length)
        console.log('Offset UTC : '+track.info.offsetUTC)
        buildMap(track)  
      } else {
        displayStatus(track.info.parsingError)
      }        
    } catch (error) {
      displayStatus('Error '+' : '+error)      
    }      
  }
  
  function buildMap(track) {
      console.log('buildMap')
    if (mapPm != null) {
      mapPm.off();
      mapPm.remove();
    }
    mapPm = L.map('mapid').setView([0, 0], 5);
  
    var tile_layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
    tile_layer.addTo(mapPm); 
    var trackOptions = {
      color: 'red',
      weight: 2,
      opacity: 0.85
    };
    mapPm.removeLayer(L.geoJson);
    var geojsonLayer = L.geoJson(track.GeoJSON,{ style: trackOptions}).addTo(mapPm)
    mapPm.fitBounds(geojsonLayer.getBounds());
    
    var StartIcon = new L.Icon({
      iconUrl: '../../leaflet/images/windsock22.png',
      shadowUrl: '../../leaflet/images/marker-shadow.png',
      iconSize: [18, 18],
      iconAnchor: [0, 18],
      popupAnchor: [1, -34],
      shadowSize: [25, 25]
    });
  
    var startLatlng = L.latLng(track.fixes[0].latitude, track.fixes[0].longitude)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm);
  
    var EndIcon = new L.Icon({
      iconUrl: '../../leaflet/images/Arrivee22.png',
      shadowUrl: '../../leaflet/images/marker-shadow.png',
      iconSize: [18, 18],
      iconAnchor: [4, 18],
      popupAnchor: [1, -34],
      shadowSize: [25, 25]
    });
  
    var endLatlng = L.latLng(track.fixes[track.fixes.length - 1].latitude, track.fixes[track.fixes.length - 1].longitude)
    L.marker(endLatlng,{icon: EndIcon}).addTo(mapPm);
  
    var info = L.control({position: 'bottomright'});
  
    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'map-info'); // create a div with a class "map-info"
        this.update();
        return this._div;
    };
  
    // method that we will use to update the control based on feature properties passed
    info.update = function () {
        this._div.innerHTML = '';
        this._div.innerHTML += 'Voile:'+track.info.gliderType+'<br>';
        this._div.innerHTML += 'Alti Max GPS : '+track.stat.maxalt.gps+'m<br>';
        this._div.innerHTML += 'Vario max :'+track.stat.maxclimb+'m/s<br>';
        this._div.innerHTML += 'Gain max : 0m<br>';
  
    };
  
    info.addTo(mapPm);  
  
  }
  
  function displayWait() {
    $('#div_table').removeClass('d-block')
    $('#div_table').addClass('d-none')
    $('#div_waiting').addClass('d-block')
  }

  // function hideWait() {
  //   $('#div_waiting').removeClass('d-block')
  //   $('#div_waiting').addClass('d-none')
  //   $('#div_table').addClass('d-block')
  // }

  ipcRenderer.on('remove-waiting-gif', (event, result) => {
    console.log('remove-waiting-gif reçu...')
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
    $('#div_table').addClass('d-block')
  })

  function initmapBasic(viewlat,viewlon,viewzoom) {
    var L = require('leaflet');
    mapBasic = L.map('mapid').setView([viewlat,viewlon], viewzoom);
  
    const tile_layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
    tile_layer.addTo(mapBasic); 
    tile_layer.on("load",function() { console.log("Basique -> all visible tiles have been loaded") });
  }

  function displayStatus(content) {
    document.getElementById('status').innerHTML = i18n.gettext(content)
    $('#status').show(); 
  }

  function hideStatus() {
    if ($('#status').show().is(":visible")) $('#status').hide();  
  }
  
  // inutilisée pour l'instant
  function convertSQLDate(sqldate) {
    let a = sqldate.split(" ");
    let d = a[0].split("-");
    let t = a[1].split(":");
  
    return (new Date(d[0],(d[1]-1),d[2],t[0],t[1],t[2]))
  }
  