const {ipcMain} = require('electron')
const IGCDecoder = require('./igc-decoder.js')

ipcMain.on('read-igc', (event, arg) => {
	const track = new IGCDecoder(arg)
	track.parse(true, true)      	
  	event.returnValue = track
})
