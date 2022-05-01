const {ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const log = require('electron-log')
const IGCAnalyzer = require('../../utils/igc-analyzer.js')
const anaTrack = new IGCAnalyzer()
const dblog = require('../../utils/db/db-search.js')

ipcMain.on('display-map', (event, track) => {
   openWindow(event,track)    
})

function openWindow(event,track) {
    const mapHtmlPath = path.join('file://', __dirname, '../../views/html/fullmap.html')
    let win = new BrowserWindow({ 
        width: 1024,
        height: 620,
        frame : true,
        parent: BrowserWindow.getFocusedWindow(),
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, 
        }              
    })
    win.maximize()
    win.webContents.openDevTools();
    win.on('close', () => { win = null })
    win.loadURL(mapHtmlPath)
    // Computation is much faster in the main process
    anaTrack.compute(track.fixes)
    let tkSite = dblog.searchSiteInDb(track.fixes[0].latitude, track.fixes[0].longitude, false);
    win.webContents.on('did-finish-load', function() {    
        win.send('geojson-for-map', [track,anaTrack,tkSite])  
        win.show();
    });
}

