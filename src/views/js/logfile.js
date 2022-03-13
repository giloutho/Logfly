var {ipcRenderer} = require('electron')
var fs = require('fs')
var path = require('path');
var log = require('electron-log');
var currOS = store.get('currOS')
var homedir = require('os').homedir()

var logmainpath = null
var logrendererpath = null
var currDisplay = null
var renderDisplay = 'render'
var mainDisplay = 'main'

var btnMainDisplay = document.getElementById('main-display')
var btnMainClear = document.getElementById('main-clear')
var btnRenderDisplay = document.getElementById('render-display')
var btnRenderClear = document.getElementById('render-clear')
var statusContent = document.getElementById("status")

var dialogLang = {
  title: i18n.gettext('Please confirm'),
  message: i18n.gettext('Are you sure you want to continue')+' ?',
  yes : i18n.gettext('Yes'),
  no : i18n.gettext('No')
};

/**
 *       Default display will be renderer log file
 * 
 * By default, electron-log writes logs to the following locations:
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

if (logrendererpath != null) {
  currDisplay = renderDisplay
  ipcRenderer.send('read-log-render',logrendererpath)
  // ipcRenderer.on('log-lines-array') send result
}

btnRenderDisplay.addEventListener('click',(event) => {
  currDisplay = renderDisplay
  ipcRenderer.send('read-log-render',logrendererpath)
  // the result is back with ipcRenderer.on('log-lines-array') 
})

btnMainDisplay.addEventListener('click',(event) => {
  currDisplay = mainDisplay
  ipcRenderer.send('read-log-main',logmainpath)
  // the result is back with ipcRenderer.on('log-lines-array') 
})

ipcRenderer.on('log-lines-array', (event, logLines) => {
  if (logLines.length > 0) {
    displayLogLines(logLines)
  } else {
    $('#wholetable').addClass('d-none') 
    statusContent.innerHTML = i18n.gettext('The file is empty or non-existent')
    $('#status').show();    
  }
})

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

btnMainClear.addEventListener('click',(event) => {
  currDisplay = mainDisplay
  ipcRenderer.send('open-confirmation-dialog', dialogLang)
  // ipcRenderer.on('confirmation-dialog' send result
})

btnRenderClear.addEventListener('click',(event) => {
  currDisplay = renderDisplay
  ipcRenderer.send('open-confirmation-dialog', dialogLang)
  // ipcRenderer.on('confirmation-dialog' send result
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
})
