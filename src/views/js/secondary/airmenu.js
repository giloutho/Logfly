const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const btnCancel = document.getElementById('bt-cancel')
const btnOk = document.getElementById('bt-ok')

const originWindow = 1


// a template for a secondary window

iniForm()

ipcRenderer.on('airspace-radius', (event, radius) => {    
    console.log('radius : '+radius)
    if(!radius) $('#rd-radius').addClass('d-none')
})

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile))
            let langjson = JSON.parse(content)
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang)            
        }
    } catch (error) {
        log.error('[airmenu.js] Error while loading the language file')
    }  
    document.getElementById('title').innerHTML = i18n.gettext('Airspace filter')
    document.getElementById('lb-floor').innerHTML = i18n.gettext('Floor below')
    btnOk.addEventListener('click',(event)=>{validFields()}) 
    btnCancel.innerHTML = i18n.gettext('Cancel')
    btnCancel.addEventListener('click',(event)=>{window.close()})     
}

function validFields() {
    const values = getAllCheckedValues()
    // console.log('Valeurs sélectionnées :', values)
    // alert('Checkboxes : ' + values.checkboxes.join(', ') + '\nRadios : ' + values.radios.join(', '))
    ipcRenderer.sendTo(1,"back_airmenu", values)
    window.close() 
}

function getAllCheckedValues() {
    const bloc1Checkboxes = Array.from(document.querySelectorAll('#cbA, #cbB, #cbC, #cbD, #cbE, #cbF, #cbG'))
    .filter(cb => cb.checked)
    .map(cb => cb.value)
    // 'SUA' Special Use Airspace with id 8 is always added
    bloc1Checkboxes.push('8')

    const bloc2Checkboxes = Array.from(document.querySelectorAll('#cbPro, #cbRes, #cbDan, #cbCtr, #cbTma, #cbRmz, #cbTmz, #cbGli, #cbOth'))
    .filter(cb => cb.checked)
    .map(cb => cb.value)

    const checkedRadios = Array.from(document.querySelectorAll('input[type="radio"]:checked'))
    const radioValues = checkedRadios.map(rd => rd.value)

    return {
        classes : bloc1Checkboxes,
        types : bloc2Checkboxes,
        floor : radioValues[0],
        radius : radioValues[1]*1000
    }
}
