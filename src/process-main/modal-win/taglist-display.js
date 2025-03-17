const {ipcMain, BrowserWindow, Menu} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')

ipcMain.on('display-tag-list', (event, currFlight) => {
    openWindow(event, currFlight)    
})

function openWindow(event, currFlight) {
    const taglistHtmlPath = path.join('file://', __dirname, '../../views/html/secondary/taglist.html')
    let win = new BrowserWindow({ 
        width: 250,   
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
    win.loadURL(taglistHtmlPath)
    win.webContents.on('did-finish-load', function() {    
    win.send('current-flight', currFlight)    
    });
}