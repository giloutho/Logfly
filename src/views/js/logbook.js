const {ipcRenderer} = require('electron')
const L = require('leaflet');
const Mustache = require('mustache')
const i18n = require('../../lang/gettext.js')()

const path = require('path');
const fs = require('fs');
const Store = require('electron-store')
let webOk = require("internet-available");
let store = new Store(); 
let db = require('better-sqlite3')(store.get('dbFullPath'))
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
let inputArea = document.getElementById('inputdata')

let mapPm
let table
let currIdFlight
let currIgcText
let track
const btnFullmap = document.getElementById('fullmap')
let btnScoring = document.getElementById('scoring')
let btnFlyxc = document.getElementById('flyxc')

iniForm()

function iniForm() {
  const currLang = store.get('lang')
  i18n.setMessages('messages', currLang, store.get('langmsg'))
  i18n.setLocale(currLang)
  let menuOptions = menuFill.fillMenuOptions(i18n)
  $.get('../../views/tpl/sidebar.html', function(templates) { 
      const template = $(templates).filter('#temp-menu').html();  
      const rendered = Mustache.render(template, menuOptions)
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
                //const m = "clicked: " + key + " on " + $(this).text();
                const m = table.cell(this, 1).data()
                alert(m); 
                break                
              case "Change": 
                let flightDef = '<strong>['+i18n.gettext('Flight')+' '+table.cell(this, 1).data()+' '+table.cell(this, 2).data()+']</strong>'
                changeGlider(table.cell(this, 0).data(),table.row( this ).index(),flightDef)
                break
              case "Glider" :
                testSelected()
                break
              case "Day" :
                break
              case "Delete" : 
                deleteFlights()
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
  if (track !== undefined)  {
    if (track.fixes.length> 0) {    
      // functionnal code
      displayWait()
      let disp_map = ipcRenderer.send('display-map', track)   // process-main/maps/fullmap-display.js
      // try wit fullmap-compute
      //let disp_map = ipcRenderer.send('compute-map', track)   // process-main/maps/fullmap-compute.js
    } else {
      log.error('Full map not displayed -> track decoding error  '+track.info.parsingError)
      let err_title = i18n.gettext("Program error")
      let err_content = i18n.gettext("Decoding problem in track file")
      ipcRenderer.send('error-dialog',[err_title, err_content])    // process-main/system/messages.js
    } 
  }     
})  

function displayFlyxc() {
  if (track !== undefined && track.fixes.length> 0) {  
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
    const flstmt = db.prepare('SELECT V_ID, strftime(\'%d-%m-%Y\',V_date) AS Day, strftime(\'%H:%M\',V_date) AS Hour, V_sDuree, V_Site, V_Engin, V_Commentaire FROM Vol ORDER BY V_Date DESC').all()    
    const dataTableOption = {
    data: flstmt, 
    autoWidth : false,
    columns: [
        { title : 'Id', data: 'V_ID' },
        { title : i18n.gettext('Date'), data: 'Day' },
        { title : i18n.gettext('Time'), data: 'Hour' },
        { title : 'Duration', data: 'V_sDuree' },
        { title : 'Site', data: 'V_Site' },
        { title : i18n.gettext('Glider'), data: 'V_Engin' },     
        { title : 'Comment', data: 'V_Commentaire' }      
    ],      
    columnDefs : [
        { "targets": 0, "visible": false, "searchable": false },     // On cache la première colonne, celle de l'ID
        { "width": "13%", "targets": 1 },
        { "width": "7%", "targets": 2 },
        { "width": "10%", "targets": 3 },
        { "width": "30%", className: "text-nowrap", "targets": 4 },
        { "width": "30%", "targets": 5 },
        { "targets": 6, "visible": false, "searchable": false },     // On cache la colonne commentaire
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
        currComment = dt.row({selected: true}).data().V_Commentaire
        if (currComment != null && currComment !='') {
          alert(currComment)
        } else {
          $('#inputdata').hide()
        }
        currIdFlight = dt.row({selected: true}).data().V_ID
        currGlider = dt.row({selected: true}).data().V_Engin
            readIgc(currIdFlight, currGlider)
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

function deleteFlights() {
  let rows = table.rows('.selected');
  if(rows.data().length > 0 && db.open) {
    table.rows('.selected').every(function(rowIdx, tableLoop, rowLoop){
      //alert(table.cell(this, 0).data())
      let flightId = table.cell(this, 0).data()
      let smt = 'DELETE FROM Vol WHERE V_ID = ?'            
      const stmt = db.prepare(smt)
      const delFlight = stmt.run(flightId)    
    });
    tableStandard()
  }
  
}

function tableSelection(idFlight) {  
  table.rows().every (function (rowIdx, tableLoop, rowLoop) {
    if (this.data().V_ID === idFlight) {    
      // https://datatables.net/forums/discussion/38802/how-do-i-show-a-row-as-selected-programmatically
      // where `this` is the `row()` - for example in `rows().every(...)`
      const displayIndex = table.rows( { order: 'applied', search: 'applied' } ).indexes().indexOf( this.index() )
      const pageSize = table.page.len()               
      table.page( parseInt( displayIndex / pageSize, 10 ) ).draw( false )        
      this.select ()
      readIgc(idFlight)
      currIdFlight = idFlight
    }
  });  
}

function testSelected() {
    tableSelection(520)
}

/**
 * 
 * @param {*} flightId 
 * @param {*} flightDef 
 * 
 * A combobox will be added dynmamically
 * https://stackoverflow.com/questions/1918923/adding-combo-box-dynamically
 */
function changeGlider(flightId, rowNum, flightDef) {
 if (db.open) {
  let inputContent = flightDef+'&nbsp;&nbsp;&nbsp;&nbsp;'+i18n.gettext('Choose an existant glider')+' : '
  inputArea.innerHTML = inputContent
  // select came from https://github.com/snapappointments/bootstrap-select
  let selectGlider = document.createElement("select");
  // We want the most recent used in first
  const GliderSet = db.prepare(`SELECT V_Engin, strftime('%Y-%m',V_date) FROM Vol GROUP BY upper(V_Engin) ORDER BY strftime('%Y-%m',V_date) DESC`)
  let nbGliders = 0
  for (const gl of GliderSet.iterate()) {
    nbGliders++
    let newOption = document.createElement("option")
    newOption.value= nbGliders.toString()
    newOption.innerHTML= (gl.V_Engin)
    selectGlider.appendChild(newOption);
  } 
  selectGlider.id = "selglider"
  selectGlider.style.marginRight = "25px";
  inputArea.appendChild(selectGlider)
  const newText= document.createTextNode(i18n.gettext('Or new glider')+' : ')
  inputArea.appendChild(newText)
  let newGlider = document.createElement("input");
  newGlider.type = "text"
 // newGlider.className = "form-control col-xs-2"
  newGlider.placeholder= "New glider name"
  newGlider.id = 'newglider'
  newGlider.style.marginRight = "25px"
  //newGlider.style.textTransform = 'uppercase'
  newGlider.onkeyup = function(){this.value=this.value.toUpperCase()}
  inputArea.appendChild(newGlider)
  let btnUpdate = document.createElement("input")   // must be input not button
  btnUpdate.type = "button"
  btnUpdate.name = "update"
  btnUpdate.value=i18n.gettext("Modify")
  btnUpdate.style.marginRight = "20px";  
  btnUpdate.className="btn btn-danger"
  btnUpdate.onclick = function () {
    let selectedName
    let enew = document.getElementById("newglider")
    let newGliderName = document.getElementById("newglider").value
    let elist = document.getElementById("selglider")
    let listGliderName = elist.options[elist.selectedIndex].text
    if (newGliderName != null && newGliderName != '') {
      selectedName = newGliderName
    } else {
      selectedName = listGliderName
    }
    if (db.open) {
      try {
        const stmt = db.prepare('UPDATE Vol SET V_Engin= ? WHERE V_ID = ?')
        const updateGlider = stmt.run(selectedName,flightId)
        console.log(' in db : '+updateGlider.changes) // newFlight.changes must return 1 for one row added   
        table.cell({row:rowNum, column:5}).data(selectedName)
      //  tableSelection(flightId)              
      } catch (error) {
        console.log('Error during flight update '+error)
      //  log.error('Error during flight update '+error)
      }
    }
    $('#inputdata').hide()
  }
  inputArea.appendChild(btnUpdate)
  let btnCancel = document.createElement("input")   // must be input not button
  btnCancel.type = "button"
  btnCancel.name = "cancel"
  btnCancel.value=i18n.gettext("Cancel");
  btnCancel.className="btn btn-secondary"
  btnCancel.onclick = function () {
    $('#inputdata').hide()
  };
  inputArea.appendChild(btnCancel)
 }
 $('#inputdata').show()
}

function manageComment() {
  
}

function readIgc(igcID, dbGlider) {
    hideStatus()
    if (db.open) {
      let req ='SELECT V_IGC, V_LatDeco, V_LongDeco, V_AltDeco, V_Site FROM Vol WHERE V_ID = ?'
      try {
        const stmt = db.prepare(req)
        const selIgc = stmt.get(igcID)
        if (selIgc.V_IGC === undefined || selIgc.V_IGC == "" ) {
          mapWithoutIgc(selIgc.V_LatDeco, selIgc.V_LongDeco, selIgc.V_AltDeco, selIgc.V_Site) 
        } else {
          currIgcText = selIgc.V_IGC
          igcDisplay(currIgcText, dbGlider)
        }
      } catch (err) {
        displayStatus('Database error')        
      }
    }
  }
  
  function igcDisplay(stringIgc, dbGlider) {
    try {
      track = ipcRenderer.sendSync('read-igc', stringIgc)  // process-main/igc/igc-read.js.js
      if (track.fixes.length> 0) {
        // If the glider name has been changed, it no longer corresponds to the name stored in the IGC file
        track.info.gliderType = dbGlider
        buildMap(track)  
      } else {
        displayStatus(track.info.parsingError)
      }        
    } catch (error) {
      displayStatus('Error '+' : '+error)      
    }      
  }

  /**
   * 
   * @param {*} latDeco 
   * @param {*} longDeco 
   * @param {*} altDeco 
   * @param {*} deco 
   * 
   * In Logfly 5 I don't know why I was creating a traceGPS instance with a null IGC file
   * CarnetViewController line 675. Map built in map_markers class
   */
  function mapWithoutIgc(latDeco, longDeco, altDeco, deco){
    if (mapPm != null) {
      mapPm.off();
      mapPm.remove();
    }
    mapPm = L.map('mapid').setView([latDeco,longDeco], 12)
    const osmlayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
    const OpenTopoMap = L.tileLayer('http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        maxZoom: 16,
        attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    });
    let mtklayer = L.tileLayer('http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png');
    let fouryoulayer = L.tileLayer('http://4umaps.eu/{z}/{x}/{y}.png');
    const baseMaps = {
      "OSM": osmlayer,
      "OpenTopo" : OpenTopoMap,
      "MTK" : mtklayer,
      "4UMaps" : fouryoulayer,
    };

    // default layer map
    osmlayer.addTo(mapPm)

    L.control.layers(baseMaps).addTo(mapPm)

    const takeOffPopUp = deco+'<br>'+altDeco+'m'
    let StartIcon = new L.Icon({
      iconUrl: '../../leaflet/images/windsock22.png',
      shadowUrl: '../../leaflet/images/marker-shadow.png',
      iconSize: [22, 22],
      iconAnchor: [0, 22],
      popupAnchor: [1, -34],
      shadowSize: [25, 25]
    });
  
    const startLatlng = L.latLng(latDeco, longDeco)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm).bindPopup(takeOffPopUp).openPopup()
  }
  
  function buildMap(track) {
    if (mapPm != null) {
      mapPm.off();
      mapPm.remove();
    }
    mapPm = L.map('mapid').setView([0, 0], 5);
  
    const tile_layer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            });
    tile_layer.addTo(mapPm); 
    const trackOptions = {
      color: 'red',
      weight: 2,
      opacity: 0.85
    };
    mapPm.removeLayer(L.geoJson);
    const geojsonLayer = L.geoJson(track.GeoJSON,{ style: trackOptions}).addTo(mapPm)
    mapPm.fitBounds(geojsonLayer.getBounds());
    
    const StartIcon = new L.Icon({
      iconUrl: '../../leaflet/images/windsock22.png',
      shadowUrl: '../../leaflet/images/marker-shadow.png',
      iconSize: [18, 18],
      iconAnchor: [0, 18],
      popupAnchor: [1, -34],
      shadowSize: [25, 25]
    });
  
    const startLatlng = L.latLng(track.fixes[0].latitude, track.fixes[0].longitude)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm);
  
    const EndIcon = new L.Icon({
      iconUrl: '../../leaflet/images/Arrivee22.png',
      shadowUrl: '../../leaflet/images/marker-shadow.png',
      iconSize: [18, 18],
      iconAnchor: [4, 18],
      popupAnchor: [1, -34],
      shadowSize: [25, 25]
    });
  
    const endLatlng = L.latLng(track.fixes[track.fixes.length - 1].latitude, track.fixes[track.fixes.length - 1].longitude)
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
  