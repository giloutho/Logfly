const {app, shell, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const fs = require('fs')
const {download} = require('electron-dl')
const Store = require('electron-store')

ipcMain.on('dl-file', (event, dlUrl) => {
  const dlProperties = {directory: app.getPath('downloads')}
  const win = BrowserWindow.getFocusedWindow()
  download(win, dlUrl, dlProperties)
  .then(dl => win.webContents.send("dl-complete", dl.getSavePath()));
})


ipcMain.on("download", (event, info) => {
  info.properties.onProgress = status => window.webContents.send("download progress", status);
  download(BrowserWindow.getFocusedWindow(), info.url, info.properties)
      .then(dl => window.webContents.send("download complete", dl.getSavePath()));
});

ipcMain.on('dl-file-progress', (event, dlUrl) => {
  // delete a possible file with the same name
  let fileName = dlUrl.substring(dlUrl.lastIndexOf('/')+1)
  const oldFilePath  = path.join(app.getPath('downloads'), fileName)
  if (fs.existsSync(oldFilePath)) {
    try {
      fs.unlinkSync(oldFilePath)
    } catch(err) {
      console.log(oldFilePath+' was not deleted : '+err)
    }
  }
  const dlProperties = {directory: app.getPath('downloads')}
  const win = BrowserWindow.getFocusedWindow()
  dlProperties.onProgress = status => win.webContents.send("dl-progress", status);
  download(win, dlUrl, dlProperties)
  .then(dl => win.webContents.send("dl-complete", dl.getSavePath()));
})

/**
 * https://stackoverflow.com/questions/70140124/electron-node-js-quit-app-after-launching-external-app-or-file
 */
ipcMain.on('run-update', (event, updateFile) => { 
  console.log('run update')
  // const child = require('child_process').spawn
  // const subprocess = child(updateFile, {
  //   detached: true,  //Continue running after the parent exits.
  //   stdio: 'ignore'  
  // });  
  // subprocess.unref() //To prevent the parent from waiting for a given subprocess to exit
  // app.quit()

  // const child = require('child_process').execFile;
  // const fs = require('fs');
  // if (fs.existsSync(updateFile)) {
  //    child(updateFile, function(err, data) { }); //start the update.exe
  //  //  app.quit(); //quit the app
  // }

  shell.showItemInFolder(updateFile);
  app.quit()

    // const child = require('child_process').spawn
  // const subprocess = child(updateFile, {
  //   detached: true,  //Continue running after the parent exits.
  //   stdio: 'ignore'  
  // });  
  // subprocess.unref() //To prevent the parent from waiting for a given subprocess to exit
  // app.quit()

})