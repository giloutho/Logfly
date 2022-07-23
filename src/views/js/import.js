const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
// status messages
const statusContent = document.getElementById("status")
// waiting template 
const waitTpl = document.getElementById('wait-template').innerHTML
// buttons definition
const btnDisk = document.getElementById('imp-disk')
const btnFlymSD = document.getElementById('imp-gps-flysd')
const btnFlymOld = document.getElementById('imp-gps-flyold')
const btnFlytec20 = document.getElementById('imp-gps-fly20')
const btnFlytec15 = document.getElementById('imp-gps-fly15')
const btnSyride = document.getElementById('imp-gps-syr')
const btnSyrUsb = document.getElementById('imp-gps-syrusb')
const btnXctracer = document.getElementById('imp-gps-xct')
const btnRever = document.getElementById('imp-gps-rever')
const btnSkytrax2 = document.getElementById('imp-gps-sky2')
const btnSkytrax3 = document.getElementById('imp-gps-sky3')
const btnOudie = document.getElementById('imp-gps-oud')
const btnCPilot = document.getElementById('imp-gps-cpil')
const btnElement = document.getElementById('imp-gps-elem')
const btnConnect = document.getElementById('imp-gps-conn')
const btnSkydrop = document.getElementById('imp-gps-skydrop')
const btnVarduino = document.getElementById('imp-gps-vardui')
const btnFlynet = document.getElementById('imp-gps-flynet')
const btnSensbox = document.getElementById('imp-gps-sens')    
const btnManu = document.getElementById('imp-manu')
// const msgImport = i18n.gettext("Retrieving the list of flights in progress") 
// const mustImport = Mustache.render(waitTpl, { typeimport : msgImport });

ipcRenderer.on('translation', (event, langJson) => {
    const currLang = store.get('lang')
    i18n.setMessages('messages', currLang, langJson)
    i18n.setLocale(currLang);
    iniForm()
  })

ipcRenderer.on('gpsdump-fone', (event, result) => {
  // if (igcString != null) {
  //   console.log(igcString)
  // }
  console.log('retour gpsdump-fone '+result)
  if (result != null) {
    hideWaiting()        
    alert(result)      
  } else {
    hideWaiting() 
    $('#table-content').addClass('d-block')   
  }
})  

