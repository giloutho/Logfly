const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../../views/tpl/sidebar.js')
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
    document.getElementById('tx_1').innerHTML = i18n.gettext('Utilities')
    document.getElementById('tx_2').innerHTML = i18n.gettext('Coming soon')+'...'
    btnOption1.innerHTML = i18n.gettext('Logbook copy')
    btnOption2.innerHTML = i18n.gettext('Csv export')
    // btnOption1.addEventListener('click',(event) => {callDiskImport()})
    // btnOption2.addEventListener('click',(event) => {clearStatus()})
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


function displayStatus(content) {
    statusContent.innerHTML = content
    $('#status').show();
}

function clearStatus() {
    statusContent.innerHTML = ''
    $('#status').hide();
}

