const { app } = require('electron')
const path = require('path')
const fs = require('fs') 
const Store = require('electron-store')
const process = require('process')
const propertiesReader = require('properties-reader')
const log = require('electron-log')
const dbbasic = require('../utils/db/db-basic.js')

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
    let specOS
    const platform = process.platform;
    switch(platform) {
        case 'darwin': 
            currOS = 'mac'
            currVersion = process.getSystemVersion()
            if (currVersion != undefined && currVersion != null) {
              const arrVersion = currVersion.split('.')
              if (arrVersion.length == 3) { 
                if (arrVersion[0] === '10') {
                  if (arrVersion[1] < 15) {
                    specOS = 'mac32'
                  } else {
                    specOS = 'mac64'
                  }
                } else {
                    specOS = 'mac64'
                }
              } else {lace
                specOS = 'mac64'
              }
            }
            break;
        case 'linux': 
            currOS = 'linux'
            specOS = 'linux'
            currVersion = process.getSystemVersion()
            break;
        case 'win32':
            currOS = 'win'
            specOS = 'win'
            currVersion = process.getSystemVersion()
            break;    
        default: 
            currOS = 'ns'  // non supported 
            currVersion = 'ns'
    }
    store.set('currOS',currOS)
    store.set('specOS',specOS)
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
            // On Windows, path arrive with double slashes 
            // C\:\\Users\\Thinkpad\\Documents\\Logfly
            // store.set put an extra slash
            // we must remove one from original propertie
            let cleanPath = properties.get('pathsyride').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")
            store.set('pathsyride',cleanPath)          
            cleanPath = properties.get('pathdb').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")
            store.set('pathdb',cleanPath)
            store.set('urlvisu','https://flyxc.app/?track=')
            store.set('urllogflyigc',"http://www.logfly.org/Visu/")   
            store.set('urllogfly','http://www.logfly.org')            
            store.set('finderlong',properties.get('finderlong'))
            store.set('finderlat',properties.get('finderlat'))
            cleanPath = properties.get('pathw').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")
            store.set('pathWork',cleanPath)            
            cleanPath = properties.get('fullpathdb').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")    
            store.set('dbFullPath',cleanPath)
            cleanPath = properties.get('pathimport').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")
            store.set('pathimport', cleanPath)
            store.set('defpilot',properties.get('defaultpilote'))
            store.set('defglider',properties.get('defaultvoile'))
            store.set('pilotmail',properties.get('pilotemail'))
            store.set('pilotid',properties.get('piloteid'))
            store.set('pilotpass',properties.get('pilotepass'))
            const idxLang = properties.get('idxlang')
            if (idxLang != undefined) {
                switch (idxLang) {
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
            // ....
            const idxGps = properties.get('idxgps')
            if (idxGps != undefined) {
                switch (idxGps) {
                    case 0:
                        store.set('gps','none') // V5 no gps selected
                        break;                
                    case 1:
                        store.set('gps','6020') // V5 GPS_List.add("6020/6030");
                        break;
                    case 2:
                        store.set('gps','6015') // V5 GPS_List.add("6015");
                        break;       
                    case 3:
                        store.set('gps','flynet') // V5 GPS_List.add("Flynet");
                        break;     
                    case 4:
                        store.set('gps','flymold') // V5 GPS_List.add("Flymaster (old)");
                        break;         
                    case 5:
                        store.set('gps','rever') // V5 GPS_List.add("Reversale");
                        break;       
                    case 6:
                        store.set('gps','sky2') // V5 GPS_List.add("Skytraax 2");
                        break;     
                    case 7:
                        store.set('gps','oudi') // V5 GPS_List.add("Oudie");
                        break;           
                    case 8:
                        store.set('gps','elem') // V5  GPS_List.add("Element");
                        break;       
                    case 9:
                        store.set('gps','sens') // V5 GPS_List.add("Sensbox");
                        break;     
                    case 10:
                        store.set('gps','syri') // V5 GPS_List.add("Syride");
                        break;         
                    case 11:
                        store.set('gps','flyma') // V5 GPS_List.add("Flymaster");
                        break;       
                    case 12:
                        store.set('gps','conn') // V5 GPS_List.add("Connect");
                        break;     
                    case 13:
                        store.set('gps','sky3') // V5 GPS_List.add("Skytraxx 3");
                        break;          
                    case 14:
                        store.set('gps','cpil') // V5 GPS_List.add("C-Pilot Evo");
                        break;       
                    case 15:
                        store.set('gps','xctra') // V5 GPS_List.add("XC Tracer"); 
                        break;     
                    case 16:
                        store.set('gps','flyma') // V5 GPS_List.add("Flymaster +");
                        break;         
                    case 17:
                        store.set('gps','digi') // V5 GPS_List.add("Digifly");
                        break;       
                    case 18:
                        store.set('gps','vard') // V5 GPS_List.add("Varduino");
                        break;                                                                                         
                    default:
                        store.set('gps','none') 
                        break;
                }
            } else {
                store.set('gps','none') 
            }
            const idxLeague = properties.get('idxleague')
            if (idxLeague != undefined) {
                switch (idxLeague) {
                    case 0:
                        store.set('league','FR') 
                        break;                
                    default:
                        store.set('league','XC')
                        break;
                }
            } else {
                store.set('league','XC')
            }
            const idxMap = properties.get('idxmap')
            if (idxMap != undefined) {
                switch (idxMap) {
                    case 0:
                        store.set('map','osm')
                        break;     
                    case 1:
                        store.set('map','open')
                        break;            
                    case 2:
                        store.set('map','mtk')
                        break;     
                    case 3:
                        store.set('map','4u')
                        break;                                               
                    default:
                        store.set('map','osm')
                        break;
                }
            } else {
                store.set('map','osm')
            }
            const pPhoto = properties.get('photoauto') ? true : false
            store.set('photo',pPhoto)
            // default settings without worrying about L5 settings 
            store.set('start','log')
            store.set('over','cal')
            store.set('priorpilot', false)
            store.set('priorglider',false)
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
        store.set('urlvisu','https://flyxc.app/?track=')
        store.set('urllogflyigc',"http://www.logfly.org/Visu/")   
        store.set('urllogfly','http://www.logfly.org')
        setLangWithLocale()    
        store.set('gps','none') // no gps selected
        store.set('start','log')
        store.set('over','cal')
        store.set('map','osm')
        store.set('photo','no')
        store.set('priorpilot', false)
        store.set('priorglider',false)
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
            store.set('league','FR') 
            break
        case 'de':
            store.set('lang','de')
            store.set('league','XC') 
            break
        case 'it':
            store.set('lang','it')  
            store.set('league','XC')       
        default:
            store.set('lang','en')
            store.set('league','XC')     
            break;
    }                 
}

module.exports.checkSettings = checkSettings