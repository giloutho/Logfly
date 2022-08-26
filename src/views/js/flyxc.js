var {ipcRenderer} = require('electron')

var Mustache = require('mustache')
const log = require('electron-log')
var Store = require('electron-store')
var store = new Store()

const btnClose = document.getElementById('bt-close')
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
console.log('mod : https://flyxc.app/?track=http://logfly.org/Visu/20220712112212_885.igc')
console.log('cal : '+srcPath)
document.getElementById('webframe').src = srcPath

