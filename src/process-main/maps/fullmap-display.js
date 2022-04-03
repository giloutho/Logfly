const {ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const log = require('electron-log')

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
    win.webContents.openDevTools();
    win.on('close', () => { win = null })
    win.loadURL(mapHtmlPath)
    win.webContents.on('did-finish-load', function() {    
        win.send('geojson-for-map', track)  
        win.show();
    });
}

