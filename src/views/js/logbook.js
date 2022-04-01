var {ipcRenderer} = require('electron')
var L = require('leaflet');
var mapPm
var table

var lnkActions = document.getElementById('actions')

var Store = require('electron-store');
var store = new Store();
var db = require('better-sqlite3')(store.get('dbFullPath'))



lnkActions.addEventListener('click', (event) => {
  var selData = table.rows( { selected: true } ).data();
  alert(selData.length);
  console.log(table.rows( { selected: true } ).data()[1].V_Site)
  // from https://datatables.net/forums/discussion/33997/how-do-i-fetch-data-for-column-cells-of-selected-rows
  // with a link to https://datatables.net/extensions/select/integration
  // l'explication finale est dans le deuxième exemple de https://datatables.net/reference/api/rows().data()
  let sites = ''
  for (var i = 0; i < selData.length; i++) {
    sites += table.rows( { selected: true } ).data()[i].V_Site
  }
  console.log(sites)

})

tableStandard()

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
      columns: [
        { title : 'Id', data: 'V_ID' },
        { title : 'Date', data: 'Day' },
        { title : 'Time', data: 'Hour' },
        { title : 'Duration', data: 'V_sDuree' },
        { title : 'Site', data: 'V_Site' },
        { title : 'Glider', data: 'V_Engin' }        
      ],      
      columnDefs : [
        {
            "targets": [ 0 ],           // On cache la première colonne, celle de l'ID
            "visible": false,
            "searchable": false
        },
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
            let igcID = dt.row({selected: true}).data().V_ID
            console.log(igcID) 
            readIgc(igcID)
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
    var track = ipcRenderer.sendSync('read-igc', stringIgc)
    // console.log(JSON.stringify(track.GeoJSON))
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
    iconUrl: './leaflet/images/windsock22.png',
    shadowUrl: './leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [0, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  });

  var startLatlng = L.latLng(track.fixes[0].latitude, track.fixes[0].longitude)
  L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm);

  var EndIcon = new L.Icon({
    iconUrl: './leaflet/images/Arrivee22.png',
    shadowUrl: './leaflet/images/marker-shadow.png',
    iconSize: [18, 18],
    iconAnchor: [4, 18],
    popupAnchor: [1, -34],
    shadowSize: [25, 25]
  });

  var endLatlng = L.latLng(track.fixes[track.fixes.length - 1].latitude, track.fixes[track.fixes.length - 1].longitude)
  L.marker(endLatlng,{icon: EndIcon}).addTo(mapPm);

  var info = L.control({position: 'bottomright'});

  info.onAdd = function (map) {
      this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
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
