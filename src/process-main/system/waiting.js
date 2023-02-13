const {app, ipcMain, BrowserWindow } = require('electron')
const path = require('path')
const log = require('electron-log');
const fs = require('fs')

let msg = null

// Test synchrone

ipcMain.on('win-waiting', (event) => {
  openWindow(event)
})

function openWindow(event) {
  const modalPath = path.join('file://', __dirname, '../../views/html/secondary/waiting-or.html')
  let win = new BrowserWindow({ 
    width: 350,
    height: 300,
    frame: false 
  })

  // on profite du debug pour vérifier le chemin des fichiers temporaires
  console.log(app.getPath('temp'))

  win.on('close', () => { win = null })
  win.loadURL(modalPath)
  win.webContents.on('did-finish-load', function() {
    win.show();
    for(var i=0; i<4500000000; ++i){}
    msg = 'coucou'
    console.log('fin des opérations.... coucou sent')
    win.close()
    event.returnValue = msg
  });


}



