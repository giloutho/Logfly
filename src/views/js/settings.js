const {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const fs = require('fs')
const jetpack = require('fs-jetpack')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const Mustache = require('mustache')
const inputMask = require('inputmask')
const dbbasic = require('../../utils/db/db-basic.js')
const settingsList = require('../../settings/settings-list.js')
let menuFill = require('../../views/tpl/sidebar.js')
const { Alert } = require('bootstrap')
const store = new Store()
let dbList = null
let currLang

const btnMenu = document.getElementById('toggleMenu')
const btnWorkPath = document.getElementById('bt-work-path')
const imgWorkPath = document.getElementById("img-work-path")
const btnDbPath = document.getElementById('bt-choose-folder') 
const imgLogPath = document.getElementById('img-log-path') 
const imgDbName = document.getElementById('img-dbname') 
const selectDb = document.getElementById('sel-logbook') 
const btnMove = document.getElementById('bt-move-folder')
const btnNewLog = document.getElementById('bt-new-logbook')
const btnCopy = document.getElementById('bt-repatriate')
const btnLogbook = document.getElementById('tablog')
const btnPilot = document.getElementById('tabpilot')
const btnGen = document.getElementById('tabgen')
const btnMisc = document.getElementById('tabmisc')
const btnWeb = document.getElementById('tabweb')
const btnValLog = document.getElementById('bt-log-ok')
const btnCancelLog = document.getElementById('bt-log-cancel')
const btnValPil = document.getElementById('bt-pil-ok')
const btnCancelPil = document.getElementById('bt-pil-cancel')
const btnValGen = document.getElementById('bt-gen-ok')
const btnCancelGen = document.getElementById('bt-gen-cancel')
const btnValWeb = document.getElementById('bt-web-ok')
const btnCancelWeb = document.getElementById('bt-web-cancel')
const oldDbName = store.get('dbName')
const oldPathDb = store.get('pathdb')
const oldPathWork = store.get('pathWork')
const oldDbFullPath = store.get('dbFullPath')
const btnPathImport = document.getElementById('bt-import')
const btnPathExport = document.getElementById('bt-export')
const btnPathSyride = document.getElementById('bt-syride')
const selectGps = document.getElementById("sel-gps")
const selectLeague = document.getElementById("sel-league")
const selectLang = document.getElementById("sel-lang")
const selectStart = document.getElementById("sel-start")
const selectOver = document.getElementById("sel-over")
const selectMap = document.getElementById("sel-map")
const selectPhoto = document.getElementById("sel-photos")
const selectMenu = document.getElementById("sel-menu")
const txLatDd = document.getElementById('tx-lat-dd')
const txLongDd = document.getElementById('tx-long-dd')

let latDD = 0
let longDD = 0

iniForm()



function iniForm() {
    try {    
      document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'  
      currLang = store.get('lang')
      if (currLang != undefined && currLang != 'en') {
          currLangFile = currLang+'.json'
          let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile))
          let langjson = JSON.parse(content)
          i18n.setMessages('messages', currLang, langjson)
          i18n.setLocale(currLang)
      }
    } catch (error) {
        log.error('[problem.js] Error while loading the language file')
    }  
    // let menuOptions = menuFill.fillMenuOptions(i18n)
    // $.get('../../views/tpl/sidebar.html', function(templates) { 
    //     const template = $(templates).filter('#temp-menu').html()  
    //     const rendered = Mustache.render(template, menuOptions)
    //     document.getElementById('target-sidebar').innerHTML = rendered
    // })
    translateLabels()
    const maskLatDd = new Inputmask({
      mask: '[-]9{1,2}.9{5}'        
    })
    maskLatDd.mask(txLatDd)

    $("#tx-lat-dd").on('focusout', function(){    
      const degrees = txLatDd.value.replaceAll('_','')
      if (degrees != '') {
          latDD = degrees
      }
    })    

    const maskLongDd = new Inputmask({
        mask: '[-]9{1,3}.9{5}'
    })
    maskLongDd.mask(txLongDd)

    $("#tx-long-dd").on('focusout', function(){    
      const degrees = txLongDd.value.replaceAll('_','')
      if (degrees != '') {
          longDD = degrees
      }
    })       

    btnLogbook.addEventListener('click',(event) => {
      fnLogbook()
    })
    iniLogbook()
    btnPilot.addEventListener('click',(event) => {
      fnPilot()
    })
    iniPilot()

    btnGen.addEventListener('click',(event) => {
      fnGeneral()
    })
    iniGeneral()
    btnWeb.addEventListener('click',(event) => {
      fnWeb()
    })    
    iniWeb()
}

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

