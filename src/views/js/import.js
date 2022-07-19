const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
let store = new Store()
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
// status messages
let statusContent = document.getElementById("status")
// waiting template 
let waitTpl = document.getElementById('wait-template').innerHTML
// buttons definition
let btnDisk = document.getElementById('imp-disk')
let btnFlymSD = document.getElementById('imp-gps-flysd')
let btnFlymOld = document.getElementById('imp-gps-flyold')
let btnFlytec20 = document.getElementById('imp-gps-fly20')
let btnFlytec15 = document.getElementById('imp-gps-fly15')
let btnSyride = document.getElementById('imp-gps-syr')
let btnSyrUsb = document.getElementById('imp-gps-syrusb')
let btnXctracer = document.getElementById('imp-gps-xct')
let btnRever = document.getElementById('imp-gps-rever')
let btnSkytrax2 = document.getElementById('imp-gps-sky2')
let btnSkytrax3 = document.getElementById('imp-gps-sky3')
let btnOudie = document.getElementById('imp-gps-oud')
let btnCPilot = document.getElementById('imp-gps-cpil')
let btnElement = document.getElementById('imp-gps-elem')
let btnConnect = document.getElementById('imp-gps-conn')
let btnSkydrop = document.getElementById('imp-gps-skydrop')
let btnVarduino = document.getElementById('imp-gps-vardui')
let btnFlynet = document.getElementById('imp-gps-flynet')
let btnSensbox = document.getElementById('imp-gps-sens')    
let btnManu = document.getElementById('imp-manu')

ipcRenderer.on('translation', (event, langJson) => {
    let currLang = store.get('lang')
    i18n.setMessages('messages', currLang, langJson)
    i18n.setLocale(currLang);
    iniForm()
  })

function iniForm() {
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    btnFlymSD.addEventListener('click',(event) => {callFlymSD()})      
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
    btnVarduino.addEventListener('click',(event) => {callVarduino()})
    btnXctracer.addEventListener('click',(event) => {callXctracer()})
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
          clearPage()
          let errorMsg = gpsStatus+' not found'
          displayStatus(errorMsg,false)      
      }
  })     
}

function callSyride() {
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
}

function callManu() {
    displayStatus('C est mon statut...',false)
}

function callDiskImport(selectedPath, statusContent) {
    try {    
      clearPage()
      displayWaiting()
      let searchDisk = ipcRenderer.sendSync('disk-import',selectedPath)
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
    let msg = i18n.gettext("Retrieving the list of flights in progress") 
    let rendered = Mustache.render(waitTpl, { typeimport : msg });
    document.getElementById('div_waiting').innerHTML = rendered;
    $('#div_waiting').addClass('m-5 pb-5 d-block')
}

function hideWaiting() {
    $('#div_waiting').removeClass('d-block')
    $('#div_waiting').addClass('d-none')
}