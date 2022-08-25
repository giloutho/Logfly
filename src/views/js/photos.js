const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../../views/tpl/sidebar.js')
const dbadd = require('../../utils/db/db-add.js')
const btnMenu = document.getElementById('toggleMenu')
const btnOption1 = document.getElementById('option1')
const btnOption2 = document.getElementById('option2')
const btnOption3 = document.getElementById('option3')
const statusContent = document.getElementById("status")
let currLang

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
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    btnOption1.innerHTML = 'IGC to db'
    btnOption2.innerHTML = 'Clear'
    btnOption1.addEventListener('click',(event) => {callDiskImport()})
    btnOption2.addEventListener('click',(event) => {clearStatus()})
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

function loadIgc() {
try {
    const tempFileName = './db/220714.IGC'
    const igcString = fs.readFileSync(tempFileName, 'utf8')
    displayStatus('Chargement fichier Ok')
    } catch (err) {
        console.log('Error reading file '+err)
    }      
}

function displayStatus(content) {
    statusContent.innerHTML = content
    $('#status').show();
}

function clearStatus() {
    statusContent.innerHTML = ''
    $('#status').hide();
}

/** Just for debug */

function callDiskImport() {
    try {    
        console.log('Exploration du dossier ./db')
        let selectedPath = '/Users/gil/Documents/El_Logfly/Logfly/dbtest'
        console.log(selectedPath)
        const searchDisk = ipcRenderer.sendSync('disk-import',selectedPath)
        if (searchDisk.igcForImport.length > 0) {
          var nbInsert = 0
          searchDisk.igcForImport.forEach(element => {
            if (element.forImport === true ) {
                const dateTkoff = element.dateStart
                let sqlDate = dateTkoff.getFullYear()+'-'+String((dateTkoff.getMonth()+1)).padStart(2, '0')+'-'+String(dateTkoff.getDate()).padStart(2, '0')
                sqlDate += ' '+String(dateTkoff.getHours()).padStart(2, '0')+':'+String(dateTkoff.getMinutes()).padStart(2, '0')+':'+String(dateTkoff.getSeconds()).padStart(2, '0')
                let duration = (element.dateEnd.getTime() - element.dateStart.getTime()) / 1000;
                let totalSeconds = duration
                let hours = Math.floor(totalSeconds / 3600)
                totalSeconds %= 3600
                let minutes = Math.floor(totalSeconds / 60);
                const sDuration = String(hours).padStart(2, "0")+'h'+String(minutes).padStart(2, "0")+'mn'                                
                let dbElements = 'V_Date :  [2008-10-07 15:05:00] : '+sqlDate+'<br>'  //TimeStamp   ** 2008-10-07 15:05:00  A ajouter puis à calculer
                dbElements += 'V_Duree : [5800s] : '+duration+'<br>'  //integer    calc durée en secondes
                dbElements += 'V_sDuree [0h27mn] : '+sDuration+'<br>'  //
                dbElements += 'V_LatDeco : '+element.firstLat+'<br>'
                dbElements += 'V_LongDeco : '+element.firstLong+'<br>'
                dbElements += 'V_AltDeco [1240] : '+element.startGpsAlt+'<br>'
                dbElements += 'V_IGC Long Text'+'<br>'
                dbElements += 'UTC [120] : '+element.offsetUTC+'<br><br>'
               let newFlight = dbadd.addFlight(element, i18n.gettext('To rename'))
               dbElements += newFlight + ' flight added<br>'
                document.getElementById("results").innerHTML = dbElements
            }
          });  
      } else {
        statusContent += ' '+'No tracks decoded'
        displayStatus(statusContent)
      }  
    } catch (error) {
        displayStatus(error)  
    }
}