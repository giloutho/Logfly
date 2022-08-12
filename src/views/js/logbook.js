const {ipcRenderer} = require('electron')
const L = require('leaflet');
const Mustache = require('mustache')
const i18n = require('../../lang/gettext.js')()
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const sharp = require('sharp')
let webOk = require('internet-available')
let store = new Store(); 
let db = require('better-sqlite3')(store.get('dbFullPath'))
let menuFill = require('../../views/tpl/sidebar.js');
const { Alert } = require('bootstrap');
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
                const comment = table.cell(this, 6).data()
                if (comment == null || comment == '') {
                  let flDate = table.cell(this, 1).data()
                  let flTime = table.cell(this, 2).data()
                  let rowIndex = table.row( this ).index()           
                  updateComment(currIdFlight, '',flDate, flTime,rowIndex)                  
                }
                break                
              case "Change": 
                let flightDef = '<strong>['+i18n.gettext('Flight')+' '+table.cell(this, 1).data()+' '+table.cell(this, 2).data()+']</strong>'
                changeGlider(table.cell(this, 7).data(),table.row( this ).index(),flightDef)
                break
              case "Glider" :
                testSelected()
                break
              case "Day" :
                let flPhoto = table.cell(this, 0).data()
                let rowIndex = table.row( this ).index()  
                photoManager(currIdFlight, rowIndex,flPhoto)
                // we keep this debug function
                //uploadPhoto(currIdFlight, rowIndex)
                break
              case "Delete" : 
                deleteFlights()
                break
              case "Export" : 
                break
              case "Merge" : 
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
            "Merge": {name: i18n.gettext("Merge flights")}
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
    //const flstmt = db.prepare('SELECT V_ID, strftime(\'%d-%m-%Y\',V_date) AS Day, strftime(\'%H:%M\',V_date) AS Hour, V_sDuree, V_Site, V_Engin, V_Commentaire, V_Photos FROM Vol ORDER BY V_Date DESC').all()    
    let reqSQL = 'SELECT V_ID, strftime(\'%d-%m-%Y\',V_date) AS Day, strftime(\'%H:%M\',V_date) AS Hour, V_sDuree, V_Site, V_Engin, V_Commentaire,'
    reqSQL += 'CASE WHEN (V_Photos IS NOT NULL AND V_Photos !=\'\') THEN \'Yes\' END Photo '  
    reqSQL += 'FROM Vol ORDER BY V_Date DESC'
    console.log(reqSQL)
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
              return '<img src="../../assets/img/camera.png" alt=""></img>';
            } 
            return data;
          },          
          className: "dt-body-center text-center"
        },       
        { title : i18n.gettext('Date'), data: 'Day' },
        { title : i18n.gettext('Time'), data: 'Hour' },
        { title : 'Duration', data: 'V_sDuree' },
        { title : 'Site', data: 'V_Site' },
        { title : i18n.gettext('Glider'), data: 'V_Engin' },     
        { title : 'Comment', data: 'V_Commentaire' },  
        { title : 'Id', data: 'V_ID' }    
    ],      
    columnDefs : [
        { "width": "3%", "targets": 0 },
        { "width": "12%", "targets": 1 },
        { "width": "6%", "targets": 2 },
        { "width": "8%", "targets": 3 },
        { "width": "30%", className: "text-nowrap", "targets": 4 },
        { "width": "30%", "targets": 5 },
        { "targets": 6, "visible": false, "searchable": false },     // On cache la colonne commentaire
        { "targets": 7, "visible": false, "searchable": false },     // On cache la première colonne, celle de l'ID
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
    select: true,            // Activation du plugin select
    // Line coloring if there is a comment. 
    // Finally, I don't really like
    'createdRow': function( row, data, dataIndex ) {
      if( data['V_Commentaire'] != null && data['V_Commentaire'] !=''){
        $(row).addClass('tableredline');
      }
    },      
    }
    table = $('#table_id').DataTable(dataTableOption )
    table.on( 'select', function ( e, dt, type, indexes ) {
        if ( type === 'row' ) {
          //console.log('e : '+e+' dt : '+dt+' type : '+type+' indexes :'+indexes)
          // from https://datatables.net/forums/discussion/comment/122884/#Comment_122884
          currIdFlight = dt.row({selected: true}).data().V_ID
          let currComment = dt.row({selected: true}).data().V_Commentaire
          if (currComment != null && currComment !='') {
            currIdFlight = dt.row({selected: true}).data().V_ID
            flDate = dt.row({selected: true}).data().Day
            flTime = dt.row({selected: true}).data().Hour         
            manageComment(currIdFlight,currComment, flDate, flTime,indexes)
          } else {
            $('#inputcomment').hide()
          }
          $('#inputdata').hide()
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
}    // End of tableStandard

// Click on the first column dedicated to the management of the photo of the day
$('#table_id').on('click', 'tbody td:first-child', function () {  
  let data = table.row( $(this).parents('tr') ).data();
  let rowIndex = $(this).parents('tr').index()
  if (data['Photo']=== 'Yes') photoDecoding(data['V_ID'], rowIndex)
});

function photoDecoding(flightId, rowIndex) {
  if (db.open) {
    const stmt = db.prepare('SELECT V_Photos FROM Vol WHERE V_ID = ?');
    const dbImage = stmt.get(flightId);
    const strImage = dbImage.V_Photos

    let src = 'data:image/png;base64,'+strImage
    // We want to get image width and height from the base64 string
    let i = new Image(); 
    i.onload = function(){
      let winWidth = i.width
      let winHeight = i.height+30
      // Using a string variable eg  winSize = '"width:'+winWidth+'px;height: '+winHeight+'px;"' does not work
      // templte litteral is working https://stackoverflow.com/questions/52112894/pass-a-variable-into-setattribute-method
      document.getElementById('modalwin').setAttribute("style",`width:${winWidth}px;height: ${winHeight}px;`);
    };                                                         
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
    btnDelete.style.marginLeft = "20px";  
    btnDelete.value=i18n.gettext("Delete");
    btnDelete.className="btn btn-danger btn-sm"
    btnDelete.onclick = function () {      
      if (db.open) {
        try {
          let emptyPhoto = null
          const stmt = db.prepare('UPDATE Vol SET V_Photos = ? WHERE V_ID = ?')
          const updatePhoto = stmt.run(emptyPhoto,flightId)
          console.log(' in db : '+updatePhoto.changes) // newFlight.changes must return 1 for one row added     
          table.cell({row:rowNum, column:0}).data('')
          $('#inputdata').hide()             
        } catch (error) {
          console.log('Error during flight update '+error)
          displayStatus('Error during flight update')
        //  log.error('Error during flight update '+error)
        }
      }
    }
    displayInput.appendChild(btnDelete)
  } else {
    let btnAdd = document.createElement("input")   // must be input not button
    btnAdd.type = "button"
    btnAdd.name = "add"
    btnAdd.value=i18n.gettext("Add")
    btnAdd.style.marginLeft = "20px";  
    btnAdd.className="btn btn-success btn-sm"
    btnAdd.onclick = function () {
      // $('#inputcomment').hide(); 
      // updateComment(flightId, currComment,flDate, flTime, rowIndex)
      photoUpload(flightId, rowNum)
      //uploadPhoto(flightId, rowNum)
    }
    displayInput.appendChild(btnAdd)
  }    
  let btnCancel = document.createElement("input")   // must be input not button
  btnCancel.type = "button"
  btnCancel.name = "cancel" 
  btnCancel.style.marginLeft = "10px";  
  btnCancel.value=i18n.gettext("Cancel");
  btnCancel.className="btn btn-secondary btn-sm"
  btnCancel.onclick = function () {
    $('#inputdata').hide()    
  };
  inputArea.appendChild(btnCancel)  
  $('#inputdata').show();   
}

function photoUpload(flightId, rowNum) {  
  const imgPath = ipcRenderer.sendSync('choose-img',store.get('pathw'))
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
              let src = `data:image/png;base64,${outputBuffer.toString('base64')}`
              document.getElementById('modalwin').setAttribute("style",`width:${wantedWidth}px;height: ${wantedHeight}px;`);                        
              $(".modal-img").prop("src",src)
              $('#Modal').modal('show')
              if (db.open) {
                try {
                  const stmt = db.prepare('UPDATE Vol SET V_Photos= ? WHERE V_ID = ?');
                  const updloadImg = stmt.run(rawSrc,flightId)
                  console.log(' in db : '+updloadImg.changes) // changes must return 1 for one row updated            
                  //table.cell({row:rowNum, column:0}).data('<img src="../../assets/img/camera.png" alt=""></img>')
                  table.cell({row:rowNum, column:0}).data('Yes')                  
                  $('#inputdata').hide()             
                } catch (error) {
                  console.log('Error during flight update '+error)
                  displayStatus('Error during flight update')
                //  log.error('Error during flight update '+error)
                }
              }          
            })
            .catch(function(err){
              console.log("Got Error during sharp process");
            });            
          })                 
  }
}


