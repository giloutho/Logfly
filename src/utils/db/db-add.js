const Store = require('electron-store');
const store = new Store();
const trigo = require('../geo/trigo.js')
const db = require('better-sqlite3')(store.get('dbFullPath'))
const dbsearch = require('../../utils/db/db-search.js')
const log = require('electron-log');


function addFlight(trackParams,msg) {
    let result = 0
    const dateTkoff = trackParams.dateStart
    let sqlDate = dateTkoff.getFullYear()+'-'+String((dateTkoff.getMonth()+1)).padStart(2, '0')+'-'+String(dateTkoff.getDate()).padStart(2, '0')
    sqlDate += ' '+String(dateTkoff.getHours()).padStart(2, '0')+':'+String(dateTkoff.getMinutes()).padStart(2, '0')+':'+String(dateTkoff.getSeconds()).padStart(2, '0')
    let duration = (trackParams.dateEnd.getTime() - trackParams.dateStart.getTime()) / 1000;
    let totalSeconds = duration
    let hours = Math.floor(totalSeconds / 3600)
    totalSeconds %= 3600
    let minutes = Math.floor(totalSeconds / 60);
    const sDuration = String(hours).padStart(2, "0")+'h'+String(minutes).padStart(2, "0")+'mn'
    let gliderName = trackParams.glider
    if (store.get('priorglider') == true) {
        gliderName = store.get('defglider') 
    }
    if (db.open) {
        let siteTakeOff = dbsearch.searchSiteInDb(trackParams.firstLat, trackParams.firstLong, false) 
        if (siteTakeOff == null || siteTakeOff == '') {
            siteTakeOff = addBlankSite(trackParams.firstLat, trackParams.firstLong, trackParams.startGpsAlt, msg)
        } 
        if (siteTakeOff != null || siteTakeOff != '') {
            let fullSite = siteTakeOff.split('*')
            let siteName
            let siteCountry
            if (fullSite.length > 0) {
                siteName = fullSite[0]
                siteCountry = fullSite[1]
            } else {
                siteName = fullSite
                siteCountry = '***'
            }
            let smt1 ='INSERT INTO Vol (V_Date,V_Duree,V_sDuree,V_LatDeco,V_LongDeco,V_AltDeco,V_Site,V_Pays,V_IGC,UTC,V_Engin)'
            let smt2 = '(?,?,?,?,?,?,?,?,?,?,?)'
            const stmt = db.prepare(smt1+' VALUES '+smt2)
            const newFlight = stmt.run(sqlDate, duration, sDuration, trackParams.firstLat, trackParams.firstLong, trackParams.startGpsAlt, siteName, siteCountry, trackParams.igcFile, trackParams.offsetUTC, gliderName)
            result = newFlight.changes // newFlight.changes must return 1 for one row added                  
        } else {
            log.error('[addFlight] Unable to find a site or to add a blank one')
        }
    } else {
        log.error('[addFlight] db not open')
    }

    return result
}

function addBlankSite(pLat, pLong, pAlt, msg) {

    const siteArg = 'Site No%'
    const lastBlank = db.prepare(`SELECT Count(S_ID) from Site where S_Nom LIKE '${siteArg}'`)
    let countSites = lastBlank.get()
    let result = countSites['Count(S_ID)']+1
    let siteName = 'Site No '+result.toString()+'  ('+msg+')'
    let sAlt =  Math.ceil(pAlt).toString() 
    const updateDate = new Date();
    const sqlDate = updateDate.getFullYear()+'-'+String((updateDate.getMonth()+1)).padStart(2, '0')+'-'+String(updateDate.getDate()).padStart(2, '0')
    if (db.open) {
        const stmt = db.prepare('INSERT INTO Site (S_Nom,S_CP,S_Type,S_Alti,S_Latitude,S_Longitude,S_Maj) VALUES (?,?,?,?,?,?,?)');
        const newBlank = stmt.run(siteName, '***','D', sAlt, pLat, pLong, sqlDate);
        // newBlank.changes must return 1 for one row added
        console.log('Insert : '+newBlank.changes)
    } else {
        log.error('[addBlankSite] db not open')  
    }   
    siteName += "*...";  // Since version 3 a country field will be added

     return siteName
   }

function importSites(arrSites) {
    let nbInsert = 0
    if (db.open) {
        const updateDate = new Date()
        let p_Update = updateDate.getFullYear()+'-'+String((updateDate.getMonth()+1)).padStart(2, '0')+'-'+String(updateDate.getDate()).padStart(2, '0') 
        const stmt = db.prepare('INSERT INTO Site (S_Nom,S_Localite,S_CP,S_Pays,S_Type,S_Orientation,S_Alti,S_Latitude,S_Longitude,S_Commentaire,S_Maj) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        arrSites.forEach(element => {
            let p_Type = ""
            if (element.Type.indexOf("coll") > 0) // en principe on a "Décollage"
                p_Type = "D"
            else if (element.Type.indexOf("tter") > 0)   // En principe on a atterrisage
                p_Type = "A"       
            // Le CP a été vu 
            let p_CP =  element.CP.toString()           
            // Je voulais l'altitude en pur numérique pour pouvoir éventuellement rechercher tous les décos supérieur à 1000
            // L'altitude peut être saisie avec ou sans espaces et avec la lettre m (1870m)       
            let sAlti = element.Alt.toString()
            let alti = sAlti.replace(/\D+$/g, "")  
            let p_Alt = ""  
            if (alti > 0) p_Alt = alti             
            const addSite = stmt.run(element.Nom,element.Ville,p_CP,element.Pays,p_Type,element.Orientation,p_Alt,element.Lat,element.Long,element.Commentaire,p_Update)
            nbInsert++              
        })
    }
    return nbInsert
}

function importFlights(arrFlights) {
    let nbInsert = 0
    if (db.open) {        
        const stmt = db.prepare('INSERT INTO Vol (V_Date, V_Duree, V_sDuree, V_LatDeco, V_LongDeco, V_AltDeco, V_Site, V_Pays, V_Commentaire, UTC, V_Engin) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        arrFlights.forEach(flight => {                
            const addFlight = stmt.run(flight.sqlDate, flight.duree, flight.sduree, flight.lat, flight.long, flight.alt, flight.site, flight.pays, flight.comment, flight.utc, flight.engin)
            nbInsert++              
        })
    }
    return nbInsert
}
module.exports.addFlight = addFlight
module.exports.importSites = importSites
module.exports.importFlights = importFlights
