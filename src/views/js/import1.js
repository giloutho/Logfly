var {ipcRenderer} = require('electron')
var i18n = require('../../lang/gettext.js')()
var glob = require("glob");
var { event } = require('jquery');
var fs = require('fs')
var path = require('path');
var log = require('electron-log');
const Store = require('electron-store')
let store = new Store()

// table must be global
var table

$(document).ready(function () {
  $('#sidebarCollapse').on('click', function () {
      console.log('clic sidebar')
      $('#sidebar').toggleClass('active');
  });    
});

ipcRenderer.on('translation', (event, langJson) => {
  let currLang = store.get('lang')
  i18n.setMessages('messages', currLang, langJson)
  i18n.setLocale(currLang);
  iniForm()
  fillSelect()
})

function callPage(pageName) {
  console.log('clic page')
  ipcRenderer.send("changeWindow", pageName);    // main.js
}

// buttons definition
var btnDisk = document.getElementById('imp-disk')

var btnFlymSD = document.getElementById('imp-gps-flysd')
var btnFlymOld = document.getElementById('imp-gps-flyold')
var btnFlytec20 = document.getElementById('imp-gps-fly20')
var btnFlytec15 = document.getElementById('imp-gps-fly15')
var btnSyride = document.getElementById('imp-gps-syr')
var btnXctracer = document.getElementById('imp-gps-xct')
var btnRever = document.getElementById('imp-gps-rever')
var btnSky2 = document.getElementById('imp-gps-sky2')
var btnSky3 = document.getElementById('imp-gps-sky3')
var btnOudie = document.getElementById('imp-gps-oud')
var btnCPilot = document.getElementById('imp-gps-cpil')
var btnElement = document.getElementById('imp-gps-elem')
var btnConnect = document.getElementById('imp-gps-conn')
var btnVarduino = document.getElementById('imp-gps-vardui')
var btnFlynet = document.getElementById('imp-gps-flynet')
var btnSensbox = document.getElementById('imp-gps-sens')

var btnManu = document.getElementById('imp-manu')

var statusContent = document.getElementById("status")

/** button for development 
 * 
 * 
 */
var runTest = document.getElementById('run-test')
runTest.addEventListener('click', (event) => {
  // test choix directory
  // let importPath = store.get('pathImport')
  // ipcRenderer.send('open-directory',importPath)
  // // The answer could be expected in a separate event -> ipcRenderer.on('selected-directory'
  // // but we use dialog.showOpenDialogSync, answer is expected
  // ipcRenderer.on('selected-directory', (event, arg) => {
  //   console.log('selection : '+arg) 
  // })  

  // test fenetre attente synchrone
  // let msgRetour = ipcRenderer.sendSync('win-waiting')
  // if (msgRetour != null) {
  //   console.log('response-test : '+msgRetour) 
  // } else {
  //   console.log('msgRetour est null')
  // }
  console.log('clic test')
  const selectedPath = ipcRenderer.sendSync('open-directory',store.get('pathImport'))
  if (selectedPath != null) {
    try {    
      log.info('[Import disk] for '+selectedPath)
      var statusContent = selectedPath+' : '
      let searchDisk = ipcRenderer.sendSync('disk-import',selectedPath)
      if (searchDisk.igcForImport.length > 0) {
          console.log('Returned from igc-disk-import.js with '+searchDisk.igcForImport.length+' igc files decoded')
          console.log('Returned from igc-disk-import.js with '+searchDisk.igcBad.length+' bad igc files')
          var nbInsert = 0
          searchDisk.igcForImport.forEach(element => {
            if (element.forImport === true ) {
              nbInsert++
            }
          });
          // affichage du resultat    
          statusContent += searchDisk.igcForImport.length+' tracks decoded&nbsp;/&nbsp;'
          statusContent += searchDisk.totalIGC+' igc files found'+'&nbsp;&nbsp;&nbsp;'
          statusContent += '<strong>[&nbsp;'+'Tracks to be added : '+nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
          displayStatus(statusContent,true)
          tableStandard(searchDisk.igcForImport)          
      } else {
        statusContent += ' '+'No tracks decoded'
        displayStatus(statusContent,false)
        log.info('disk-import.js : zero igc files decoded');
      }  
    } catch (error) {
      log.error('[Import disk clicked] '+error)    
    }
  }
})
/** End of buttons developpement */

