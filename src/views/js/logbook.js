const {ipcRenderer} = require('electron')
const Mustache = require('mustache')
const i18n = require('../../lang/gettext.js')()
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const log = require('electron-log')
const { scoringRules } = require('igc-xc-score')
const sharp = require('sharp')
const moment = require('moment')
const momentDurationFormatSetup = require('moment-duration-format')
const elemMap = require('../../utils/leaflet/littlemap-build.js')
const dbupdate = require('../../utils/db/db-update.js')
let store = new Store()
const typeScoring = scoringRules
let db = require('better-sqlite3')(store.get('dbFullPath'))
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
let inputArea = document.getElementById('inputdata')

const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const baseMaps = tiles.baseMaps
let mapPm

let table
let tableLines

let currIdFlight
let currIgcText
let track
const btnFullmap = document.getElementById('fullmap')
let btnScoring = document.getElementById('scoring')
let btnFlyxc = document.getElementById('flyxc')
let currLang
let noGpsFlight = false
let timeOutFunctionId

iniForm()

function iniForm() {
  // found on https://www.geeksforgeeks.org/how-to-wait-resize-end-event-and-then-perform-an-action-using-javascript/
  window.addEventListener("resize", function() {      
    clearTimeout(timeOutFunctionId)
    timeOutFunctionId = setTimeout(workAfterResizeIsDone, 500)
  })
  if (store.get('logtablelines')) {
    tableLines = store.get('logtablelines')
  } else { 
    tableLines = 14
    store.set('logtablelines',14)
  } 
  const stmt = db.prepare('SELECT COUNT(*) FROM Vol')
  let countFlights = stmt.get()
  if (countFlights['COUNT(*)'] < 1) ipcRenderer.send("changeWindow", 'noflights') 

  try {    
    document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'   
    currLang = store.get('lang')
    if (currLang != undefined && currLang != 'en') {
        currLangFile = currLang+'.json'
        let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile))
        let langjson = JSON.parse(content)
        i18n.setMessages('messages', currLang, langjson)
        i18n.setLocale(currLang)
    }
  } catch (error) {
      log.error('[problem.js] Error while loading the language file')
  }   
  let menuOptions = menuFill.fillMenuOptions(i18n)
  $.get('../../views/tpl/sidebar.html', function(templates) { 
      const template = $(templates).filter('#temp-menu').html()  
      const rendered = Mustache.render(template, menuOptions)
      document.getElementById('target-sidebar').innerHTML = rendered
  })
  document.getElementById("txt-download").innerHTML = i18n.gettext("Downloading digital elevation data")
  document.getElementById('fullmap').innerHTML = i18n.gettext('Full screen map')
  document.getElementById('tx-search').placeholder = i18n.gettext('Search')+'...'
  $('button[data-toggle="dropdown"]').text(i18n.gettext('Scoring'))   
  Object.keys(typeScoring).forEach(function(key, index) {
    $('#mnu-scoring').append(`<a class="dropdown-item" href="#">${key}</a>`)
  })
  $( "#mnu-scoring a" ).on( "click", function() {
    const selLeague =  $( this ).text()
    $('button[data-toggle="dropdown"]').text(selLeague)    
    runXcScore(selLeague)
  })

  $(function(){
    $('#table_id').contextMenu({
        selector: 'tr', 
        callback: function(key, options) {            
            switch (key) {
              case "Comment" : 
                const comment = table.cell(this, 6).data()
                if (comment == null || comment == '') {
                  let flDate = table.cell(this, 1).data()
                  let flTime = table.cell(this, 2).data()
                  let rowIndex = table.row( this ).index()           
                  updateComment(currIdFlight, '',flDate, flTime,rowIndex)                    
                }
                break                
              case "Change": 
                // const flightDef = '<strong>['+i18n.gettext('Flight')+' '+table.cell(this, 1).data()+' '+table.cell(this, 2).data()+']</strong>'
                // changeGlider(table.cell(this, 7).data(),table.row( this ).index(),flightDef)
                changeGliderNew()
                break
              case "Site": 
                // const siteLabel = '<strong>['+i18n.gettext('Flight')+' '+table.cell(this, 1).data()+' '+table.cell(this, 2).data()+' '+table.cell(this, 4).data()+']</strong>'
                const siteLabel = '<strong>['+table.cell(this, 4).data()+']</strong>'
                changeSite(table.cell(this, 7).data(),table.row( this ).index(),siteLabel,table.cell(this, 4).data())
                break              
              case "Glider" :
                let flGlider = table.cell(this, 5).data()
                gliderHours(flGlider )
                break
              case "Mutlicount" :
                multiCount()
                break                
              case "Day" :
                let flPhoto = table.cell(this, 0).data()
                let rowIndex = table.row( this ).index()  
                photoManager(currIdFlight, rowIndex,flPhoto)
                break
              case "Delete" : 
                deleteFlights()
                break
              case "Igc" : 
                exportIgc()
                break
              case "Gpx" : 
                exportGpx()
                break                
              case "Merge" : 
                break   
              case "Dupli" : 
                if (noGpsFlight) {
                  updateFlight()
                } else {
                  alert(i18n.gettext('This flight is not modifiable'))
                }              
                break   
            }
        },
        items: {
            "Comment" : {name: i18n.gettext('Comment')},            
            "Change": {name: i18n.gettext("Change glider")},
            "Site": {name: i18n.gettext("Site")},
            "Glider": {name: i18n.gettext("Glider flight time")},
            "Mutlicount": {name: i18n.gettext("Totals for the selection")},
            "Day": {name: i18n.gettext("Photo of the day")},
            "Delete": {name: i18n.gettext("Delete")},
            "Igc": {name: i18n.gettext("IGC export")},
            "Gpx": {name: i18n.gettext("GPX export")},
            "Merge": {name: i18n.gettext("Merge flights")},
            "Dupli": {name: i18n.gettext("Edit/Duplicate")}
        }
    })
  })
}

