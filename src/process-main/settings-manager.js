const { app } = require('electron');
const path = require('path')
const fs = require('fs') 
const Store = require('electron-store')
const process = require('process')
const propertiesReader = require('properties-reader')
const log = require('electron-log')



function checkSettings (appPath, progVersion) {          
    const store = new Store()
    try {
        // If this is the first run, there is no config.json file
        if (fs.existsSync((store.path))) {
            // Updating environment variables
            getEnv()
            return testDb(store.get('dbFullPath'))
        } else {
            // creation of config file
        }        
    } catch (error) {
        log.error('Error while checking settings  '+error)
        return false  
    }

}

function getEnv(modeProd) {    
    const store = new Store(); 
    let currOS
    let currVersion
    var platform = process.platform;
    switch(platform) {
        case 'darwin': 
            currOS = 'mac'
            currVersion = process.getSystemVersion()
            break;
        case 'linux': 
            currOS = 'linux'
            currVersion = process.getSystemVersion()
            break;
        case 'win32':
            currOS = 'win'
            currVersion = process.getSystemVersion()
            break;    
        default: 
            currOS = 'ns'  // non supported 
            currVersion = 'ns'
    }
    store.set('currOS',currOS)
    store.set('osVersion',currVersion)
    store.set('chromeVersion',process.versions.chrome)
    store.set('electronVersion',process.versions.electron)
    store.set('nodeVersion',process.versions.node)
    store.set('version',app.getVersion())      
    store.set('locale',app.getLocale())
}

/**
 * If necessary check and read properties file of Logfly5
 * WindowsXP -> C:\Documents and Settings\UserName\Application Data\logfly.properties 
 * Windows Vista and Up -> C:\Users\UserName\AppData\Roaming\logfly.properties
 * MacOS -> /Users/UserName/Library/Preferences/logfly.properties
 * Linux -> '/home/user/.local/share'  A vérifier
 */
 function iniSettings() {
    const store = new Store(); 
    var propertiesPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    if (propertiesPath != null) 
    {
        const logfly5Path = path.resolve(propertiesPath, "logfly.properties");   
        // we check if Logfly5 was installed
        if (fs.existsSync(logfly5Path)) {    
            const properties = propertiesReader(logflyPath);
            // console.log(`Path db : ${properties.get('pathdb')} dbName : ${properties.get('dbName')}`)
            store.set('dbName',properties.get('dbname'))           
            store.set('pathsyride',properties.get('pathsyride'))            
            store.set('pathdb',properties.get('pathdb'))
            store.set('finderlong',properties.get('finderlong'))
            store.set('finderlat',properties.get('finderlat'))
            store.set('pathWork',properties.get('pathw'))
            store.set('urlicones',properties.get('urlicones'))
            store.set('dbFullPath',properties.get('fullpathdb'))
            store.set('pathimport',properties.get('pathimport'))
            const idxLang = properties.get('idxLang')
            if (idxLang != undefined) {
                switch (key) {
                    case 0:
                        store.set('lang','de')
                        break;
                    case 1:
                        store.set('lang','en')
                        break;
                    case 2:
                        store.set('lang','fr')
                        break;
                    case 3:
                        store.set('lang','it')
                        break;                                                                
                    default:    
                        setLangWithLocale()          
                        break;
                }
            } else {
                setLangWithLocale()
            }
            // default assignments
            store.set('urlvisu','https://flyxc.app/?track=')
            store.set('urllogflyigc',"http://www.logfly.org/Visu/")   
            store.set('urllogfly','http://www.logfly.org')
        } else {
            defaultSettings()
        }
    } else {
        defaultSettings()
    }
}

