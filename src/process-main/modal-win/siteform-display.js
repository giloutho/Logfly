const {ipcMain, BrowserWindow, Menu} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')

ipcMain.on('display-site-form', (event, currSite) => {
    openWindow(event,currSite)    
})

function openWindow(event,currSite) {
    const siteHtmlPath = path.join('file://', __dirname, '../../views/html/secondary/siteform.html')
    let win = new BrowserWindow({ 
        width: 1200,   // 1024
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
        win.send('current-site', currSite)    
    });
}