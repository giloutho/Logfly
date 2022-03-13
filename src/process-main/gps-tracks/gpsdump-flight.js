const {app, ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
var log = require('electron-log');

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

ipcMain.on('getflight', (event, gpsParam, flightIndex) => {
  openWindow(event,gpsParam, flightIndex)
})

function openWindow(event,gpsParam, flightIndex) {
  const modalPath = path.join('file://', __dirname, '../../views/html/waiting2.html')
  let win = new BrowserWindow({ 
    width: 300,
    height: 300,
    frame: false 
  })
  win.loadURL(modalPath)
  win.webContents.on('did-finish-load', function() {
    win.show()   
    let igcString = getFlight(gpsParam, flightIndex)
    event.sender.send('gpsdump-fone', igcString)    
    win.close()
  })
}

function getFlight(gpsParam, flightIndex) {
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
      } catch (err) {
        log.error('Error reading gpsdump result '+tempFileName+' '+error)
      }      

    }     
  } catch (error) {
    log.error('Error on calling GpsDump ['+paramGPS+','+paramPort+','+paramFile+','+paramFlightIndex+'] : '+error)
  }
  return res
}