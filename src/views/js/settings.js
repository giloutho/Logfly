var {ipcRenderer} = require('electron')
var i18n = require('../../lang/gettext.js')()
var fs = require('fs')
var path = require('path');
var log = require('electron-log')
var Store = require('electron-store')
var Mustache = require('mustache')
let menuFill = require('../../views/tpl/sidebar.js')
var store = new Store()
var dbList = null

let btnMenu = document.getElementById('toggleMenu')
var btnLogbook
var btnPilot
var btnMap
var btnMisc
var btnWeb
var btnWorkPath = document.getElementById('bt-work-path')
let currLang

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

function callPage(pageName) {
    console.log('clic page')
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

$('#sel-logbook').on('change', function() {
    if (dbList.length > 0) {
        store.set('dbFullPath',path.join(store.get('pathdb'),dbList[this.value]))
        alert(store.get('dbFullPath'));
        store.set('dbName',dbList[this.value])
    }
  });

btnWorkPath.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory',store.get('pathWork'))
    if (selectedPath != null) {
      log.info('[Work path] for '+selectedPath)
      document.getElementById('tx-work-path').value = selectedPath
    }
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
        logbook : i18n.gettext('Logbook'),
        pilot : i18n.gettext('Pilot'),
        map : i18n.gettext('Map'),
        miscell : i18n.gettext('Miscellaneous'),
        web : i18n.gettext('Web')
      };    
    let templateNav = document.getElementById('navtemplate').innerHTML;
    let navRendered = Mustache.render(templateNav, navOptions)
    console.log(navRendered)
    document.getElementById('navbarSupportedContent').innerHTML = navRendered;

    btnLogbook = document.getElementById('lnk_logbook')
    btnLogbook.addEventListener('click',(event) => {
      fnLogbook()
    })
    btnPilot = document.getElementById('lnk_pilot')
    btnPilot.addEventListener('click',(event) => {
      fnPilot()
    })
    btnMap = document.getElementById('lnk_map')
    btnMap.addEventListener('click',(event) => {
      fnMap()
    })
    btnMisc = document.getElementById('lnk_misc')
    btnMisc.addEventListener('click',(event) => {
      fnMisc()
    })
    btnWeb = document.getElementById('lnk_web')
    btnWeb.addEventListener('click',(event) => {
      fnWeb()
    })


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

function fnLogbook() {
    console.log('clic logbook')
    $('#div_logbook').show()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').hide()
    $('#div_web').hide()
}

function fnPilot() {
    console.log('clic pilot')
    $('#div_logbook').hide()
    $('#div_pilot').show()
    $('#div_map').hide()   
    $('#div_misc').hide()
    $('#div_web').hide()
}

function fnMap() {
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_map').show()   
    $('#div_misc').hide()
    $('#div_web').hide()
}

function fnMisc() {
    console.log('clic Misc')
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').show()
    $('#div_web').hide()
}

function fnWeb() {
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_map').hide()   
    $('#div_misc').hide()
    $('#div_web').show()
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