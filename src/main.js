const { app, BrowserWindow } = require('electron');
const path = require('path');
const glob = require('glob')
const settings = require(path.join(__dirname, 'utils/settings-manager.js'))

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

// To avoid an “Electron Security Warning”in the console when the program is run
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

const createWindow = () => {

  // app.isPackaged returns true if the app is packaged, used to distinguish development and production environments
  settings.checkSettings(app.isPackaged, app.getVersion())
  loadMainProcesses() 
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
   //   preload: path.join(__dirname, 'preload.js')      
    }      
  });

  mainWindow.removeMenu()
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools.
 // mainWindow.webContents.openDevTools();

};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

function loadMainOneByOne () {
  const filesutils = glob.sync(path.join(__dirname, 'process-main/files-utils/*.js'))
  filesutils.forEach((file) => { require(file) })

  const gpstracks = glob.sync(path.join(__dirname, 'process-main/gps-tracks/*.js'))
  gpstracks.forEach((file) => { require(file) })

  const igcmain = glob.sync(path.join(__dirname, 'process-main/igc/*.js'))
  igcmain.forEach((file) => { require(file) })
  const oamain = glob.sync(path.join(__dirname, 'process-main/igc/*.js'))
  oamain.forEach((file) => { require(file) })
  const sysmain = glob.sync(path.join(__dirname, 'process-main/igc/*.js'))
  sysmain.forEach((file) => { require(file) })
}

// Require each JS file in the main-process dir
function loadMainProcesses () {
  const files = glob.sync(path.join(__dirname, 'process-main/**/*.js'))
  files.forEach((file) => { require(file) })
}