function workAfterResizeIsDone() {
  let tableHeight = Math.round(window.innerHeight *0.85)    // the table occupies about 85% of the window height
  let logLines = Math.round(tableHeight / 38) - 2   // one line occupies about 38 pixels
  tableLines = logLines
  let siteLines = Math.round(tableHeight / 42) - 2  
  store.set('screenWidth',window.innerWidth)
  store.set('screenHeight',window.innerHeight)
  store.set('logtablelines',logLines)
  store.set('sitetablelines',siteLines)
  let msg = i18n.gettext('New screen size saved\n')
  msg += window.innerWidth+'x'+window.innerHeight+'  Table : '+logLines
  msg += '\n\n'+i18n.gettext('If the screen is blank, restart')
  //alert('tableHeight '+tableHeight+' logLines '+logLines+' tableLines '+tableLines)
  alert(msg)
  $('#tx-search').val('')
  tableStandard()  
}

ipcRenderer.on('back_flightform', (_, updateFlight) => { 
  table.cell({row:updateFlight.row, column:1}).data(updateFlight.date)
  table.cell({row:updateFlight.row, column:2}).data(updateFlight.time)  
  table.cell({row:updateFlight.row, column:3}).data(updateFlight.strduree)
  table.cell({row:updateFlight.row, column:4}).data(updateFlight.nom)
  table.cell({row:updateFlight.row, column:5}).data(updateFlight.glider)
  table.cell({row:updateFlight.row, column:6}).data(updateFlight.comment)
  tableSelection(updateFlight.id)
})

ipcRenderer.on('xc-score-result', (_, result) => {
  track.xcscore = result    
  $('#waiting-spin').addClass('d-none')
  $('button[data-toggle="dropdown"]').text(i18n.gettext('Scoring'))   
  displayFullMap()   
})

tableStandard()


$(document).ready(function () {
  let selectedFixedMenu =  store.get('menufixed') 
  if (selectedFixedMenu === 'yes') {
    $("#sidebar").removeClass('active')
    $('#toggleMenu').addClass('d-none')
    document.getElementById("menucheck").checked = true;
  }
})

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName)    // main.js
}

function changeMenuState(cbmenu) {
  if (cbmenu.checked) {
    $("#sidebar").removeClass('active')
    $('#toggleMenu').addClass('d-none')
    store.set('menufixed','yes') 
  } else {
    $("#sidebar").addClass('active')
    $('#toggleMenu').removeClass('d-none')
    store.set('menufixed','no') 
  }
}

btnMenu.addEventListener('click', (event) => {
  console.log('toggle')
  if (btnMenu.innerHTML === "Menu On") {
      btnMenu.innerHTML = "Menu Off"
  } else {
      btnMenu.innerHTML = "Menu On"
  }
  $('#sidebar').toggleClass('active')
})

btnFlyxc.addEventListener('click', (event) => { 
  if (noGpsFlight) {
    alert(i18n.gettext('No track to display'))
  } else {
    displayFlyxc()
  }
})


btnFullmap.addEventListener('click', (event) => {  
  displayFullMap()  
})  

function displayFullMap() {
  if (!noGpsFlight && track !== undefined)  {
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
  }  else {
    alert(i18n.gettext('No track to display'))
  }   
}

function runXcScore(selScoring) { 
  if(!noGpsFlight) {
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
  } else {
    alert(i18n.gettext('No track to display'))
  }
}

