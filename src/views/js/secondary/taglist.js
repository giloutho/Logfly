const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const btnCancel = document.getElementById('bt-cancel')

// a template for a secondary window

iniForm()

ipcRenderer.on('current-flight', (event, currFlight) => {    
    const selectedFlight =  currFlight.date+' '+currFlight.hour+' '+currFlight.duration
    document.getElementById('lb-fl-date').innerHTML = selectedFlight
    document.getElementById('lb-fl-site').innerHTML = currFlight.site
})

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            console.log(path.join(__dirname, '../../../lang/',currLangFile))
            let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile));
            let langjson = JSON.parse(content);
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang);            
           // translateLabels()
        }
        btnCancel.addEventListener('click',(event)=>{window.close()}) 
    } catch (error) {
        log.error('[downsites.js] Error while loading the language file')
    }  
}