const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fse = require('fs-extra')
const path = require('path');
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../tpl/sidebar.js')
//const btnMenu = document.getElementById('toggleMenu')
let currLang

iniForm()

function iniForm() {
    try {    
        document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'  
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fse.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
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
    document.getElementById('msg-title').innerHTML = i18n.gettext('Logfly 7 is available')
    document.getElementById('msg-nav').innerHTML = i18n.gettext('No installation required, directly in the browser')
    document.getElementById('info-badge').innerHTML = i18n.gettext('For Logfly 7, this information is required')+':'
    const pathDb = store.get('pathdb')
    const dbName = store.get('dbName')
    let msgLogbook = i18n.gettext('Your logbook')+' <strong>'
    msgLogbook+= dbName+'</strong> '
    msgLogbook += i18n.gettext('is in the folder')+' <strong>'
    msgLogbook += pathDb+'</strong>'
    document.getElementById('info-logbook').innerHTML = msgLogbook

    // Ouvre le lien dans le navigateur par défaut
    const link = document.querySelector('.msg-nav a');
    if (link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const { shell } = require('electron');
            shell.openExternal(link.href);
        });
    }
}

$(document).ready(function () {
    //let selectedFixedMenu =  store.get('menufixed') 
   // if (selectedFixedMenu === 'yes') {
      $("#sidebar").removeClass('active')
      $('#toggleMenu').addClass('d-none')
      document.getElementById("menucheck").checked = true;
   // }
  })
  
//   function changeMenuState(cbmenu) {
//     if (cbmenu.checked) {
//       $("#sidebar").removeClass('active')
//       $('#toggleMenu').addClass('d-none')
//       store.set('menufixed','yes') 
//     } else {
//       $("#sidebar").addClass('active')
//       $('#toggleMenu').removeClass('d-none')
//       store.set('menufixed','no') 
//     }
//   }

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

// btnMenu.addEventListener('click', (event) => {
//     if (btnMenu.innerHTML === "Menu On") {
//         btnMenu.innerHTML = "Menu Off";
//     } else {
//         btnMenu.innerHTML = "Menu On";
//     }
//     $('#sidebar').toggleClass('active');
// })

