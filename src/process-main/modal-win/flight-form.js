const {ipcMain, BrowserWindow, Menu} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')

ipcMain.on('display-flight-form', (event, flightData) => {
    openWindow(event,flightData)    
})

function openWindow(event,flightData) {
    const siteHtmlPath = path.join('file://', __dirname, '../../views/html/secondary/nogpsflight.html')
    let win = new BrowserWindow({ 
        width: 800,   
        height: 700,
        frame : true,
        parent: BrowserWindow.getFocusedWindow(),
        modal: true,
        frame: false,     // important
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, 
        }              
    })
   // win.webContents.openDevTools();
   process.platform === "win32" && win.removeMenu()
 //  process.platform === "darwin" && Menu.setApplicationMenu(Menu.buildFromTemplate([]))
    win.on('close', () => {
        win = null 
    })
    win.loadURL(siteHtmlPath)
    win.webContents.on('did-finish-load', function() {    
        win.send('current-flight', flightData)    
    });
}