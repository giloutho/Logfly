const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const db = require('better-sqlite3')(store.get('dbFullPath'))
const dbadd = require('../../utils/db/db-add.js')
const menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
const inputSearch = document.getElementById('tx-search')
const inputArea = document.getElementById('inputdata')
let currLang

const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
let mapPm

let table
let currIdSite

iniForm()

function iniForm() {
    try {    
      document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'   
      currLang = store.get('lang')
      if (currLang != undefined && currLang != 'en') {
          currLangFile = currLang+'.json'
          let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
          let langjson = JSON.parse(content);
          i18n.setMessages('messages', currLang, langjson)
          i18n.setLocale(currLang)
          translateLabels()
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

    document.getElementById("mnu_new").addEventListener('click',(event)=>{
      addNewSite()
    })

    document.getElementById("mnu_down").addEventListener('click',(event)=>{
      if (navigator.onLine) {
        const callList = ipcRenderer.send('display-sites-down', '')   // process-main/modal-win/site-down-list.js
      } else {
        alert(i18n.gettext('No Internet connection'))
      }
    })

    document.getElementById("mnu_import").addEventListener('click',(event)=>{
      importSites()
    })

    document.getElementById("mnu_export").addEventListener('click',(event)=>{
      const msg1 = i18n.gettext('The whole table displayed will be exported')
      const mgs2 = i18n.gettext('Choose a destination and a filename')
      let msg = msg1+'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<button class="btn btn-info" style="margin-bottom: 10px" onclick="exportTable()" id="btn-export">'
      msg += mgs2+'</button>'
      displayStatus(msg)  
    })

    document.getElementById("mnu-dupli").addEventListener('click',(event)=>{
      displayDuplicates()
    })

    inputSearch.placeholder = i18n.gettext('Search')+'...'

    // inputSearch.addEventListener('input', (event) => {
    //   table.search(inputSearch.value).draw();
    // })

    const stmtCount = db.prepare('SELECT COUNT(*) FROM Site')
    const countSites = stmtCount.get()
    if (countSites['COUNT(*)'] < 1)  displayStatus(i18n.gettext('No sites in logbook, you can import French or Swiss sites from Logfly.org'))  
    $(function(){
        $('#table_id').contextMenu({
            selector: 'tr', 
            callback: function(key, options) {
                switch (key) {
                  case "Comment" : 
                    const comment = table.cell(this, 9).data()
                    if (comment == null || comment == '') {
                      let rowIndex = table.row( this ).index()           
                      updateComment(currIdSite, '',rowIndex)                    
                    }
                    break                
                  case "Modify": 
                    let rowIndex = table.row( this ).index()  
                    updateSite(currIdSite,rowIndex)
                    break
                  case "Delete" : 
                    deleteSite()
                    break           
                }
            },
            items: {          
                "Modify": {name: i18n.gettext("Modify")},
                "Delete": {name: i18n.gettext("Delete")},
                "Comment" : {name: i18n.gettext('Comment')}
            }
        });
    })
    // Even if the table is empty it must be initialize
    tableStandard('all')
}

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

ipcRenderer.on('back_siteform', (_, updateSite) => { 
  if (updateSite.newsite) {
    // https://datatables.net/forums/discussion/comment/153095/#Comment_153095
    let newdata = {
      'S_Type' : updateSite.typeSite,
      'S_Nom' : updateSite.nom,
      'S_Localite' : updateSite.localite,
      'S_CP' : updateSite.cp,
      'S_Alti' : updateSite.alti,
      'S_Orientation' : updateSite.orient,
      'S_Type' : updateSite.typeSite,
      'S_Latitude' : updateSite.lat,
      'S_Longitude' : updateSite.long,
      'S_Commentaire' : updateSite.comment,
      'S_ID' : updateSite.id    
    }    
    currIdSite = updateSite.id
    const newRow =  table.row.add(newdata)
    const newRowIndex = newRow.index()     // https://datatables.net/reference/api/row().index()
    const newRowSelect = newRow.select().draw().node();  // cela sélectionne mais ne va pas à la page
    // https://datatables.net/forums/discussion/38802/how-do-i-show-a-row-as-selected-programmatically#Comment_101284
    let displayIndex = table.rows( { order: 'applied', search: 'applied' } ).indexes().indexOf( newRowIndex ); // where `this` is the `row()` - for example in `rows().every(...)`
    const pageSize = table.page.len()
    table.page( parseInt( displayIndex / pageSize, 10 ) ).draw( false )
    displayMap(table.row(newRowIndex).data())
    // OK mais il faudrait déselectionner la première ligne qui est automatiquement selectionnée
    // le problème est que si on envoie
   // table.row(':eq(0)', { page: 'current' }).deselect()
   // cette instruction annule définitvement la sélection de la première ligne au changement de page
   // après recherche on fait l'impasse

   if (updateSite.comment != null && updateSite.comment !='') {
     manageComment(updateSite.id,updateSite.comment, newRowIndex)
   } else {
     $('#inputcomment').hide()
   }  
  } else {
      table.cell(updateSite.rowNumber,0).data(updateSite.typeSite)
      table.cell(updateSite.rowNumber,1).data(updateSite.nom)
      table.cell(updateSite.rowNumber,2).data(updateSite.localite)
      table.cell(updateSite.rowNumber,3).data(updateSite.cp)
      table.cell(updateSite.rowNumber,4).data(updateSite.alti)
      table.cell(updateSite.rowNumber,5).data(updateSite.orient)
      table.cell(updateSite.rowNumber,6).data(updateSite.typeSite)
      table.cell(updateSite.rowNumber,7).data(updateSite.lat)
      table.cell(updateSite.rowNumber,8).data(updateSite.long)
      table.cell(updateSite.rowNumber,9).data(updateSite.comment) 
      displayMap(table.row(updateSite.rowNumber).data())
      if (updateSite.comment != null && updateSite.comment !='') {
        manageComment(updateSite.id,updateSite.comment, updateSite.rowNumber)
      } else {
        $('#inputcomment').hide()
      }  
  }
})

ipcRenderer.on('back_sitedown', (_, downloaded) => { 
  if (downloaded) {
    hideStatus()
    tableStandard('all')
  }
})

btnMenu.addEventListener('click', (event) => {
    if (btnMenu.innerHTML === "Menu On") {
        btnMenu.innerHTML = "Menu Off";
    } else {
        btnMenu.innerHTML = "Menu On";
    }
    $('#sidebar').toggleClass('active');
})

function tableStandard(setData) {
    if ($.fn.DataTable.isDataTable('#table_id')) {
        $('#table_id').DataTable().clear().destroy()
    }
    if (db.open) {
        let sqlReq
        switch (setData) {
          case 'all':
            sqlReq = 'SELECT * FROM Site ORDER BY S_Nom'
            break;
          case 'dup':
            sqlReq = 'SELECT a.* FROM Site a'
            sqlReq += ' JOIN (SELECT *, COUNT(S_ID) FROM Site GROUP BY S_Nom, S_Alti HAVING COUNT(S_Nom) > 1 ) b'
            sqlReq += ' ON a.S_Nom = b.S_Nom'
            sqlReq += ' ORDER BY a.S_Nom'
            break;        
          default:
            sqlReq = 'SELECT * FROM Site ORDER BY S_Nom'
            break;
        }
        const stmSites = db.prepare(sqlReq).all()
        const dataTableOption = {
        data: stmSites, 
        autoWidth : false,
        columns: [
            {
                title : '',
                data: 'S_Type',
                render: function(data, type, row) {
                    let iconType
                    switch (data) {
                        case 'D':
                            iconType = '<img src="../../leaflet/images/windsock22.png" alt=""></img>'
                            break
                        case 'A' :
                            iconType = '<img src="../../leaflet/images/arrivee22.png" alt=""></img>'
                            break                    
                        default:
                            iconType = data
                            break
                    }
                    return iconType
                },          
                className: "dt-body-center text-center"
            },             
            { title : i18n.gettext('Name'), data: 'S_Nom' },
            { title : i18n.gettext('Locality'), className: "text-nowrap", data: 'S_Localite' },
            { title : i18n.gettext('ZIP'), data: 'S_CP' },
            { title : i18n.gettext('Alt'), data: 'S_Alti' },
            { title : i18n.gettext('Orientation'), data: 'S_Orientation' },     
            { title : 'Type', data: 'S_Type' },  
            { title : 'Lat', data: 'S_Latitude' },
            { title : 'Long', data: 'S_Longitude' },
            { title : 'Comment', data: 'S_Commentaire' }, 
            { title : 'id', data: 'S_ID' }
        ],      
        columnDefs : [
            { "width": "3%", "targets": 0 },
            { "width": "28%", "targets": 1 },
            { "width": "29%", "targets": 2 },
            { "width": "8%", "targets": 3 },
            { "width": "8%", "targets": 4 },
            { "width": "24%", "targets": 5 },
            { "targets": 6, "visible": false, "searchable": false },     
            { "targets": 7, "visible": false, "searchable": false },   
            { "targets": 8, "visible": false, "searchable": false },   
            { "targets": 9, "visible": false, "searchable": false },   
            { "targets": 10, "visible": false, "searchable": false },  
        ],      
        bInfo : false,          // hide "Showing 1 to ...  row selected"
        lengthChange : false,   // hide "show x lines"  end user's ability to change the paging display length 
       // searching : false,      // hide search abilities in table
        dom: 'lrtip',
       // ordering: false,        // Sinon la table est triée et écrase le tri sql mais ds ce cas addrow le met à la fin
        order: [[ 1, 'asc' ]],
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
        select: true,            // Activation du plugin select
        }
        table = $('#table_id').DataTable(dataTableOption )
        $('#tx-search').on( 'keyup', function () {
          table.search( this.value ).draw();
        });
        table.on( 'select', function ( e, dt, type, indexes ) {
            if ( type === 'row' ) {
                currIdSite = dt.row(indexes).data().S_ID
                displayMap(dt.row(indexes).data())
                let currComment = dt.row(indexes).data().S_Commentaire
                if (currComment != null && currComment !='') {
                  siteId = dt.row(indexes).data().S_ID
                  manageComment(siteId,currComment, indexes)
                } else {
                  $('#inputcomment').hide()
                }                
            }        
        } );
        if (table.data().count() > 0) {
          $('#table_id').removeClass('d-none')
          $('#mapid').removeClass('d-none')
          table.row(':eq(0)').select();    // Sélectionne la première lmigne
        }
    } else {
        displayStatus(i18n.gettext('Database connection failed'))
    }
}    // End of tableStandard

// To select the first row at each page change
$('#table_id').on( 'page.dt', function () {
    table.row(':eq(0)', { page: 'current' }).select();
});

$('#table_id').on( 'search.dt', function () {
  table.row(':eq(0)', { page: 'current' }).select();
});

function displayMap(selectedSite) {
    if (mapPm != null) {
      console.log('remove')
        mapPm.off();
        mapPm.remove();
      }
      mapPm = L.map('mapid').setView([selectedSite.S_Latitude,selectedSite.S_Longitude], 12)
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
  
      const sitePopUp = selectedSite.S_Nom+'<br>'+i18n.gettext('Altitude')+' : '+ selectedSite.S_Alti+'m'
      let typeIcon = selectedSite.S_Type =='A' ? '../../leaflet/images/Arrivee22.png' : '../../leaflet/images/windsock22.png'
      let siteIcon = new L.Icon({
        iconUrl: typeIcon,
        shadowUrl: '../../leaflet/images/marker-shadow.png',
        iconSize: [22, 22],
        iconAnchor: [0, 22],
        popupAnchor: [1, -34],
        shadowSize: [25, 25]
      });
    
      const startLatlng = L.latLng(selectedSite.S_Latitude,selectedSite.S_Longitude)
      L.marker(startLatlng,{icon: siteIcon}).addTo(mapPm).bindPopup(sitePopUp).openPopup()    
}

function updateComment(siteId, currComment, rowIndex){
    // A clear of input zone
    inputArea.innerHTML = ''
    inputArea.style.marginTop = "8px";  
    let iDiv = document.createElement('div');
    iDiv.id = 'input-group';
    iDiv.className = 'input-group';
    inputArea.appendChild(iDiv)
    let commentArea = document.createElement("textarea")   // must be input not button
    commentArea.name = "commenttext"
    commentArea.id = 'commenttext'
    commentArea.className="form-control"
    commentArea.rows = "2"
    commentArea.value = currComment
    iDiv.appendChild(commentArea)
    let btDiv = document.createElement('div');
    btDiv.id = 'input-group-append'
    btDiv.className = 'input-group-append'
    iDiv.appendChild(btDiv)
    let btnUpdate = document.createElement("input")   // must be input not button
    btnUpdate.type = "button"
    btnUpdate.name = "update"
    btnUpdate.value=i18n.gettext("OK")
    btnUpdate.style.marginTop = "8px";  
    btnUpdate.style.marginLeft = "20px";  
    btnUpdate.className="btn btn-success btn-sm"
    btnUpdate.onclick = function () {
      let newComment = commentArea.value
      if (db.open) {
        try {
          const stmt = db.prepare('UPDATE Site SET S_Commentaire= ? WHERE S_ID = ?')
          const updateComment = stmt.run(newComment,siteId)     
          table.cell(rowIndex,9).data(newComment);        
          $('#inputdata').hide()      
          manageComment(siteId, newComment, rowIndex)
        } catch (error) {
          log.error('Error during site comment update '+error)
          displayStatus(i18n.gettext('Error during site comment update'))
        }
      }
    }
    btDiv.appendChild(btnUpdate)
    let btnCancel = document.createElement("input")   // must be input not button
    btnCancel.type = "button"
    btnCancel.name = "cancel"
    btnCancel.style.marginTop = "8px"; 
    btnCancel.style.marginLeft = "10px";  
    btnCancel.value=i18n.gettext("Cancel");
    btnCancel.className="btn btn-danger btn-sm"
    btnCancel.onclick = function () {
      let displayComment = document.getElementById('inputcomment')
      displayComment.innerHTML = currComment
      $('#inputdata').hide()
      manageComment(siteId, currComment, rowIndex)
    };
    btDiv.appendChild(btnCancel)
    $('#inputdata').show()
    document.getElementById("commenttext").focus();
}

function manageComment(siteId, currComment, rowIndex) {
    if (currComment != null && currComment !='') {
      let displayComment = document.getElementById('inputcomment')
      displayComment.innerHTML = '';
      displayComment.style.marginTop = "8px";  
      let iDiv = document.createElement('div');
      iDiv.id = 'input-group';
      iDiv.className = 'input-group';
      displayComment.appendChild(iDiv)    
      let commentArea = document.createElement("textarea")   // must be input not button
      commentArea.name = "commenttext"
      commentArea.id = 'commenttext'
      commentArea.className="form-control"
      commentArea.style.backgroundColor = '#fff1c2'
      commentArea.rows = "2"
      commentArea.value = currComment
      commentArea.disabled = true
      iDiv.appendChild(commentArea)
      let btDiv = document.createElement('div');
      btDiv.id = 'input-group-append'
      btDiv.className = 'input-group-append'
      iDiv.appendChild(btDiv)
      let btnUpdate = document.createElement("input")   // must be input not button
      btnUpdate.type = "button"
      btnUpdate.name = "update"
      btnUpdate.value=i18n.gettext("Modify")
      btnUpdate.style.marginTop = "5px";  
      btnUpdate.style.marginLeft = "10px";  
      btnUpdate.className="btn btn-success btn-sm"
      btnUpdate.onclick = function () {
        $('#inputcomment').hide(); 
        updateComment(siteId, currComment, rowIndex)
      }
      btDiv.appendChild(btnUpdate)
      let btnDelete = document.createElement("input")   // must be input not button
      btnDelete.type = "button"
      btnDelete.name = "cancel"
      btnDelete.style.marginTop = "5px";  
      btnDelete.style.marginLeft = "10px";  
      btnDelete.value=i18n.gettext("Delete");
      btnDelete.className="btn btn-danger btn-sm"
      btnDelete.onclick = function () {      
        if (db.open) {
          try {
            let newComment = ''
            const stmt = db.prepare('UPDATE Site SET S_Commentaire= ? WHERE S_ID = ?')
            const updateComment = stmt.run(newComment,siteId)
            table.cell(rowIndex,9).data(newComment);
            $('#inputdata').hide()     
            $('#inputcomment').hide()           
          } catch (error) {
            log.error('Error during site comment update '+error)
            displayStatus(i18n.gettext('Error during site comment update'))
          }
        }
      };
      btDiv.appendChild(btnDelete)    
      $('#inputcomment').show(); 
    }
}

function updateSite(currIdSite,rowIndex) {
  if (db.open) {
    const stmt = db.prepare('SELECT * FROM Site WHERE S_ID = ?');
    const dbSite = stmt.get(currIdSite)
    let currSite = {
      id : dbSite.S_ID,
      nom : dbSite.S_Nom,
      localite : dbSite.S_Localite,
      cp : dbSite.S_CP,
      pays : dbSite.S_Pays,
      typeSite : dbSite.S_Type,
      orient : dbSite.S_Orientation,
      alti : dbSite.S_Alti,
      lat : dbSite.S_Latitude,
      long : dbSite.S_Longitude,
      comment : dbSite.S_Commentaire,
      update : dbSite.S_Maj,
      rowNumber : rowIndex,
      newsite : false
    }
    const callForm = ipcRenderer.send('display-site-form', currSite)   // process-main/modal-win/form-display.js
  }
}

function addNewSite() {
  let currSite = {
    id : 0,
    nom : "",
    localite : "",
    cp : "",
    pays : "",
    typeSite : "D",
    orient : "",
    alti : "",
    lat : 0.00000,
    long : 0.00000,
    comment : "",
    update : "",
    rowNumber : 0,
    newsite : true
  }
  const callForm = ipcRenderer.send('display-site-form', currSite)   // process-main/modal-win/form-display.js
}

function deleteSite() {
  let rows = table.rows('.selected');
  if(rows.data().length > 0 && db.open) {
    table.rows('.selected').every(function(rowIdx, tableLoop, rowLoop){
      let siteId = table.cell(this, 10).data()
      let smt = 'DELETE FROM Site WHERE S_ID = ?'            
      const stmt = db.prepare(smt)
      const delSite = stmt.run(siteId)    
      const rowDel = table.row(rowIdx )
      // il ne suffit pas de supprimer la ligne, il faut redessiner !
      rowDel.remove().draw()
    })
  }
}
function exportTable() {
  let arrData = new Array();
  table.rows( {search:'applied'}).every( function ( rowIdx, tableLoop, rowLoop ) {
    let data = this.data();
    let lineData = {
        "Nom": data.S_Nom,
        "Lat": data.S_Latitude,
        "Long": data.S_Longitude,
        "Alt": data.S_Alti,
        "Type": data.S_Type,
        "Orientation": data.S_Orientation,
        "CP": data.S_CP,
        "Ville": data.S_Localite,
        "Pays": data.S_Pays,
        "Commentaire": data.S_Commentaire
      }
      arrData.push(lineData)
    console.log(lineData.Nom+' '+lineData.Ville)
  })
  let jsonData = JSON.stringify(arrData)
  const exportResult = ipcRenderer.sendSync('save-json',jsonData)
  if (exportResult.indexOf('Error') !== -1) {
    displayStatus(exportResult)      
  } else {
    let msg = i18n.gettext('List saved in')
    msg += ' -> '+exportResult
    msg += '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>'
    displayStatus(msg)
  }  
}

function importSites() {
  const selectedFile = ipcRenderer.sendSync('open-file','')
  if(selectedFile.fullPath != null) {
      let content = fs.readFileSync(selectedFile.fullPath, 'utf8')
      const arrSites = JSON.parse(content) 
      if (arrSites.length > 0) {
          let nbInserted = dbadd.importSites(arrSites)
          alert(i18n.gettext('imported sites')+' : '+nbInserted)
          tableStandard('all')
      } else {
          alert(i18n.gettext('File decoding problem'))
      }          
  }
}


function displayDuplicates() {
  const stmtCount = db.prepare('SELECT COUNT(*) FROM Site')
  const countSites = stmtCount.get()
  if (countSites['COUNT(*)'] > 0) tableStandard('dup')
}

function displayStatus(content) {
    document.getElementById('status').innerHTML = content
    $('#status').show(); 
  }

  function hideStatus() {
    if ($('#status').show().is(":visible")) $('#status').hide();  
  }

  function translateLabels() {
    document.getElementById("mnu_new").innerHTML = i18n.gettext('New')
    document.getElementById("mnu-dupli").innerHTML = i18n.gettext('Duplicates')
    document.getElementById("mnu_down").innerHTML = i18n.gettext('Download')
    document.getElementById("mnu_import").innerHTML = i18n.gettext('Import')
    document.getElementById("mnu_export").innerHTML = i18n.gettext('Export')
  }