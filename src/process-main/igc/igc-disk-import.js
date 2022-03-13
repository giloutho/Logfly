const {ipcMain} = require('electron')
const fs = require('fs');
const IGCParser = require('igc-parser')   // https://github.com/Turbo87/igc-parser
const offset = require('../../utils/geo/offset-utc.js')
const dblog = require('../../utils/db/db-search.js')
const log = require('electron-log');

let igcForImport

ipcMain.on('import-igc', (event, arg) => {
  log.info('[import-igc] called with '+arg.length+' files')
  // Must be reinitialized 
  igcForImport = []
  // un excellent article sur forEach https://dmitripavlutin.com/foreach-iterate-array-javascript/
  arg.forEach(testIgc);
  event.returnValue = igcForImport
})

function testIgc(item, index) {
  this.path = item
  // ------- igc decoding ----------    
  let igcData = fs.readFileSync(this.path, 'utf8');      
  try {
    let flightData = IGCParser.parse(igcData, { lenient: true });  
    checkedIgc = new validIGC(this.path,flightData)
    igcForImport.push(checkedIgc)
  } catch (error) {
    log.warn('   [testIGC] error for '+this.path+' -> '+error);
  }
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
    this.startLocalTime = flightData.fixes[1].timestamp + (this.offsetUTC*60000)
    this.errors = [] 
    // is this track present in the logbook
    let inLogbook = dblog.flightByTakeOff(this.firstLat, this.firstLong, this.startLocalTime) 
    // Opposite boolean value : if present in the logbook, it's not for import
    this.forImport = !inLogbook
  } else {
    this.pointsNumber = 0
    this.errors = flightData.errors  // igc-parser returns an array
  }
}