btnFlymSD.addEventListener('click',(event) => {
  clearPage()
  serialGpsCall('FlymasterSD')
})

btnFlymOld.addEventListener('click',(event) => {
  clearPage()
  serialGpsCall('FlymasterOld')
})

btnFlytec15.addEventListener('click',(event) => {
  clearPage()
  serialGpsCall('Flytec15')
}) 

btnFlytec20.addEventListener('click',(event) => {
  clearPage()
  serialGpsCall('Flytec20')
}) 

btnOudie.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Oudie : </strong>'
  ipcRenderer.invoke('check-usb-gps','oudie').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })      
}) 

btnSky2.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Skytraxx 2 : </strong>'
  ipcRenderer.invoke('check-usb-gps','sky2').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })    

}) 

btnSky3.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Skytraxx 3 : </strong>'
  ipcRenderer.invoke('check-usb-gps','sky3').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })    

}) 

btnConnect.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Connect : </strong>'
  ipcRenderer.invoke('check-usb-gps','connect').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })        
}) 

btnFlynet.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Flynet : </strong>'
  ipcRenderer.invoke('check-usb-gps','flynet').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })        
}) 

btnElement.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Element : </strong>'
  ipcRenderer.invoke('check-usb-gps','element').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })        
}) 

btnCPilot.addEventListener('click',(event) => {
  let gpsStatus = '<strong>C-Pilot : </strong>'
  ipcRenderer.invoke('check-usb-gps','cpilot').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })        
}) 

btnSensbox.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Sensbox : </strong>'
  ipcRenderer.invoke('check-usb-gps','sensbox').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })        
}) 

btnVarduino.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Varduino : </strong>'
  ipcRenderer.invoke('check-usb-gps','varduino').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })   
}) 

btnXctracer.addEventListener('click',(event) => {
  let gpsStatus = '<strong>XC Tracer : </strong>'
  ipcRenderer.invoke('check-usb-gps','xctracer').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })    
}) 

btnRever.addEventListener('click',(event) => {
  let gpsStatus = '<strong>Reversale : </strong>'
  ipcRenderer.invoke('check-usb-gps','reverlog').then((logResult) => {   
    if (logResult != null) {
      callDiskImport(logResult,gpsStatus)  
    } else {
      clearPage()
      let errorMsg = gpsStatus+' not found'
      displayStatus(errorMsg,false)      
    }
  })  
}) 

btnSyride.addEventListener('click', (event) => {
  let syrideSetting = store.get('pathSyride')
  log.info('[Import Syride] from '+syrideSetting)
  var syridePath = ipcRenderer.sendSync('syride-check',syrideSetting)
  if (syridePath.parapentepath != null) {
    let gpsStatus = '<strong>Syride : </strong>'  
    callDiskImport(syridePath.parapentepath,gpsStatus)  
  } else {
    clearPage()
    let errorMsg = 'Syride path setting ['+syrideSetting+'] not found'
    displayStatus(errorMsg,false)
  }
})

btnDisk.addEventListener('click', (event) => {
  const selectedPath = ipcRenderer.sendSync('open-directory',store.get('pathImport'))
  if (selectedPath != null) {
    log.info('[Import disk] for '+selectedPath)
    var importStatus = selectedPath+' : '
    callDiskImport(selectedPath,importStatus)
  }
})