function displayFlyxc() {
  if (track !== undefined && track.fixes.length> 0) {  
    let resUpload = ipcRenderer.sendSync('upload-igc', currIgcText)  // process-main/igc/igc-read.js.js
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

function afficheFlyxc() {
  let debugUrl = 'logfly6.igc'
  let disp_flyxc = ipcRenderer.send('display-flyxc', debugUrl)   // process-main/maps/flyxc-display.js
}


function tableStandard() {
  let msgdbstate  
  if ($.fn.DataTable.isDataTable('#table_id')) {
      $('#table_id').DataTable().clear().destroy()
  }
  try {    
    if (db.open) {
        const stmt = db.prepare('SELECT COUNT(*) FROM Vol')
        let countFlights = stmt.get()
        // on récupére la valeur avec counFlights['COUNT(*)']
        msgdbstate = (`Connected : ${countFlights['COUNT(*)']} flights`)
        //const flstmt = db.prepare('SELECT V_ID, strftime(\'%d-%m-%Y\',V_date) AS Day, strftime(\'%H:%M\',V_date) AS Hour, V_sDuree, V_Site, V_Engin, V_Commentaire, V_Photos FROM Vol ORDER BY V_Date DESC').all()    
        let reqSQL = 'SELECT V_ID, strftime(\'%d-%m-%Y\',V_date) AS Day, strftime(\'%H:%M\',V_date) AS Hour, V_sDuree, V_Site, V_Engin, V_Commentaire, V_Duree,'
        reqSQL += 'CASE WHEN (V_Photos IS NOT NULL AND V_Photos !=\'\') THEN \'Yes\' END Photo '  
        reqSQL += 'FROM Vol ORDER BY V_Date DESC'
        const flstmt = db.prepare(reqSQL).all()    
        const dataTableOption = {
          data: flstmt, 
          autoWidth : false,
          columns: [
              {
                title : '',
                data: 'Photo',
                render: function(data, type, row) {
                  if (data == 'Yes') {
                    return '<img src="../../assets/img/Camera.png" alt=""></img>'
                  } 
                  return data
                },          
                className: "dt-body-center text-center"
              },       
              { title : i18n.gettext('Date'), data: 'Day' },
              { title : i18n.gettext('Time'), data: 'Hour' },
              { title : 'Duration', data: 'V_sDuree' },
              { title : 'Site', data: 'V_Site' },
              { title : i18n.gettext('Glider'), data: 'V_Engin' },     
              { title : 'Comment', data: 'V_Commentaire' },  
              { title : 'Id', data: 'V_ID' },
              { title : 'Seconds', data: 'V_Duree' }  
          ],      
          columnDefs : [
              { "width": "3%", "targets": 0, "bSortable": false },
              // { "width": "14%", "targets": 1, "orderData": [ [ 1, 'asc' ], [ 2, 'desc' ] ] },
              // { "width": "6%", "targets": 2, "orderData": [[ 1, 'asc' ],[ 2, 'desc' ] ] },
              // { "width": "14%", "targets": 1, "orderData": [ 1, 2 ] },
              // { "width": "6%", "targets": 2, "orderData": 1 },
              // { "width": "14%", "targets": 1, "bSortable": false},
              // { "width": "6%", "targets": 2, "bSortable": false },
              { "width": "14%", "targets": 1 },
              { "width": "6%", "targets": 2 },
              { "width": "10%", "targets": 3 },
              { "width": "30%", className: "text-nowrap", "targets": 4 },
              { "width": "26%", "targets": 5 },
              { "targets": 6, "visible": false, "searchable": false },     // On cache la colonne commentaire
              { "targets": 7, "visible": false, "searchable": false },     // On cache la première colonne, celle de l'ID
              { "targets": 8, "visible": false, "searchable": false },     // On cache la colonne de la durée en secondes
          ],      
          bInfo : false,          // hide "Showing 1 to ...  row selected"
          lengthChange : false,   // hide "show x lines"  end user's ability to change the paging display length 
          //searching : false,      // hide search abilities in table
          ordering: false,        // Sinon la table est triée et écrase le tri sql
          pageLength: tableLines,         // ce sera à calculer avec la hauteur de la fenêtre
          pagingType : 'full',
          dom: 'lrtip',
          language: {             // cf https://datatables.net/examples/advanced_init/language_file.html
              paginate: {
              first: '<<',
              last: '>>',
              next: '>', // or '→'
              previous: '<' // or '←' 
              }
          },     
          select: true,            // Activation du plugin select
          // Line coloring if there is a comment. 
          // Finally, I don't really like
          'createdRow': function( row, data, dataIndex ) {
            if( data['V_Commentaire'] != null && data['V_Commentaire'] !=''){
              $(row).addClass('tableredline')
            }
          },
          }
      table = $('#table_id').DataTable(dataTableOption )
      //  table = new dtbs(dataTableOption)
        $('#tx-search').on( 'keyup', function () {
          table.search( this.value ).draw()
          table.row(':eq(0)', { page: 'current' }).select()
          sumRowFiltered()
        })
        table.on( 'select', function ( e, dt, type, indexes ) {
            if ( type === 'row' ) {
              //console.log('e : '+e+' dt : '+dt+' type : '+type+' indexes :'+indexes)
              // from https://datatables.net/forums/discussion/comment/122884/#Comment_122884
              currIdFlight = dt.row(indexes).data().V_ID
              let currComment = dt.row(indexes).data().V_Commentaire
              if (currComment != null && currComment !='') {
                currIdFlight = dt.row(indexes).data().V_ID
                flDate = dt.row(indexes).data().Day
                flTime = dt.row(indexes).data().Hour         
                manageComment(currIdFlight,currComment, flDate, flTime,indexes)
              } else {
                $('#inputcomment').hide()
              }
              $('#inputdata').hide()
              currIdFlight = dt.row(indexes).data().V_ID
              currGlider = dt.row(indexes).data().V_Engin
              readIgc(currIdFlight, currGlider)
              let isPhoto = dt.row(indexes).data().Photo
              if (isPhoto === 'Yes') {
                if (store.get('photo') === 'yes') {              
                  photoDecoding(currIdFlight, indexes)
                }
              }
            }        
        } )
        table.row(':eq(0)').select()    // Sélectionne la première lmigne
        $('#table_id').removeClass('d-none')
    } else {
        msgdbstate = 'db connection error'
    }
  } catch (error) {
    alert(error)
  }    
}    // End of tableStandard

// To select the first row at each page change
$('#table_id').on( 'page.dt', function () {
  //var info = table.page.info()
  //alert( 'Showing page: '+info.page+' of '+info.pages )
  table.row(':eq(0)', { page: 'current' }).select()
})

// Click on the first column dedicated to the management of the photo of the day
$('#table_id').on('click', 'tbody td:first-child', function () {  
  let data = table.row( $(this).parents('tr') ).data()
  let rowIndex = $(this).parents('tr').index()
  if (data['Photo']=== 'Yes') photoDecoding(data['V_ID'], rowIndex)
})



function photoDecoding(flightId, rowIndex) {
  if (db.open) {
    const stmt = db.prepare('SELECT V_Photos FROM Vol WHERE V_ID = ?')
    const dbImage = stmt.get(flightId)
    const strImage = dbImage.V_Photos

    let src = 'data:image/png;base64,'+strImage
    // We want to get image width and height from the base64 string
    let i = new Image() 
    i.onload = function(){
      let winWidth = i.width
      let winHeight = i.height+30
      // Using a string variable eg  winSize = '"width:'+winWidth+'px;height: '+winHeight+'px;"' does not work
      // templte litteral is working https://stackoverflow.com/questions/52112894/pass-a-variable-into-setattribute-method
      document.getElementById('modalwin').setAttribute("style",`width:${winWidth}px;height: ${winHeight}px;`)
    }                                                         
    i.src = src 
    // https://stackoverflow.com/questions/49536873/display-image-on-single-bootstrap-modal
    $(".modal-img").prop("src",src)
    $('#Modal').modal('show')
  }
}


function photoManager(flightId, rowNum, flPhoto) {
  let displayInput = document.getElementById('inputdata')
  displayInput.innerHTML = '<strong>'+i18n.gettext("Photo of the day")+'</strong>'
  if (flPhoto === 'Yes') {
    let btnDelete = document.createElement("input")   // must be input not button
    btnDelete.type = "button"
    btnDelete.name = "delete"
    btnDelete.style.marginLeft = "20px"  
    btnDelete.value=i18n.gettext("Delete")
    btnDelete.className="btn btn-danger btn-sm"
    btnDelete.onclick = function () {      
      if (db.open) {
        try {
          let emptyPhoto = null
          const stmt = db.prepare('UPDATE Vol SET V_Photos = ? WHERE V_ID = ?')
          const updatePhoto = stmt.run(emptyPhoto,flightId)    
          table.cell({row:rowNum, column:0}).data('')
          $('#inputdata').hide()             
        } catch (error) {
          log.error('Error during flight update '+error)
          displayStatus('Error during flight update')
        }
      }
    }
    displayInput.appendChild(btnDelete)
  } else {
    let btnAdd = document.createElement("input")   // must be input not button
    btnAdd.type = "button"
    btnAdd.name = "add"
    btnAdd.value=i18n.gettext("Add")
    btnAdd.style.marginLeft = "20px"  
    btnAdd.className="btn btn-success btn-sm"
    btnAdd.onclick = function () {
      photoUpload(flightId, rowNum)
    }
    displayInput.appendChild(btnAdd)
  }    
  let btnCancel = document.createElement("input")   // must be input not button
  btnCancel.type = "button"
  btnCancel.name = "cancel" 
  btnCancel.style.marginLeft = "10px"  
  btnCancel.value=i18n.gettext("Cancel")
  btnCancel.className="btn btn-secondary btn-sm"
  btnCancel.onclick = function () {
    $('#inputdata').hide()    
  }
  inputArea.appendChild(btnCancel)  
  $('#inputdata').show()   
}

function photoUpload(flightId, rowNum) {  
  const imgPath = ipcRenderer.sendSync('choose-img',store.get('pathWork'))
  if (imgPath !== undefined && imgPath != null) {
        let wantedWidth = 960
        let wantedHeight = 600
        // https://github.com/lovell/sharp/issues/1395
        // the same Using a variable does not work 
        // we try template litteral with success !!
        let imgDay = sharp(`${imgPath}`)
        imgDay.metadata()
          .then(function (metadata) {
            // By default the picture is horizontal
            // it's necessarary to check the metadata orientation 
            // orientation >=5 it's vertical
            if (metadata.orientation !== undefined && metadata.orientation != null && metadata.orientation >=5 )
            {
              wantedWidth = 500
              wantedHeight = 720
            }
            imgDay.rotate()  // calling before resize will auto-orient the image based on the EXIF data.
            .resize(wantedWidth, wantedHeight, {    // 75% of the original browserwindow size
                fit: sharp.fit.inside,
                withoutEnlargement: true
              })
            .toFormat('jpeg')
            .toBuffer()
            .then(function(outputBuffer) {
              let rawSrc = outputBuffer.toString('base64')
              if (db.open) {
                try {
                  const stmt = db.prepare('UPDATE Vol SET V_Photos= ? WHERE V_ID = ?')
                  const updloadImg = stmt.run(rawSrc,flightId)          
                  //table.cell({row:rowNum, column:0}).data('<img src="../../assets/img/camera.png" alt=""></img>')
                  table.cell({row:rowNum, column:0}).data('Yes')                  
                  $('#inputdata').hide()             
                } catch (error) {
                  log.error('Error during flight update '+error)
                  displayStatus('Error during flight update')
                }
                let src = 'data:image/png;base64,'+rawSrc
                let i = new Image() 
                  i.onload = function(){
                    let winWidth = i.width
                    let winHeight = i.height+30
                    document.getElementById('modalwin').setAttribute("style",`width:${winWidth}px;height: ${winHeight}px;`)
                }
                i.src = src 
                // https://stackoverflow.com/questions/49536873/display-image-on-single-bootstrap-modal
                $(".modal-img").prop("src",src)
                $('#Modal').modal('show')            
              }          
            })
            .catch(function(err){
              log.error('Got Error during sharp process')
              displayStatus('Got Error during sharp process')
            })            
          })
          .catch(function(err){
            log.error('Got Error during sharp process')
            displayStatus('Got Error during sharp process')
          })                      
  }
}

function deleteFlights() {
  const dialogLang = {
    title: i18n.gettext('Please confirm'),
    message: i18n.gettext('Are you sure you want to continue')+' ?',
    yes : i18n.gettext('Yes'),
    no : i18n.gettext('No')
  }
  ipcRenderer.invoke('yes-no',dialogLang).then((result) => {
    if (result) {
      let rows = table.rows('.selected')
      if(rows.data().length > 0 && db.open) {
        table.rows('.selected').every(function(rowIdx, tableLoop, rowLoop){
          let flightId = table.cell(this, 7).data()
          let smt = 'DELETE FROM Vol WHERE V_ID = ?'            
          const stmt = db.prepare(smt)
          const delFlight = stmt.run(flightId)    
        })
        tableStandard()
      }
    }
  })
}

function multiCount() {
  let msgResult = '<strong>'+i18n.gettext("Totals for the selection")+'  '+'</strong>'
  let rows = table.rows('.selected')
  if(rows.data().length > 0 && db.open) {
    let totSeconds = 0
    let nbFlights = 0
    table.rows('.selected').every(function(rowIdx, tableLoop, rowLoop){
      let flightId = table.cell(this, 7).data()
      let req ='SELECT V_Duree FROM Vol WHERE V_ID = ?'
      try {
        const stmt = db.prepare(req)
        const result = stmt.get(flightId)
        if (result.V_Duree != null && result.V_Duree > 0) {
          totSeconds += result.V_Duree
          nbFlights++
          console.log(totSeconds+' '+nbFlights)
        }
      } catch (err) {
        displayStatus('Database error')        
      } 
    })
    if (totSeconds > 0) {      
      const nbHours = Math.floor(totSeconds/3600)
      const nbMin = Math.floor((totSeconds - (nbHours*3600))/60)
      const minutes = String(nbMin).padStart(2, '0')
      msgResult += '<span class="badge badge-primary even-larger-badge" style="margin-left:30px" >'+i18n.gettext('Flights')+' : '+nbFlights+'</span>'
      msgResult += '<span class="badge badge-warning even-larger-badge" style="margin-left:30px" >'+i18n.gettext('Flight hours')+' : '+nbHours+'h'+minutes+'mn'+'</span>'      
    } else {
      msgResult = i18n.gettext('No flights counted for this glider')      
    }
    let displayResult = document.getElementById('inputcomment')
    displayResult.innerHTML = msgResult      
    $('#inputcomment').show() 
  }
}

function updateFlight() {
  let rows = table.rows('.selected')
  if(rows.data().length > 0 && db.open) {
    table.rows('.selected').every(function(rowIdx, tableLoop, rowLoop){
      let flightId = table.cell(this, 7).data()      
      const stmt = db.prepare('SELECT * FROM Vol WHERE V_ID = ?')
      const selFlight = stmt.get(flightId)     
      let duration = moment.duration(selFlight.V_Duree, 'seconds')
      let flightData = {
        type : 'edit',
        row : rowIdx,
        id : flightId,
        date : moment(selFlight.V_Date, 'YYYY-MM-DD hh:mm:ss').format('YYYY-MM-DD'),
        time : moment(selFlight.V_Date, 'YYYY-MM-DD hh:mm:ss').format('HH:mm'),
        sqlDate : selFlight.V_Date,
        duree : moment.utc(duration._milliseconds).format('HH:mm'),
        strduree : selFlight.V_sDuree,
        lat : selFlight.V_LatDeco,
        lon : selFlight.V_LongDeco,
        alti : selFlight.V_AltDeco,
        nom : selFlight.V_Site,
        pays : selFlight.V_Pays,
        glider : selFlight.V_Engin,
        comment : selFlight.V_Commentaire
      }
      console.log(flightData.nom)
      const callList = ipcRenderer.send('display-flight-form', flightData)   // process-main/modal-win/flight-form.js
    })
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
  })  
}

function testSelected() {
    tableSelection(520)
}

function gliderHours(flGlider) {
  if (db.open) {
    let displayResult = document.getElementById('inputcomment')
    try {
      let msgResult = '<strong>'+i18n.gettext("Glider flight time")+' '+flGlider+'</strong>'
      const stmt = db.prepare('SELECT Sum(V_Duree) AS seconds, Count(V_ID) as flights FROM Vol WHERE V_Engin = ?')
      const result = stmt.get(flGlider)
      if (result.seconds != null && result.seconds > 0) {         
        const nbHours = Math.floor(result.seconds/3600)
        const nbMin = Math.floor((result.seconds - (nbHours*3600))/60)
        const minutes = String(nbMin).padStart(2, '0')
        msgResult += '<span class="badge badge-primary even-larger-badge" style="margin-left:30px" >'+i18n.gettext('Flights')+' : '+result.flights+'</span>'
        msgResult += '<span class="badge badge-warning even-larger-badge" style="margin-left:30px" >'+i18n.gettext('Flight hours')+' : '+nbHours+'h'+minutes+'mn'+'</span>'
       
      } else {
        msgResult = i18n.gettext('No flights counted for this glider')
      }
      displayResult.innerHTML = msgResult
      $('#inputcomment').show() 
    } catch (error) {
      log.error('[gliderHours] '+error)
    }
  }
}

function sumRowFiltered() {
  $('#lb-search').removeClass('d-none')
  let sumSecs = 0
  let nbFiltered = 0
  table.rows({filter: 'applied'}).every( function ( rowIdx, tableLoop, rowLoop ) {
    let data = this.data()
    nbFiltered++
    sumSecs += data.V_Duree
  })
  const duration = moment.duration(sumSecs,'seconds').format("h [h] m [mn]")
  const result = i18n.gettext('Flights')+' : '+nbFiltered+' - '+i18n.gettext('Duration')+' : '+duration
  document.getElementById('res-search').innerHTML = result
  $('#lb-search').removeClass('d-none')
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
  let inputContent = flightDef+'&nbsp&nbsp&nbsp&nbsp'+i18n.gettext('Choose an existant glider')+' : '
  inputArea.style.marginTop = "8px" 
  inputArea.innerHTML = inputContent
  // select came from https://github.com/snapappointments/bootstrap-select
  let selectGlider = document.createElement("select")
  // We want the most recent used in first
  const GliderSet = db.prepare(`SELECT V_Engin, strftime('%Y-%m',V_date) FROM Vol GROUP BY upper(V_Engin) ORDER BY strftime('%Y-%m',V_date) DESC`)
  let nbGliders = 0
  for (const gl of GliderSet.iterate()) {
    nbGliders++
    let newOption = document.createElement("option")
    newOption.value= nbGliders.toString()
    newOption.innerHTML= (gl.V_Engin)
    selectGlider.appendChild(newOption)
  } 
  selectGlider.id = "selglider"
  selectGlider.style.marginRight = "25px"
  inputArea.appendChild(selectGlider)
  const newText= document.createTextNode(i18n.gettext('Or new glider')+' : ')
  inputArea.appendChild(newText)
  let newGlider = document.createElement("input")
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
  btnUpdate.style.marginRight = "20px"  
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
        table.cell({row:rowNum, column:5}).data(selectedName)
      //  tableSelection(flightId)              
      } catch (error) {
        log.error('Error during flight update '+error)
        displayStatus('Error during flight update')
      }
    }
    $('#inputdata').hide()
  }
  inputArea.appendChild(btnUpdate)
  let btnCancel = document.createElement("input")   // must be input not button
  btnCancel.type = "button"
  btnCancel.name = "cancel"
  btnCancel.value=i18n.gettext("Cancel")
  btnCancel.className="btn btn-secondary"
  btnCancel.onclick = function () {
    $('#inputdata').hide()
  }
  inputArea.appendChild(btnCancel)
 }
 $('#inputdata').show()
}

