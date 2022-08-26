var {ipcRenderer} = require('electron')

var i18n = require('../../lang/gettext.js')()
var Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
var Store = require('electron-store')
var store = new Store()
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')
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
    document.getElementById('tx_1').innerHTML = i18n.gettext('Waypoints')
    document.getElementById('tx_2').innerHTML = i18n.gettext('Coming soon')+'...'
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