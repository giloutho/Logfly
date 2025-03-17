const log = require('electron-log')
const fs = require('fs') 
const Database = require('better-sqlite3')
const Store = require('electron-store')
const store = new Store()

function testDb(dbFullPath) {
    let resDb
    try {
        if (fs.existsSync(dbFullPath)) {
            const db = new Database(dbFullPath)   
            if (db.open) {  
                // const stmt = db.prepare('SELECT COUNT(*) FROM sqlite_master')
                // let countTables = stmt.get()
                // console.log('countTables : '+countTables+' '+countTables['COUNT(*)'])
                // // countTables is an object, the value is recovered with a notation between brackets 
                // let result = countTables['COUNT(*)'] >= 2 ? true : false    
                // return result
                // const stmtFlights = db.prepare('SELECT COUNT(*) FROM Vol')
                // let countFlights = stmtFlights.get()
                const stmtFlights = db.prepare('SELECT MAX(V_date) FROM Vol')
                const resFlights = stmtFlights.get()  
                // console.log(`Connected on ${dbFullPath} with ${resFlights['MAX(V_date)']}`)
                const lastFlights = resFlights['MAX(V_date)']
                if (lastFlights != null) {      
                    resDb = lastFlights.substring(2, 4)
                } else {
                    resDb = ''
                }
                const stmtTag = db.prepare(`SELECT * FROM sqlite_master where sql like ?`)
                const resTag = stmtTag.get('%V_Tag%')  
                if (resTag ==  undefined || resTag == null) {
                    try {
                        let creaTag = 'ALTER TABLE Vol ADD V_Tag integer'
                        const stmtCreaTag= db.prepare(creaTag)
                        const infoTag = stmtCreaTag.run()
                        if (infoTag.changes != 0) {
                            resDb = null
                        }   
                        store.set('tag1','Tag 1')
                        store.set('tag2','Tag 2')
                        store.set('tag3','Tag 3')
                        store.set('tag4','Tag 4')
                        store.set('tag5','Tag 5')
                    } catch (error) {
                        log.error('Error occured during creation of V_Tag in table Vol '+' : '+error)
                    }                
                }
            } else {
                log.error('Error when opening the database '+dbFullPath+' : '+error)
            }         
        } else {
            log.error('db file not exist : '+dbFullPath)  
            resDb = null
        }        
    } catch (error) {
        log.error('Error occured during checking of '+dbFullPath+' : '+error)
        resDb = null
    }
    return resDb
}

function createDb(dbFullPath) {
    const db = new Database(dbFullPath)   
    let creaResult = false
    try {
        let creationVol = 'CREATE TABLE Vol (V_ID integer NOT NULL PRIMARY KEY, V_Date TimeStamp, V_Duree integer,'
        creationVol += 'V_sDuree varchar(20), V_LatDeco double, V_LongDeco double, V_AltDeco integer, '
        creationVol += 'V_Site varchar(100), V_Pays varchar(50), V_Commentaire Long Text, V_IGC Long Text, V_Photos Long Text,UTC integer, V_CFD integer,V_Engin Varchar(10), '
        creationVol += 'V_League integer, V_Score Long Text)'
        const stmtCreaVol = db.prepare(creationVol)
        const infoVol = stmtCreaVol.run()
        if (infoVol.changes == 0) {
            let creationSite = 'CREATE TABLE Site(S_ID integer NOT NULL primary key,S_Nom varchar(50),S_Localite varchar(50),'
            creationSite += 'S_CP varchar(8),S_Pays varchar(50),S_Type varchar(1),S_Orientation varchar(20),S_Alti varchar(12),'
            creationSite += 'S_Latitude double,S_Longitude double,S_Commentaire Long Text,S_Maj varchar(10))'
            const stmtCreaSite = db.prepare(creationSite)
            const infoSite = stmtCreaSite.run()
            if (infoSite.changes == 0) creaResult = true
        }     
    } catch (error) {
        log.error('Error occured during creation of '+dbFullPath+' : '+error)
    }
    return creaResult
}

module.exports.testDb = testDb
module.exports.createDb = createDb