const {ipcMain, BrowserWindow, Menu} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')

ipcMain.on('display-xc-save', (event, routeSet) => {
    openWindow(event, routeSet)    
})

function openWindow(event, routeSet) {
    const xcsavetHtmlPath = path.join('file://', __dirname, '../../views/html/secondary/xcnavsave.html')
    let win = new BrowserWindow({ 
        width: 500,   
        height: 450,
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
    win.loadURL(xcsavetHtmlPath)
    win.webContents.on('did-finish-load', function() {    
    win.send('route-to-save', routeSet)    
    });
}