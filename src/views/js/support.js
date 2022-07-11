var {ipcRenderer} = require('electron')
var fs = require('fs')
var path = require('path');
var log = require('electron-log');
var i18n = require('../../lang/gettext.js')()
var Mustache = require('mustache')
var Store = require('electron-store')
var store = new Store()

var currOS = store.get('currOS')
var homedir = require('os').homedir()
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
var logmainpath = null
var logrendererpath = null
var currDisplay = null
var renderDisplay = 'render'
var mainDisplay = 'main'
var btnMainDisplay
var btnRenderDisplay
var btnClearLog
var btnSystem
var btnMail
var btnLogbook

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
      //  console.log(template)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    const navOptions = {
        logfile : i18n.gettext('Log file'),
        maindisplay : i18n.gettext('Main log display'),
        mainclear : i18n.gettext('Main log clear'),
        rendererdisplay : i18n.gettext('Renderer display'),
        rendererclear : i18n.gettext('Renderer clear'),
        systemreport : i18n.gettext('System report'),
        sendmail : i18n.gettext('Send an e-mail'),
        sendlogbook : i18n.gettext('Send logbook')
      };    
    let templateNav = document.getElementById('navtemplate').innerHTML;
    let navRendered = Mustache.render(templateNav, navOptions)
    document.getElementById('navbarSupportedContent').innerHTML = navRendered;
    btnMainDisplay = document.getElementById('main-display')
    btnMainDisplay.addEventListener('click',(event) => {
      fnMainDisplay()
    })
    btnClearLog = document.getElementById('logclear')
    btnClearLog.addEventListener('click',(event) => {
      fnClearLog()
    })
    btnRenderDisplay = document.getElementById('render-display')
    btnRenderDisplay.addEventListener('click',(event) => {
      fnRenderDisplay()
    })
    btnRenderClear = document.getElementById('render-clear')
    statusContent = document.getElementById("status")  
    btnSystem =   document.getElementById('system')
    btnSystem.addEventListener('click',(event) => {
      fnSystemDisplay()
    }) 
    btnMail = document.getElementById('email')
    btnMail.addEventListener('click',(event) => {
      fnMailDisplay()
    })     
    btnLogbook = document.getElementById('logbook')
    btnLogbook.addEventListener('click',(event) => {
      fnLogbookDisplay()
    })         
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

var dialogLang = {
  title: i18n.gettext('Please confirm'),
  message: i18n.gettext('Are you sure you want to continue')+' ?',
  yes : i18n.gettext('Yes'),
  no : i18n.gettext('No')
};

/**
 *   Default display will be renderer log file
 * 
 *   By default, electron-log writes logs to the following locations:
 *
 *   on Linux: ~/.config/{app name}/logs/{process type}.log
 *   on macOS: ~/Library/Logs/{app name}/{process type}.log
 *   on Windows: %USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log
 */
 switch (currOS) {
  case 'win':      
    logmainpath = path.join(homedir,'/Library/Logs/logfly/main.log')
    logrendererpath = path.join(homedir,'/Library/Logs/logfly/renderer.log')
    break
    case 'mac':
    logmainpath = path.join(homedir,'/Library/Logs/logfly/main.log')
    logrendererpath = path.join(homedir,'/Library/Logs/logfly/renderer.log')
    break
  case 'linux':
    logmainpath = path.join(homedir,'/Library/Logs/logfly/main.log')
    logrendererpath = path.join(homedir,'/Library/Logs/logfly/renderer.log')
    break  
}  

function fnMainDisplay() {
  currDisplay = mainDisplay
  $('#div_system').hide()   
  $('#div_mail').hide()
  $('#div_logbook').hide()
  ipcRenderer.send('read-log-main',logmainpath)
  // the result is back with ipcRenderer.on('log-lines-array')
}

function fnRenderDisplay() {
  currDisplay = renderDisplay
  $('#div_system').hide()   
  $('#div_mail').hide()
  $('#div_logbook').hide()
  ipcRenderer.send('read-log-render',logrendererpath)
  // the result is back with ipcRenderer.on('log-lines-array')
}

function fnSystemDisplay() {
  $('#div_tablelog').hide()
  $('#div_system').show()   
  $('#div_mail').hide()
  $('#div_logbook').hide()
}

function fnMailDisplay() {
  $('#div_tablelog').hide()
  $('#div_system').hide()   
  $('#div_mail').show()
  $('#div_logbook').hide()
}

function fnLogbookDisplay() {
  $('#div_tablelog').hide()
  $('#div_system').hide()   
  $('#div_mail').hide()
  $('#div_logbook').show()
}

function fnClearLog() {
  ipcRenderer.send('open-confirmation-dialog', dialogLang)
  // result come with ipcRenderer.on('confirmation-dialog' 
}

function displayLogLines(logLines) {
  let tabletitle = 'Unknown display'
  if ( $.fn.dataTable.isDataTable( '#tablelog' ) ) {
    $('#tablelog').DataTable().clear().destroy()
  }   
  let nbLines = logLines.length - 1
  switch (currDisplay) {
    case mainDisplay:
      tabletitle = 'Main log : '+nbLines+' '+'lines'
      break;
    case renderDisplay:
      tabletitle = 'Renderer log : '+nbLines+' '+'lines'
      break;
  }
  var dataTableOption = {
    data: logLines,
    columns: [  
      { title : tabletitle, data: 'content'},
    ],     
    // change color according cell value -> http://live.datatables.net/tohehohe/1/edit
    'createdRow': function( row, data, dataIndex ) {
      if ( data['class'] === 'warning') {        
        $(row).addClass('importred');
      } else if ( data['class'] === 'error') {        
        $(row).addClass('logerror');
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
  }
  table = $('#tablelog').DataTable(dataTableOption )
  $('#wholetable').removeClass('d-none') 
  $('#status').hide();
}

ipcRenderer.on('log-lines-array', (event, logLines) => {
  if (logLines.length > 0) {
    displayLogLines(logLines)
    $('#div_tablelog').show()
  } else {
    $('#wholetable').addClass('d-none') 
    statusContent.innerHTML = i18n.gettext('The file is empty or non-existent')
    $('#status').show();    
  }
})

ipcRenderer.on('confirmation-dialog', (event, response) => {
  if (response) {
    switch (currDisplay) {
      case mainDisplay:
        fs.writeFileSync(logmainpath, '')
        log.warn('The main log file has been erased')
        ipcRenderer.send('read-log-main',logmainpath)        
        break;
      case renderDisplay:        
        fs.writeFileSync(logrendererpath, '')
        log.warn('The renderer log file has been erased')
        ipcRenderer.send('read-log-render',logrendererpath)           
        break;
    }
  }
  else {
    console.log('currdisplay : '+currDisplay)
  }
})