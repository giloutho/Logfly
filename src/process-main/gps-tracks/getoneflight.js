const {app, ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
var log = require('electron-log');
const gpsdumpOne = require('../gps-tracks/gpsdump-flight.js')
const gpsDumpFiles = require('../../settings/gpsdump-name.js')

const Store = require('electron-store');
const store = new Store();
const currOS = store.get('currOS')

let gpsDumpPath = null
let gpsDumpNames = gpsDumpFiles.getNames()
switch (currOS) {
    case 'win':
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_win',gpsDumpNames['win'])
        break
    case 'mac':
        // https://stackoverflow.com/questions/46022443/electron-how-to-add-external-files
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_darwin',gpsDumpNames['mac'])
        testPath = path.join(path.dirname(__dirname), '../../docs/flight_list.txt')
        break
    case 'linux':
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_linux',gpsDumpNames['linux'])
        break
}

// process-main/gps-tracks/getoneflight.js
ipcMain.on('displayoneflight', (event, gpsParam, flightIndex) => {
    // We wait the same function for Gpsdump and usb gps. 
    // we only need flightindex for gpsdump
    // for usb, we send 9999, flight file path is in gpsParam
    let flightFilePath
    let igcString
    if (flightIndex == 9999) {
        flightFilePath = gpsParam
    } else {
        flightFilePath = gpsdumpOne.getGpsdumpFlight(gpsParam, flightIndex)
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
        win.send('little-map-elements', igcString)  // This is a simple trick to pass some variables to littlemap.js
        win.show();
    })
}
