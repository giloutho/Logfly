var {ipcRenderer} = require('electron')

var i18n = require('../../lang/gettext.js')()
var Mustache = require('mustache')
var Store = require('electron-store')
var store = new Store()

const currLang = store.get('lang')
i18n.setMessages('messages', currLang, store.get('langmsg'))
i18n.setLocale(currLang)    
const btnClose = document.getElementById('bt-close')
btnClose.innerHTML = i18n.gettext('Close')
btnClose.addEventListener('click',(event) => {
    window.close()
})  
/**
 * ATTENTION aux caractères d'échappement venus de Logfly5
 * "urlvisu": "https\\://flyxc.app/?track\\=",
 * "urllogflyigc": "http\\://www.logfly.org/Visu/",
 * NE PAS RECUPERER, écrire en dur
 */
let srcPath = store.get('urlvisu')+store.get('urllogflyigc')+store.get('igcVisu')
console.log(srcPath)
// let srcPath = store.get('urlvisu')
console.log('mod : https://flyxc.app/?track=http://logfly.org/Visu/20220712112212_885.igc')
console.log('cal : '+srcPath)
//srcPath = 'https://flyxc.app/?track=http://www.logfly.org/Visu/logfly6.igc'
document.getElementById('webframe').src = srcPath

