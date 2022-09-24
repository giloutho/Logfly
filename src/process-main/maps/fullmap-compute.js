const {ipcMain, BrowserWindow} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const IGCAnalyzer = require('../igc/igc-analyzer.js')
const anaTrack = new IGCAnalyzer()
const dblog = require('../../utils/db/db-search.js')
const SyncTileSet = require('srtm-elevation').SyncTileSet
const Store = require('electron-store')
const store = new Store();
const pathW  = store.get('pathWork')


let tkSite
let strmEle = []; 
let originWindow = BrowserWindow.getFocusedWindow()

ipcMain.on('compute-map', (event, track) => {
  //openWindow(event,track)   
  runComputing(track)
})

function openWindow(track) {
//function openWindow(event,track) {
    const mapHtmlPath = path.join('file://', __dirname, '../../views/html/fullmap.html')
    let win = new BrowserWindow({ 
        width: 1024,
        height: 620,
        frame : true,
        parent: originWindow,
        modal: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, 
        }              
    })
    win.maximize()
    win.webContents.openDevTools();
    win.on('close', () => { win = null })
    win.loadURL(mapHtmlPath)
 //   runComputing(track)
    win.webContents.on('did-finish-load', function() {    
        win.send('geojson-for-map', [track,anaTrack,tkSite])  
        win.show();
    });
}

function runComputing(track) {
    const modalPath = path.join('file://', __dirname, '../../views/html/waiting-or.html')
    let winWait = new BrowserWindow({ 
      width: 350,
      height: 350,
      parent: BrowserWindow.getFocusedWindow(),
      modal: true,
      frame: false,
    })
  //  originWindow = BrowserWindow.getFocusedWindow(),
 //   winWait.on('close', () => { win = null })
    winWait.loadURL(modalPath)
    winWait.show();
    winWait.webContents.on('did-finish-load', function() {
        anaTrack.compute(track.fixes)
        tkSite = dblog.searchSiteInDb(track.fixes[0].latitude, track.fixes[0].longitude, false);
        // strm download process
        let pathOk = false
        let pathSrtm =  path.join(pathW,'Srtm') 
        if (fs.existsSync(pathSrtm)) {
            pathOk = true
        } else {
            try {
                fs.mkdirSync(pathSrtm)
                pathOk = true
            } catch (error) {
                log.error('[fullmap-compute] unable to create '+pathSrtm)
            }            
        }
        if (pathOk) {
            let arrayElevation = []
            const coordsArray = track.fixes.map(({ latitude, longitude}) => ([latitude,longitude]));
            downloadElevation(coordsArray,pathSrtm,function(downloadResult) {  
                console.log('retour callback')
                if (downloadResult) { 
                    coordsArray.forEach(l => {
                        arrayElevation.push(Math.round(tileset.getElevation([l[0], l[1]])))            
                    });                              
                    anaTrack.elevation.push(...arrayElevation)
                }
            })
        }
        sleepFor(5000)
        winWait.close()
        openWindow(track)
      })
}

function downloadElevation(locations, pathSrtm, myCallback) {    
    let downloadResult
    // Calculate min and max lats/lngs
    let lats = locations.map(l => l[0]);
    let lngs = locations.map(l => l[1]);
    let minLat = Math.min.apply(null, lats);
    let maxLat = Math.max.apply(null, lats);
    let minLng = Math.min.apply(null, lngs);
    let maxLng = Math.max.apply(null, lngs);
    console.log('démarrage download pour '+minLat+'-'+minLng+'  '+maxLat+'-'+maxLng)
    console.time("download");

    tileset = new SyncTileSet(pathSrtm, [minLat, minLng], [maxLat, maxLng], function(err) {
        if (err) {
            downloadResult = false;
            myCallback(downloadResult)
        } else {
            console.timeEnd("download")
            downloadResult = true
            myCallback(downloadResult)
        }
    }, {
        // un peu chaud ... Cela ne fonctionnait plus le 27 08 22
        // upgrade version 2.1.2
        // cette issue https://github.com/rapomon/srtm-elevation/issues/3
        //  évoque le problème ou il répond que la nasa fonctionne mal
        // on change le provider        
        // provider: "https://srtm.fasma.org/{lat}{lng}.SRTMGL3S.hgt.zip",
        // username: null,
        // password: null        
        username: 'logfly_user',
        password: 'Logfly22'
    });
}

// for debugging
function sleepFor(sleepDuration){
    var now = new Date().getTime();
    while(new Date().getTime() < now + sleepDuration){ 
        /* Do nothing */ 
    }
}