function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName)    // main.js
}

btnMenu.addEventListener('click', (event) => {
  if (btnMenu.innerHTML === "Menu On") {
      btnMenu.innerHTML = "Menu Off"
  } else {
      btnMenu.innerHTML = "Menu On"
  }
  $('#sidebar').toggleClass('active')
})

$('#sel-logbook').on('change', function() {
  if (dbList.length > 0) {
    let newDbName = dbList[this.value]
    let currPathDb = document.getElementById('tx-log-path').value
    let newDbFullPath = path.join(currPathDb,newDbName) 
    const resDb = dbbasic.testDb(newDbFullPath)
    if (resDb != null) {
        store.set('lastyear',resDb)
      document.getElementById("img-dbname").src='../../assets/img/valid.png'       
    } else {
      alert(i18n.gettext('Reading problem in logbook'))
    }
  }
})

function iniLogbook() {
  let pathDb = store.get('pathdb')
  let dbName = store.get('dbName')
  // translation
  $('#tx-work-path').val(store.get('pathWork'))
  imgWorkPath.src='../../assets/img/valid.png'
  $('#tx-log-path').val(pathDb)
  imgLogPath.src='../../assets/img/valid.png'
  imgDbName.src='../../assets/img/valid.png'
  fillSelect(pathDb,dbName)
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
        moveLogbooks(selectedPath)
       // changeLogBook(dbList[this.value])      

        // document.getElementById('tx-log-path').value = selectedPath
        // fillSelect(selectedPath,'')
      }
    }
  })
  btnNewLog.addEventListener('click',(event)=>{
    let newDbName = document.getElementById('tx-create-logbook').value
    if (newDbName != undefined && newDbName != '') {
        document.getElementById('tx-create-logbook').value = ''
        createLogbook(newDbName)
    } else {
        alert(i18n.gettext('Logbook name is empty'))
    }
  })
  btnCopy.addEventListener('click', (event) => {
    const selectedFile = ipcRenderer.sendSync('open-file','')
    if(selectedFile.fullPath != null) {
        copyLogbook(selectedFile.fullPath)
    }
  })  

  btnValLog.addEventListener('click', (event)=>{
    // check logbook parameters
    if (checkLogbooks()) {
      ipcRenderer.send("changeWindow", 'logbook')    // main.js
    } else {
      alert(i18n.gettext('The new settings are not correct'))
    }
  })

  btnCancelLog.addEventListener('click',(event)=>{
    let msgConfirm = i18n.gettext('Return to the original settings')+' ?'
    let confirmCancel = confirm(msgConfirm)
    if (confirmCancel) restoreSettings()
  })

}

function iniPilot() {
    btnValPil.innerHTML = i18n.gettext('Ok')
    btnCancelPil.innerHTML = i18n.gettext('Cancel')
    setGps = settingsList.getAllGps()
    for (let index in setGps ) {
      var gps = setGps[index]
      selectGps.options[selectGps.options.length] = new Option(gps.val, gps.key)
    }  

    setLeagues = settingsList.getLeagues()
    for (let index in setLeagues ) {
      var _league = setLeagues[index]
      selectLeague.options[selectLeague.options.length] = new Option(_league.val, _league.key)
    }  

    btnValPil.addEventListener('click', (event)=>{
      store.set('defpilot',document.getElementById('tx-pilotname').value)
      store.set('priorpilot',document.getElementById('check-pilot').checked)
      store.set('defglider',document.getElementById('tx-glider').value)
      store.set('priorglider',document.getElementById('check-glider').checked)
      store.set('pilotmail',document.getElementById('tx-pilotmail').value)
      store.set('pilotid',document.getElementById('tx-login').value)
      store.set('pilotpass',document.getElementById('tx-pass').value)
      store.set('gps',selectGps.value)
      store.set ('gps-usb',document.getElementById('tx-gps-usb').value)
      store.set('gpsnewflights',document.getElementById('check-gps-limit').checked)
      store.set('league',selectLeague.value)
      alert(i18n.gettext('Saved changes'))
      ipcRenderer.send("changeWindow", 'logbook')    // main.js
    })
  
    btnCancelPil.addEventListener('click',(event)=>{
      let msgConfirm = i18n.gettext('Return to the original settings')+' ?'
      let confirmCancel = confirm(msgConfirm)
      if (confirmCancel) iniPilotSettings()
    })    

    iniPilotSettings()
}

