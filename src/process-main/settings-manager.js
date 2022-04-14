const path = require('path')
const fs = require('fs') 
const Store = require('electron-store')
const process = require('process')
const propertiesReader = require('properties-reader')


function checkSettings (electronPack, progVersion) {      
    // pour debugging
    var propertiesPath = process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share")
    if (propertiesPath != null) 
    {
        console.log(path.resolve(propertiesPath, "logfly.properties")); 
    } 
    if (electronPack) { 
        prodSettings(progVersion)
    } else {
        devSettings()
    }
    testDb()
}

function testDb() {
    const store = new Store(); 
    let dbFullPath = (store.get('dbFullPath'))
    if (fs.existsSync(dbFullPath)) {
        const db = require('better-sqlite3')(dbFullPath)
        // how many tables in database
        const stmt = db.prepare('SELECT COUNT(*) FROM sqlite_master')
        let countTables = stmt.get()
        // countTables is an object, the value is recovered with a notation between brackets 
        countTables['COUNT(*)'] >= 2 ? store.set('checkDb',true) : store.set('checkDb',false)     
    } else {
        store.set('checkDb',false)
        console.log('db checked file not exist '+store.get('checkDb'))  
    }
    console.log(store.get('checkDb'))
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
    console.log('mode prod sur mon '+store.get('currOS')+' avec Chrome '+store.get('chromeVersion')+' sur '+store.get('fullPathDb'))
}


function devSettings() {
    const store = new Store(); 
  //  getEnv()
    store.set('dbFullPath','./db/test6.db')
    store.set('dbName','test6.db')
    store.set('pathdb','./db')
    store.set('pathImport', '/Users/gil/Documents/Logfly6/import')
    store.set('pathSyride','/Users/gil/syride')  
    store.set('pathWork','/Users/gil/Documents/Logfly')
    store.set('lang','fr')
  //  console.log('mode developpement sur mon '+store.get('currOS')+' avec Chrome '+store.get('chromeVersion'))
  console.log('devSettings Ok')
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
            currOs = 'linux'
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
            store.set('pathw',properties.get('pathw'))
            store.set('urlicones',properties.get('urlicones'))
            store.set('dbFullPath',properties.get('fullpathdb'))
            store.set('pathimport',properties.get('pathimport'))
            // une boucle à effectuer pour récupérer la langue
        } else {
            // Logfly5 settings not found, default values will be defined

        }
    }
}

module.exports.checkSettings = checkSettings
