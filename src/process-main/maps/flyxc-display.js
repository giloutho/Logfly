const {ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store();

ipcMain.on('display-flyxc', (event, igcUrl) => {  
    store.set('igcVisu',igcUrl)  
    console.log('igcUrl envoyée : '+igcUrl)
    openWindow(event,igcUrl)    
})

function openWindow() {
    const flyxcHtmlPath = path.join('file://', __dirname, '../../views/html/flyxc.html')
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
    win.on('close', () => { win = null })
    win.loadURL(flyxcHtmlPath)
    win.webContents.on('did-finish-load', function() {    
       // win.send('geojson-for-map', [track,anaTrack,tkSite])    // This is a simple passage of variables intended for fullmap.js
        win.show();
    });
}