/**
 * Kept for debugging purposes if needed
 * @param {*} flightId 
 * @param {*} rowNum 
 */
function uploadPhoto(flightId, rowNum) {  
  //let imgPath = './dbtest/Tournette.jpg'
  let imgPath = './dbtest/Verticale.jpeg'
  let wantedWidth = 960
  let wantedHeight = 600  
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
        imgDay.rotate()
        .resize(wantedWidth, wantedHeight, {    // 75% of the original browserwindow size
          fit: sharp.fit.inside,
          withoutEnlargement: true
        })
        .toFormat('jpeg')
        .toBuffer()
        .then(function(outputBuffer) {
          let rawSrc = outputBuffer.toString('base64')
          let src = `data:image/png;base64,${outputBuffer.toString('base64')}`
          document.getElementById('modalwin').setAttribute("style",`width:${wantedWidth}px;height: ${wantedHeight}px;`);          
          $(".modal-img").prop("src",src)
          $('#Modal').modal('show')
          // if (db.open) {
          //   try {
          //     const stmt = db.prepare('UPDATE Vol SET V_Photos= ? WHERE V_ID = ?');
          //     const updloadImg = stmt.run(rawSrc,flightId)
          //     console.log(' in db : '+updloadImg.changes) // changes must return 1 for one row updated            
          //     table.cell({row:rowNum, column:0}).data('<img src="../../assets/img/camera.png" alt=""></img>')
          //     $('#inputdata').hide()             
          //   } catch (error) {
          //     console.log('Error during flight update '+error)
          //     displayStatus('Error during flight update')
          //   //  log.error('Error during flight update '+error)
          //   }
          // }          
        })
        .catch(function(err){
          console.log("Got Error during sharp process");
        });            
      })                     
}
}

