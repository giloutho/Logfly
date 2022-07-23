const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store')
const glob = require('glob')
const settings = require(path.join(__dirname, './process-main/settings-manager.js'))

let mainWindow = null;
let langjson;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  // eslint-disable-line global-require
  app.quit();
}

// To avoid an “Electron Security Warning”in the console when the program is run
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

const createWindow = () => {
  loadMainProcesses() 

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }      
  });

  loadLanguage()
//  openWindow('logbook')
 //mainWindow.loadFile(path.join(__dirname, './views/html/logbook.html'));

  // Open the DevTools.
 // mainWindow.webContents.openDevTools();
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

function loadLanguage() {
  // load language
  console.log(app.getPath('userData'));
  try {
    settings.checkSettings(app.isPackaged, '6.0.0')
    const store = new Store(); 
    let currLang = store.get('lang')
    let currLangFile = currLang+'.json'
    let langPath = path.join(__dirname, './lang/',currLangFile)
    if (fs.existsSync(langPath)) {
      let content = fs.readFileSync(path.join(__dirname, './lang/',currLangFile));
      langjson = JSON.parse(content);
    } else {
      // flag for bad language download
    }
    // Each time a new page is loaded, the json language file will be sent
    mainWindow.webContents.on('did-finish-load', function () {
      mainWindow.send('translation', langjson ) 
    })    
    if (store.get('checkDb')) {
      openWindow('overview')
    } else {
      openWindow('problem')
    }
    
  } catch (error) {
      console.log('Error  : '+error)
  } 
}

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
        break;
    case "overview":
      mainWindow.loadFile(path.join(__dirname, './views/html/littlemap.html'));
      mainWindow.webContents.openDevTools();  
      break;      
    case "import":
      mainWindow.loadFile(path.join(__dirname, './views/html/import.html'));
      mainWindow.webContents.openDevTools();
      break;        
    case "sites":
        mainWindow.loadFile(path.join(__dirname, './views/html/sites.html'));
        break;
    case "problem":
          mainWindow.loadFile(path.join(__dirname, './views/html/problem.html'));
          break;        
    case "settings":
        mainWindow.loadFile(path.join(__dirname, './views/html/settings.html'));
        break;        
    case "tools":
      mainWindow.loadFile(path.join(__dirname, './views/html/flyxc.html'));
      break;            
    case "support":
      mainWindow.loadFile(path.join(__dirname, './views/html/support.html'));
      break;   
    case "flyxc":
      mainWindow.loadFile(path.join(__dirname, './views/html/flyxc.html'));
      break;                 
  } 
}

// Require each JS file in the main-process dir
function loadMainProcesses () {
  const files = glob.sync(path.join(__dirname, 'process-main/**/*.js'))
  files.forEach((file) => { require(file) })
}