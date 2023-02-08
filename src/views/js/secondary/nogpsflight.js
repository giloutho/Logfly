const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
let db = require('better-sqlite3')(store.get('dbFullPath'))
const moment = require('moment')
const { stringify } = require('querystring')

const inputDate = document.getElementById('tx-manu-date')
const inputTime = document.getElementById('tx-manu-time')
const inputDuration = document.getElementById('tx-manu-dur')
const selectGlider = document.getElementById('sel-glider')
const btnNew = document.getElementById('bt-new')
const btnCancel = document.getElementById('bt-cancel')
const btnOk = document.getElementById('bt-ok')

const formattedToday = moment().format('YYYY-MM-DD');

let flightData

let flightDataRec = {
    date : '2000-01-01',
    time : '00:00'
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

ipcRenderer.on('current-flight', (event, currFlight) => {  
    flightData = currFlight
    inputDate.value = currFlight.date
    inputTime.value  = currFlight.time
    inputDuration.value  = currFlight.duree   
    document.querySelector('#glider-list-inp').value = currFlight.glider
    if (currFlight.nom != '' && currFlight.nom != null) {
        if (db.open) {  
            const stmt = db.prepare('SELECT * FROM Site WHERE S_Nom = ? AND S_Type = \'D\'')
            const selSite = stmt.get(currFlight.nom) 
            if (selSite != undefined) {
                flightSite.id = selSite.S_ID
                flightSite.nom = selSite.S_Nom
                flightSite.pays = selSite.S_Pays
                flightSite.alti = selSite.S_Alti
                flightSite.lat = selSite.S_Latitude
                flightSite.lon = selSite.S_Longitude
                document.getElementById('sel-site').innerHTML = flightSite.nom+' '+flightSite.pays+' '+flightSite.alti+'m' 
                document.querySelector('#site-list-inp').value = currFlight.nom
            } else {
                flightSite.id = 0
                flightSite.nom = currFlight.nom
                flightSite.pays = ''
                flightSite.alti = ''
                flightSite.lat = 0
                flightSite.lon = 0
                document.getElementById('sel-site').innerHTML = flightSite.nom+' '+i18n.gettext('Not found') 
            }        
        }
    }
    document.getElementById('tx-comment').innerHTML = currFlight.comment
})

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
                let option = $('<option value="'+gl.V_Engin+'"></option>')
                $('#glider-list').append(option)                        
            } 
            const sitesSet = db.prepare(`SELECT S_ID, S_Nom, S_Localite FROM Site WHERE S_Type = \'D\'`)
            for (const si of sitesSet.iterate()) {                       
                const fullName = si.S_Nom+' '+si.S_Localite
                let option = $('<option data-value="'+si.S_ID+'"  value="'+fullName+'"></option>')
                $('#site-list').append(option)              
            }                  
        }                
        btnOk.addEventListener('click',(event)=>{validFields()}) 
        btnCancel.addEventListener('click',(event)=>{window.close()}) 
        btnNew.addEventListener('click',(event)=>{addNewSite()}) 
    } catch (error) {
        log.error('[nogpsflight.js] Error in iniForm function')
    }  
}

ipcRenderer.on('back_siteform', (_, updateSite) => { 
    if (updateSite != null)  {
        // combobox update
        flightSite.id = updateSite.id
        flightSite.nom = updateSite.nom
        flightSite.pays = updateSite.pays
        flightSite.alti = updateSite.alti
        flightSite.lat = updateSite.lat
        flightSite.lon = updateSite.long
        const fullName = updateSite.nom+' '+updateSite.localite
        let option = $('<option data-value="'+updateSite.id+'"  value="'+fullName+'"></option>')
        $('#site-list').append(option)     
        document.getElementById("site-list-inp").value = fullName
        document.getElementById('sel-site').innerHTML = flightSite.nom+' '+flightSite.pays+' '+flightSite.alti+'m' 
    }
  })