function changeGliderNew() {
  // const flightDef = '<strong>['+i18n.gettext('Flight')+' '+table.cell(this, 1).data()+' '+table.cell(this, 2).data()+']</strong>'
  // changeGlider(table.cell(this, 7).data(),table.row( this ).index(),flightDef)
  let flightDef
  let rows = table.rows('.selected')
  if(rows.data().length > 0 && db.open) {
    flightDef = '<strong>['+rows.data().length+' '+i18n.gettext('flights selected')+']</strong>'      
    let inputContent = flightDef+'&nbsp&nbsp&nbsp&nbsp'+i18n.gettext('Choose an existant glider')+' : '
    inputArea.style.marginTop = "8px" 
    inputArea.innerHTML = inputContent
    // select came from https://github.com/snapappointments/bootstrap-select
    let selectGlider = document.createElement("select")
    // We want the most recent used in first
    const GliderSet = db.prepare(`SELECT V_Engin, strftime('%Y-%m',V_date) FROM Vol GROUP BY upper(V_Engin) ORDER BY strftime('%Y-%m',V_date) DESC`)
    let nbGliders = 0
    for (const gl of GliderSet.iterate()) {
      nbGliders++
      let newOption = document.createElement("option")
      newOption.value= nbGliders.toString()
      newOption.innerHTML= (gl.V_Engin)
      selectGlider.appendChild(newOption)
    } 
    selectGlider.id = "selglider"
    selectGlider.style.marginRight = "25px"
    inputArea.appendChild(selectGlider)
    const newText= document.createTextNode(i18n.gettext('Or new glider')+' : ')
    inputArea.appendChild(newText)
    let newGlider = document.createElement("input")
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
    btnUpdate.style.marginRight = "20px"  
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
      table.rows('.selected').every(function(rowIdx, tableLoop, rowLoop){
        try {
          let flightId = table.cell(this, 7).data()
          const stmt = db.prepare('UPDATE Vol SET V_Engin= ? WHERE V_ID = ?')
          const updateGlider = stmt.run(selectedName,flightId)
          table.cell({row:rowIdx, column:5}).data(selectedName)
        } catch (error) {
          log.error('Error during flight update '+error)
          displayStatus('Error during flight update')
        }
      })
      $('#inputdata').hide()
    }
    inputArea.appendChild(btnUpdate)
    let btnCancel = document.createElement("input")   // must be input not button
    btnCancel.type = "button"
    btnCancel.name = "cancel"
    btnCancel.value=i18n.gettext("Cancel")
    btnCancel.className="btn btn-secondary"
    btnCancel.onclick = function () {
      $('#inputdata').hide()
    }
    inputArea.appendChild(btnCancel)
    $('#inputdata').show()
  }
}

