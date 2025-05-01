const {ipcMain} = require('electron')
const IGCAnalyzer = require('./igc-analyzer.js')


ipcMain.on('ask-analyze', (event, trackfixes) => {
    const anaTrack = new IGCAnalyzer()
	anaTrack.compute(trackfixes)   	
  	event.returnValue = anaTrack
})