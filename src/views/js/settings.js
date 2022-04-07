var {ipcRenderer} = require('electron')
var i18n = require('../../lang/gettext.js')()
var fs = require('fs')
var path = require('path');
var log = require('electron-log')
var Store = require('electron-store')
var store = new Store()
var dbList = null


var btnLogbook = document.getElementById('lnk_logbook')
var btnPilot = document.getElementById('lnk_pilot')
var btnMap = document.getElementById('lnk_map')
var btnMisc = document.getElementById('lnk_misc')
var btnWeb = document.getElementById('lnk_web')
var btnWorkPath = document.getElementById('bt-work-path')

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


$('#sel-logbook').on('change', function() {
    if (dbList.length > 0) {
        store.set('dbFullPath',path.join(store.get('pathdb'),dbList[this.value]))
        alert(store.get('dbFullPath'));
        store.set('dbName',dbList[this.value])
    }
  });

btnLogbook.addEventListener('click',(event) => {
    console.log('clic logbook')
    $('#div_logbook').show()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').hide()
    $('#div_web').hide()
})

btnPilot.addEventListener('click',(event) => {
    console.log('clic pilot')
    $('#div_logbook').hide()
    $('#div_pilot').show()
    $('#div_map').hide()   
    $('#div_misc').hide()
    $('#div_web').hide()
})

btnMap.addEventListener('click',(event) => {
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_map').show()   
    $('#div_misc').hide()
    $('#div_web').hide()
})

btnMisc.addEventListener('click',(event) => {
    console.log('clic Misc')
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').show()
    $('#div_web').hide()
})

btnWeb.addEventListener('click',(event) => {
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').hide()
    $('#div_web').show()
})

btnWorkPath.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory',store.get('pathWork'))
    if (selectedPath != null) {
      log.info('[Work path] for '+selectedPath)
      document.getElementById('tx-work-path').value = selectedPath
    }
  })

function iniForm() {
    document.getElementById('lnk_logbook').innerHTML = i18n.gettext('Logbook')
    document.getElementById('lnk_pilot').innerHTML = i18n.gettext('Pilot')
    document.getElementById('lnk_map').innerHTML = i18n.gettext('Map')
    document.getElementById('lnk_misc').innerHTML = i18n.gettext('Miscellaneous')
    document.getElementById('lnk_web').innerHTML = i18n.gettext('Web')
    document.getElementById('lg_logbook').innerHTML = i18n.gettext('Logbook')
    document.getElementById('lg-working-path').innerHTML = i18n.gettext('Working folder path')   
    $('#tx-work-path').val(store.get('pathWork'))
    document.getElementById('bt-work-path').innerHTML = i18n.gettext('Modify')
    document.getElementById('lg-folder-path').innerHTML = i18n.gettext('Current logbook folder')
    $('#tx-log-path').val(store.get('pathdb'))
    document.getElementById('lg-curr-logbook').innerHTML = i18n.gettext('Current logbook')
    $('#lg-log-folder').val(i18n.gettext('Choose a new logbook folder'))
    document.getElementById('bt-choose-folder').innerHTML = i18n.gettext('Choose')
    $('#lg-move-logbook').val(i18n.gettext('Move logbook(s) to a different folder'))
    document.getElementById('bt-move-folder').innerHTML = i18n.gettext('Move')
    $('#lg-new-logbook').val(i18n.gettext('Create a new logbook'))
    document.getElementById('bt-new-logbook').innerHTML = i18n.gettext('Create')
    $('#lg-repatriate').val(i18n.gettext('Recover a copy'))
    document.getElementById('bt-repatriate').innerHTML = i18n.gettext('Recover')
}

function fillSelect() {

    const dirpath = store.get('pathdb')
    console.log(dirpath)
    fs.readdir(dirpath, function(err, files) {
        const dbFiles = files.filter(el => path.extname(el) === '.db')
        for(var i= 0; i < dbFiles.length; i++)
        {
            if (dbFiles[i] === store.get('dbName'))
                $("#sel-logbook").append('<option value=' + i + ' selected >' + dbFiles[i] + '</option>')
            else
                $("#sel-logbook").append('<option value=' + i + '>' + dbFiles[i] + '</option>')
        }
        dbList = dbFiles
    })
}