function changeSite(flightId, rowNum, siteLabel, siteName) {
  if (db.open) {  
    table.search(siteName).draw()
    document.getElementById('tx-search').value = siteName
    let inputContent = siteLabel+'   '+i18n.gettext('Change the name')
    inputArea.style.marginTop = "8px"
    inputArea.innerHTML = inputContent

    // Create rename box
    let inputRename = document.createElement("input")
    inputRename.style.marginLeft = "10px"
    inputRename.style.marginRight = "25px"
    inputRename.style.width = "200px"
    inputRename.style.textTransform = 'uppercase'
    inputRename.setAttribute("id", "inp-rename")
    inputArea.appendChild(inputRename)
    let btnModify = document.createElement("input")   // must be input not button
    btnModify.type = "button"
    btnModify.name = "rename"
    btnModify.value=i18n.gettext("Rename")
    btnModify.style.marginRight = "20px"  
    btnModify.className="btn btn-danger"
    btnModify.onclick = function () {
      let newName = inputRename.value.toUpperCase()
      if (newName != '' && newName != undefined) {
        dbupdate.changeSiteName(siteName,newName)
        applyNewName(siteName,newName)
      } else {
        alert(i18n.gettext('Incomplete input'))
      }
    }
    inputArea.appendChild(btnModify)
   
    // Create Change Site box
    const newText= document.createTextNode(i18n.gettext('Select a new site in the sites file'))
    inputArea.appendChild(newText)
    // Creating a HTML5 datalist on the fly
    // http://www.java2s.com/example/javascript/dom-html-element/create-datalist-element.html
    let inputSites = document.createElement("input")
    inputSites.style.marginLeft = "10px"
    inputSites.style.marginRight = "25px"
    inputSites.style.width = "200px"
    inputSites.setAttribute("list", "sites")
    inputArea.appendChild(inputSites)


    let dlSites = document.createElement("datalist")
    dlSites.setAttribute("id", "sites")
    inputArea.appendChild(dlSites)

    const sitesSet = db.prepare(`SELECT S_ID, S_Nom, S_Localite FROM Site WHERE S_Type = \'D\'`)
    for (const si of sitesSet.iterate()) {        
        let newOption = document.createElement('option') 
        newOption.setAttribute("data-value", si.S_ID) 
        newOption.setAttribute("value", si.S_Nom)       
        dlSites.appendChild(newOption)
    }     

    let btnUpdate = document.createElement("input")   // must be input not button
    btnUpdate.type = "button"
    btnUpdate.name = "update"
    btnUpdate.value=i18n.gettext("Change")
    btnUpdate.style.marginRight = "20px"  
    btnUpdate.className="btn btn-danger"
    btnUpdate.onclick = function () {
      let idSite = $('#sites [value="' + inputSites.value + '"]').data('value')
      if (idSite != undefined && idSite != 0) {
        dbupdate.switchSite(flightId,idSite)
        table.cell({row:rowNum, column:4}).data(inputSites.value)
        $('#inputdata').hide()      
      } else {
        alert(i18n.gettext('No site selected'))
      }
   }
   inputArea.appendChild(btnUpdate)
   let btnCancel = document.createElement("input")   // must be input not button
   btnCancel.type = "button"
   btnCancel.name = "cancel"
   btnCancel.value=i18n.gettext("Cancel")
   btnCancel.className="btn btn-secondary"
   btnCancel.onclick = function () {
     $('#inputdata').hide()
   }
   inputArea.appendChild(btnCancel)
  }
  $('#inputdata').show()
 }

 function applyNewName(oldName, newName) {
    let allData  = table.rows().data()
    for (let i = 0; i < allData.length; i++) {
      if (allData[i].V_Site == oldName) {
        table.cell(i,4).data(newName)   
      }        
    }
    table.search( newName ).draw()
    document.getElementById('tx-search').value = newName
    $('#inputdata').hide()
 }


