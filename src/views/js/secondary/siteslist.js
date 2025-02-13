const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const Database = require('better-sqlite3')
const db = new Database(store.get('dbFullPath'))

const selectGlider = document.getElementById('sel-glider')
const selectSites = document.getElementById('sel-sites')
const btnNew = document.getElementById('bt-new')
const btnCancel = document.getElementById('bt-cancel')
const btnOk = document.getElementById('bt-ok')

const today = new Date()
const year = today.toLocaleString("default", { year: "numeric" })
const month = today.toLocaleString("default", { month: "2-digit" })
const day = today.toLocaleString("default", { day: "2-digit" })
var formattedToday = year + "-" + month + "-" + day

// const yyyy = today.getFullYear()
// let mm = today.getMonth() + 1 // Months start at 0!
// let dd = today.getDate()
// if (dd < 10) dd = '0' + dd;
// if (mm < 10) mm = '0' + mm;
// const formattedToday = dd + '/' + mm + '/' + yyyy

let flightData = {
    date : formattedToday,
    time : '12:00',
    duree : '00:30',
    strduree : '',
    lat : 0.00,
    lon : 0.00,
    alti : 0,
    nom : '',
    pays : '',
    igc : '',
    utc : 0,
    glider : '',
    comment :''
}

let flightSite = {
    id : 0,
    nom : '',
    pays : '',
    alti : 0,
    lat : 0.00,
    lon : 0.00
}

iniForm()

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile));
            let langjson = JSON.parse(content);
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang);            
            translateLabels()
        }
        if (db.open) {  
            const GliderSet = db.prepare(`SELECT V_Engin, strftime('%Y-%m',V_date) FROM Vol GROUP BY upper(V_Engin) ORDER BY strftime('%Y-%m',V_date) DESC`)
            let nbGliders = 0
            for (const gl of GliderSet.iterate()) {
                nbGliders++
                let newOption = document.createElement("option")
                newOption.value= nbGliders.toString()
                newOption.innerHTML= (gl.V_Engin)
                selectGlider.appendChild(newOption);
            } 
            const sitesSet = db.prepare(`SELECT S_ID, S_Nom, S_Localite FROM Site WHERE S_Type = \'D\'`)
            let nbSites = 1
            let firstOption = document.createElement("option")
            firstOption.value = ''
            firstOption.selected = 'selected'
            firstOption.innerHTML = i18n.gettext('Beginning of the name')            
            selectSites.appendChild(firstOption)
            for (const si of sitesSet.iterate()) {         
                nbSites++                
                let newOption = document.createElement("option")
                newOption.value= si.S_ID
                const fullName = si.S_Nom+' '+si.S_Localite
                //newOption.innerHTML= (si.S_Nom)
                newOption.innerHTML= fullName
                selectSites.appendChild(newOption);                
            }           
        }
        document.getElementById('tx-manu-date').value = flightData.date
        document.getElementById('tx-manu-time').value = flightData.time
        document.getElementById('tx-manu-dur').value = flightData.duree                   
        btnOk.addEventListener('click',(event)=>{validFields()}) 
        btnNew.addEventListener('click',(event)=>{addNewSite()}) 
    } catch (error) {
        log.error('[siteslist.js] Error while loading the language file')
    }  
}

ipcRenderer.on('back_siteform', (_, updateSite) => { 
      // update badge
      console.log(updateSite.id+' '+updateSite.nom)
  })

function validFields() {
/*     if (flightSite.id == 0) {
        alert(i18n.gettext('No site selected'))
    } */
    console.log(document.getElementById('tx-manu-date').value) 
    console.log(document.getElementById('tx-manu-time').value)
    console.log(document.getElementById('tx-manu-dur').value)    
    console.log(selectGlider.options[selectGlider.selectedIndex].text)
    console.log(document.getElementById('tx-comment').value)
}

function updateSelSite() {
    console.log('selectSites.value '+selectSites.value)
    if (selectSites.value != '' && selectSites.value != null && selectSites.value > 0 && db.open) {
        const stmt = db.prepare('SELECT * FROM Site WHERE S_ID = ?');
        const dbSite = stmt.get(selectSites.value)
        console.log({dbSite})
        flightSite.id = dbSite.S_ID
        flightSite.nom = dbSite.S_Nom
        flightSite.pays = dbSite.S_Pays
        document.getElementById('sel-site').innerHTML = flightSite.nom+' '+flightSite.pays
    }   
}

function addNewSite() {
    let currSite = {
      id : 0,
      nom : "",
      localite : "",
      cp : "",
      pays : "",
      typeSite : "D",
      orient : "",
      alti : "",
      lat : 0.00000,
      long : 0.00000,
      comment : "",
      update : "",
      rowNumber : 0,
      newsite : true
    }
    const callForm = ipcRenderer.send('display-site-form', currSite)   // process-main/modal-win/form-display.js
  }

  function translateLabels() {
    btnOk.innerHTML = i18n.gettext('Save')
    btnCancel.innerHTML = i18n.gettext('Close')
    document.getElementById('sel-site').innerHTML = i18n.gettext('No site selected')
  }