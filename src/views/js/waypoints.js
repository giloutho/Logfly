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
const btnNewWayp = document.getElementById('new-wayp')
const txPrefix = document.getElementById('tx-prefix')
let currLang
const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
const easyButton = require('leaflet-easybutton')
const turfHelper = require('@turf/helpers')
const turfbbox = require('@turf/bbox').default

let mapwp
let mapLat, mapLong
let arrWayp = []
let arrMarker = []

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
    btnSelect.innerHTML = i18n.gettext('Select a file')
    document.getElementById('lb-prefix').innerHTML = i18n.gettext('Turnpoint prefix')
    txPrefix.value = 'WAYPOINT'
    btnSelect.addEventListener('click', (event) => {callDisk()})
    btnNewWayp.innerHTML = i18n.gettext('New')
    btnNewWayp.addEventListener('click', (event) => {addNewWaypoint()})
    defaultMap()
    tableStandard()
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
      });
  })
}

function callDisk() {
    document.documentElement.requestFullscreen()
}

ipcRenderer.on('back_waypform', (_, updateWayp) => { 
  if (updateWayp.new) {
    arrWayp.push(updateWayp)
    updateWayp.arrayIdx = arrWayp.length - 1
    addRow(updateWayp)
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
  mapwp.fitBounds(markerBounds);
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
     // alert(waypBbox.length)
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