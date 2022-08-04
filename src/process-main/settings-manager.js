const path = require('path')
const fs = require('fs') 
const Store = require('electron-store')
const process = require('process')
//const propertiesReader = require('../../node_modules/properties-reader')
const propertiesReader = require('properties-reader')
const log = require('electron-log');



function checkSettings (electronPack, appPath, progVersion) {          
    // A decommenter c'était pour du debugging Windows
    // var propertiesPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    // if (propertiesPath != null) 
    // {
    //     let forcheck = path.resolve(propertiesPath, "logfly.properties")
    //     console.log(forcheck)
    //     checkPropWindows(forcheck)
    // } 
    if (electronPack) { 
        prodSettings(progVersion)
    } else {
        devSettings(appPath)
    }
    return testDb()
}

/* A vérifier la procédure de vérification dans L5 était plus sophistiquée */
function testDb() {
    const store = new Store(); 
    let dbFullPath = (store.get('dbFullPath'))
    try {
        if (fs.existsSync(dbFullPath)) {
            const db = require('better-sqlite3')(dbFullPath)
            // how many tables in database
            const stmt = db.prepare('SELECT COUNT(*) FROM sqlite_master')
            let countTables = stmt.get()
            //console.log('Test '+dbFullPath+' '+countTables['COUNT(*)']+' tables')
            // countTables is an object, the value is recovered with a notation between brackets 
           // countTables['COUNT(*)'] >= 2 ? store.set('checkDb',true) : store.set('checkDb',false)     
            const stmtSites = db.prepare('SELECT COUNT(*) FROM Site')
            let countSites = stmtSites.get()
            console.log(`Connected on ${dbFullPath} with ${countSites['COUNT(*)']} sites`);
            return true
        } else {
            log.error('db checked file not exist '+dbFullPath)  
            return false
        }        
    } catch (error) {
        log.error('Error occured during db checking  '+error)
        return false  
    }
}

function prodSettings(progVersion) {
    const store = new Store(); 
    console.log('ProgVersion '+progVersion)
   // store.set('progVersion', progVersion)
    getEnv()
    let firstRun = store.get('premiere')
    if(typeof firstRun === 'undefined') {
        iniSettings()
    } else {
        store.set('progVersion',progVersion)
    }
    console.log('mode prod sur mon '+store.get('currOS')+' avec Chrome '+store.get('chromeVersion')+' sur '+store.get('f'))
}


function devSettings(appPath) {
    const store = new Store(); 
    getEnv()
    let currOS = store.get('currOS')
    switch(currOS) {
        case 'mac': 
            store.set('dbFullPath','./dbtest/test6.db')
            console.log('settings '+store.get('dbFullPath'))
            store.set('dbName','test6.db')
            store.set('pathdb','./db')
            store.set('pathImport', '/Users/gil/Documents/Logfly6/import')
            store.set('pathSyride','/Users/gil/syride')  
            store.set('pathWork','/Users/gil/Documents/Logfly')
            store.set('lang','fr')
            console.log('langue = fr')
            break;
        case 'linux': 
        store.set('dbFullPath','./dbtest/test6.db')
            store.set('dbName','test6.db')
            store.set('pathdb','./db')
            store.set('pathImport', '/home/thinklinux/Documents/Logfly/import')
            store.set('pathSyride','/home/thinklinux/Documents/Logfly/syride')  
            store.set('pathWork','/home/thinklinux/Documents/Logfly')
            store.set('lang','fr') 
            store.set('urlvisu','https://flyxc.app/?track=')
            store.set('urllogflyigc','http://logfly.org/Visu/')
            break;
        case 'win':
            store.set('dbFullPath','./dbtest/test6.db')
            store.set('dbName','test6.db')
            store.set('pathdb','./db')
            store.set('pathImport',process.env.USERPROFILE+'\\Documents\\import')
            store.set('pathSyride', process.env.USERPROFILE+'\\Documents\\Syride')
            store.set('pathWork', process.env.USERPROFILE+'\\Documents\\Logfly')
            store.set('lang','fr')
            break;    
        default: 
            currOS = 'ns'  // non supported  
    }
    // Bien qu'inutile on charge à chaque fois pour vérification si des modifications ont été faites dans le json
    let currLang = store.get('lang')
    let currLangFile = currLang+'.json'
    // src uniquement en dev. A supprimer pour le chemin en prod
    let langPath = path.resolve(appPath, 'src/lang', currLangFile)
    console.log(currLangFile)
    try {
        if (fs.existsSync(langPath)) {
            let content = fs.readFileSync(langPath);
            langjson = JSON.parse(content);
            store.set('langmsg',langjson)
        } else {
            log.error('language file not found : '+langPath)
            store.set('lang','en')
        }        
    } catch (error) {
        log.error('Error reading language file : '+error)
        store.set('lang','en')
    }
    console.log('Mode dev sur ['+store.get('currOS')+'] Settings on : '+store.path+'   Logfly db in '+store.get('dbFullPath'))
}

function getEnv() {    
    const store = new Store(); 
    let currOS
    var platform = process.platform;
    switch(platform) {
        case 'darwin': 
            currOS = 'mac'
            break;
        case 'linux': 
            currOS = 'linux'
            break;
        case 'win32':
            currOS = 'win'
            break;    
        default: 
            currOS = 'ns'  // non supported  
    }
    store.set('currOS',currOS)
    store.set('chromeVersion',process.versions.chrome)
    store.set('electronVersion',process.versions.electron)
    store.set('nodeVersion',process.versions.node)
    console.log('currOs : '+currOS)
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
        var logflyPath = path.resolve(propertiesPath, "logfly.properties");   
        // we check if Logfly5 was installed
        if (fs.existsSync(logflyPath)) {    
            var properties = propertiesReader(logflyPath);
            console.log(`Path db : ${properties.get('pathdb')} dbname : ${properties.get('dbname')}`)
            store.set('dbname',properties.get('dbname'))
            store.set('urlvisu',properties.get('urlvisu'))
            store.set('pathsyride',properties.get('pathsyride'))
            store.set('debugmode',properties.get('debugmode'))
            store.set('urllogflyigc',properties.get('urllogflyigc'))
            store.set('pathdb',properties.get('pathdb'))
            store.set('finderlong',properties.get('finderlong'))
            store.set('finderlat',properties.get('finderlat'))
            store.set('urllogfly',properties.get('urllogfly'))
            store.set('pathWork',properties.get('pathw'))
            store.set('urlicones',properties.get('urlicones'))
            store.set('dbFullPath',properties.get('fullpathdb'))
            store.set('pathimport',properties.get('pathimport'))
            // une boucle à effectuer pour récupérer la langue
        } else {
            // Logfly5 settings not found, default values will be defined

        }
    }
}

function checkPropWindows(logflyPath) {
    if (fs.existsSync(logflyPath)) {   
        const store = new Store()
        var properties = propertiesReader(logflyPath);
        let pathdb = properties.get('pathdb')
        let pathw = properties.get('pathw')
        let pathfulldb = properties.get('fullpathdb')
        store.set('debugFullPath',properties.get('fullpathdb'))
        console.log(pathdb+'   '+pathw+'   '+properties.get('fullpathdb'))
    }
}

module.exports.checkSettings = checkSettings