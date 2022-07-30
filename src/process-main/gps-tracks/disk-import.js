const {ipcMain, BrowserWindow} = require('electron')
const log = require('electron-log')
const path = require('path')
const glob = require("glob");
const fs = require('fs');
const IGCParser = require('igc-parser')   // https://github.com/Turbo87/igc-parser
const offset = require('../../utils/geo/offset-utc.js')
const dblog = require('../../utils/db/db-search.js')
const { event } = require('jquery');
const homedir = require('os').homedir()

ipcMain.on('disk-import', (event, importPath) => {
  //openWindow(event,importPath)
  runSearchIgc(importPath,function(searchResult) {
    event.returnValue = searchResult
  })
})

function runSearchIgc(importPath,_callback) {
  let searchResult = {
    errReport: '',
    totalIGC : 0,
    igcBad: [],
    igcForImport : []
   };
    getDirectories(importPath, function (err, arrayIGC) {
    if (err) {
      log.error('[disk-import] getDirectories -> '+err)
      searchResult.errReport = errormsg 
    } else {
      if (arrayIGC != null && arrayIGC instanceof Array) {
        log.info('[disk-gps] getDirectories returns '+arrayIGC.length+' files')
        searchResult.totalIGC = arrayIGC.length
        for (let index = 0; index < arrayIGC.length; index++) {   
          let igcData = fs.readFileSync(arrayIGC[index], 'utf8');      
          try {
            let flightData = IGCParser.parse(igcData, { lenient: true });  
            checkedIgc = new validIGC(arrayIGC[index],flightData)
            if (checkedIgc.validtrack) searchResult.igcForImport.push(checkedIgc)
          } catch (error) {
            log.warn('   [IGC] decoding error on '+arrayIGC[index]+' -> '+error);
            searchResult.igcBad.push(arrayIGC[index])
          }          
        }      
      }
    }  
    _callback(searchResult)
  })
}

function validIGC(path, flightData) {
  this.path = path
  // from https://stackoverflow.com/questions/423376/how-to-get-the-file-name-from-a-full-path-using-javascript
  this.filename = path.replace(/^.*[\\\/]/, '')
  if (flightData.fixes.length > 2) {
    this.pointsNumber = flightData.fixes.length  
    this.firstLat = flightData.fixes[0].latitude
    this.firstLong = flightData.fixes[0].longitude
    this.pilotName = flightData.pilot
    this.date = flightData.date   // date formatted as YYYY-MM-DD
    this.offsetUTC = offset.computeOffsetUTC(flightData.fixes[0].latitude, flightData.fixes[0].longitude,flightData.fixes[1].timestamp)   
    // offsetUTC is in minutes, original timestamp in milliseconds
    //this.startLocalTime = flightData.fixes[1].timestamp + (this.offsetUTC*60000)
    // à priori pas besoin d'ajouter UTC (Vu sr Sky3) ??? A vérifier
    //let tsLocal = flightData.fixes[1].timestamp + (this.offsetUTC*60000)
    const dateLocal = new Date(flightData.fixes[1].timestamp)
    this.dateObject = dateLocal
    this.startLocalTime = String(dateLocal.getHours()).padStart(2, '0')+':'+String(dateLocal.getMinutes()).padStart(2, '0')+':'+String(dateLocal.getSeconds()).padStart(2, '0');     
    this.errors = [] 
    // is this track present in the logbook
    let inLogbook = dblog.flightByTakeOff(this.firstLat, this.firstLong, this.startLocalTime) 
    // Opposite boolean value : if present in the logbook, it's not for import
    this.forImport = !inLogbook
    this.validtrack = true
  } else {
    this.pointsNumber = 0
    this.errors = flightData.errors  // igc-parser returns an array
    this.validtrack = false
  }
}

let getDirectories = function (src, callback) {
  // igc or IGC ??? In Reversale, it was IGC
  // glob function did not seem to work
  // We've been looking for this option [nocase : true] for a long time !!!
  glob(src + '/**/*.igc',{nocase : true},callback);
}