function iniForm() {
    const menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    btnFlymSD.addEventListener('click',(event) => {serialGpsCall('FlymasterSD')})      
    btnFlymOld.addEventListener('click',(event) => {callFlymOld()})
    btnFlytec20.addEventListener('click',(event) => {callFlytec20()})
    btnOudie.addEventListener('click',(event) => {callUsbGps('oudie')})
    btnSkytrax2.addEventListener('click',(event) => {callUsbGps('sky2')})
    btnSkytrax3.addEventListener('click',(event) => {callUsbGps('sky3')})
    btnConnect.addEventListener('click',(event) => {callUsbGps('connect')})
    btnSkydrop.addEventListener('click',(event) => {callUsbGps('skydrop')})
    btnFlynet.addEventListener('click',(event) => {callUsbGps('flynet')})
    btnElement.addEventListener('click',(event) => {callUsbGps('element')})
    btnCPilot.addEventListener('click',(event) => {callUsbGps('cpilot')})
    btnSensbox.addEventListener('click',(event) => {callUsbGps('sensbox')})
    btnVarduino.addEventListener('click',(event) => {callUsbGps('varduino')})
    btnXctracer.addEventListener('click',(event) => {callUsbGps('xctracer')})
    btnRever.addEventListener('click',(event) => {callUsbGps('reverlog')})
    btnSyride.addEventListener('click', (event) => {callSyride()})
    btnSyrUsb.addEventListener('click',(event) => {callUsbGps('syrideusb')})
    btnDisk.addEventListener('click', (event) => {callDisk()})
    btnManu.addEventListener('click', (event) => {callManu()})
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

function callUsbGps(typeGPS) {
  let gpsStatus
  switch (typeGPS) {
    case 'reverlog':
      gpsStatus = '<strong>Reversale : </strong>'
      break;  
    case 'connect':
      gpsStatus = '<strong>GPS Connect : </strong>'     
      break;
    case 'sensbox' :
      gpsStatus = '<strong>GPS Sensbox : </strong>'     
      break;    
    case 'element' :
      gpsStatus = '<strong>GPS Element : </strong>'     
      break;           
    case 'flynet' :
      gpsStatus = '<strong>GPS Flynet : </strong>'     
      break;             
    case 'sky2' :
      gpsStatus = '<strong>GPS Skytraax 2 : </strong>'     
      break;
    case 'sky3' :
      gpsStatus = '<strong>GPS Skytraax 3/4 : </strong>'     
      break;     
    case 'cpilot' : 
      gpsStatus = '<strong>GPS C-Pilot: </strong>'     
      break; 
    case 'xctracer' :
      gpsStatus = '<strong>GPS C-Pilot: </strong>'     
      break;
    case 'varduino' :
      gpsStatus = '<strong>GPS Varduino: </strong>'     
      break; 
    case 'oudie':
      gpsStatus = '<strong>GPS Oudie : </strong>'     
      break;   
    case 'skydrop' :
      gpsStatus = '<strong>GPS Skydrop : </strong>'     
      break;
    case 'syrideusb':
      gpsStatus = '<strong>GPS Syride via Usb : </strong>'     
      break;          
  }
  displayWaiting()
  ipcRenderer.invoke('check-usb-gps',typeGPS).then((logResult) => {   
      if (logResult != null) {     
          callDiskImport(logResult,gpsStatus)  
      } else {
          let errorMsg
          clearPage()
          if (typeGPS == 'varduino') {
            errorMsg = gpsStatus+' '+i18n.gettext('The USB connection being very random, it is advised to use directly the microSD connected to the computer')
          } else {
            errorMsg = gpsStatus+' '+i18n.gettext('Not found')
          }
          displayStatus(errorMsg,false)      
      }
  })     
}

function callSyride() {
  const syrideSetting = store.get('pathSyride')
  log.info('[Import Syride] from '+syrideSetting)
  var syridePath = ipcRenderer.sendSync('syride-check',syrideSetting)
  if (syridePath.parapentepath != null) {
    const gpsStatus = '<strong>Syride : </strong>'  
    callDiskImport(syridePath.parapentepath,gpsStatus)  
  } else {
    clearPage()
    const errorMsg = 'Syride path setting ['+syrideSetting+'] not found'
    displayStatus(errorMsg,false)
  }
}


function callDisk() {
  console.log(store.get('pathImport'))
  const selectedPath = ipcRenderer.sendSync('open-directory',store.get('pathimport'))
  if (selectedPath != null) {
    log.info('[Import disk] for '+selectedPath)
    var importStatus = selectedPath+' : '
    callDiskImport(selectedPath,importStatus)
  }
}

function callManu() {
    displayStatus('C est mon statut...',false)
}

function callDiskImport(selectedPath, statusContent) {
    try {    
      clearPage()
      displayWaiting()
      const searchDisk = ipcRenderer.sendSync('disk-import',selectedPath)
      if (searchDisk.igcForImport.length > 0) {
          var nbInsert = 0
          searchDisk.igcForImport.forEach(element => {
            if (element.forImport === true ) {
              nbInsert++
            }
          });
          // result display
          statusContent += searchDisk.igcForImport.length+'&nbsp;'+i18n.gettext('tracks decoded')+'&nbsp;/&nbsp;'
          statusContent += searchDisk.totalIGC+'&nbsp;'+i18n.gettext('igc files found')+'&nbsp;&nbsp;&nbsp;'
          statusContent += '<strong>[&nbsp;'+i18n.gettext('Tracks to be added')+'&nbsp;:&nbsp;'+nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
          displayStatus(statusContent,true)
          tableStandard(searchDisk.igcForImport)          
      } else {
        statusContent += ' '+'No tracks decoded'
        displayStatus(statusContent,false)
        log.info('disk-import.js : zero igc files decoded');
      }  
    } catch (error) {
        displayStatus(error,false)
        log.error('[callDiskImport] '+error)    
    }
}

function serialGpsCall(gpsModel) {
  let gpsCom = []
  let msg
  clearPage()
  displayWaiting()

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
      callFlightList(gpsCom, gpsModel)  
    } else {
      displayStatus(i18n.gettext('No usable serial port detected',false))
    }
  })
}