function updateComment(flightId, currComment,flDate, flTime,rowIndex){
  // A clear of input zone
  inputArea.innerHTML = ''
  inputArea.style.marginTop = "8px"  
  let iDiv = document.createElement('div')
  iDiv.id = 'input-group'
  iDiv.className = 'input-group'
  inputArea.appendChild(iDiv)
  let commentArea = document.createElement("textarea")   // must be input not button
  commentArea.name = "commenttext"
  commentArea.id = 'commenttext'
  commentArea.className="form-control"
  commentArea.rows = "2"
  commentArea.value = currComment
  iDiv.appendChild(commentArea)
  let btDiv = document.createElement('div')
  btDiv.id = 'input-group-append'
  btDiv.className = 'input-group-append'
  iDiv.appendChild(btDiv)
  let btnUpdate = document.createElement("input")   // must be input not button
  btnUpdate.type = "button"
  btnUpdate.name = "update"
  btnUpdate.value=i18n.gettext("OK")
  btnUpdate.style.marginTop = "8px"  
  btnUpdate.style.marginLeft = "20px"  
  btnUpdate.className="btn btn-success btn-sm"
  btnUpdate.onclick = function () {
    let newComment = commentArea.value
    if (db.open) {
      try {
        const stmt = db.prepare('UPDATE Vol SET V_Commentaire= ? WHERE V_ID = ?')
        const updateComment = stmt.run(newComment,flightId)     
        table.cell(rowIndex,6).data(newComment)        
        table.$('tr.selected').addClass('tableredline')
        $('#inputdata').hide()      
        manageComment(flightId, newComment, flDate, flTime, rowIndex)
      } catch (error) {
        log.error('Error during flight update '+error)
        displayStatus('Error during flight update')
      //  log.error('Error during flight update '+error)
      }
    }
  }
  btDiv.appendChild(btnUpdate)
  let btnCancel = document.createElement("input")   // must be input not button
  btnCancel.type = "button"
  btnCancel.name = "cancel"
  btnCancel.style.marginTop = "8px" 
  btnCancel.style.marginLeft = "10px"  
  btnCancel.value=i18n.gettext("Cancel")
  btnCancel.className="btn btn-danger btn-sm"
  btnCancel.onclick = function () {
    let displayComment = document.getElementById('inputcomment')
    displayComment.innerHTML = currComment
    $('#inputdata').hide()
    manageComment(flightId, currComment, flDate, flTime)
  }
  btDiv.appendChild(btnCancel)
  $('#inputdata').show()
  document.getElementById("commenttext").focus()
}

