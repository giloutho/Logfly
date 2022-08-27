var {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const fs = require('fs')
const jetpack = require('fs-jetpack')
const path = require('path');
const log = require('electron-log')
const Store = require('electron-store')
const Mustache = require('mustache')
const dbbasic = require('../../utils/db/db-basic.js')
let menuFill = require('../../views/tpl/sidebar.js');
const { Alert } = require('bootstrap');
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
const btnMap = document.getElementById('tabmap')
const btnMisc = document.getElementById('tabmisc')
const btnWeb = document.getElementById('tabweb')
const btnValLog = document.getElementById('bt-log-ok')
const btnCancelLog = document.getElementById('bt-log-cancel')
const oldDbName = store.get('dbName')
const oldPathDb = store.get('pathdb')
const oldPathWork = store.get('pathWork')
const oldDbFullPath = store.get('dbFullPath')

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
    btnValLog.innerHTML = i18n.gettext('Ok')
    btnCancelLog.innerHTML = i18n.gettext('Cancel')
}


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

$('#sel-logbook').on('change', function() {
  if (dbList.length > 0) {
    let newDbName = dbList[this.value]
    let currPathDb = document.getElementById('tx-log-path').value
    let newDbFullPath = path.join(currPathDb,newDbName) 
    if (dbbasic.testDb(newDbFullPath)) {
      document.getElementById("img-dbname").src='../../assets/img/valid.png'       
    } else {
      console.log('retour faux')      
      alert(i18n.gettext('Reading problem in logbook'))
    }
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
  document.getElementById('bt-choose-folder').innerHTML = i18n.gettext('Select')
  $('#lg-move-logbook').val(i18n.gettext('Move logbook(s) to a different folder'))
  document.getElementById('bt-move-folder').innerHTML = i18n.gettext('Select')
  $('#lg-new-logbook').val(i18n.gettext('Create a new logbook'))
  $('#tx-create-logbook').attr("placeholder", i18n.gettext('Type the name without extension'))
  document.getElementById('bt-new-logbook').innerHTML = i18n.gettext('Create')
  $('#lg-repatriate').val(i18n.gettext('Repatriate a copy'))
  btnCopy.innerHTML = i18n.gettext('Select')
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
    const repLogbook = ipcRenderer.sendSync('open-file','')
    if (repLogbook !== undefined && repLogbook != null) {
        copyLogbook(repLogbook[0])
    }
  })  

  btnValLog.addEventListener('click', (event)=>{
    // check logbook parameters
    if (checkLogbooks()) {
      // display menu
      btnMenu.innerHTML = "Menu Off"
      $('#sidebar').toggleClass('active');    
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
          //   src.move(filePath, dst.path(filePath));
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
      console.log(dbFiles.length+ ' à transférer ')
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
            if (dbbasic.testDb(newDbFullPath)) {
              store.set('dbName',dbName)
	            store.set('pathdb',pathDb)
		          store.set('pathWork', document.getElementById('tx-work-path').value)
	            store.set('dbFullPath', newDbFullPath)
              alert(i18n.gettext('Saved changes'))
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