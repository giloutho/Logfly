const path = require('path')
const fs = require('fs') 
const process = require('process')
const propertiesReader = require('properties-reader')

/**
 * WindowsXP -> C:\Documents and Settings\UserName\Application Data\logfly.properties 
 * Windows Vista and Up -> C:\Users\UserName\AppData\Roaming\logfly.properties
 * MacOS -> /Users/UserName/Library/Preferences/logfly.properties
 * Linux -> '/home/user/.local/share'  A vérifier
 */
 function getLog5Settings() {
    const propertiesPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    let log5Parameters = {
        found : false,
        lang : '',
        dbname : '',
        pathdb : '',
        pathWork : '',
        dbFullPath : ''
    }
    if (propertiesPath != null) 
    {
        const logfly5Path = path.resolve(propertiesPath, "logfly.properties");   
        // we check if Logfly5 was installed
        if (fs.existsSync(logfly5Path)) {                
            const properties = propertiesReader(logfly5Path);
            log5Parameters.found = true
            log5Parameters.dbname = properties.get('dbname')     
            // On Windows, path arrive with double slashes 
            // C\:\\Users\\Thinkpad\\Documents\\Logfly
            // store.set put an extra slash
            // we must remove one from original propertie
            let cleanPath = properties.get('pathdb').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")
            log5Parameters.pathdb = cleanPath
            cleanPath = properties.get('pathw').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")
            log5Parameters.pathWork = cleanPath
            cleanPath = properties.get('fullpathdb').replace(/\t/g,"t").replace(/\\:/g,":").replace(/\\\\/g,"\\")    
            log5Parameters.dbFullPath =  cleanPath
            const idxLang = properties.get('idxlang')
            if (idxLang != undefined) {
                switch (idxLang) {
                    case 0:
                        log5Parameters.lang = 'de'
                        break;
                    case 1:
                        log5Parameters.lang = 'en'
                        break;
                    case 2:
                        log5Parameters.lang = 'fr'
                        break;
                    case 3:
                        log5Parameters.lang = 'it'
                        break;                                                                
                    default:    
                        log5Parameters.lang = 'en'         
                        break;
                }
            } else {
                log5Parameters.lang = 'en'
            }
        } 
    } 

    return log5Parameters
}

module.exports.getLog5Settings = getLog5Settings