function defaultSettings() {
    // Logfly5 settings not found, default values will be defined            
    let logflyPath  = path.join(app.getPath('documents'), 'Logfly')  
    try {
        if (!fs.existsSync(logflyPath)) {
            fs.mkdirSync(logflyPath)    
            let logflyDbPath  = path.join(logflyPath, 'Logfly.db')  
            if (createDb(logflyDbPath)) {
                store.set('dbName','Logfly.db')                       
                store.set('pathWork',logflyPath)
                store.set('pathdb',logflyPath)
                store.set('dbFullPath',logflyDbPath)            
            } else {
                store.set('dbName','')                       
                store.set('pathdb','')
                store.set('pathWork','')
                store.set('dbFullPath','')        
            }
        } else {
            // a folder Logfly  exixts ... lower version than version 5 ?
            let dbName = 'Logfly.db'
            let logflyDbPath = path.join(logflyPath, dbName) 
            if (fs.existsSync(logflyDbPath)) {
                if (!testDb(logflyDbPath)) {
                    dbName = 'Logfly6.db'
                    logflyDbPath  = path.join(logflyPath, dbName)  
                    if (createDb(logflyDbPath)) {
                        store.set('dbName',dbName)    
                        store.set('pathWork',logflyPath)                   
                        store.set('pathdb',logflyPath)
                        store.set('dbFullPath',logflyDbPath)            
                    } else {
                        store.set('dbName','')                       
                        store.set('pathdb','')
                        store.set('pathWork','')
                        store.set('dbFullPath','')        
                    }                    
                } else {
                    store.set('dbName',dbName)                       
                    store.set('pathdb',logflyPath)
                    store.set('dbFullPath',logflyDbPath)  
                }
            } else {
                if (createDb(logflyDbPath)) {
                    store.set('dbName',dbName)    
                    store.set('pathWork',logflyPath)                    
                    store.set('pathdb',logflyPath)
                    store.set('dbFullPath',logflyDbPath)            
                } else {
                    store.set('dbName','')                       
                    store.set('pathdb','')
                    store.set('pathWork',logflyPath)
                    store.set('dbFullPath','')        
                }  
            }
        }    
    } catch (error) {
        log.error('Error occured inside defaultSettings : '+error)
        store.set('dbName','')                       
        store.set('pathdb','')
        store.set('dbFullPath','')    
    }
}


function testDb(dbFullPath) {
    try {
        if (fs.existsSync(dbFullPath)) {
            const db = require('better-sqlite3')(dbFullPath)
            // how many tables in database -> kept for future use
            //const stmt = db.prepare('SELECT COUNT(*) FROM sqlite_master')
            // let countTables = stmt.get()
            // console.log('Test '+dbFullPath+' '+countTables['COUNT(*)']+' tables')
            // countTables is an object, the value is recovered with a notation between brackets 
            // countTables['COUNT(*)'] >= 2 ? store.set('checkDb',true) : store.set('checkDb',false)     
            const stmtFlights = db.prepare('SELECT COUNT(*) FROM Vol')
            let countFlights = stmtFlights.get()
            // console.log(`Connected on ${dbFullPath} with ${countFlights['COUNT(*)']} flights`);
            return true
        } else {
            log.error('db file not exist : '+dbFullPath)  
            return false
        }        
    } catch (error) {
        log.error('Error occured during checking of '+dbFullPath+' : '+error)
        return false  
    }
}

function createDb(dbFullPath) {
    const db = require('better-sqlite3')(dbFullPath)
    let creationVol = 'CREATE TABLE Vol (V_ID integer NOT NULL PRIMARY KEY, V_Date TimeStamp, V_Duree integer,'
    creationVol += 'V_sDuree varchar(20), V_LatDeco double, V_LongDeco double, V_AltDeco integer, '
    creationVol += 'V_Site varchar(100), V_Pays varchar(50), V_Commentaire Long Text, V_IGC Long Text, V_Photos Long Text,UTC integer, V_CFD integer,V_Engin Varchar(10), '
    creationVol += 'V_League integer, V_Score Long Text)'
    const stmtCreaVol = db.prepare(creationVol)
    stmtCreaVol.run()
    console.log(stmtCreaVol.changes); // => 1
    let creaTables = stmtCreaVol.changes
    let creationSite = 'CREATE TABLE Site(S_ID integer NOT NULL primary key,S_Nom varchar(50),S_Localite varchar(50),'
    creationSite += 'S_CP varchar(8),S_Pays varchar(50),S_Type varchar(1),S_Orientation varchar(20),S_Alti varchar(12),'
    creationSite += 'S_Latitude double,S_Longitude double,S_Commentaire Long Text,S_Maj varchar(10))'
    const stmtCreaSite = db.prepare(creationSite)
    stmtCreaSite.run()
    console.log(stmtCreaSite.changes); // => 1
    creaTables += stmtCreaSite.changes
    if (creaTables == 2)
        return true
    else 
        return false
}

function setLangWithLocale() {
    let _locale = app.getLocale()     
    switch (_locale) {
        case 'fr':
            store.set('lang','fr')    
            break
        case 'de':
            store.set('lang','de')
            break
        case 'it':
            store.set('lang','it')        
        default:
            store.set('lang','en')    
            break;
    }                 
}

module.exports.checkSettings = checkSettings