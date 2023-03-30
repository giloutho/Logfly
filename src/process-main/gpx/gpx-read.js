const {ipcMain} = require('electron')
const IGCDecoder = require('../igc/igc-decoder.js')
const gpxIgc = require('./gpx-to-igc.js')

ipcMain.on('read-gpx', (event, gpxString) => {
    const newIgc = gpxIgc.encodeIGC(gpxString, false)
    if (newIgc.nbPoints > 0) {
        const track = new IGCDecoder(newIgc.igcString)
        track.parse(true, true)  
        event.returnValue = track    	
    } else {
        event.returnValue = 'The GPX file cannot be translated into IGC format'
    }
  	
})