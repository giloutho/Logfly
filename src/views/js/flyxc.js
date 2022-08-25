var {ipcRenderer} = require('electron')

var i18n = require('../../lang/gettext.js')()
var Mustache = require('mustache')
var Store = require('electron-store')
var store = new Store()
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

