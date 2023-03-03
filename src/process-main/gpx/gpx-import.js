const {ipcMain, BrowserWindow} = require('electron')
const log = require('electron-log')
const path = require('path')
const glob = require('glob')
const fs = require('fs')
const IGCParser = require('igc-parser')   // https://github.com/Turbo87/igc-parser
const IGCDecoder = require('../igc/igc-decoder.js')
const offset = require('../../utils/geo/offset-utc.js')
const dblog = require('../../utils/db/db-search.js')
const { event } = require('jquery')
const homedir = require('os').homedir()
const gpxIgc = require('./gpx-to-igc.js')

ipcMain.on('disk-gpx', (event, importPath) => {
  console.log('disk-gpx called')
  runSearchGpx(importPath,function(searchResult) {
    event.returnValue = searchResult
  })
})

// The principle is simple : the GPX is read and immediately encoded in IGC
function runSearchGpx(importPath,_callback) {
  let searchResult = {
    errReport: '',
    totalIGC : 0,
    igcBad: [],
    igcForImport : []
   }
    getDirectories(importPath, function (err, arrayGPX) {
    if (err) {
      log.error('[gpx-import] getDirectories -> '+err)
      searchResult.errReport = errormsg 
    } else {
      if (arrayGPX != null && arrayGPX instanceof Array) {
        log.info('[runSearchGpx] getDirectories returns '+arrayGPX.length+' files')
        searchResult.totalIGC = arrayGPX.length
        for (let index = 0; index < arrayGPX.length; index++) {   
          const gpxString = fs.readFileSync(arrayGPX[index], 'utf8')
          const newIgc = gpxIgc.encodeIGC(gpxString, false) 
          const igcData = newIgc.igcString
          try {
            let flightData = IGCParser.parse(igcData, { lenient: true })  
            checkedIgc = new validIGC(arrayGPX[index],flightData, igcData)
            if (checkedIgc.validtrack) searchResult.igcForImport.push(checkedIgc)
          } catch (error) {
            log.warn('   [IGC] decoding error on '+arrayGPX[index]+' -> '+error)
            searchResult.igcBad.push(arrayGPX[index])
          }          
        }      
      }
    }  
    _callback(searchResult)
  })
}

function validIGC(path, flightData, igcData) {
  this.path = path
  // from https://stackoverflow.com/questions/423376/how-to-get-the-file-name-from-a-full-path-using-javascript
  this.filename = path.replace(/^.*[\\\/]/, '')
  if (flightData.fixes.length > 2) {
    this.igcFile = igcData
    this.pointsNumber = flightData.fixes.length  
    this.startGpsAlt = flightData.fixes[0].gpsAltitude
    this.firstLat = flightData.fixes[0].latitude
    this.firstLong = flightData.fixes[0].longitude
    this.pilotName = flightData.pilot
    this.glider = flightData.gliderType
    this.offsetUTC = offset.computeOffsetUTC(flightData.fixes[0].latitude, flightData.fixes[0].longitude,flightData.fixes[1].timestamp)   
    /**
     * IMPORTANT : when a date oject is requested from the timestamp, 
     * the time difference is returned with the local configuration of the computer. 
     * So if I take a flight from Argentina in January it will return UTC+1, in July UTC+2.
     * it's necessary to request an UTC date object 
     */
    // offsetUTC is in minutes, original timestamp in milliseconds
    this.startLocalTimestamp = flightData.fixes[0].timestamp + (this.offsetUTC*60000)
    const isoLocalStart = new Date(this.startLocalTimestamp).toISOString()
    const dateLocal = new Date(isoLocalStart.slice(0, -1))
    this.dateStart = dateLocal
    // format of flightData.date is not good -> YYYY-MM-DD
    this.date = String(dateLocal.getDate()).padStart(2, '0')+'-'+String((dateLocal.getMonth()+1)).padStart(2, '0')+'-'+dateLocal.getFullYear()
    this.startLocalTime = String(dateLocal.getHours()).padStart(2, '0')+':'+String(dateLocal.getMinutes()).padStart(2, '0')+':'+String(dateLocal.getSeconds()).padStart(2, '0')  
    const isoLocalEnd = new Date(flightData.fixes[flightData.fixes.length - 1].timestamp+(this.offsetUTC*60000)).toISOString()
    this.dateEnd = new Date(isoLocalEnd.slice(0, -1))
    this.errors = [] 
    // check if track is present in the logbook     
    let inLogbook = dblog.flightByTakeOff(this.firstLat, this.firstLong, this.startLocalTimestamp) 
    // ne peut pas être coché donc ne sera pas dans l'import inutile de refaire la vérif
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
  glob(src + '/**/*.gpx',{nocase : true},callback)
}