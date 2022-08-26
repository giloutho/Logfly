const {ipcRenderer} = require('electron')
const i18n = require('../../lang/gettext.js')()
const fs = require('fs')
const path = require('path');
const log = require('electron-log')
const Store = require('electron-store')
const dbbasic = require('../../utils/db/db-basic.js');
const { event } = require('jquery');
const store = new Store()
let dbList = null
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
let statusMsg = document.getElementById('status')
let btnStart = document.getElementById('bt-start')
let selectLang = document.getElementById('sel-lang')
let btnWorkPath = document.getElementById('bt-choose-working')
let btnDbPath = document.getElementById('bt-choose-dbpath')
let btnCreateLogbook = document.getElementById('bt-create-logbook')
let btnRepatriate = document.getElementById('bt-repatriate')


/**
 * The work folder is going to changed
 */
btnWorkPath.addEventListener('click', (event)=>{
    const selectedPath = ipcRenderer.sendSync('open-directory','')
    if (selectedPath != null) {
        if (fs.existsSync(selectedPath)) {
            document.getElementById("img-work-path").src='../../assets/img/valid.png'
            document.getElementById('tx-work-path').value = selectedPath                     
            checkSettings()
        } else {
            document.getElementById("img-log-path").src='../../assets/img/close.png'
        }  
    }    
})

/**
 * The logbook folder is going to be changed
 */
btnDbPath.addEventListener('click', (event) => {    
    const selectedPath = ipcRenderer.sendSync('open-directory','')
    if (selectedPath != null) {
        if (fs.existsSync(selectedPath)) {
            document.getElementById("img-log-path").src='../../assets/img/valid.png'
            document.getElementById('tx-log-path').value = selectedPath
            document.getElementById('tx-dbname').value = ''
            document.getElementById("img-dbname").src='../../assets/img/close.png'            
            document.getElementById('tx-dbfullpath').value = ''
            //document.getElementById("img-select").src='../../assets/img/select.png'   
            fillSelect(selectedPath,'')
            checkSettings()
        } else {
            document.getElementById("img-log-path").src='../../assets/img/close.png'
        }  
    }
})

/**
 * Creation of a new logbook in defined logbook folder
 */
btnCreateLogbook.addEventListener('click', (event) => {
    let newDbName = document.getElementById('tx-create-logbook').value
    if (newDbName != undefined && newDbName != '') {
        createLogbook(newDbName)
    } else {
        alert(i18n.gettext('Logbook name is empty'))
    }
})

btnRepatriate.addEventListener('click', (event) => {
    const repLogbook = ipcRenderer.sendSync('open-file','')
    if (repLogbook !== undefined && repLogbook != null) {
        copyLogbook(repLogbook[0])
    }
})

btnStart.addEventListener('click', (event) => {
    store.set('lang',currLang)
    let pathWork = document.getElementById('tx-work-path').value
    store.set('pathWork',pathWork)   
    let pathDb = document.getElementById('tx-log-path').value
    store.set('pathdb', pathDb)
    let dbName = document.getElementById('tx-dbname').value
    store.set('dbName',dbName)
    let dbFullPath = document.getElementById('tx-dbfullpath').value
    store.set('dbFullPath',dbFullPath) 
    ipcRenderer.send('changeWindow', 'logbook')    // main.js
})

$('#sel-lang').on('change', function() {
    let langIdx = selectLang.selectedIndex
    let choosedLang 
    switch (langIdx) {
        case 1 :
            choosedLang = 'de'
            break;
        case 2 :
            choosedLang = 'en'          
            break;        
        case 3 :
            choosedLang = 'fr'            
            break;
        case 4 :
            choosedLang = 'it'            
            break;                                              
    }      
    try {            
        if (choosedLang != undefined ) {
            if (choosedLang != 'en') {
                currLangFile = choosedLang+'.json'
                let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
                let langjson = JSON.parse(content);
                i18n.setMessages('messages', choosedLang, langjson)
                i18n.setLocale(choosedLang)
            }
            currLang = choosedLang
            document.getElementById("img-lang").src='../../assets/img/valid.png'
            displayLabels()
            checkSettings()
        }
    } catch (error) {
        log.error('[problem.js] Error while loading the language file')
    }  
});

/**
 * A logbook is selected on the new logbook folder
 */
$('#sel-logbook').on('change', function() {
    if (dbList.length > 0) {
      //  store.set('dbFullPath',path.join(store.get('pathdb'),dbList[this.value]))
      //  alert(store.get('dbFullPath'));
        let msgConfirm = dbList[this.value]+' '+i18n.gettext('will become the current logbook')+' ?'
        let confirmChange = confirm(msgConfirm)
        if (confirmChange) changeLogBook(dbList[this.value])      
    }
});

