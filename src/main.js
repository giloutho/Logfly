//const { app, BrowserWindow } = require('electron');
//const path = require('node:path');

const { app, BrowserWindow, Menu, ipcMain, net } = require('electron')
const path = require('path')
const fs = require('fs')
const {globSync} = require('glob')
const checkInternetConnected = require('check-internet-connected') 
const settings = require(path.join(__dirname, './settings/settings-manager.js'))
const Store = require('electron-store')
const Splashscreen = require('@trodi/electron-splashscreen')

let mainWindow = null
let releaseInfo
let start = performance.now()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
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
   // let modeProd = app.commandLine.hasSwitch('prod') ? true : false

  const startOk = settings.checkSettings()

  // grab screen size
  let store = new Store()
  let screenWidth
  let screenHeight
  if (store.get('screenWidth')) {
    screenWidth = store.get('screenWidth')
    screenHeight = store.get('screenHeight')
  } else {
    screenWidth = 1280
    screenHeight = 800
    store.set('screenWidth',screenWidth)
    store.set('screenHeight',screenHeight)
    store.set('logtablelines',14)
    store.set('sitetablelines',12)
  }

  
  
  //  Code with splahscreen

  /* const windowOptions = {
    width: screenWidth,
    height: screenHeight,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }   
  }

  mainWindow = Splashscreen.initSplashScreen({
    windowOpts: windowOptions,
    templateUrl: `${__dirname}/views/html/secondary/splash.html`,
    delay: 0, // force show immediately since example will load fast
    minVisible: 1500, // show for 1.5s so example is obvious
    splashScreenOpts: {
        height: 300,
        width: 500,
        transparent: true,
    },
})
*/
  // end of code with splahscreen


  
  // Code without splashscreen
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,        // Values determined by looking at this table https://en.wikipedia.org/wiki/Display_resolution
   // show: false,               // Uncomment with Splashcreen
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }      
  })
    // End of code without splashscreen



  const macTemplate = [
  {
    label: app.name,
    submenu: [
      { label : 'Hide Logfly',
        role: 'hide' },
      { label : 'Hide Others',
        role: 'hideOthers' },
      { label : 'Show All',
        role: 'unhide' },
      { type: 'separator' },
      { label : 'Quit Logfly',
        role: 'quit' }      
    ]
  },{
    label: 'Help',
    submenu: [
      {
        label: 'Help on line',
        click: async () => {
          const { shell } = require('electron')
          await shell.openExternal('https://logfly.org')
        }
      },
      { 
        label :'Debug mode',
        role: 'toggleDevTools' 
      }      
    ]
  }
  ]

  const winTemplate = [
    {
      label: app.name,
      submenu: [
        { label : 'Quit Logfly',
          role: 'quit' }      
      ]
    },{
      label: 'Help',
      submenu: [
        {
          label: 'Help on line',
          click: async () => {
            const { shell } = require('electron')
            await shell.openExternal('https://logfly.org')
          }
        },
        { 
          label :'Debug mode',
          role: 'toggleDevTools' 
        }      
      ]
    }
  ]

  loadMainProcesses() 

  // Hide menu bar https://stackoverflow.com/questions/69629262/how-can-i-hide-the-menubar-from-an-electron-app
  //  process.platform === "win32" && mainWindow.removeMenu()
  process.platform === "win32" && Menu.setApplicationMenu(Menu.buildFromTemplate(winTemplate))
  process.platform === "linux" && mainWindow.removeMenu()
  process.platform === "darwin" && Menu.setApplicationMenu(Menu.buildFromTemplate(macTemplate))

  if (startOk) { 
    openWindow('equip')
   // checkAndStart()
  } else {
    openWindow('problem')
  }
  let timeTaken = performance.now()-start;
  console.log(`Operation took ${timeTaken} milliseconds`)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {  
  createWindow()

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on("changeWindow", function(event, arg) {
  openWindow(arg)
})

ipcMain.on('hide-waiting-gif', function(event, arg) {
  console.log('hide waiting reçu')
  mainWindow.webContents.send('remove-waiting-gif')
})

ipcMain.on('ask-infos', function(event, arg) {
  releaseInfo = null
  checkRequest()
})

ipcMain.on('back_waypform', (event, arg) => {  
  mainWindow.webContents.send('back_waypform',arg)
})

ipcMain.on('back_siteform', (event, arg) => {  
  mainWindow.webContents.send('back_siteform',arg)
})

ipcMain.on('back_sitedown', (event, arg) => {  
  mainWindow.webContents.send('back_sitedown',arg)
})

ipcMain.on('back_flightform', (event, arg) => {  
  mainWindow.webContents.send('back_flightform',arg)
})


function openWindow(pageName) {
  switch (pageName) {
    case "logbook":
        mainWindow.loadFile(path.join(__dirname, './views/html/logbook.html'))
     //   mainWindow.webContents.openDevTools() 
        break
    case "overview":
      // original code
      mainWindow.loadFile(path.join(__dirname, './views/html/overview.html'))      
 //     mainWindow.webContents.openDevTools()
      break      
    case "infos":
      mainWindow.loadFile(path.join(__dirname, './views/html/information.html'))
  //    mainWindow.webContents.send('read-infos')
//      mainWindow.webContents.openDevTools() 
      break            
    case "import":
      mainWindow.loadFile(path.join(__dirname, './views/html/import.html'))
   //   mainWindow.webContents.openDevTools()
      break        
    case "external":
      mainWindow.loadFile(path.join(__dirname, './views/html/external.html'))
      break              
    case "stat":
      mainWindow.loadFile(path.join(__dirname, './views/html/statistics.html'))
      //mainWindow.webContents.openDevTools() 
      //mainWindow.loadFile(path.join(__dirname, './views/html/problem.html'))
      break          
    case "sites":
        mainWindow.loadFile(path.join(__dirname, './views/html/sites.html'))
        break
    case "wayp":
      mainWindow.loadFile(path.join(__dirname, './views/html/waypoints.html'))
      //mainWindow.webContents.openDevTools()
      break 
    case "airspaces":
      mainWindow.loadFile(path.join(__dirname, './views/html/airspaces.html'))
    //  mainWindow.webContents.openDevTools()
      break              
    case "equip":
      mainWindow.loadFile(path.join(__dirname, './views/html/equip.html'))
      mainWindow.webContents.openDevTools()  
      break                
    case "settings":
      mainWindow.loadFile(path.join(__dirname, './views/html/settings.html'))
      break          
    case "utils":
      mainWindow.loadFile(path.join(__dirname, './views/html/utils.html'))
      //mainWindow.webContents.openDevTools()  
      break         
    case "problem":
          mainWindow.loadFile(path.join(__dirname, './views/html/problem.html'))
          break                     
    case "support":
      mainWindow.loadFile(path.join(__dirname, './views/html/support.html'))
     // mainWindow.webContents.openDevTools()
      break   
    case "flyxc":
      mainWindow.loadFile(path.join(__dirname, './views/html/flyxc.html'))
      break       
    case "noflights":
      mainWindow.loadFile(path.join(__dirname, './views/html/noflights.html'))
      break                
  } 
}

async function checkAndStart() {
  let checkLogfly = await checkInternetConnected()
  if (checkLogfly) {
    const infosOk = await checkInfos()
    if (infosOk) {
      console.log('infos OK '+releaseInfo.version)
      const currVersion = app.getVersion() 
      console.log('currVersion '+currVersion+' json.version '+releaseInfo.version)
      if (releaseInfo.version > currVersion || releaseInfo.message !== undefined )  {
          openWindow('infos')
      } else {
          openWindow('logbook')
      }    
    } else {
      openWindow('logbook')
    }    
  } else {
    openWindow('logbook')
  }
}

async function checkRequest() { 
  releaseInfo = null
  let checkLogfly = await checkInternetConnected()
  const infosOk = await checkInfos()
  mainWindow.webContents.send('read-infos', releaseInfo)
}

/**
 * From https://www.geeksforgeeks.org/http-rest-api-calls-in-electronjs/
 * and json solution in https://stackoverflow.com/questions/71221278/in-an-electron-application-i-am-successfully-making-an-http-get-request-from-an
 */
async function checkInfos() {
    releaseInfo = null
    const request = net.request({
        method: 'GET',
        url: 'https://logfly.org/download/logfly6/release.php'
    })
    const logflyResponse = new Promise((resolve, reject) => {
      request.on('response', (response) => {
        if (response.statusCode == 200) {
          let buffers = []
          response.on('data', (chunk) => {
            buffers.push(chunk)
          })
          response.on('end', () => {
            let responseBodyBuffer = Buffer.concat(buffers)
            let json = JSON.parse(responseBodyBuffer.toString())
            releaseInfo = json    
            console.log('In checkInfos '+releaseInfo.version)  
            resolve(true)
          })
        } else {
          console.log('logfly.org is now unavailable')
          resolve(false)
        }
      })
      console.log('on envoie request.end')
      request.end()    
    })

    return await logflyResponse
}

// Require each JS file in the main-process dir
function loadMainProcesses () {
    const files = globSync(path.join(__dirname, 'process-main/**/*.js'),{nocase : true,windowsPathsNoEscape:true})
     files.forEach((file) => { require(file) })
  }
