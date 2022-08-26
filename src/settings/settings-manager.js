const { app } = require('electron');
const path = require('path')
const fs = require('fs') 
const Store = require('electron-store')
const process = require('process')
const propertiesReader = require('properties-reader')
const log = require('electron-log')
const dbbasic = require('../utils/db/db-basic.js');


function checkSettings (appPath, progVersion) {          
    const store = new Store()
    try {
        // If this is the first run, there is no config.json file
        if (fs.existsSync((store.path))) {
            // Updating environment variables
            getEnv()
            return dbbasic.testDb(store.get('dbFullPath'))
        } else {
            iniSettings()   
            // false to check settings with problem page
            return false         
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
    const platform = process.platform;
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
    store.set('urlvisu','https://flyxc.app/?track=')
    store.set('urllogflyigc',"http://www.logfly.org/Visu/")   
    store.set('urllogfly','http://www.logfly.org')
}

/**
 * If necessary check and read properties file of Logfly5
 * WindowsXP -> C:\Documents and Settings\UserName\Application Data\logfly.properties 
 * Windows Vista and Up -> C:\Users\UserName\AppData\Roaming\logfly.properties
 * MacOS -> /Users/UserName/Library/Preferences/logfly.properties
 * Linux -> '/home/user/.local/share'  A vérifier
 */
 function iniSettings() {
    const propertiesPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    if (propertiesPath != null) 
    {
        const logfly5Path = path.resolve(propertiesPath, "logfly.properties");   
        // we check if Logfly5 was installed
        if (fs.existsSync(logfly5Path)) {    
            const properties = propertiesReader(logfly5Path);
            // console.log(`Path db : ${properties.get('pathdb')} dbName : ${properties.get('dbName')}`)
            const store = new Store()
            store.set('dbName',properties.get('dbname'))           
            store.set('pathsyride',properties.get('pathsyride'))            
            store.set('pathdb',properties.get('pathdb'))
            store.set('finderlong',properties.get('finderlong'))
            store.set('finderlat',properties.get('finderlat'))
            store.set('pathWork',properties.get('pathw'))
            store.set('dbFullPath',properties.get('fullpathdb'))
            store.set('pathimport',properties.get('pathimport'))
            const idxLang = properties.get('idxlang')
            if (idxLang != undefined) {
                switch (idxLang) {
                    case 0:
                        store.set('lang','de')
                        break;
                    case 1:
                        console.log('envoi de idxLang '+idxLang)
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
            getEnv()
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
        const store = new Store()
        getEnv()
        setLangWithLocale()    
        if (!fs.existsSync(logflyPath)) {
            fs.mkdirSync(logflyPath)    
            let logflyDbPath  = path.join(logflyPath, 'Logfly.db')  
            if (dbbasic.createDb(logflyDbPath)) {
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
            // a folder Logfly  exixts ... lower version than version 5 possible
            let dbName = 'Logfly.db'
            let logflyDbPath = path.join(logflyPath, dbName) 
            if (fs.existsSync(logflyDbPath)) {
                if (!dbbasic.testDb(logflyDbPath)) {
                    dbName = 'Logfly6.db'
                    logflyDbPath  = path.join(logflyPath, dbName)  
                    if (dbbasic.createDb(logflyDbPath)) {
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
                    store.set('pathWork',logflyPath)
                    store.set('dbName',dbName)                       
                    store.set('pathdb',logflyPath)
                    store.set('dbFullPath',logflyDbPath)  
                }
            } else {
                if (dbbasic.createDb(logflyDbPath)) {
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

function setLangWithLocale() {
    const store = new Store()
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