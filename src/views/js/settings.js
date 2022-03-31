var {ipcRenderer} = require('electron')
var fs = require('fs')
var path = require('path');
var log = require('electron-log');
var Store = require('electron-store');
var store = new Store();


var btnLogbook = document.getElementById('lnk_logbook')
var btnPilot = document.getElementById('lnk_pilot')
var btnMap = document.getElementById('lnk_map')
var btnMisc = document.getElementById('lnk_misc')
var btnWeb = document.getElementById('lnk_web')
var btnWorkPath = document.getElementById('bt-work-path')


translation()
fillSelect()

btnLogbook.addEventListener('click',(event) => {
    console.log('clic logbook')
    $('#div_logbook').show()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').hide()
})

btnPilot.addEventListener('click',(event) => {
    console.log('clic pilot')
    $('#div_logbook').hide()
    $('#div_pilot').show()
    $('#div_map').hide()   
    $('#div_misc').hide()
})

btnMisc.addEventListener('click',(event) => {
    console.log('clic Misc')
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').show()
})

btnWorkPath.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory',store.get('pathWork'))
    if (selectedPath != null) {
      log.info('[Work path] for '+selectedPath)
      document.getElementById('tx-work-path').value = selectedPath
    }
  })

function translation() {
    document.getElementById('lnk_logbook').innerHTML = i18n.gettext('Logbook')
    document.getElementById('lb-folder-path').innerHTML = i18n.gettext('Working folder path')
}

function fillSelect() {
    var options = [];
    var src = [
    { id : 1, txt : "test long 1" },
    { id : 2, txt : "test large 2" },
    { id : 3, txt : "test grand 3" }
    ];
    for (var idx in src) {
        $("#sel-logbook").append('<option value=' + src[idx].id + '>' + src[idx].txt + '</option>');
        console.log(src[idx].id+' '+src[idx].txt)
    }    
}