fillLanguage()
displayLabels()
displaySettings()
checkSettings()


function displayLabels() {
    statusMsg.innerHTML = '<h4>'+i18n.gettext('Logfly could not start')+'</h4>'
    // first section
    document.getElementById('lg_settings').innerHTML = i18n.gettext('Checking stored settings')
    document.getElementById('lg-lang').innerHTML = i18n.gettext('Selected language')
    if (currLang != undefined && currLang != '') { 
        switch (currLang) {
            case 'de' :
                document.getElementById('tx-lang').value = 'Deutsche'
                break;
            case 'en' :
                document.getElementById('tx-lang').value = 'English'
                break;        
            case 'fr' :
                document.getElementById('tx-lang').value = 'Français'
                break;
            case 'it' :
                document.getElementById('tx-lang').value = 'Italiano'
                break;   
        }                                             
    } else {
        document.getElementById('tx-lang').value = 'not set'  
    } 
    document.getElementById('lg-working-path').innerHTML = i18n.gettext('Working folder path')
    document.getElementById('lg-folder-log').innerHTML = i18n.gettext('Logbook(s) folder path')
    document.getElementById('lg-dbname').innerHTML = i18n.gettext('Current logbook')
    document.getElementById('lg-dbfullpath').innerHTML = i18n.gettext('Full path of the logbook')
    // second section
    btnStart.innerHTML = i18n.gettext('Change settings to start')
    document.getElementById('lg_change').innerHTML = i18n.gettext('Changing settings')
    document.getElementById('lg-sel-lang').innerHTML = i18n.gettext('Select a language')
    document.getElementById('lg-choose-working').innerHTML = i18n.gettext('Change the path of the working folder')
    document.getElementById('bt-choose-working').innerHTML = i18n.gettext('Select')
    document.getElementById('lg-choose-dbpath').innerHTML = i18n.gettext('Change the path of the logbook(s) folder')
    btnDbPath.innerHTML = i18n.gettext('Select')
    document.getElementById('lg-sel-logbook').innerHTML = i18n.gettext('Select a logbook in the chosen folder')
    document.getElementById('lg-create-logbook').innerHTML = i18n.gettext('Create a newlogbook')
    btnCreateLogbook.innerHTML = i18n.gettext('OK')
    document.getElementById('tx-create-logbook').placeholder = i18n.gettext('Enter a name and click Ok')
    document.getElementById('lg-repatriate').innerHTML = i18n.gettext('Repatriate a copy')
    btnRepatriate.innerHTML = i18n.gettext('Select')       
}

function displaySettings() { 
    if (currLang != undefined && currLang != '') { 
        switch (currLang) {
            case 'de' :
                document.getElementById('tx-lang').value = 'Deutsche'
                break;
            case 'en' :
                document.getElementById('tx-lang').value = 'English'
                break;        
            case 'fr' :
                document.getElementById('tx-lang').value = 'Français'
                break;
            case 'it' :
                document.getElementById('tx-lang').value = 'Italiano'
                break;                                                
        }             
        document.getElementById("img-lang").src='../../assets/img/valid.png'
    } else {
        document.getElementById('tx-lang').value = 'not set'
        document.getElementById("img-lang").src='../../assets/img/close.png'
    } 
    document.getElementById('tx-work-path').value = store.get('pathWork')
    document.getElementById('tx-log-path').value = store.get('pathdb')
    document.getElementById('tx-dbname').value = store.get('dbName')   
    document.getElementById('tx-dbfullpath').value = store.get('dbFullPath')  
}

