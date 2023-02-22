const {ipcRenderer, net} = require('electron')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const Store = require('electron-store')
const store = new Store()
const currOS = store.get('currOS')
const gpsDumpFiles = require('../../settings/gpsdump-settings.js')
const gpsDumpNames = gpsDumpFiles.getGpsdumpNames()
const homedir = require('os').homedir()
const menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
let logmainpath = null
let logrendererpath = null
let currDisplay = null
let renderDisplay = 'render'
let mainDisplay = 'main'
let loadLangTime
let currLang 

iniForm()         

function iniForm() {
  let start = performance.now()
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
    loadLangTime = performance.now()-start;
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
      //  console.log(template)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    const navOptions = {
        logfile : i18n.gettext('Log files'),
        maindisplay : i18n.gettext('Main log display'),
        mainclear : i18n.gettext('Main log clear'),
        rendererdisplay : i18n.gettext('Renderer display'),
        rendererclear : i18n.gettext('Renderer clear'),
        systemreport : i18n.gettext('System report'),
        infos : i18n.gettext('Infos'),
        sendmail : i18n.gettext('Send an e-mail'),
        sendlogbook : i18n.gettext('Send logbook')
      };    
    let templateNav = document.getElementById('navtemplate').innerHTML;
    let navRendered = Mustache.render(templateNav, navOptions)
    document.getElementById('navbarSupportedContent').innerHTML = navRendered;
    const btnMainDisplay = document.getElementById('main-display')
    btnMainDisplay.addEventListener('click',(event) => {
      fnMainDisplay()
    })
    btnClearLog = document.getElementById('logclear')
    btnClearLog.addEventListener('click',(event) => {
      fnClearLog()
    })
    const btnRenderDisplay = document.getElementById('render-display')
    btnRenderDisplay.addEventListener('click',(event) => {
      fnRenderDisplay()
    })
    const btnRenderClear = document.getElementById('render-clear')
    statusContent = document.getElementById("status")  
    const btnSystem = document.getElementById('system')
    btnSystem.addEventListener('click',(event) => {
      fnSystemDisplay()
    }) 

    document.getElementById('infos').addEventListener('click',(event) => {
      callPage('infos')
    }) 

    const btnMail = document.getElementById('email')
    btnMail.addEventListener('click',(event) => {
      fnMailDisplay()
    })     
    const btnLogbook = document.getElementById('logbook')
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
    // electron-log default path : %USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log 
    // logmainpath = path.join(homedir,'/Library/Logs/logfly/main.log')
    // logrendererpath = path.join(homedir,'/Library/Logs/logfly/renderer.log')    
    logmainpath = path.join(homedir,'AppData/Roaming/logfly/logs/main.log')
    logrendererpath = path.join(homedir,'AppData/Roaming/logfly/logs/renderer.log')
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
  ipcRenderer.send('read-log-main',logmainpath)    // process-main/files-utils/read-log.js
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
  let customReport = []
  customReport.push(['Logfly version',store.get('version')])
  customReport.push(['OS',store.get('currOS')])
  customReport.push(['Version',store.get('osVersion')])
  customReport.push(['System Locale',store.get('locale')])
  let currLang = store.get('lang')
  console.log('currlang '+currLang)
  if (currLang != undefined && currLang != 'en') {
    customReport.push(['Language used',store.get('lang')])
    let loadLang = (Math.round(loadLangTime * 100) / 100).toFixed(2);
    customReport.push(['Language file loading time',`${loadLang} milliseconds`])
  } else {
    customReport.push(['Language used','default (en)'])
    customReport.push(['Language file loading time',''])
  }
  customReport.push(['Electron',store.get('electronVersion')])
  customReport.push(['Chrome',store.get('chromeVersion')])
  customReport.push(['Node',store.get('nodeVersion')])
  customReport.push(['GpsDump Windows',gpsDumpNames['win']])
  customReport.push(['GpsDump Mac 64 bit',gpsDumpNames['mac64']])
  customReport.push(['GpsDump Mac 32 bit',gpsDumpNames['mac32']])
  customReport.push(['GpsDump Linux',gpsDumpNames['linux']])
  customReport.push([' ',' '])
  // test db
  let dbFullPath = (store.get('dbFullPath'))
  customReport.push(['Current db path',store.get('dbFullPath')])
  let stats = fs.statSync(store.get('dbFullPath'))
  let dbSize = nFormatter(stats.size, 1)
  customReport.push(['Db size',`${dbSize}`])
  try {
      if (fs.existsSync(dbFullPath)) {
          const db = require('better-sqlite3')(dbFullPath)   
          const stmtSites = db.prepare('SELECT COUNT(*) FROM Site')
          let countSites = stmtSites.get()
          customReport.push(['Number of items in the file Sites',`${countSites['COUNT(*)']}`])
          const stmtFlights = db.prepare('SELECT COUNT(*) FROM Vol')
          let countFlights = stmtFlights.get()
          customReport.push(['Number of items in the file Vol',`${countFlights['COUNT(*)']}`])
      } else {
          customReport.push(['<b>Error</b>','db checked file not exist'])
      }        
  } catch (error) {
      customReport.push(['<b>Error occured during db checking r</b>',error])
  }

  // Add blank line
  customReport.push(['========================================',''])
  customReport.push(['<b>Config file</b>',store.path])

  let rawconfig = fs.readFileSync(store.path)
  let jsonconfig = JSON.parse(rawconfig);
  // JSON.parse not enought. Must be transformed in array of array
  const arrConfig = Object.keys(jsonconfig).map((key) => [key, jsonconfig[key]]);
  let finalReport = customReport.concat(arrConfig)
  var dataTableConfig = {
    data: finalReport,
    columns: [  
      { title: 'Key' },
      { title: 'Value' }
    ],     
    destroy: true,
    bInfo : false,          // hide "Showing 1 to ...  row selected"
    lengthChange : false,   // hide "show x lines"  end user's ability to change the paging display length 
    searching : false,      // hide search abilities in table
    ordering: false,        // Sinon la table est triée et écrase le tri sql
    pageLength: 14,         // ce sera à calculer avec la hauteur de la fenêtre
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

  let table = $('#table_config').DataTable(dataTableConfig )


 
// $(document).ready(function () {
//     $('#table_config').DataTable({
//         data: arrConfig,
//         columns: [
//             { title: 'Id' },
//             { title: 'Value' },
//         ],
//     });
// });


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

function nFormatter(num, digits) {
  const lookup = [
    { value: 1, symbol: "" },
    { value: 1e3, symbol: "k" },
    { value: 1e6, symbol: "M" },
    { value: 1e9, symbol: "G" },
    { value: 1e12, symbol: "T" },
    { value: 1e15, symbol: "P" },
    { value: 1e18, symbol: "E" }
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup.slice().reverse().find(function(item) {
    return num >= item.value;
  });
  return item ? (num / item.value).toFixed(digits).replace(rx, "$1") + item.symbol : "0";
}