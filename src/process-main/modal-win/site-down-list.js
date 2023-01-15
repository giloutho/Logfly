const {ipcMain, BrowserWindow, net} = require('electron')
const fs = require('fs')
const path = require('path')
const { isInternetAvailable, InternetAvailabilityService } = require('is-internet-available')
const log = require('electron-log')

ipcMain.on('display-sites-down', (event, currSite) => {
    downloadList()
    //openWindow(event,currSite)    
})

function downloadList() {   
    const url = 'http://logfly.org/download/sites/json/sites_list.json'
    const service = new InternetAvailabilityService({
      authority: 'https://www.logfly.org',
      rate: 1000, // the wait time between checks
    })
    
    service.on('status', (status) => {
      if (status) {
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
        request.end()
      } else {
        log.error('logfly.org is now unavailable')
      }
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
   // win.webContents.openDevTools();
    process.platform === "win32" && win.removeMenu()
    win.on('close', () => {
        win = null 
    })
    win.loadURL(siteHtmlPath)
    win.webContents.on('did-finish-load', function() {    
        win.send('current-list', sitesJson)   
    });

  }