const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const btnCancel = document.getElementById('bt-cancel')
const btnOk = document.getElementById('bt-ok')
const txTag1 = document.getElementById('tag1')
const txTag2 = document.getElementById('tag2')
const txTag3 = document.getElementById('tag3')
const txTag4 = document.getElementById('tag4')
const txTag5 = document.getElementById('tag5')

const originWindow = 1
let selectedTag = 0
let selectedFlight

// a template for a secondary window

iniForm()

ipcRenderer.on('current-flight', (event, currFlight) => {    
    selectedFlight = currFlight
    const infoFlight =  currFlight.date+' '+currFlight.hour+' '+currFlight.duration
    document.getElementById('lb-fl-date').innerHTML = infoFlight
    document.getElementById('lb-fl-site').innerHTML = selectedFlight.site
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
        btnOk.addEventListener('click', (event) => {saveTag()} )
    } catch (error) {
        log.error('[downsites.js] Error while loading the language file')
    }  
}

function pushTag(id) {
    switch (id) {
        case 1 :
            document.getElementById("selected-tag-text").innerHTML = txTag1.value
            document.getElementById("selected-tag-img").src="../../../assets/img/tag_red.png"
            selectedTag = 1
            break;
        case 2 :
            document.getElementById("selected-tag-text").innerHTML = txTag2.value
            document.getElementById("selected-tag-img").src="../../../assets/img/tag_orange.png"
            selectedTag = 2
            break;
        case 3 :
            document.getElementById("selected-tag-text").innerHTML = txTag3.value
            document.getElementById("selected-tag-img").src="../../../assets/img/tag_gold.png"
            selectedTag = 3
            break;   
        case 4 :
            document.getElementById("selected-tag-text").innerHTML = txTag4.value
            document.getElementById("selected-tag-img").src="../../../assets/img/tag_lime.png"
            selectedTag = 4
            break;             
        case 5 :
            document.getElementById("selected-tag-text").innerHTML = txTag5.value
            document.getElementById("selected-tag-img").src="../../../assets/img/tag_blue.png"
            selectedTag = 5
            break;   
    }
}

function saveTag() { 
    // save all tags labels in config.json
    store.set('tag1',txTag1.value)
    store.set('tag2',txTag2.value)
    store.set('tag3',txTag3.value)
    store.set('tag4',txTag4.value)
    store.set('tag5',txTag5.value)
    selectedFlight.selTag = selectedTag
    ipcRenderer.sendTo(originWindow,'back_taglist', selectedFlight)
    window.close()     
}