function deleteFlights() {
  let rows = table.rows('.selected');
  if(rows.data().length > 0 && db.open) {
    table.rows('.selected').every(function(rowIdx, tableLoop, rowLoop){
      let flightId = table.cell(this, 7).data()
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
        displayStatus('Error during flight update')
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

function updateComment(flightId, currComment,flDate, flTime,rowIndex){
  // A clear of input zone
  inputArea.innerHTML = '';
  let commentArea = document.createElement("textarea")   // must be input not button
  commentArea.name = "commenttext"
  commentArea.id = 'commenttext'
  commentArea.className="form-control"
  commentArea.rows = "2"
  commentArea.value = currComment
  inputArea.appendChild(commentArea)
  let btnUpdate = document.createElement("input")   // must be input not button
  btnUpdate.type = "button"
  btnUpdate.name = "update"
  btnUpdate.value=i18n.gettext("OK")
  btnUpdate.style.marginTop = "10px";  
  btnUpdate.style.marginLeft = "20px";  
  btnUpdate.className="btn btn-success btn-sm"
  btnUpdate.onclick = function () {
    let newComment = commentArea.value
    if (db.open) {
      try {
        const stmt = db.prepare('UPDATE Vol SET V_Commentaire= ? WHERE V_ID = ?')
        const updateComment = stmt.run(newComment,flightId)
        console.log(' in db : '+updateComment.changes) // newFlight.changes must return 1 for one row added          
        table.cell(rowIndex,6).data(newComment);        
        table.$('tr.selected').addClass('tableredline');
        $('#inputdata').hide()      
     //   manageComment(flightId, newComment, flDate, flTime, rowIndex)
      } catch (error) {
        console.log('Error during flight update '+error)
        displayStatus('Error during flight update')
      //  log.error('Error during flight update '+error)
      }
    }

  }
  inputArea.appendChild(btnUpdate)    
  let btnCancel = document.createElement("input")   // must be input not button
  btnCancel.type = "button"
  btnCancel.name = "cancel"
  btnCancel.style.marginTop = "10px";  
  btnCancel.style.marginLeft = "10px";  
  btnCancel.value=i18n.gettext("Cancel");
  btnCancel.className="btn btn-secondary btn-sm"
  btnCancel.onclick = function () {
    let displayComment = document.getElementById('inputcomment')
    displayComment.innerHTML = currComment
    $('#inputdata').hide()
    manageComment(flightId, currComment, flDate, flTime)
  };
  inputArea.appendChild(btnCancel)  
  $('#inputdata').show()
  document.getElementById("commenttext").focus();
}

function manageComment(flightId, currComment, flDate, flTime, rowIndex) {
  if (currComment != null && currComment !='') {
    let displayComment = document.getElementById('inputcomment')
    displayComment.innerHTML = '<strong>'+flDate+' '+flTime+' : '+currComment+'</strong>'
    let btnUpdate = document.createElement("input")   // must be input not button
    btnUpdate.type = "button"
    btnUpdate.name = "update"
    btnUpdate.value=i18n.gettext("Modify")
    btnUpdate.style.marginLeft = "20px";  
    btnUpdate.className="btn btn-success btn-sm"
    btnUpdate.onclick = function () {
      $('#inputcomment').hide(); 
      updateComment(flightId, currComment,flDate, flTime, rowIndex)
    }
    displayComment.appendChild(btnUpdate)
    let btnDelete = document.createElement("input")   // must be input not button
    btnDelete.type = "button"
    btnDelete.name = "cancel"
    btnDelete.style.marginLeft = "10px";  
    btnDelete.value=i18n.gettext("Delete");
    btnDelete.className="btn btn-danger btn-sm"
    btnDelete.onclick = function () {      
      if (db.open) {
        try {
          let newComment = ''
          const stmt = db.prepare('UPDATE Vol SET V_Commentaire= ? WHERE V_ID = ?')
          const updateComment = stmt.run(newComment,flightId)
          console.log(' in db : '+updateComment.changes) // newFlight.changes must return 1 for one row added     
          table.cell(rowIndex,6).data(newComment);
          table.$('tr.selected').removeClass('tableredline');
          $('#inputdata').hide()     
          $('#inputcomment').hide()           
        } catch (error) {
          console.log('Error during flight update '+error)
          displayStatus('Error during flight update')
        //  log.error('Error during flight update '+error)
        }
      }
    };
    displayComment.appendChild(btnDelete)    
    $('#inputcomment').show(); 
  }
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
    // L.easyButton(
    //   { id: 'bt_comment',
    //     position: 'topleft',      // inherited from L.Control -- the corner it goes in")
    //     type: 'replace',          // set to animate when you're comfy with css")
    //     leafletClasses: true,     // use leaflet classes to style the button?")
    //     states:[
    //             { stateName: 'get-comment', // specify different icons and responses for your button")
    //               title: 'show me the middle',
    //               icon: 'fa-comment-o fa-lg'}
    //             ]
    //   }).addTo(map)

                // btnComment.append("        $('#bt_comment').click(function(){").append(RC);  
                // btnComment.append("            $('#comment_to_pop_up').bPopup(").append(RC);  
                // btnComment.append("                {closeClass:'b-close-c',").append(RC);  
                // btnComment.append("                 opacity: 0.1,").append(RC);  
                // btnComment.append("                 position:[20,20]}").append(RC);  
                // btnComment.append("            );").append(RC);  
                // btnComment.append("        });").append(RC).append(RC);  
                // btnComment.append("        $('#bt_comment').trigger( \"click\" );").append(RC);   
  
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
  