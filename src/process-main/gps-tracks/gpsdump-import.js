const {ipcMain} = require('electron')
const log = require('electron-log')
const path = require('path')
const glob = require("glob");
const fs = require('fs');
const IGCParser = require('igc-parser')   // https://github.com/Turbo87/igc-parser
const offset = require('../../utils/geo/offset-utc.js')
const dblog = require('../../utils/db/db-search.js')
const gpsdumpOne = require('../gps-tracks/gpsdump-flight.js')

let searchResult = {
  errReport: '',
  totalIGC : 0,
  igcBad: [],
  igcForImport : []
 };

ipcMain.on('gpsdump-import', (event, arrayIgc) => {
  runSearchIgc(arrayIgc)  
  event.sender.send('gpsdump-result', searchResult)
})

function runSearchIgc(arrayIGC) {
   searchResult.totalIGC = arrayIGC.length
   for (let index = 0; index < arrayIGC.length; index++) {   
      flightFilePath = gpsdumpOne.getGpsdumpFlight(arrayIGC[index]['gpsparam'], arrayIGC[index]['flightIndex'])
      let igcData = fs.readFileSync(flightFilePath, 'utf8');      
      try {
        let flightData = IGCParser.parse(igcData, { lenient: true });  
        checkedIgc = new validIGC(flightData, igcData)
        if (checkedIgc.validtrack) searchResult.igcForImport.push(checkedIgc)
      } catch (error) {
        log.warn('   [IGC] decoding error on '+arrayIGC[index]+' -> '+error);
        searchResult.igcBad.push(arrayIGC[index])
      }          
   }      
}

function validIGC(flightData, igcData) {
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
    //const dateLocal = (new Date(flightData.fixes[0].timestamp)).toUTCString()   // toUTCString() to avoid the time zone computer
    const dateLocal = new Date(flightData.fixes[0].timestamp)
    this.dateStart = dateLocal
    // format of flightData.date is not good -> YYYY-MM-DD
    this.date = String(dateLocal.getDate()).padStart(2, '0')+'-'+String((dateLocal.getMonth()+1)).padStart(2, '0')+'-'+dateLocal.getFullYear()
    this.startLocalTime = String(dateLocal.getHours()).padStart(2, '0')+':'+String(dateLocal.getMinutes()).padStart(2, '0')+':'+String(dateLocal.getSeconds()).padStart(2, '0');  
    this.dateEnd = new Date(flightData.fixes[flightData.fixes.length - 1].timestamp)
    this.errors = [] 
    // check if track is present in the logbook     
    let inLogbook = dblog.flightByTakeOff(this.firstLat, this.firstLong, this.startLocalTimestamp) 
    // ne peut pas être coché donc ne sera pas dans l'import inutile de refaire la vérif
    // Opposite boolean value : if present in the logbook, it's not for import
    this.forImport = !inLogbook
    this.validtrack = true
    console.log('OK pour '+this.date)
  } else {
    this.pointsNumber = 0
    this.errors = flightData.errors  // igc-parser returns an array
    this.validtrack = false
  }
}
