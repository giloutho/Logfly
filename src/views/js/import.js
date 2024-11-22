const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../../views/tpl/sidebar.js')
const dbadd = require('../../utils/db/db-add.js')
let db = require('better-sqlite3')(store.get('dbFullPath'))
const moment = require('moment')

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

let currStatusContent
let currTypeGps = null
let currLang

iniForm()

$(document).ready(function () {
  let selectedFixedMenu =  store.get('menufixed') 
  if (selectedFixedMenu === 'yes') {
    $("#sidebar").removeClass('active')
    $('#toggleMenu').addClass('d-none')
    document.getElementById("menucheck").checked = true;
  }
})

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

ipcRenderer.on('gpsdump-fone', (event, result) => {
  hideWaiting() 
//  $('#table-content').addClass('d-block')  
  if (result != null) alert(result)      
})  

ipcRenderer.on('tracks-result', (_, searchIgc) => {
  simpleHideWating()
  displayDiskResult(searchIgc)
})

function iniForm() {
  try {    
    document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'  
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
    const menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        const template = $(templates).filter('#temp-menu').html();  
        const rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    document.getElementById('imp-gps').innerHTML = i18n.gettext('GPS import')
    document.getElementById('imp-disk').innerHTML = i18n.gettext('Disk import')
    document.getElementById('imp-manu').innerHTML = i18n.gettext('Flight without GPS track')
    btnFlymSD.addEventListener('click',(event) => {serialGpsCall('FlymasterSD')})      
    btnFlymOld.addEventListener('click',(event) => {serialGpsCall('FlymasterOld')})
    btnFlytec20.addEventListener('click',(event) => {serialGpsCall('Flytec20')})
    btnFlytec15.addEventListener('click',(event) => {serialGpsCall('Flytec15')})
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



/**
 *
 *
 * @param {*} typeGPS
 */
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
      gpsStatus = '<strong>GPS C-Pilot : </strong>'     
      break; 
    case 'xctracer' :
      gpsStatus = '<strong>GPS XC Tracer : </strong>'     
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
  simpleWaiting()
  ipcRenderer.invoke('check-usb-gps',typeGPS).then((resultUsb) => {   
      if (resultUsb.pathFlights != null) {     
        console.log(resultUsb.pathFlights)
        newCallUsbImport(resultUsb.pathFlights,gpsStatus)  
      } else {
          let errorMsg
          simpleHideWating()
          clearTable()        
          if (typeGPS == 'varduino') {
            errorMsg = gpsStatus+' '+i18n.gettext('The USB connection being very random, it is advised to use directly the microSD with disk import')
          } else {
            errorMsg = gpsStatus+' '+i18n.gettext('Not found')
          }
          console.log(errorMsg)
          displayStatus(errorMsg,false)      
      }
  })     
}



/**
 *
 *
 */
function callSyride() {
  const syrideSetting = store.get('pathsyride')
  log.info('[Import Syride] from '+syrideSetting)
  const syridePath = ipcRenderer.sendSync('syride-check',syrideSetting)
  if (syridePath.parapentepath != null) {
   currStatusContent = '<strong>Syride : </strong>' 
   simpleWaiting()
   ipcRenderer.send('tracks-igc', syridePath.parapentepath)   
  } else {
    clearTable()
    const errorMsg = 'Syride path setting ['+syrideSetting+'] not found'
    displayStatus(errorMsg,false)
  }
}


function callDisk() {
  const selectedFile = ipcRenderer.sendSync('open-file',store.get('pathimport'))
  if(selectedFile.fullPath != null) {
    let selectedPath = selectedFile.directoryName
    currStatusContent = selectedPath+' : '
    simpleWaiting()
    ipcRenderer.send('tracks-disk', selectedPath)     
  }
}

function callManu() {
  clearForm()
  const formattedToday = moment().format('YYYY-MM-DD')
  let flightData = {
    type : 'new',
    id : 0,
    row : 0,
    date : formattedToday,
    time : '12:00',
    sqlDate : formattedToday+' 12:00',
    duree : '00:30',
    strduree : '',
    lat : 0.00,
    lon : 0.00,
    alti : 0,
    nom : '',
    pays : '',
    glider : '',
    comment :''
  }
  const callList = ipcRenderer.send('display-flight-form', flightData)   // process-main/modal-win/flight-form.js
}


function newCallUsbImport(selectedPath, statusContent) {
  currStatusContent = statusContent
  ipcRenderer.send('tracks-disk', selectedPath)   
}

function displayDiskResult(searchIgc) {
  clearTable()
  let statusReport = currStatusContent
  if (searchIgc.igcForImport.length > 0) {
    statusReport += searchIgc.igcForImport.length+'&nbsp;'+i18n.gettext('tracks decoded')+'&nbsp;/&nbsp;'
    statusReport += searchIgc.totalIGC+'&nbsp;'+i18n.gettext('igc files found')+'&nbsp;&nbsp;&nbsp;'
    statusReport += '<strong>[&nbsp;'+i18n.gettext('Tracks to be added')+'&nbsp;:&nbsp;'
    currStatusContent = statusReport
    statusReport += searchIgc.totalInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
    displayStatus(statusReport,true)
    let typeDisplay = store.get('gpsnewflights')
    if (typeDisplay === undefined) {
      typeDisplay = true
      store.set('gpsnewflights',true)
    }
    if (typeDisplay) {
      const filteredImport =  searchIgc.igcForImport.filter(function(igcItem) {
        return igcItem.forImport == true
      })
      tableStandard(filteredImport) 
    } else {
      tableStandard(searchIgc.igcForImport)
    }         
  } else {
    currStatusContent += ' '+'No tracks decoded'
    displayStatus(currStatusContent,false)
    log.info('import-disk.js : zero igc files decoded');
  } 
}

function serialGpsCall(gpsModel) {
  let gpsCom = []
  let msg
  clearTable()
  displayWaiting('many')

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
          const regexProlif = /prolific/i
          const regexFlym = /flymas/i
          const regexFlymOld = /FTDI/i
          if (result[i].manufacturer.search(regexProlif) >= 0) {
            // Dès Logfly5, on avait un problème avec Flytec
            // deux ports dev/cu.usbserial et dev/cu.usbserial-1440 apparaissent
            // plantage si on utilise cu.usbserial alors que cela fonctionne avec cu.usbserial-1440            
            // FIXME pour debugging  if en dur pour le 6015   
            // on avait donc fait un if
            //  if (result[i].path.includes('-')) {
            // Il semblerait qu'avec serialport un seul port apparaisse
            // usbserial-1440 sur macOS 12.6   usbserial sur macOS.10.11
              gpsReq =  {
                'chip': result[i].manufacturer,
                'model': gpsModel,
                'port': result[i].path
              }          
              gpsCom.push(gpsReq)                            
              log.info(msg+' Prolific manufacturer detected on '+result[i].path)
           // }
          } else if (result[i].manufacturer.search(regexFlym) >= 0) {
            gpsReq =  {
              'chip': result[i].manufacturer,
              'model': gpsModel,
              'port': result[i].path
            }          
            gpsCom.push(gpsReq)
            log.info(msg+' Flymaster manufacturer detected on '+result[i].path)
          } else if (result[i].manufacturer.search(regexFlymOld) >= 0) {
            gpsReq =  {
              'chip': result[i].manufacturer,
              'model': gpsModel,
              'port': result[i].path
            }          
            gpsCom.push(gpsReq)
            log.info(msg+' FTDI manufacturer detected on '+result[i].path+' (Flymaster Old)')            
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
  const flightList = ipcRenderer.send('flightlist', gpsCom)
  ipcRenderer.on('gpsdump-flist', (event, flightList) => {
    if (typeof flightList !== 'undefined') { 
      if (Array.isArray(flightList.flights)) {        
        if (flightList.flights.length > 0) {       
          let typeDisplay = store.get('gpsnewflights')
          if (typeDisplay === undefined) {
            typeDisplay = true
            store.set('gpsnewflights',true)
          }
          if (typeDisplay) {
            const filteredImport =  flightList.flights.filter(function(igcItem) {
              return igcItem.new == true
            })
            tableFromGpsDump(filteredImport, flightList.model)
          } else {
            tableFromGpsDump(flightList.flights, flightList.model)
          }      
        } else {
          let errorMsg = '['+flightList.model+' callFlihtList] returned an empty flightList.flights array'
          if (flightList.otherlines.length > 0) {
            errorMsg += '<br>'
            for (let index = 0; index < flightList.otherlines.length; index++) {
              errorMsg += flightList.otherlines[index]+'<br>'              
            }
          }
          log.error(errorMsg)
          //let statusContent = '<strong>'+flightList.model+' : </strong>&nbsp;&nbsp;&nbsp;flightList.flights array is empty'
          let statusContent = errorMsg
          displayStatus(statusContent,false)  
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

function displayOneFlight(flightPath, flightIndex) {
  // We wat the same function for Gpsdump and usb gps. 
  // we only need flightindex for gpsdump, for usb, we send 9999
  // $('#table-content').removeClass('d-block')
  // $('#table-content').addClass('d-none')
  displayWaiting('one')
  // call process-main/gps-tracks/getoneflight.js
  // map will be displayed in a modal window
  // come back is managed with ipcRenderer.on('gpsdump-fone')
  let igcFile = ipcRenderer.send('displayoneflight', flightPath, flightIndex)    
}

function tableFromGpsDump(flightList,gpsModel) {
  hideWaiting()
  currTypeGps = 'serial'
  if ($.fn.DataTable.isDataTable('#tableimp_id')) {
    $('#tableimp_id').DataTable().clear().destroy()
  }   
  attachCheckClic()
  let dataTableOption = {
    data: flightList, 
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
            return '<input type="checkbox" name="chkbx" class="editor-active" checked >';
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
          return '<button type="button" class="btn btn-outline-secondary btn-sm">'+i18n.gettext('Map')+'</button>'
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
    let isChecked = this.checked;
    // set the data item associated with the row to match the checkbox
    let dtRow = table.rows($(this).closest("tr"));
    dtRow.data()[0].forImport = isChecked;
  })
  // example from https://datatables.net/examples/ajax/null_data_source.html
  $('#tableimp_id').on( 'click', 'button', function () {
    let dtRow = table.row( $(this).parents('tr') ).data();
    let rowIndex = table.row( $(this).parents('tr') ).index()
   // alert( 'Index '+rowIndex+'   '+dtRow['date']+"' ' "+dtRow['gpsdump']);
    $('#img_waiting').addClass('d-none')
    displayOneFlight(dtRow['gpsdump'],rowIndex)
   // getOneFlight(dtRow['gpsdump'],rowIndex)
  } );  
  $('#tableimp_id').removeClass('d-none')
  $('#img_waiting').addClass('d-none')
     
  let nbInsert = 0
  flightList.forEach(element => {
    if (element.new === true ) {
      nbInsert++
    }
  });  
  let newStatusContent = '<strong>'+gpsModel+' : </strong>'  
  newStatusContent += flightList.length+'&nbsp;'+i18n.gettext('tracks in GPS')+'&nbsp;&nbsp;&nbsp;'
  newStatusContent += '<strong>[&nbsp;'+i18n.gettext('Tracks to be added')+'&nbsp;:&nbsp;'
  currStatusContent = newStatusContent
  newStatusContent += nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'  
  displayStatus(newStatusContent,true)  
}


function uncheckTable() {
  let table = $('#tableimp_id').DataTable();

  $('input[type="checkbox"]', table.cells().nodes()).prop('checked',false);
  let nbInsert = 0
  let newStatusContent = currStatusContent+nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
  displayStatus(newStatusContent,false) 
}

function attachCheckClic() {
  $('#tableimp_id').on('click', 'tbody td:first-child', function () {  
    let data = table.rows( function ( idx, data, node ) {
      return $(node).find('input[type="checkbox"][name="chkbx"]').prop('checked')
    }).data().toArray();
    let nbInsert = data.length
    let newStatusContent = currStatusContent+nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
    displayStatus(newStatusContent,true)
  })
}

// a enlever si ok
function updateStatus() {
  console.log(currStatusContent)
  let data = table.rows( function ( idx, data, node ) {
    return $(node).find('input[type="checkbox"][name="chkbx"]').prop('checked')
  }).data().toArray();
  let nbInsert = data.length
  let newStatusContent = currStatusContent+nbInsert+'&nbsp;]</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;'
  displayStatus(newStatusContent,true)
}

function tableStandard(igcForImport) {
    if ( $.fn.dataTable.isDataTable( '#tableimp_id' ) ) {
      console.log('destroy')
      $('#tableimp_id').DataTable().clear().destroy(true)
    }   
    attachCheckClic()
    currTypeGps = 'disk'
    let dataTableOption = {
      // width format see this http://live.datatables.net/zurecuzi/1/edit
      autoWidth: false,
      data: igcForImport, 
      // // the select plugin is used -> https://datatables.net/extensions/select/
      // pas nécessaire ici
      // select: {
      //   style: 'multi'
      // },
      columns: [  
        {
          // display boolean as checkbox -> http://live.datatables.net/kovegexo/1/edit
          title : i18n.gettext('Logbook'),
          data: 'forImport',
          width: '5%',
          render: function(data, type, row) {
            if (data === true) {
              return '<input type="checkbox" name="chkbx" class="editor-active" checked >';
            } else {
           //   return '<input type="checkbox" class="editor-active">';
                return '<img src="../../assets/img/in_logbook.png" alt=""></img>';
            }
            return data;
          },
         className: "dt-body-center text-center"
        },      
        { title : i18n.gettext('Date'), data: 'date', width: '10%'},
        { title : i18n.gettext('Time'), data: 'startLocalTime', width: '8%'},
        { title : i18n.gettext('File name') , data: 'filename'},
        { title : i18n.gettext('Pilot name') , data: 'pilotName'},        
        { title : i18n.gettext('Path') , data: 'path'},
        {
          title : '',
          data: 'forImport',
          width: '8%',
          render: function(data, type, row) {
            // action on the click is described below
            return '<button type="button" class="btn btn-outline-secondary btn-sm">'+i18n.gettext('Map')+'</button>';
          },
         className: "dt-body-center text-center"
        },         
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
      let isChecked = this.checked;
      // set the data item associated with the row to match the checkbox
      let dtRow = table.rows($(this).closest("tr"));
      dtRow.data()[0].forImport = isChecked;
    })
  // example from https://datatables.net/examples/ajax/null_data_source.html
  $('#tableimp_id').on( 'click', 'button', function () {
    //$('#tableimp_id').off( 'click' )
    let dtRow = table.row( $(this).parents('tr') ).data();
    let rowIndex = table.row( $(this).parents('tr') ).index()
    // alert( 'Index '+rowIndex+'   '+dtRow['date']+"' ' "+dtRow['path']);
    // code original
    // displayOneFlight(dtRow['path'], 9999)
    console.log('rowindex '+rowIndex)
   // console.log({dtRow})
    // nouveau code
   // const igcString = igcForImport[rowIndex].igcFile    
    const igcString = dtRow.igcFile  
    displayOneFlight(igcString, 9999)
  } );      
  $('#tableimp_id').removeClass('d-none')
}

function updateLogbook() {
  if(currTypeGps == 'disk'){
    // No need to display the waiting screen everything is in memory
    let data = table.rows( function ( idx, data, node ) {
      return $(node).find('input[type="checkbox"][name="chkbx"]').prop('checked')
    }).data().toArray();
    let nbToInsert = data.length
    statusContent.innerHTML = currStatusContent+nbToInsert+'&nbsp;]</strong>' 
    let nbInserted = 0      
    data.forEach((element) => {
      nbInserted += dbadd.addFlight(element, i18n.gettext('To rename'))
    });
    alert(nbInserted+' / '+nbToInsert+' '+i18n.gettext('flights inserted'))
    callPage('logbook')
  } else if (currTypeGps == 'serial') {
      $('#table-content').removeClass('d-block')
      $('#table-content').addClass('d-none')
      displayWaiting('gpsdump')
      let reqImport = []
      let data = table.rows( function ( idx, data, node ) {
        if ($(node).find('input[type="checkbox"][name="chkbx"]').prop('checked')) {
          let reqline = {}
          reqline['gpsparam'] = data['gpsdump']
          reqline['flightIndex'] = idx
          reqImport.push(reqline)
        }
      })
      let nbToInsert = reqImport.length
      statusContent.innerHTML = currStatusContent+nbToInsert+'&nbsp;]</strong>' 
      let nbInserted = 0   
      const flightsFromGps = ipcRenderer.send('gpsdump-import', reqImport)
      ipcRenderer.on('gpsdump-result', (event, result) => {
        if (result.igcForImport.length > 0) {
          result.igcForImport.forEach(element => {
            nbInserted += dbadd.addFlight(element, i18n.gettext('To rename'))
          });
          hideWaiting()
          $('#table-content').removeClass('d-none')
          $('#table-content').addClass('d-block')
          alert(nbInserted+' / '+nbToInsert+' '+i18n.gettext('flights inserted'))
          callPage('logbook')
        }
      })
  } else {
    hideWaiting()
    $('#table-content').removeClass('d-none')
    $('#table-content').addClass('d-block')
    let newStatusContent = '<strong>ERROR : </strong>Unknown type gps selected'
    displayStatus(newStatusContent,false) 
  }
}
  
function clearForm() {
  $('#div_table').hide()
  $('#status').hide()
}

function clearTable() {
  $('#div_table').show()
  if ($.fn.DataTable.isDataTable('#tableimp_id')) {
    // It's necessary to remove the listener that has already been attached to the DataTable
    // otherwise, on the second filling of the table, the map was displayed twice
    // on the third, three times, etc... etc...
    // solution -> https://datatables.net/reference/api/off()#:~:text=This%20off()%20method%20is,only%20a%20single%20event%20listener.
    $('#tableimp_id').off( 'click' )
    $('#tableimp_id').DataTable().destroy()
    $('#tableimp_id').addClass('d-none')
  } 
  $('#status').hide()
}

function displayStatus(content,updateDisplay) {
    hideWaiting()
    if (updateDisplay) {      
      let htmlButton = '<button type="button" class="btn btn-outline-info mr-4" id="bt-selection" onclick="uncheckTable()">'+i18n.gettext('Unselect')+'</button>'
      statusContent.innerHTML = htmlButton+content
      let statusAlert = document.getElementById('status');
      let btnUpdate = document.createElement("input");
      btnUpdate.type = "button";
      btnUpdate.name = "add";
      btnUpdate.value=i18n.gettext("Logbook update");
      btnUpdate.className="btn btn-danger btn-xs mr-2";
      btnUpdate.onclick = function () {
        updateLogbook() 
      };
      statusAlert.appendChild(btnUpdate);
    } else {
      statusContent.innerHTML = content
    }
    $('#status').show();
}

function displayWaiting(typeMsg) {
    $('#table-content').removeClass('d-block')
    $('#table-content').addClass('d-none')
    let msg
    switch (typeMsg) {
      case 'one':
        msg = i18n.gettext('Loading the selected flight')
        break;
      case 'gpsdump' :
        msg = i18n.gettext('Tracks waiting to be received from GPS')
        break;
      case 'many':
        msg = i18n.gettext('Retrieving the list of flights in progress') 
        break;
    }    
    const rendered = Mustache.render(waitTpl, { typeimport : msg });
    document.getElementById('div_waiting').innerHTML = rendered
    $('#div_waiting').removeClass('d-none')
    $('#div_waiting').addClass('m-5 pb-5 d-block')
}

function simpleWaiting() {
  $('#table-content').removeClass('d-block')
  $('#table-content').addClass('d-none')
  $('#waiting-spin').removeClass('d-none')   
}

function simpleHideWating() {
  $('#waiting-spin').addClass('d-none')
  $('#table-content').removeClass('d-none')
  $('#table-content').addClass('d-block')   
}

function hideWaiting() {
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
    $('#table-content').removeClass('d-none')
    $('#table-content').addClass('d-block')  
}