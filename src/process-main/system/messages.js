const {BrowserWindow, ipcMain, dialog} = require('electron')


ipcMain.on('error-dialog', (event, arg) => {  
  dialog.showErrorBox(arg[0], arg[1])  
})

ipcMain.on('hide-waiting-gif', (event, arg) => {  
  console.log('remove waiting sent')
  event.sender.send('remove-waiting-gif',null) 
})