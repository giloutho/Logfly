const {ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs');
const IGCParser = require('igc-parser')   // https://github.com/Turbo87/igc-parser
const offset = require('../../utils/geo/offset-utc.js')
const dblog = require('../../utils/db/db-search.js')
const log = require('electron-log')

let igcForImport
let debugNb = 0

ipcMain.on('check-import', (event, arrayIGC) => {
  openWindow(event,arrayIGC)
})

function openWindow(event,arrayIGC) {
  console.log('OpenWindow run...')
  const modalPath = path.join('file://', __dirname, '../../views/html/waiting-or.html')
  let win = new BrowserWindow({ 
    width: 300,
    height: 300,
    frame: false 
  })
  win.loadURL(modalPath)
  //win.webContents.on('did-finish-load', function() {
  // it seems to be better with ready-to-show event
  // https://www.electronjs.org/docs/api/browser-window#%C3%A0-laide-de-l%C3%A9v%C3%A9nement-ready-to-show
 // win.once('did-finish-load', () => {
  win.webContents.on('did-finish-load', function() {
    console.log('Ready-to-show')
    win.show()
    runTestIgc(arrayIGC,function(checkedIGC) {
      event.sender.send('igc-checked-import', checkedIGC)
      win.close()
      console.log('******** CALLBACK Close() ******')
    })
  })
}

function runTestIgc(arrayIGC,_callback) {
  // Must be reinitialized 
  igcForImport = []
  //arrayIGC.forEach(testIgc)
  for (let index = 0; index < arrayIGC.length; index++) {
    testIgc(arrayIGC[index])
  }

  _callback(igcForImport)
}


function testIgc(item) {
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
  let checkDate = /\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])*/  
  if (flightData.fixes.length > 2) {
    // the date must be formatted as YYYY-MM-DD
    if (flightData.date.match(checkDate)) {
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

      debugNb++
 //     console.log(debugNb+' '+path+' flightData.date '+flightData.date+' flightData.fixes[1].timestamp '+flightData.fixes[1].timestamp)
    } else {
 //     console.log('flightData.date '+flightData.date)
    }
  } else {
    this.pointsNumber = 0
    this.errors = flightData.errors  // igc-parser returns an array
  }
}
