var {ipcRenderer} = require('electron')
var L = require('leaflet');
var Mustache = require('mustache')
var i18n = require('../../lang/gettext.js')()

const path = require('path');
const fs = require('fs');
const Store = require('electron-store')
let store = new Store(); 
let db = require('better-sqlite3')(store.get('dbFullPath'))
var mapPm
var table
var currIdFlight
var track
var btnFullmap = document.getElementById('fullmap')


$(document).ready(function () {
    $('#sidebarCollapse').on('click', function () {
        console.log('clic sidebar')
        $('#sidebar').toggleClass('active');
    });    
});

tableStandard()

ipcRenderer.on('translation', (event, langJson) => {
    let currLang = store.get('lang')
    i18n.setMessages('messages', currLang, langJson)
    i18n.setLocale(currLang);
    const menuOptions = {
      logbook : i18n.gettext('Logbook'),
      overview : i18n.gettext('Overview'),
      import : i18n.gettext('Import'),
      external : i18n.gettext('External track'),
      stat : i18n.gettext('Statistics'),
      sites : i18n.gettext('Sites'),
      wayp : i18n.gettext('Waypoints'),
      airspaces : i18n.gettext('Airspaces'),
      photos : i18n.gettext('Photos'),
      settings : i18n.gettext('Settings'),
      tools : i18n.gettext('Tools'),     // Original display - Logbook copy - Csv Import - Csv Export - Backup/Restore - Translation
      support : i18n.gettext('Support'),    // Send an email - Log file - System Report - Send logbook - miniTeamViewer ?
    };    
    var rendered = Mustache.render($('#temp-menu').html(), menuOptions)
    document.getElementById('target-menu').innerHTML = rendered;
  })

function callPage(pageName) {
    console.log('clic page')
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

// lnkActions.addEventListener('click', (event) => {
//     if (track.fixes.length> 0) {    
//       let disp_map = ipcRenderer.send('display-map', track)   // process-main/maps/fullmap-display.js
//     } else {
//       log.error('Full map not displayed -> track decoding error  '+track.info.parsingError)
//       let err_title = i18n.gettext("Program error")
//       let err_content = i18n.gettext("Decoding problem in track file")
//       ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
//     }      
//   })

btnFullmap.addEventListener('click', (event) => {
  console.log('clic fullmap')
  if (track.fixes.length> 0) {    
    let disp_map = ipcRenderer.send('display-map', track)   // process-main/maps/fullmap-display.js
  } else {
    log.error('Full map not displayed -> track decoding error  '+track.info.parsingError)
    let err_title = i18n.gettext("Program error")
    let err_content = i18n.gettext("Decoding problem in track file")
    ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
  }      
})  

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
    let msg
    if (db.open) {
      let req ='SELECT V_IGC FROM Vol WHERE V_ID = ?'
      try {
        const stmt = db.prepare(req)
        const selIgc = stmt.get(igcID)
        if (selIgc.V_IGC === undefined)    
          msg = 'Record not found'
        else {
          msg = 'Trace récupérée dans la db'
          console.log(msg)
          igcDisplay(selIgc.V_IGC)
        }
      } catch (err) {
        msg ='Database error'
      }
    }
    console.log(msg)
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
        console.log('Track decoding error'+' : '+track.info.parsingError)
       // barre de status à créer $('#title').text(i18n.__('Track decoding error')+' : '+track.info.parsingError)
      }        
    } catch (error) {
      console.log('Error '+' : '+error)
      // barre de status à créer $('#title').text(i18n.__('Error')+' : '+error)
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
  
  
  function initmapBasic(viewlat,viewlon,viewzoom) {
    var L = require('leaflet');
    mapBasic = L.map('mapid').setView([viewlat,viewlon], viewzoom);
  
    const tile_layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
    tile_layer.addTo(mapBasic); 
    tile_layer.on("load",function() { console.log("Basique -> all visible tiles have been loaded") });
  }
  
  // inutilisée pour l'instant
  function convertSQLDate(sqldate) {
    let a = sqldate.split(" ");
    let d = a[0].split("-");
    let t = a[1].split(":");
  
    return (new Date(d[0],(d[1]-1),d[2],t[0],t[1],t[2]))
  }
  