function serialGpsCall(gpsModel) {
  let gpsCom = []
  let msg
  ipcRenderer.invoke('ports-list').then((result) => {
    if (result instanceof Array) { 
      switch (gpsModel) {
        case 'FlymasterSD':
          msg = '[Import Flymaster SD]  '  
          break;      
        case 'FlymasterOld':
          msg = '[Import Flymaster Old]  '  
          break;             
        case 'Flytec20':
          msg = '[Import Flytec/Brau 6020-30 ]  '  
          break;  
        case 'Flytec15':
          msg = '[Import Flytec 6015/Brau IQ]  '  
          break;             
      }      
      log.info(msg+result.length+' ports detected')
      for (let i = 0; i < result.length; i++) {        
        if (typeof result[i].manufacturer != 'undefined') {
          var regexProlif = /prolific/i
          var regexFlym = /flymas/i
          if (result[i].manufacturer.search(regexProlif) >= 0) {
            // Dès Logfly5, on avait un problème avec Flytec
            // deux ports dev/cu.usbserial et dev/cu.usbserial-1440 apparaissent
            // plantage si on utilise cu.usbserial alors que cela fonctionne avec cu.usbserial-1440            
            // FIXME pour debugging  if en dur pour le 6015   
            if (result[i].path.includes('-')) {
              gpsReq =  {
                'chip': result[i].manufacturer,
                'model': gpsModel,
                'port': result[i].path
              }          
              gpsCom.push(gpsReq)                            
              log.info(msg+' Prolific manufacturer detected on '+result[i].path)
            }
          } else if (result[i].manufacturer.search(regexFlym) >= 0) {
            gpsReq =  {
              'chip': result[i].manufacturer,
              'model': gpsModel,
              'port': result[i].path
            }          
            gpsCom.push(gpsReq)
            log.info(msg+' Flymaster manufacturer detected on '+result[i].path)
          }
        }
      }
    } else {
      log.error(ms+' No serial port found')
    }
    if (gpsCom.length > 0) {
      callFlightList(gpsCom)  
    } else {
      displayStatus(i18n.gettext('No usable serial port detected',false))
    }
  })
}

function callDiskImport(selectedPath, statusContent) {
  try {    
    clearPage()
    let searchDisk = ipcRenderer.sendSync('disk-import',selectedPath)
    if (searchDisk.igcForImport.length > 0) {
        var nbInsert = 0
        searchDisk.igcForImport.forEach(element => {
          if (element.forImport === true ) {
            nbInsert++
          }
        });
        // affichage du resultat    
        statusContent += searchDisk.igcForImport.length+' tracks decoded&nbsp;/&nbsp;'
        statusContent += searchDisk.totalIGC+' igc files found'+'&nbsp;&nbsp;&nbsp;'
        statusContent += '<strong>[&nbsp;'+'Tracks to be added : '+nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
        displayStatus(statusContent,true)
        tableStandard(searchDisk.igcForImport)          
    } else {
      statusContent += ' '+'No tracks decoded'
      displayStatus(statusContent,false)
      log.info('disk-import.js : zero igc files decoded');
    }  
  } catch (error) {
    log.error('[callDiskImport] '+error)    
  }
}

function clearPage() {
  if ($.fn.DataTable.isDataTable('#tableimp_id')) {
    $('#tableimp_id').DataTable().clear().destroy()
    $('#tableimp_id').addClass('d-none')
  } 
  $('#status').hide();
}

function callFlightList(gpsCom) {
  // GpsDump is called in gpsdump-list.js 
  var flightList = ipcRenderer.send('flightlist', gpsCom)
  ipcRenderer.on('gpsdump-flist', (event, flightList) => {
    if (typeof flightList !== 'undefined') { 
      if (Array.isArray(flightList.flights)) {
        if (flightList.flights.length > 0) {
          tableFromGpsDump(flightList.flights, flightList.model)
        } else {
          log.error('['+flightList.model+' callFlihtList] returned an empty flightList.flights array')
          let statusContent = '<strong>'+flightList.model+' : </strong>&nbsp;&nbsp;&nbsp;flightList.flights array is empty'
          displayStatus(statusContent,true)  
        }
      } else {
        log.error('['+flightList.model+' callFlihtList did not return a flightList.flights array')
        let statusContent = '<strong>'+flightList.model+' : </strong>&nbsp;&nbsp;&nbsp;callFlihtList did not return a flightList.flights array'
        displayStatus(statusContent,true)  
      }
    } else {
      log.error('['+flightList.model+' callFlihtList returned undefined flightList')
      let statusContent = '<strong>'+flightList.model+' : </strong>&nbsp;&nbsp;&nbsp;callFlihtList returned undefined flightList'
      displayStatus(statusContent,true)        
    }
  })
}