function manageComment(flightId, currComment, flDate, flTime, rowIndex) {
  if (currComment != null && currComment !='') {
    let displayComment = document.getElementById('inputcomment')
    displayComment.innerHTML = ''
    displayComment.style.marginTop = "8px"  
    let iDiv = document.createElement('div')
    iDiv.id = 'input-group'
    iDiv.className = 'input-group'
    displayComment.appendChild(iDiv)    
    let commentArea = document.createElement("textarea")   // must be input not button
    commentArea.name = "commenttext"
    commentArea.id = 'commenttext'
    commentArea.className="form-control"
    commentArea.style.backgroundColor = '#fff1c2'
    commentArea.rows = "2"
    commentArea.value = flDate+' '+flTime+' : '+currComment
    commentArea.disabled = true
    iDiv.appendChild(commentArea)
    let btDiv = document.createElement('div')
    btDiv.id = 'input-group-append'
    btDiv.className = 'input-group-append'
    iDiv.appendChild(btDiv)
    let btnUpdate = document.createElement("input")   // must be input not button
    btnUpdate.type = "button"
    btnUpdate.name = "update"
    btnUpdate.value=i18n.gettext("Modify")
    btnUpdate.style.marginTop = "5px"  
    btnUpdate.style.marginLeft = "10px"  
    btnUpdate.className="btn btn-success btn-sm"
    btnUpdate.onclick = function () {
      $('#inputcomment').hide() 
      updateComment(flightId, currComment,flDate, flTime, rowIndex)
    }
    btDiv.appendChild(btnUpdate)
    let btnDelete = document.createElement("input")   // must be input not button
    btnDelete.type = "button"
    btnDelete.name = "cancel"
    btnDelete.style.marginTop = "5px"  
    btnDelete.style.marginLeft = "10px"  
    btnDelete.value=i18n.gettext("Delete")
    btnDelete.className="btn btn-danger btn-sm"
    btnDelete.onclick = function () {      
      if (db.open) {
        try {
          let newComment = ''
          const stmt = db.prepare('UPDATE Vol SET V_Commentaire= ? WHERE V_ID = ?')
          const updateComment = stmt.run(newComment,flightId)
          table.cell(rowIndex,6).data(newComment)
          table.$('tr.selected').removeClass('tableredline')
          $('#inputdata').hide()     
          $('#inputcomment').hide()           
        } catch (error) {
          log.error('Error during flight update '+error)
          displayStatus('Error during flight update')
        }
      }
    }
    btDiv.appendChild(btnDelete)    
    $('#inputcomment').show() 
  }
}

function exportGpx() {
  const togpx = require('togpx')
  if (track.GeoJSON != undefined) {
    try {
      let gpxText = togpx(track.GeoJSON)
      const exportResult = ipcRenderer.sendSync('save-gpx',gpxText)
      if (exportResult.indexOf('Error') !== -1) {
          alert(exportResult)      
      } else {
          alert(i18n.gettext('Successful operation'))
      }        
    } catch (error) {
      alert(error)
    }
  }
}

function exportIgc() {
  if (currIgcText === undefined || currIgcText == "" ) {
    alert(i18n.gettext('No track to display'))
  } else {
    const exportResult = ipcRenderer.sendSync('save-igc',currIgcText)
    if ( exportResult.indexOf('Error') !== -1) {
      displayStatus(exportResult)      
    } else {
      let msg = i18n.gettext('The track is saved in IGC format with the .igc extension')
      msg += ' -> '+exportResult
      displayStatus(msg)
    }
  }
}

