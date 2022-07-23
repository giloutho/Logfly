const {app, ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
var log = require('electron-log');
const elemMap = require('../maps/littlemap-compute.js')

const Store = require('electron-store');
const store = new Store();
const currOS = store.get('currOS')

let gpsDumpPath = null
switch (currOS) {
    case 'win':
        gpsDumpPath = './ext_resources/bin_win'
        break
    case 'mac':
        // https://stackoverflow.com/questions/46022443/electron-how-to-add-external-files
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_darwin/gpsdumpMac64_9')
        testPath = path.join(path.dirname(__dirname), '../../docs/flight_list.txt')
        break
    case 'linux':
        gpsDumpPath = './ext_resources/bin_linux'
        break
}

ipcMain.on('getflighformap', (event, gpsParam, flightIndex) => {
    let igcString = getFlight(event,gpsParam, flightIndex)
    // const mapTrack = elemMap.buildMapElements(igcString)
    // console.log(mapTrack.ready+' '+mapTrack.flDate+' '+mapTrack.flToffTime+' '+mapTrack.glider)
    // if (mapTrack.ready) {
    //     event.sender.send('gpsdump-fone', true) 
    //     openWindow(mapTrack)
    // } else {
    //     event.sender.send('gpsdump-fone', false) 
    // }
   // event.sender.send('gpsdump-fone', 'Error reading gpsdump result') 
})

function openWindow(event, igcString) {
    const modalPath = path.join('file://', __dirname, '../../views/html/littlemap.html')
    const mapTrack = elemMap.buildMapElements(igcString)
    console.log(mapTrack.ready+' '+mapTrack.flDate+' '+mapTrack.flToffTime+' '+mapTrack.glider)
    if (mapTrack.ready) {
        let win = new BrowserWindow({ 
            width: 1024,
            height: 620,
            parent: BrowserWindow.getFocusedWindow(),
           // modal: true,  modal = frameless don gestion bootsrap d'une barre en ahut avec bouton fermé etc.. on verra
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false, 
            }              
        })
        win.on('close', () => { win = null, event.sender.send('gpsdump-fone', null) })
        win.loadURL(modalPath)
        win.webContents.on('did-finish-load', function() {
          //  win.send('little-map-elements', mapTrack)  // This is a simple trick to pass some variables to littlemap.js
            win.show();
        })
    } else {
        event.sender.send('gpsdump-fone', 'An error occurred during the map generation') 
    }
}

function getFlight(event, gpsParam, flightIndex) {
  // gpsParam contains parameters for GpsDump
  // something like -giq,-cu.usbserial-14140
  // First one is gps type, second serial port
  let paramGPS
  let paramPort
  let paramFile
  let paramFlightIndex
  const execFileSync = require('child_process').execFileSync;
  const tempFileName  = path.join(app.getPath('temp'), 'gpsdump.igc')
  let res = null

  try {
    const gpsParamArray = gpsParam.split(",")
    paramGPS = gpsParamArray[0]
    paramPort = gpsParamArray[1]
    paramFile = '-l'+tempFileName  
    flightIndex +=1
    paramFlightIndex = '-f'+flightIndex.toString()
    data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,paramFlightIndex])   
    if (data) {
      log.info('IGC file saved on '+tempFileName)
      try {
        const igcString = fs.readFileSync(tempFileName, 'utf8')
        res = igcString
        openWindow(event, igcString) 
      } catch (err) {
        log.error('Error reading gpsdump result '+tempFileName+' '+error)
      }      

    }     
  } catch (error) {
    log.error('Error on calling GpsDump ['+paramGPS+','+paramPort+','+paramFile+','+paramFlightIndex+'] : '+error)
  }
  return res
}