function checkSettings() {    
    let startScoring = 0    
    if (currLang != undefined && currLang != '') { 
        const arrLang = ['Deutsche','English','Français', 'Italiano'] 
        let language = document.getElementById('tx-lang').value 
        if (arrLang.includes(language.trim())) startScoring += 1
    }    
    let pathWork = document.getElementById('tx-work-path').value
    if (fs.existsSync(pathWork)) {
        startScoring += 1
        document.getElementById("img-work-path").src='../../assets/img/valid.png'
    } else {
        document.getElementById("img-work-path").src='../../assets/img/close.png'
    }

    let pathDb = document.getElementById('tx-log-path').value
    if (fs.existsSync(pathDb)) {
        startScoring += 1
        document.getElementById("img-log-path").src='../../assets/img/valid.png'
        let dbName = document.getElementById('tx-dbname').value
        if (dbName != undefined && dbName != '') {
            let dbFullPath = path.join(pathDb,dbName)
            if (dbbasic.testDb(dbFullPath)) {
                startScoring += 1
                document.getElementById("img-dbname").src='../../assets/img/valid.png'   
                fillSelect(pathDb, dbName)
            } else {
                document.getElementById('tx-dbname').value = ''
                document.getElementById("img-dbname").src='../../assets/img/close.png'  
                fillSelect(pathDb, '')
            }
        } else {
            document.getElementById("img-dbname").src='../../assets/img/close.png'              
        }
    } else {
        document.getElementById("img-log-path").src='../../assets/img/close.png'
    }


    if (startScoring == 4) {
        statusMsg.classList.remove('alert-danger')
        statusMsg.classList.add('alert-success')
        statusMsg.innerHTML = '<h4>'+i18n.gettext('Logfly can start')+'</h4>'
        btnStart.innerHTML = i18n.gettext('Validate the changes and start')
        btnStart.classList.remove('btn-secondary')
        btnStart.classList.add('btn-success')
        btnStart.classList.add('active')
        btnStart.disabled = false 
    } else {
        statusMsg.classList.remove('alert-success')
        statusMsg.classList.add('alert-danger')
        statusMsg.innerHTML = '<h4>'+i18n.gettext('Logfly could not start')+'</h4>'
        btnStart.innerHTML = i18n.gettext('Change settings to start')
        btnStart.classList.remove('btn-success')
        btnStart.classList.add('btn-secondary')  
        btnStart.disabled = true     
    }   
}

function callPage(pageName) {
    console.log('clic page')
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

function fillLanguage() {
    let currLang = store.get('lang')   
    const arrLang = ['Deutsche','English','Français', 'Italiano'] 
    arrLang.unshift(i18n.gettext('Select'))
    let selIndex = 0
    if (currLang != undefined && currLang != '') { 
        switch (currLang) {
            case 'de' :
                selIndex = 1
                break;
            case 'en' :
                selIndex = 2
                break;        
            case 'fr' :
                selIndex = 3
                break;
            case 'it' :
                selIndex = 4
                break;                                                
        }     
    }
    for(let i= 0; i < arrLang.length; i++)
    {            
        $("#sel-lang").append('<option value=' + i + '>' +arrLang[i] + '</option>')
    }
    selectLang.selectedIndex = selIndex
}

function fillSelect(dirpath, selectCurrent) {
    $("#sel-logbook").empty()
    fs.readdir(dirpath, function(err, files) {
        const dbFiles = files.filter(el => path.extname(el) === '.db')
        dbFiles.sort()
        dbFiles.unshift(i18n.gettext('Select and clic OK'))
        for(let i= 0; i < dbFiles.length; i++)
        {            
            if (selectCurrent != '' && dbFiles[i] === selectCurrent)
                $("#sel-logbook").append('<option value=' + i + ' selected >' + dbFiles[i] + '</option>')
            else
                $("#sel-logbook").append('<option value=' + i + '>' + dbFiles[i] + '</option>')
        }
        dbList = dbFiles
    })
}

function changeLogBook(newDbName) {
    let newPathDb = document.getElementById('tx-log-path').value
    document.getElementById('tx-dbname').value = newDbName   
    let newDbFullPath = path.join(newPathDb,newDbName)      
    document.getElementById('tx-dbfullpath').value = newDbFullPath
    checkSettings()
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
            document.getElementById('tx-dbname').value = newDbName
            document.getElementById("img-dbname").src='../../assets/img/valid.png'
            document.getElementById('tx-dbfullpath').value = newDbFullPath
            fillSelect(pathDb,newDbName)
        }        
    } else {
        document.getElementById("img-log-path").src='../../assets/img/close.png'
        alert(i18n.gettext('Logbook(s) folder path does not exist'))
    }  
}

function copyLogbook(fullPathRep) {
    btnRepatriate.classList.remove('btn-outline-info')
    btnRepatriate.classList.add('btn-danger')
    let msgWait = i18n.gettext('Waiting')
    btnRepatriate.innerHTML = msgWait    
    setTimeout(function() {
        let newDbName = path.basename(fullPathRep)
        let pathDb = document.getElementById('tx-log-path').value
        if (dbbasic.testDb(fullPathRep)) {           
                if (fs.existsSync(pathDb)) {
                    let newDbFullPath = path.join(pathDb,newDbName)
                    fs.copyFileSync(fullPathRep, newDbFullPath)
                    if (dbbasic.testDb(newDbFullPath)) {
                        document.getElementById('tx-dbname').value = newDbName
                        document.getElementById("img-dbname").src='../../assets/img/valid.png'
                        document.getElementById('tx-dbfullpath').value = newDbFullPath
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
        btnRepatriate.classList.remove('btn-danger')
        btnRepatriate.classList.add('btn-outline-info')
        btnRepatriate.innerHTML = i18n.gettext('Select')
    }, 2000);
} 