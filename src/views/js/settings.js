var {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const fs = require('fs')
const path = require('path');
const log = require('electron-log')
const Store = require('electron-store')
const Mustache = require('mustache')
let menuFill = require('../../views/tpl/sidebar.js')
const store = new Store()
let dbList = null
let currLang

const btnMenu = document.getElementById('toggleMenu')
const btnWorkPath = document.getElementById('bt-work-path')
const imgWorkPath = document.getElementById("img-work-path")
const btnDbPath = document.getElementById('bt-choose-folder') 
const imgLogPath = document.getElementById('img-log-path') 
const imgDbName = document.getElementById('img-dbname') 
const btnMove = document.getElementById('bt-move-folder')
const btnLogbook = document.getElementById('tablog')
const btnPilot = document.getElementById('tabpilot')
const btnMap = document.getElementById('tabmap')
const btnMisc = document.getElementById('tabmisc')
const btnWeb = document.getElementById('tabweb')
const btnValid = document.getElementById('bt-valid')

iniForm()

function iniForm() {
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
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        const template = $(templates).filter('#temp-menu').html();  
        const rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    btnLogbook.innerHTML = i18n.gettext('Logbook')
    btnLogbook.addEventListener('click',(event) => {
      fnLogbook()
    })
    iniLogbook()
    btnPilot.innerHTML = i18n.gettext('Pilot')
    btnPilot.addEventListener('click',(event) => {
      fnPilot()
    })
    btnMap.innerHTML = i18n.gettext('Map')
    btnMap.addEventListener('click',(event) => {
      fnMap()
    })
    btnMisc.innerHTML = i18n.gettext('Miscellaneous')
    btnMisc.addEventListener('click',(event) => {
      fnMisc()
    })
    btnWeb.innerHTML = i18n.gettext('Web')
    btnWeb.addEventListener('click',(event) => {
      fnWeb()
    })    
    btnValid.innerHTML = i18n.gettext('Validate the changes')
}


function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

btnMenu.addEventListener('click', (event) => {
  if (btnMenu.innerHTML === "Menu On") {
    alert(imgLogPath.src)
      btnMenu.innerHTML = "Menu Off";
  } else {
      btnMenu.innerHTML = "Menu On";
  }
  $('#sidebar').toggleClass('active');
})

$('#sel-logbook').on('change', function() {
  if (dbList.length > 0) {
    //  store.set('dbFullPath',path.join(store.get('pathdb'),dbList[this.value]))
    //  alert(store.get('dbFullPath'));

    /**  On fera la vérif à la fin
      let msgConfirm = dbList[this.value]+' '+i18n.gettext('will become the current logbook')+' ?'
      let confirmChange = confirm(msgConfirm)
      if (confirmChange) changeLogBook(dbList[this.value])      
    */
  }
});

function iniLogbook() {
  let pathDb = store.get('pathdb')
  let dbName = store.get('dbName')
  // translation
  document.getElementById('lg_logbook').innerHTML = i18n.gettext('Logbook')
  document.getElementById('lg-working-path').innerHTML = i18n.gettext('Working folder path')   
  $('#tx-work-path').val(store.get('pathWork'))
  imgWorkPath.src='../../assets/img/valid.png'
  btnWorkPath.innerHTML = i18n.gettext('Modify')
  document.getElementById('lg-folder-path').innerHTML = i18n.gettext('Logbook(s) folder path')
  $('#tx-log-path').val(pathDb)
  imgLogPath.src='../../assets/img/valid.png'
  imgDbName.src='../../assets/img/valid.png'
  btnDbPath.innerHTML = i18n.gettext('Modify')
  fillSelect(pathDb,dbName)
  document.getElementById('lg-curr-logbook').innerHTML = i18n.gettext('Current logbook')
  $('#lg-log-folder').val(i18n.gettext('Choose a new logbook folder'))
  document.getElementById('bt-choose-folder').innerHTML = i18n.gettext('Choose')
  $('#lg-move-logbook').val(i18n.gettext('Move logbook(s) to a different folder'))
  document.getElementById('bt-move-folder').innerHTML = i18n.gettext('Move')
  $('#lg-new-logbook').val(i18n.gettext('Create a new logbook'))
  document.getElementById('bt-new-logbook').innerHTML = i18n.gettext('Create')
  $('#lg-repatriate').val(i18n.gettext('Recover a copy'))
  document.getElementById('bt-repatriate').innerHTML = i18n.gettext('Recover')
  // Assignment of the listeners
  btnWorkPath.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory',store.get('pathWork'))
    if (selectedPath != null) {
      document.getElementById('tx-work-path').value = selectedPath
    }
  })
  btnDbPath.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory')
    if (selectedPath != null) {
      document.getElementById('tx-log-path').value = selectedPath
      fillSelect(selectedPath,'')
    }
  })  
  btnMove.addEventListener('click', (event)=> {
    const selectedPath = ipcRenderer.sendSync('open-directory')
    if (selectedPath != null) {
      let msgConfirm = i18n.gettext('Move logbook(s) to')+' '+selectedPath
      let confirmChange = confirm(msgConfirm)
      if (confirmChange) {
       // changeLogBook(dbList[this.value])      

        // document.getElementById('tx-log-path').value = selectedPath
        // fillSelect(selectedPath,'')
      }
    }
  })
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

function fillSelect(dirpath, selectCurrent) {
    $("#sel-logbook").empty()
    imgDbName.src='../../assets/img/close.png'
    fs.readdir(dirpath, function(err, files) {
        const dbFiles = files.filter(el => path.extname(el) === '.db')
        dbFiles.sort()
        dbFiles.unshift(i18n.gettext('Select and clic OK'))
        if (dbFiles.length < 2) {
          imgLogPath.src='../../assets/img/close.png'
        } else {
          imgLogPath.src='../../assets/img/valid.png'
        }
        for(let i= 0; i < dbFiles.length; i++)
        {            
            if (selectCurrent != '' && dbFiles[i] === selectCurrent) {
                $("#sel-logbook").append('<option value=' + i + ' selected >' + dbFiles[i] + '</option>') 
                imgDbName.src='../../assets/img/valid.png'               
            } else
                $("#sel-logbook").append('<option value=' + i + '>' + dbFiles[i] + '</option>')
        }
        dbList = dbFiles
    })
}

function checkSettings() {
  // vérifier qu'il y a un carnet sélectionné (on peut rester sur OK)
  // qu'il est valide
}