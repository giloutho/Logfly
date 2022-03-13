const {ipcMain} = require('electron')

ipcMain.on('synchronous-message', (event, arg) => {
  console.log('ping reçu')
  event.returnValue = 'pong'
})