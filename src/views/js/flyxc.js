var {ipcRenderer} = require('electron')

var i18n = require('../../lang/gettext.js')()
var Mustache = require('mustache')
var Store = require('electron-store')
var store = new Store()
let menuFill = require('../../views/tpl/sidebar.js')
let btnMenu = document.getElementById('toggleMenu')

ipcRenderer.on('translation', (event, langJson) => {
    let currLang = store.get('lang')
    i18n.setMessages('messages', currLang, langJson)
    i18n.setLocale(currLang);
    iniForm()
  })

function iniForm() {
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
      //  console.log(template)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
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