function readIgc(igcID, dbGlider) {
    hideStatus()
    if (db.open) {
      let req ='SELECT V_IGC, V_LatDeco, V_LongDeco, V_AltDeco, V_Site FROM Vol WHERE V_ID = ?'
      try {
        const stmt = db.prepare(req)
        const selIgc = stmt.get(igcID)       
        if (selIgc.V_IGC === undefined || selIgc.V_IGC == "" || selIgc.V_IGC == null) {
          noGpsFlight = true
          mapWithoutIgc(selIgc.V_LatDeco, selIgc.V_LongDeco, selIgc.V_AltDeco, selIgc.V_Site) 
        } else {
          noGpsFlight = false
          currIgcText = selIgc.V_IGC
          // In some cases, the A record may be missing
          // bug introduced in V4 with merged flights
          if (currIgcText.substring(0, 1) === 'A') {
            igcDisplay(currIgcText, dbGlider)
          } else {
            noGpsFlight = true
            mapWithoutIgc(selIgc.V_LatDeco, selIgc.V_LongDeco, selIgc.V_AltDeco, selIgc.V_Site) 
          }
        }
      } catch (err) {
        displayStatus('Database error')        
      }
    }
  }
  
  function igcDisplay(stringIgc, dbGlider) {
    try {
      // in very old version of Logfly, we had a bug on Flytec igc files
      // A DC3 character (XON) begin the igc string and crash igcParser
      if (stringIgc.charAt(0) === "\u0013")  {
        let cleanString = stringIgc.substring(1)
        stringIgc = cleanString
      }
      track = ipcRenderer.sendSync('read-igc', stringIgc)  // process-main/igc/igc-read.js.js
      if (track.fixes.length> 0) {
        // If the glider name has been changed, it no longer corresponds to the name stored in the IGC file
        track.info.gliderType = dbGlider
        mapIgc(track)
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
      mapPm.off()
      mapPm.remove()
    }
    mapPm = L.map('mapid').setView([latDeco,longDeco], 12)
    L.control.layers(baseMaps).addTo(mapPm)
    const defaultMap = store.get('map')
    switch (defaultMap) {
      case 'open':
        baseMaps.OpenTopo.addTo(mapPm)  
        break
      case 'ign':
        baseMaps.IGN.addTo(mapPm)  
        break      
      case 'osm':
        baseMaps.OSM.addTo(mapPm) 
        break
      case 'mtk':
        baseMaps.MTK.addTo(mapPm)  
        break  
      case '4u':
        baseMaps.UMaps.addTo(mapPm)
        break     
      case 'out':
        baseMaps.Outdoor.addTo(mapPm)           
        break           
      default:
        baseMaps.OSM.addTo(mapPm)        
        break           
    }    

    const takeOffPopUp = deco+'<br>'+altDeco+'m'
    let StartIcon = new L.Icon({
      iconUrl: '../../leaflet/images/windsock22.png',
      shadowUrl: '../../leaflet/images/marker-shadow.png',
      iconSize: [22, 22],
      iconAnchor: [0, 22],
      popupAnchor: [1, -34],
      shadowSize: [25, 25]
    })
  
    const startLatlng = L.latLng(latDeco, longDeco)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm).bindPopup(takeOffPopUp).openPopup()
  }
  
  function mapIgc(track) {
    const mapTrack = elemMap.buildElements(track)
    if (mapPm != null) {
      mapPm.off()
      mapPm.remove()
    }
    mapPm = L.map('mapid').setView([0, 0], 5)
    L.control.layers(baseMaps).addTo(mapPm)
    const defaultMap = store.get('map')
    switch (defaultMap) {
      case 'open':
        baseMaps.OpenTopo.addTo(mapPm)  
        break
      case 'ign':
        baseMaps.IGN.addTo(mapPm)  
        break      
      case 'osm':
        baseMaps.OSM.addTo(mapPm) 
        break
      case 'mtk':
        baseMaps.MTK.addTo(mapPm)  
        break  
      case '4u':
        baseMaps.UMaps.addTo(mapPm)
        break     
      case 'out':
        baseMaps.Outdoor.addTo(mapPm)           
        break           
      default:
        baseMaps.OSM.addTo(mapPm)        
        break     
    }

    const geojsonLayer = L.geoJson(mapTrack.trackjson,{ style: mapTrack.trackOptions}).addTo(mapPm)
    mapPm.fitBounds(geojsonLayer.getBounds())

    const StartIcon = new L.Icon(mapTrack.startIcon)
    const startLatlng = L.latLng(mapTrack.startLatlng.lat,mapTrack.startLatlng.long)
    L.marker(startLatlng,{icon: StartIcon}).addTo(mapPm)

    const EndIcon = new L.Icon(mapTrack.endIcon)
    const endLatlng = L.latLng(mapTrack.endLatlng.lat,mapTrack.endLatlng.long)
    L.marker(endLatlng,{icon: EndIcon}).addTo(mapPm)

    const info = L.control({position: 'bottomright'})

    info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'map-info') // create a div with a class "map-info"
        this.update()
        return this._div
    }

    // method that we will use to update the control based on feature properties passed
    info.update = function () {
        this._div.innerHTML = ''
        this._div.innerHTML += mapTrack.flDate+'<br>'
        this._div.innerHTML += mapTrack.infoGlider
        this._div.innerHTML += mapTrack.maxAlti
        this._div.innerHTML += mapTrack.maxVario
    }

    info.addTo(mapPm)  

  }
  
  function displayWait() {
    $('#div_table').removeClass('d-block')
    $('#div_table').addClass('d-none')
    $('#div_waiting').addClass('d-block')
  }

  ipcRenderer.on('remove-waiting-gif', (event, result) => {
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
    $('#div_table').addClass('d-block')
  })

  function displayStatus(content) {
    document.getElementById('status').innerHTML = i18n.gettext(content)
    $('#status').show() 
  }

  function hideStatus() {
    if ($('#status').show().is(":visible")) $('#status').hide()  
  }
  