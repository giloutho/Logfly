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

ipcMain.on('displayoneflight', (event, gpsParam, flightIndex) => {
    // We wat the same function for Gpsdump and usb gps. 
    // we only need flightindex for gpsdump
    // for usb, we send 9999, flight file path is in gpsParam
    let flightFilePath
    let igcString
    if (flightIndex == 9999) {
        flightFilePath = gpsParam
    } else {
        flightFilePath = getGpsdumpFlight(gpsParam, flightIndex)
    }
    try {
        if (flightFilePath.includes('Error')) {  
            event.sender.send('gpsdump-fone',flightFilePath) 
        } else {
            igcString = fs.readFileSync(flightFilePath, 'utf8')
            // Il ne faut que que le openWindow fasse partie du try catch de lecture du fichier 
        }
    } catch (err) {
      log.error('Error reading flight file : '+err)
      event.sender.send('gpsdump-fone','Error reading flight file on '+flightFilePath)
    }
    if(typeof igcString !== "undefined") {
      openWindow(event, igcString) 
    } else {
      log.error('igcString stay undefined on ')+flightFilePath
      event.sender.send('gpsdump-fone','igcString stay undefined on '+flightFilePath)
    }  
})

function openWindow(event, igcString) {
    const modalPath = path.join('file://', __dirname, '../../views/html/littlemap.html')
    const mapTrack = elemMap.buildMapElements(igcString)
    if (mapTrack.ready) {
        let win = new BrowserWindow({ 
            width: 1024,
            height: 768,
            parent: BrowserWindow.getFocusedWindow(),
            modal: true,  
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false, 
            }              
        })
   //     win.webContents.openDevTools();
        win.on('close', () => { win = null, event.sender.send('gpsdump-fone', null) })
        win.loadURL(modalPath)
        win.webContents.on('did-finish-load', function() {
            win.send('little-map-elements', mapTrack)  // This is a simple trick to pass some variables to littlemap.js
            win.show();
        })
    } else {
        event.sender.send('gpsdump-fone', 'An error occurred during the map generation') 
    }
}

function getGpsdumpFlight(gpsParam, flightIndex) {
  // gpsParam contains parameters for GpsDump
  // something like -giq,-cu.usbserial-14140
  // First one is gps type, second serial port
  let paramGPS
  let paramPort
  let paramFile
  let paramFlightIndex
  const execFileSync = require('child_process').execFileSync;
  const tempFileName  = path.join(app.getPath('temp'), 'gpsdump.igc')
  if (fs.existsSync(tempFileName)) {
    try {
      fs.unlinkSync(tempFileName)
    } catch(err) {
      log.error('The gpsDump temporary file was not deleted : '+err)
    }
  }
  let res = null

  try {
    const gpsParamArray = gpsParam.split(",")
    paramGPS = gpsParamArray[0]
    paramPort = gpsParamArray[1]
    paramFile = '-l'+tempFileName  
    flightIndex +=1
    paramFlightIndex = '-f'+flightIndex.toString()
    log.info('[GpsDump called one flight] with '+paramGPS+','+paramPort+','+paramFile,','+paramFlightIndex)
    data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,paramFlightIndex])   
    if (data) {
        res = tempFileName
    }     
  } catch (error) {
    res = 'Error on calling GpsDump ['+paramGPS+','+paramPort+','+paramFile+','+paramFlightIndex+']'
    log.error(res+' : '+error)
  }

  return res    
}