function iniGeneral() {
  selectLang.innerHTML = null
  setLang = settingsList.getLanguages(i18n)
  for (let index in setLang ) {
    var _lang = setLang[index]
    selectLang.options[selectLang.options.length] = new Option(_lang.val, _lang.key)
  }  

  selectStart.innerHTML = null
  setStart = settingsList.getStart(i18n)
  for (let index in setStart ) {
    var _start = setStart[index]
    selectStart.options[selectStart.options.length] = new Option(_start.val, _start.key)
  }  

  selectOver.innerHTML = null
  setOver = settingsList.getOverview(i18n)
  for (let index in setOver ) {
    var _over = setOver[index]
    selectOver.options[selectOver.options.length] = new Option(_over.val, _over.key)
  }  

  selectMap.innerHTML = null
  setMaps = settingsList.getMaps()
  for (let index in setMaps ) {
    var _map = setMaps[index]
    selectMap.options[selectMap.options.length] = new Option(_map.val, _map.key)
  }  

  selectPhoto.innerHTML = null
  selectPhoto.options[selectPhoto.options.length] = new Option(i18n.gettext('No'),'no')
  selectPhoto.options[selectPhoto.options.length] = new Option(i18n.gettext('Yes'),'yes')

  selectMenu.innerHTML = null
  selectMenu.options[selectMenu.options.length] = new Option(i18n.gettext('No'),'no')
  selectMenu.options[selectMenu.options.length] = new Option(i18n.gettext('Yes'),'yes')

  const btnPathImport = document.getElementById('bt-import')
  btnPathImport.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory')
    if (selectedPath != null) {
      document.getElementById('tx-import').value = selectedPath
    }
  }) 

  const btnPathExport = document.getElementById('bt-export')
  btnPathExport.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory')
    if (selectedPath != null) {
      document.getElementById('tx-export').value = selectedPath
    }
  }) 

  const btnPathSyride = document.getElementById('bt-syride')
  btnPathSyride.addEventListener('click', (event) => {
    const selectedPath = ipcRenderer.sendSync('open-directory')
    if (selectedPath != null) {
      document.getElementById('tx-syride').value = selectedPath
    }
  }) 

  btnValGen.addEventListener('click', (event)=>{
    const langChoosed = selectLang.value
    if (langChoosed != store.get('lang')) {
      currLang = langChoosed
      if (currLang != undefined && currLang != 'en') {
        currLangFile = currLang+'.json'
        let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile))
        let langjson = JSON.parse(content)
        i18n.setMessages('messages', currLang, langjson)
        i18n.setLocale(currLang)
        translateLabels()
    } else {
        i18n.setLocale(currLang)
        translateLabels()
    }

    }
    store.set('lang',langChoosed)
    store.set('start',selectStart.value)
    store.set('over',selectOver.value)
    store.set('map',selectMap.value)
    store.set('pathimport',document.getElementById('tx-import').value)
    store.set('pathexport',document.getElementById('tx-export').value)
    store.set('pathsyride',document.getElementById('tx-syride').value)    
    if (longDD != 0) store.set('finderlong',longDD)
    if (latDD != 0) store.set('finderlat',latDD)
    store.set('photo',selectPhoto.value) 
    store.set('menufixed',selectMenu.value)   
    alert(i18n.gettext('Saved changes'))
    ipcRenderer.send("changeWindow", 'logbook')    // main.js
  })  

  btnCancelGen.addEventListener('click',(event)=>{
    let msgConfirm = i18n.gettext('Return to the original settings')+' ?'
    let confirmCancel = confirm(msgConfirm)
    if (confirmCancel) {
      iniGeneralsettings()
    }
  })    
  
  iniGeneralsettings()
}