// Confirmation to update db
ipcRenderer.on('confirmation-dialog', (event, response) => {
    if (response) {
        if (flightDataRec.date == inputDate.value && flightData.time == inputTime.value) {
            alert(i18n.gettext('A flight at the same date and time was recorded'))
        } else {
            flightData.sqlDate = inputDate.value+' '+inputTime.value+':00'
            // in logbook date is displayed as DD-MM-YYYY
            flightData.date = moment(inputDate.value).format('DD-MM-YYYY')
            flightData.time = inputTime.value
            let durMilli = moment.duration(inputDuration.value)
            flightData.duree = Math.floor(durMilli.asSeconds())
            flightData.strduree = moment(inputDuration.value,'HH:mm').format('HH[h]mm[mn]')
            flightData.lat = flightSite.lat
            flightData.lon = flightSite.lon
            flightData.alti = flightSite.alti
            flightData.nom = flightSite.nom
            flightData.pays = flightSite.pays
            flightData.glider = document.querySelector('#glider-list-inp').value
            flightData.comment = document.getElementById('tx-comment').value
            if (db.open) {
                try {
                    if (flightData.type == 'edit') {
                        console.log({flightData})
                        let smtUp = db.prepare('UPDATE Vol SET V_Date=?, V_Duree=?, V_sDuree=?, V_LatDeco=?, V_LongDeco=?, V_AltDeco=?, V_Site=?, V_Pays=?, V_Engin=?, V_Commentaire= ? WHERE V_ID =?')
                        const updateFlight = smtUp.run(flightData.sqlDate,flightData.duree,flightData.strduree,flightData.lat,flightData.lon,flightData.alti,flightData.nom,flightData.pays,flightData.glider,flightData.comment,flightData.id)       
                        ipcRenderer.sendTo(1, "back_flightform", flightData)      
                        window.close()
                    } else {
                        let smt1 ='INSERT INTO Vol (V_Date,V_Duree,V_sDuree,V_LatDeco,V_LongDeco,V_AltDeco,V_Site,V_Pays,V_IGC,UTC,V_Engin,V_Commentaire)'
                        let smt2 = '(?,?,?,?,?,?,?,?,?,?,?,?)'
                        const stmt = db.prepare(smt1+' VALUES '+smt2)
                        const newFlight = stmt.run(flightData.sqlDate, flightData.duree, flightData.strduree, flightData.lat, flightData.lon, flightData.alti, flightData.nom, flightData.pays, null, 0, flightData.glider, flightData.comment)
                    }     
                    flightDataRec.date = flightData.date
                    flightDataRec.time = flightData.time                         
                } catch (error) {
                    alert(i18n.gettext('Inserting in the flights file failed'))
                    log.error('[nogpsflight.js] writing error in the database')
                }               
            }
            $('#div-recorded').removeClass('d-none')
            document.getElementById('lb-recorded').innerHTML = i18n.gettext('Flight')+' : '+inputDate.value+' '+inputTime.value+' '+i18n.gettext('saved')            
        }
    }
})

function validFields() {
    const gliderName = document.querySelector('#glider-list-inp').value
    if (gliderName == "") {
        alert(i18n.gettext('No glider selected'))
    } else if (flightSite.id == 0) {
        alert(i18n.gettext('No site selected'))
    } else {
        let fulldate
        if (flightData.type == 'new') {
            fulldate = i18n.gettext('Add')+' : ' 
        } else {
            fulldate = i18n.gettext('Modify')+' : '
        }
        fulldate += moment(inputDate.value).format('DD MM YYYY')+' '
        fulldate += moment(inputTime.value,'HH:mm').format('HH:mm')+' '
        fulldate += '\n'+i18n.gettext('Duration')+' '+moment(inputDuration.value,'HH:mm').format('HH[h]mm[mn]')+'\n'+flightSite.nom 
        const dialogLang = {
            title: '',
            message: fulldate,
            yes : i18n.gettext('Yes'),
            no : i18n.gettext('No')
        }
        ipcRenderer.send('open-confirmation-dialog', dialogLang)
        // result will come with ipcRenderer.on('confirmation-dialog')
    }
}

// Function called by "onchange" in html code
function updateSelSite(elem) {
    if (db.open) {
        let idSite = $('#site-list [value="' + elem.value + '"]').data('value')
        const stmt = db.prepare('SELECT * FROM Site WHERE S_ID = ?');
        const dbSite = stmt.get(idSite)
        flightSite.id = dbSite.S_ID
        flightSite.nom = dbSite.S_Nom
        flightSite.pays = dbSite.S_Pays,
        flightSite.alti = dbSite.S_Alti
        flightSite.lat = dbSite.S_Latitude
        flightSite.lon = dbSite.S_Longitude
        document.getElementById('sel-site').innerHTML = flightSite.nom+' '+flightSite.pays+' '+flightSite.alti+'m'
    }   
}

function addNewSite() {
    let currSite = {
      id : -2,   // See winClose in siteform.js for explanations
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
    document.getElementById('lb-manu-title').innerHTML = i18n.gettext('Flight without GPS track')
    document.getElementById('lb-manu-date').innerHTML = i18n.gettext('Date')
    document.getElementById('lb-manu-time').innerHTML = i18n.gettext('Take-off time')
    document.getElementById('lb-manu-duration').innerHTML = i18n.gettext('Duration')
    document.getElementById('lb-manu-glider').innerHTML = i18n.gettext('Glider')
    btnNew.innerHTML = i18n.gettext('New site')
    document.getElementById('lb-manu-tkoff').innerHTML = i18n.gettext('Take off')
    document.getElementById('lb-manu-comment').innerHTML = i18n.gettext('Comment')
    btnOk.innerHTML = i18n.gettext('Save')
   // btnCancel.innerHTML = i18n.gettext('Close')
    document.getElementById('bt-cancel').innerHTML  = i18n.gettext('Close')
    document.getElementById('sel-site').innerHTML = i18n.gettext('No site selected')
  }