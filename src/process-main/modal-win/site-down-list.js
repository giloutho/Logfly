const {ipcMain, BrowserWindow, net} = require('electron')
const fs = require('fs')
const path = require('path')
const internetAvailable = require('internet-available')
const log = require('electron-log')

ipcMain.on('display-sites-down', (event, currSite) => {
    downloadList()
    //openWindow(event,currSite)    
})

function downloadList() {   
    const url = 'http://logfly.org/download/sites/json/sites_list.json'
    internetAvailable().then(() => {
      const request = net.request({
        method: 'GET',
        url : url,
      })
      request.on("response", (response) => {
        const data = [];
        response.on("data", (chunk) => {
          data.push(chunk);
        })
        response.on("end", () => {
          const json = Buffer.concat(data).toString()
          try {
            openWindow(json)
          } catch (error) {
            console.log(error)
          }
        })
      });
    
      request.end();
    }).catch(() => {
        console.log("No internet ou web response");
        // Not great, but waiting for better
        //openWindow('logbook')
    })
  }

  function openWindow(sitesJson) {
    const siteHtmlPath = path.join('file://', __dirname, '../../views/html/secondary/downsites.html')
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
    win.webContents.openDevTools();
    process.platform === "win32" && win.removeMenu()
    win.on('close', () => {
        win = null 
    })
    win.loadURL(siteHtmlPath)
    win.webContents.on('did-finish-load', function() {    
        win.send('current-list', sitesJson)   
    });

  }