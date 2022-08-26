const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const glob = require('glob')
const settings = require(path.join(__dirname, './settings/settings-manager.js'))

let mainWindow = null;
let currLang 
let currLangMsg

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

// To avoid an “Electron Security Warning”in the console when the program is run
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

const createWindow = () => {

  /**
   * pass additional arguments to Electron via electron-forge-start is tricky
   * https://github.com/electron-userland/electron-forge/issues/190
   * to test our prod mode we run ->  yarn start -- -- --prod     
   * without this argument, we will be in dev prod
   */
   // let modeProd = app.commandLine.hasSwitch('prod') ? true : false;

  const startOk = settings.checkSettings()

  loadMainProcesses() 

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,        // Values determined by looking at this table https://en.wikipedia.org/wiki/Display_resolution
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }      
  });

  if (startOk) {
    openWindow('settings')
  } else {
    openWindow('problem')
  }
}

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

ipcMain.on("changeWindow", function(event, arg) {
    openWindow(arg)
});

ipcMain.on('hide-waiting-gif', function(event, arg) {
  console.log('hide waiting reçu')
  mainWindow.webContents.send('remove-waiting-gif')
});


function openWindow(pageName) {
  switch (pageName) {
    case "logbook":
        mainWindow.loadFile(path.join(__dirname, './views/html/logbook.html'));
     //   mainWindow.webContents.openDevTools(); 
        break;
    case "overview":
      mainWindow.loadFile(path.join(__dirname, './views/html/overview.html'));
      break;      
    case "import":
      mainWindow.loadFile(path.join(__dirname, './views/html/import.html'));
      break;        
    case "external":
      mainWindow.loadFile(path.join(__dirname, './views/html/external.html'));
      break;              
    case "stat":
      mainWindow.loadFile(path.join(__dirname, './views/html/statistics.html'));
      break;          
    case "sites":
        mainWindow.loadFile(path.join(__dirname, './views/html/sites.html'));
        break;
    case "wayp":
      mainWindow.loadFile(path.join(__dirname, './views/html/waypoints.html'));
      break; 
    case "airspaces":
      mainWindow.loadFile(path.join(__dirname, './views/html/airspaces.html'));
      break;              
    case "photos":
      mainWindow.loadFile(path.join(__dirname, './views/html/photos.html'));
    //  mainWindow.webContents.openDevTools();  
      break;                
    case "settings":
      mainWindow.loadFile(path.join(__dirname, './views/html/settings.html'));
      break;          
    case "utils":
      mainWindow.loadFile(path.join(__dirname, './views/html/utils.html'));
      break;         
    case "problem":
          mainWindow.loadFile(path.join(__dirname, './views/html/problem.html'));
          break;                     
    case "support":
      mainWindow.loadFile(path.join(__dirname, './views/html/support.html'));
      break;   
    case "flyxc":
      mainWindow.loadFile(path.join(__dirname, './views/html/flyxc.html'));
      break;       
      case "noflights":
        mainWindow.loadFile(path.join(__dirname, './views/html/noflights.html'));
        break;                
  } 
}

// Require each JS file in the main-process dir
function loadMainProcesses () {
  const files = glob.sync(path.join(__dirname, 'process-main/**/*.js'))
  files.forEach((file) => { require(file) })
}