function iniWeb() {
  btnValWeb.addEventListener('click', (event)=>{
    store.set('urllogfly',document.getElementById('tx-logfly').value)
    store.set('urllogflyigc',document.getElementById('tx-visu').value)
    store.set('urlvisu',document.getElementById('tx-flyxc').value)    
    store.set('urlairspace',document.getElementById('tx-airspace').value)
    store.set('urlcontest',document.getElementById('tx-contest').value)   
    alert(i18n.gettext('Saved changes')) 
    ipcRenderer.send("changeWindow", 'logbook')    // main.js
  })  

  btnCancelWeb.addEventListener('click',(event)=>{
    let msgConfirm = i18n.gettext('Return to the original settings')+' ?'
    let confirmCancel = confirm(msgConfirm)
    if (confirmCancel) {
      iniWebSettings()
    }
  })    

  iniWebSettings()
}

function fnLogbook() {
    $('#div_logbook').show()
    $('#div_pilot').hide()
    $('#div_gen').hide()   
    $('#div_web').hide()
}

function fnPilot() {
    $('#div_logbook').hide()
    $('#div_pilot').show()
    $('#div_gen').hide()   
    $('#div_web').hide()
}

function fnGeneral() {
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_gen').show()   
    $('#div_web').hide()
}

function fnWeb() {
    $('#div_logbook').hide()
    $('#div_pilot').hide()
    $('#div_gen').hide()   
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

function createLogbook(newDbName) {
  // remove extension if needed
  newDbName.replace(/\.[^/.]+$/, "")
  // add db extension
  newDbName += '.db' 
  let pathDb = document.getElementById('tx-log-path').value
  if (fs.existsSync(pathDb)) {
      let newDbFullPath = path.join(pathDb,newDbName)
      if (dbbasic.createDb(newDbFullPath)) {
          fillSelect(pathDb,newDbName)
      }        
  } else {
      document.getElementById("img-log-path").src='../../assets/img/close.png'
      alert(i18n.gettext('Logbook(s) folder path does not exist'))
  }  
}

function copyLogbook(fullPathRep) {
  btnCopy.classList.remove('btn-outline-info')
  btnCopy.classList.add('btn-danger')
  let msgWait = i18n.gettext('Waiting')
  btnCopy.innerHTML = msgWait    
  setTimeout(function() {
      let newDbName = path.basename(fullPathRep)
      let pathDb = document.getElementById('tx-log-path').value
      if (dbbasic.testDb(fullPathRep)) {           
              if (fs.existsSync(pathDb)) {
                  let newDbFullPath = path.join(pathDb,newDbName)
                  fs.copyFileSync(fullPathRep, newDbFullPath)
                  if (dbbasic.testDb(newDbFullPath)) {
                      fillSelect(pathDb,newDbName)     
                  } else {
                      alert(newDbFullPath+' -> '+i18n.gettext('Database connection failed'))
                  }      
              } else {
                  document.getElementById("img-log-path").src='../../assets/img/close.png'
                  alert(i18n.gettext('Logbook(s) folder path does not exist'))
              }  
          
      } else {
          alert(fullPathRep+' -> '+i18n.gettext('Database connection failed'))
      }   
      btnCopy.classList.remove('btn-danger')
      btnCopy.classList.add('btn-outline-info')
      btnCopy.innerHTML = i18n.gettext('Select')
  }, 2000)    // This is a trick to refresh the text and the color of the button
} 

function moveLogbooks(pathDest) {
  let pathDb = document.getElementById('tx-log-path').value
  if (fs.existsSync(pathDb)) {      
      let dbName = $('#sel-logbook :selected').text()
      if (dbName != undefined && dbName != '') {
        btnMove.classList.remove('btn-outline-info')
        btnMove.classList.add('btn-danger')
        let msgWait = i18n.gettext('Waiting')
        btnMove.innerHTML = msgWait 
        setTimeout(function() {
          jetpack.copy(pathDb, pathDest, { 
            matching: "*.db",
            overwrite: true
          })
          alert(i18n.gettext('Transfer completed'))
          // to move files it was 
          // let nbMoved = 0
          // const src = jetpack.cwd(pathDb)
          // const dst = jetpack.cwd(pathDest)
          // src.find({ matching: "*.db" }).forEach(filePath => {
          //   src.move(filePath, dst.path(filePath))
          //   nbMoved++
          // })
          // alert(nbMoved+' '+i18n.gettext('files moved'))
          if (fs.existsSync(pathDest)) {          
            let newDbFullPath = path.join(pathDest,dbName)
            if (dbbasic.testDb(newDbFullPath)) {
              document.getElementById('tx-log-path').value = pathDest
              imgLogPath.src='../../assets/img/valid.png'
              fillSelect(pathDest,dbName)
            }        
          } else {
            document.getElementById("img-log-path").src='../../assets/img/close.png'
            alert(i18n.gettext('Logbook(s) folder path does not exist'))
          }  
          btnMove.classList.remove('btn-danger')
          btnMove.classList.add('btn-outline-info')
          btnMove.innerHTML = i18n.gettext('Select')
        }, 2000)    // This is a trick to refresh the text and the color of the button
      } else {
        alert(i18n.gettext('Current logbook name is empty'))
      }
  } else {
    alert(i18n.gettext('The source db folder does not exist'))
  }      
}

/**
 * a function with standard fs.rename
 * Problem it does not work with usb sticks or virtual drives
 */
function moveLogbooksOld(pathDest) {
  let pathDb = document.getElementById('tx-log-path').value
  if (fs.existsSync(pathDb)) {
    fs.readdir(pathDb, function(err, files) {
      let nbMoved = 0
      const dbFiles = files.filter(el => path.extname(el) === '.db')
      btnMove.classList.remove('btn-outline-info')
      btnMove.classList.add('btn-danger')
      let msgWait = i18n.gettext('Waiting')
      btnMove.innerHTML = msgWait    
      for (let i = dbFiles.length - 1; i >= 0; i--) {
        let srcFullPath = path.join(pathDb,dbFiles[i]) 
        let destFullPath = path.join(pathDest,dbFiles[i]) 
        try {
          fs.renameSync(srcFullPath, destFullPath)
          nbMoved++
        } catch (error) {
          alert(i18n.gettext('An error occurred during the transfer'+' '+error))
        }
      }
      btnMove.classList.remove('btn-danger')
      btnMove.classList.add('btn-outline-info')
      btnMove.innerHTML = i18n.gettext('Select')
    })
  } else {
    alert(i18n.gettext('The source folder does not exist'))
  }
}

function checkLogbooks() {
  let result = false
  let pathDb = document.getElementById('tx-log-path').value
  if (fs.existsSync(pathDb)) {      
      let dbName = $('#sel-logbook :selected').text()
      if (dbName != undefined && dbName != '') {
        let newDbFullPath = path.join(pathDb,dbName)  
        const resTest = dbbasic.testDb(newDbFullPath)         
            if (resTest != null) {
              store.set('dbName',dbName)
	            store.set('pathdb',pathDb)
		          store.set('pathWork', document.getElementById('tx-work-path').value)
	            store.set('dbFullPath', newDbFullPath)
              alert(i18n.gettext('Saved changes'))
              document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'
              result = true
            }
      }
  }
  return result
}

function restoreSettings() {
  document.getElementById('tx-work-path').value = oldPathWork
  document.getElementById('tx-log-path').value = oldPathDb
  fillSelect(oldPathDb,oldDbName)
}

function iniPilotSettings() {
  document.getElementById('tx-pilotname').value = store.get('defpilot')
  if (store.get('priorpilot'))
    document.getElementById('check-pilot').checked = true
  else
    document.getElementById('check-pilot').checked = false
  document.getElementById('tx-glider').value = store.get('defglider')
  if (store.get('priorglider'))
    document.getElementById('check-glider').checked = true
  else
    document.getElementById('check-glider').checked = false
  document.getElementById('tx-pilotmail').value = store.get('pilotmail')
  document.getElementById('tx-login').value = store.get('pilotid')
  document.getElementById('tx-pass').value = store.get('pilotpass')

  let selectedGPS = store.get('gps')
  if (selectedGPS == '' || selectedGPS == null) selectedGPS = 'none'
  selectGps.value = selectedGPS
  let usbLimit = store.get('gps-usb')
  if(usbLimit == undefined || usbLimit == '' || usbLimit == null ) {usbLimit = '6'}
  document.getElementById('tx-gps-usb').value = usbLimit
  if (store.get('gpsnewflights'))
    document.getElementById('check-gps-limit').checked = true
  else
    document.getElementById('check-gps-limit').checked = false
  let selectedLeague = store.get('league')
  if (selectedLeague == '' || selectedLeague == null) selectedLeague = 'FR'
  selectLeague.value = selectedLeague 
}

function iniGeneralsettings() {
  let selectedLang = store.get('lang')
  if (selectedLang == '' || selectedLang == null) selectedLang = 'en'
  selectLang.value = selectedLang

  let selectedStart = store.get('start')
  if (selectedStart == '' || selectedStart == null) selectedStart = 'log'
  selectStart.value = selectedStart

  let selectedOver = store.get('over')
  if (selectedOver == '' || selectedOver == null) selectedOver = 'cal'
  selectOver.value = selectedOver  

  let selectedMap = store.get('map')
  if (selectedMap == '' || selectedMap == null) selectedMap = 'osm'
  selectMap.value = selectedMap  

  let selectedPhoto = store.get('photo')
  if (selectedPhoto == '' || selectedPhoto == null) selectedPhoto = 'no'
  selectPhoto.value = selectedPhoto  

  let selectedFixedMenu =  store.get('menufixed') 
  if (selectedFixedMenu == '' || selectedFixedMenu == null) selectedFixedMenu = 'no'
  selectMenu.value = selectedFixedMenu  

  const pPathImport = store.get('pathimport')
  if (pPathImport == '' || pPathImport == null) 
    document.getElementById('tx-import').value = ''
  else
    document.getElementById('tx-import').value = pPathImport

  const pPathExport = store.get('pathexport')
  if (pPathExport == '' || pPathExport == null) 
    document.getElementById('tx-export').value = ''
  else
    document.getElementById('tx-export').value = pPathExport

  const pPathSyride = store.get('pathsyride')
  if (pPathSyride == '' || pPathSyride == null) 
    document.getElementById('tx-syride').value = ''
  else
    document.getElementById('tx-syride').value = pPathSyride
  
  const pFinderLat = store.get('finderlat')
  if (pFinderLat == '' || pFinderLat == null) {
    document.getElementById('tx-lat-dd').value = ''
  } else {
    const degrees = pFinderLat.toString().replaceAll('_','')
    if (degrees != '') {
        latDD = degrees
    }    
    document.getElementById('tx-lat-dd').value = pFinderLat
  }

  const pFinderLong = store.get('finderlong')  
  if (pFinderLong == '' || pFinderLong == null) {
    document.getElementById('tx-long-dd').value = ''
  } else{
    const degrees = pFinderLong.toString().replaceAll('_','')
    if (degrees != '') {
        longDD = degrees
    }
    document.getElementById('tx-long-dd').value = pFinderLong
  }
}

function iniWebSettings() {
  document.getElementById('tx-logfly').value = store.get('urllogfly')
  document.getElementById('tx-visu').value = store.get('urllogflyigc')
  document.getElementById('tx-flyxc').value = store.get('urlvisu')
  document.getElementById('tx-airspace').value = store.get('urlairspace')
  document.getElementById('tx-contest').value = store.get('urlcontest')
}

function translateLabels() {
  let menuOptions = menuFill.fillMenuOptions(i18n)
  $.get('../../views/tpl/sidebar.html', function(templates) { 
      const template = $(templates).filter('#temp-menu').html()  
      const rendered = Mustache.render(template, menuOptions)
      document.getElementById('target-sidebar').innerHTML = rendered
  })
  btnLogbook.innerHTML = i18n.gettext('Logbook')
  btnPilot.innerHTML = i18n.gettext('Pilot')
  btnGen.innerHTML = i18n.gettext('General')
  btnWeb.innerHTML = i18n.gettext('Web')
  btnValLog.innerHTML = i18n.gettext('Ok')
  btnCancelLog.innerHTML = i18n.gettext('Cancel')
  document.getElementById('lg_logbook').innerHTML = i18n.gettext('Logbook')
  document.getElementById('lg-working-path').innerHTML = i18n.gettext('Working folder path')   
  btnWorkPath.innerHTML = i18n.gettext('Modify')
 // document.getElementById('lg-document.
  document.getElementById('lg-curr-logbook').innerHTML = i18n.gettext('Current logbook')
  $('#lg-log-folder').val(i18n.gettext('Choose a new logbook folder'))
  document.getElementById('bt-choose-folder').innerHTML = i18n.gettext('Select')
  $('#lg-move-logbook').val(i18n.gettext('Move logbook(s) to a different folder'))
  document.getElementById('bt-move-folder').innerHTML = i18n.gettext('Select')
  $('#lg-new-logbook').val(i18n.gettext('Create a new logbook'))
  $('#tx-create-logbook').attr("placeholder", i18n.gettext('Type the name without extension'))
  document.getElementById('bt-new-logbook').innerHTML = i18n.gettext('Create')
  $('#lg-repatriate').val(i18n.gettext('Repatriate a copy'))
  btnCopy.innerHTML = i18n.gettext('Select')
  btnDbPath.innerHTML = i18n.gettext('Modify')
  document.getElementById('lg_pilot').innerHTML = i18n.gettext('Pilot')
  document.getElementById('lg-pilotname').innerHTML = i18n.gettext('Pilot name')
  document.getElementById('lg-pil-check').innerHTML = i18n.gettext('Priority on IGC field')
  document.getElementById('lg-gl-check').innerHTML = i18n.gettext('Priority on IGC field')
  document.getElementById('lg-glider').innerHTML = i18n.gettext('Glider')
  document.getElementById('lg-currgps').innerHTML = i18n.gettext('Usual GPS')
  document.getElementById('lg-gps-usb').innerHTML = i18n.gettext('USB limit')
  document.getElementById('lg-gps-limit').innerHTML = i18n.gettext('Only display new flights')
  document.getElementById('lg-pilotmail').innerHTML = i18n.gettext('Pilot mail')
  document.getElementById('lg-league').innerHTML = i18n.gettext('League')
  document.getElementById('lg-login').innerHTML = i18n.gettext('Login')
  document.getElementById('lg-pass').innerHTML = i18n.gettext('Pass')
  document.getElementById('lg_gen').innerHTML = i18n.gettext('General')
  document.getElementById('lg-lang').innerHTML = i18n.gettext('Language')
  document.getElementById('lg-start').innerHTML = i18n.gettext('Start window')
  document.getElementById('lg-overview').innerHTML = i18n.gettext('Overview')
  document.getElementById('lg-map').innerHTML = i18n.gettext('Default map')
  document.getElementById('lg-map-loca').innerHTML = i18n.gettext('Default map location')
  document.getElementById('lb-lat-dd').innerHTML = i18n.gettext('Latitude')
  document.getElementById('lb-long-dd').innerHTML = i18n.gettext('Longitude')
  document.getElementById('lg-import').innerHTML = i18n.gettext('Select the import folder for GPS tracks')
  document.getElementById('lg-export').innerHTML = i18n.gettext('Select the folder where the traces will be exported')
  document.getElementById('lg-syride').innerHTML = i18n.gettext('Select the Syride folder for GPS tracks')
  document.getElementById('lg-photo').innerHTML = i18n.gettext('Automatic display of photos')
  btnValGen.innerHTML = i18n.gettext('Ok')
  btnCancelGen.innerHTML = i18n.gettext('Cancel')
  btnPathImport.innerHTML = i18n.gettext('Select')
  btnPathExport.innerHTML = i18n.gettext('Select')
  btnPathSyride.innerHTML = i18n.gettext('Select')
  document.getElementById('lg-logfly').innerHTML = i18n.gettext('Logfly site url')
  document.getElementById('lg-visu').innerHTML = i18n.gettext('Download url')
  document.getElementById('lg-flyxc').innerHTML = i18n.gettext('FlyXC url')
  document.getElementById('lg-airspace').innerHTML = i18n.gettext('Airspace download url')
  document.getElementById('lg-contest').innerHTML = i18n.gettext('Claim url')
  btnValWeb.innerHTML = i18n.gettext('Ok')
  btnCancelWeb.innerHTML = i18n.gettext('Cancel')  
}