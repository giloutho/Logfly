const {ipcMain, BrowserWindow, Menu} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')

ipcMain.on('air-menu', (event,radius) => {
    openWindow(radius)    
})

function openWindow(radius) {
    const airmenutHtmlPath = path.join('file://', __dirname, '../../views/html/secondary/airmenu.html')
    let win = new BrowserWindow({ 
        width: 700,   
        height: 400,
        frame : true,
        parent: BrowserWindow.getFocusedWindow(),
        modal: true,
        frame: false,     // important
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, 
        }              
    })
   process.platform === "win32" && win.removeMenu()
 //  process.platform === "darwin" && Menu.setApplicationMenu(Menu.buildFromTemplate([]))
    win.on('close', () => {
        win = null 
    })
    win.loadURL(airmenutHtmlPath)
    win.webContents.on('did-finish-load', function() {    
        win.send('airspace-radius', radius)    
    });
}