function callFlightList(gpsCom, gpsModel) {
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
        displayStatus(statusContent,false)  
      }
    } else {
      log.error('['+gpsModel+' callFlihtList returned undefined flightList')
      let statusContent = '<strong>'+gpsModel+'  : </strong>&nbsp;&nbsp;&nbsp;callFlihtList returned undefined flightList'
      displayStatus(statusContent,false)      
    }
  })
}

function callFlightListNew(gpsCom, gpsModel) {
  ipcRenderer.invoke('flightlist', gpsCom).then((flighList) => {
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
        displayStatus(statusContent,false)  
      }
    } else {
      log.error('['+gpsModel+' callFlihtList returned undefined flightList')
      let statusContent = '<strong>'+gpsModel+'  : </strong>&nbsp;&nbsp;&nbsp;callFlihtList returned undefined flightList'
      displayStatus(statusContent,false)        
    }
  })
}

function getOneFlight(gpsParam, flightIndex) {
  console.log('gpsParam '+gpsParam)
  displayWaiting()
  $('#table-content').addClass('d-none')
  var igcFile = ipcRenderer.send('getflighformap', gpsParam, flightIndex)  
  // ipcRenderer.on('gpsdump-fone', (event, result) => {
  //   // if (igcString != null) {
  //   //   console.log(igcString)
  //   // }
  //   console.log('retour gpsdump-fone '+result)
  //   if (result) {
  //     hideWaiting()
  //   } else {
  //     hideWaiting()
  //     alert(i18n.gettext('An error occurred during the map generation'))      
  //   }
  // })  
}

function tableFromGpsDump(flighList,gpsModel) {
  hideWaiting()
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
              return '<img src="../../assets/img/in_logbook.png" alt=""></img>';
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
   // alert( 'Index '+rowIndex+'   '+dtRow['date']+"' ' "+dtRow['gpsdump']);
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


// TODO  Il manque le tri par date de la liste et eventuellement la visu sur un contextuel ou une icone. On a la place
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
                return '<img src="../../assets/img/check-white.png" alt=""></img>';
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
  
function clearPage() {
    if ($.fn.DataTable.isDataTable('#tableimp_id')) {
      $('#tableimp_id').DataTable().clear().destroy()
      $('#tableimp_id').addClass('d-none')
    } 
    $('#status').hide();
}

function displayStatus(content,updateDisplay) {
    hideWaiting()
    statusContent.innerHTML = content
    if (updateDisplay) {
      var statusAlert = document.getElementById('status');
      var btnUpdate = document.createElement("input");
      btnUpdate.type = "button";
      btnUpdate.name = "add";
      btnUpdate.value=i18n.gettext("Logbook update");
      btnUpdate.className="btn btn-danger btn-xs";
      btnUpdate.onclick = function () {
        logbookUpdate()
      };
      statusAlert.appendChild(btnUpdate);
    }
    $('#status').show();
}

function displayWaiting() {
    const msg = i18n.gettext("Retrieving the list of flights in progress") 
    const rendered = Mustache.render(waitTpl, { typeimport : msg });
    console.log('rendered '+rendered)
    document.getElementById('div_waiting').innerHTML = rendered
    $('#div_waiting').addClass('m-5 pb-5 d-block')
}

function hideWaiting() {
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
}