function getOneFlight(gpsParam, flightIndex) {
  console.log('gpsParam '+gpsParam)
  var igcFile = ipcRenderer.send('getflight', gpsParam, flightIndex)  
  ipcRenderer.on('gpsdump-fone', (event, igcString) => {
    if (igcString != null) {
      console.log(igcString)
    }
  })  
}

function tableFromGpsDump(flighList,gpsModel) {
  if ($.fn.DataTable.isDataTable('#tableimp_id')) {
    $('#tableimp_id').DataTable().clear().destroy()
  }   
  var dataTableOption = {
    data: flighList, 
    // // the select plugin is used -> https://datatables.net/extensions/select/
    // pas nécessaire ici
    // select: {
    //   style: 'multi'
    // },
    columns: [  
      {
        // display boolean as checkbox -> http://live.datatables.net/kovegexo/1/edit
        title : 'Logbook',
        data: 'new',
        render: function(data, type, row) {
          if (data === true) {
            return '<input type="checkbox" class="editor-active" checked >';
          } else {
         //   return '<input type="checkbox" class="editor-active">';
              return '<img src="./assets/img/check-white.png" alt=""></img>';
          }
          return data;
        },
       className: "dt-body-center text-center"
      },      
      { title : 'Date', data: 'date'},
      { title : 'Time', data: 'takeoff'},
      { title : 'Duration' , data: 'duration'},      
      { title : 'Pilot name', data: null},    //unused in this table version     
      {
        title : '',
        data: 'forImport',
        render: function(data, type, row) {
          // action on the click is described below
          return '<button type="button" class="btn btn-outline-secondary btn-sm">Display</button>';
        },
       className: "dt-body-center text-center"
      },          
      { title : 'Path' , data: 'gpsdump'},         //unused in this table version
    ],   
    columnDefs : [
      {
        "targets": [ 4 ],           // 'Pilot name' column is hidden
        "visible": false,
        "searchable": false
      },      
      {
          "targets": [ 6 ],           // 'Path' column is hidden
          "visible": false,
          "searchable": false
      },
    ],             
    // change color according cell value -> http://live.datatables.net/tohehohe/1/edit
    'createdRow': function( row, data, dataIndex ) {
      if ( data['new'] === true ) {        
        $(row).addClass('importred');
      } else {
        $(row).addClass('importgreen');
      }
    },  
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
  table = $('#tableimp_id').DataTable(dataTableOption )
  $("#tableimp_id").on("click", "td input[type=checkbox]", function () {
    var isChecked = this.checked;
    // set the data item associated with the row to match the checkbox
    var dtRow = table.rows($(this).closest("tr"));
    dtRow.data()[0].forImport = isChecked;
  })
  // example from https://datatables.net/examples/ajax/null_data_source.html
  $('#tableimp_id').on( 'click', 'button', function () {
    var dtRow = table.row( $(this).parents('tr') ).data();
    let rowIndex = table.row( $(this).parents('tr') ).index()
    alert( 'Index '+rowIndex+'   '+dtRow['date']+"' ' "+dtRow['gpsdump']);
    $('#img_waiting').addClass('d-none')
    getOneFlight(dtRow['gpsdump'],rowIndex)
  } );  
  $('#tableimp_id').removeClass('d-none')
  $('#img_waiting').addClass('d-none')

  let statusContent = '<strong>'+gpsModel+' : </strong>'+flighList.length+' igc files found'+'&nbsp;&nbsp;&nbsp;'
  var nbInsert = 0
  flighList.forEach(element => {
    if (element.new === true ) {
      nbInsert++
    }
  });
  // affichage du resultat
  statusContent += '<strong>[&nbsp;'+'Tracks to be added : '+nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
  displayStatus(statusContent,true)  
}

/**
 * Il manque le tri par date de la liste
 * la présentation de l'heure HH:MM
 * 
 * la checkbox n'est pas modifiable  OK
 * maintenant il faut être capable au clic de lister ce qui est sélectionné et ce qui ne l'est pas Ok
 * https://jsbin.com/joxiri/4/edit?html,js,output
 * peut être à relire :  https://datatables.net/forums/discussion/42290/getting-the-checked-rows-in-datatables 
 * la coloration des lignes selon le cas   OK
 * le parcours de la table pour voir ce qui est coché et ce qui ne l'est pas  OK
 */

// TODO  Il manque le tri par date de la liste
function tableStandard(igcForImport) {
  if ( $.fn.dataTable.isDataTable( '#tableimp_id' ) ) {
    $('#tableimp_id').DataTable().clear().destroy()
  }   
  var dataTableOption = {
    data: igcForImport, 
    // // the select plugin is used -> https://datatables.net/extensions/select/
    // pas nécessaire ici
    // select: {
    //   style: 'multi'
    // },
    columns: [  
      {
        // display boolean as checkbox -> http://live.datatables.net/kovegexo/1/edit
        title : 'Logbook',
        data: 'forImport',
        render: function(data, type, row) {
          if (data === true) {
            return '<input type="checkbox" class="editor-active" checked >';
          } else {
         //   return '<input type="checkbox" class="editor-active">';
              return '<img src="./assets/img/check-white.png" alt=""></img>';
          }
          return data;
        },
       className: "dt-body-center text-center"
      },      
      { title : 'Date', data: 'date'},
      { title : 'Time', data: 'startLocalTime'},
      { title : 'File name' , data: 'filename'},
      { title : 'Pilot name' , data: 'pilotName'},        
      { title : 'Path' , data: 'path'},
    ],       
    columnDefs : [
      {
          "targets": [ 5 ],           // last column with full path is hidden
          "visible": false,
          "searchable": false
      },
    ],         
    // change color according cell value -> http://live.datatables.net/tohehohe/1/edit
    'createdRow': function( row, data, dataIndex ) {
      if ( data['forImport'] === true ) {        
        $(row).addClass('importred');
      } else {
        $(row).addClass('importgreen');
      }
    },  
    destroy: true,
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

  table = $('#tableimp_id').DataTable(dataTableOption )
  $("#tableimp_id").on("click", "td input[type=checkbox]", function () {
    var isChecked = this.checked;
    // set the data item associated with the row to match the checkbox
    var dtRow = table.rows($(this).closest("tr"));
    dtRow.data()[0].forImport = isChecked;
  })
  $('#tableimp_id').removeClass('d-none')
}

function displayStatus(content,updateDisplay) {
  statusContent.innerHTML = content
  if (updateDisplay) {
    var statusAlert = document.getElementById('status');
    var btnUpdate = document.createElement("input");
    btnUpdate.type = "button";
    btnUpdate.name = "add";
    btnUpdate.value="Logbook update";
    btnUpdate.className="btn btn-danger btn-xs";
    btnUpdate.onclick = function () {
      logbookUpdate()
    };
    statusAlert.appendChild(btnUpdate);
  }
  $('#status').show();
}

function fillArray(item, index) {
  var filename = item.replace(/^.*[\\\/]/, '')
  //var filename = item.split('\\').pop().split('/').pop();
  // décrit comme + rapide dans https://stackoverflow.com/questions/423376/how-to-get-the-file-name-from-a-full-path-using-javascript
  // mais j'ai trouvé la regex plus rapide
  console.log(index+' - '+filename)
}

function logbookUpdate() {
  console.log('logbook update')
}


/***
 * Il faut extraire date heure déco nom pilote latitude et logitude décollage
 *   voir https://github.com/MrGuzior/VarioView/blob/master/parser.js
 * table :  | Check | Date | Heure | Nom fichier | Nom Pilote
 * 
 * On va tout passer à ipcmain qui renverra un objet pour remplir la table
 * Objet devra être tranformé en json ?
 * 
 */
