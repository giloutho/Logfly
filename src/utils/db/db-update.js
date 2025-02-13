const Store = require('electron-store');
const store = new Store();
const Database = require('better-sqlite3')
const db = new Database(store.get('dbFullPath'))
const log = require('electron-log')

function changeSiteName(oldName, newName) {    
    if (db.open) {
        const stmt = db.prepare('SELECT V_ID,V_Site from vol where V_Site = ?')
        // we can make -> const sitesSet = stmt.all(oldName)
        // result will be an array -> console.log('sites : '+sitesSet.length)
        // instead of returning every row together in an array, an iterator can be returned
        //  for (const si of stmt.iterate(oldName)) { ... }
        const sitesSet = stmt.all(oldName)  
        if (sitesSet.length > 0) {
            sitesSet.forEach(si => {
                console.log(si.V_ID+' '+si.V_Site)
                try {
                    const stmt = db.prepare('UPDATE Vol SET V_Site = ? WHERE V_ID = ?')
                    stmt.run(newName,si.V_ID)           
                } catch (error) {
                    log.error('Error during flight site update from changeSiteName '+error)
                }                    
            })
            try {
                const stmtSite = db.prepare('UPDATE Site SET S_Nom=? WHERE S_Nom = ?')
                stmtSite.run(newName,oldName)           
            } catch (error) {
                log.error('Error during site update from changeSiteName '+error)
            }                
            
        }
    }   
}

function switchSite(idFlight, idSite) {    
    if (db.open) {
        const stmtSite = db.prepare('SELECT * FROM Site WHERE S_ID = ?');
        const dbSite = stmtSite.get(idSite)
        try {
            const stmtFl = db.prepare('UPDATE Vol SET V_LatDeco = ?, V_LongDeco = ?, V_AltDeco = ?, V_Site = ?, V_Pays = ? WHERE V_ID = ?')
            stmtFl.run( dbSite.S_Latitude, dbSite.S_Longitude, dbSite.S_Alti, dbSite.S_Nom, dbSite.S_Pays, idFlight) 
        } catch (error) {
            log.error('Error during flight site update from switchSite '+error)
        }
    }   
}

module.exports.changeSiteName = changeSiteName
module.exports.switchSite = switchSite