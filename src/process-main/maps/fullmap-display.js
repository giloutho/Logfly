const {ipcMain, BrowserWindow} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const IGCAnalyzer = require('../../utils/igc-analyzer.js')
const anaTrack = new IGCAnalyzer()
const dblog = require('../../utils/db/db-search.js')
const SyncTileSet = require('srtm-elevation').SyncTileSet
const Store = require('electron-store')
const store = new Store();
const pathW  = store.get('pathWork')
let tkSite 
let tileset


ipcMain.on('display-map', (event, track) => {
    trackComputing(event,track)
  //  openWindow(event,track)    
})

function trackComputing(event,track) {
    anaTrack.compute(track.fixes)
    tkSite = dblog.searchSiteInDb(track.fixes[0].latitude, track.fixes[0].longitude, false);
    // Strangely anaTrack.elevation.length must be set to 0
     // otherwise the values are added to the points of the previous trace
    anaTrack.elevation.length = 0       
    // strm download process
    let pathOk = false
    let pathSrtm =  path.join(pathW,'Srtm') 
    console.log('before test : '+pathSrtm)
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
                openFenetre(event,track)
            }
        })
    } 
}

function openFenetre(event,track) {
    const mapHtmlPath = path.join('file://', __dirname, '../../views/html/fullmap.html')
    let win = new BrowserWindow({ 
        width: 1024,
        height: 620,
        frame : true,
        parent: BrowserWindow.getFocusedWindow(),
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
    win.webContents.on('did-finish-load', function() {    
        win.send('geojson-for-map', [track,anaTrack,tkSite])  
        win.show();
    });
}

function openWindow(event,track) {
    const mapHtmlPath = path.join('file://', __dirname, '../../views/html/fullmap.html')
    let win = new BrowserWindow({ 
        width: 1024,
        height: 620,
        frame : true,
        parent: BrowserWindow.getFocusedWindow(),
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
    win.webContents.on('did-finish-load', function() {    
        win.send('geojson-for-map', [track,anaTrack,tkSite])  
        win.show();
    });
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
    console.log('démarrage download')
    console.time("download");

    tileset = new SyncTileSet(pathSrtm, [minLat, minLng], [maxLat, maxLng], function(err) {
        if (err) {
            downloadResult = false;
            myCallback(downloadResult)
        }
        console.timeEnd("download")
        downloadResult = true
        myCallback(downloadResult)
    }, {
        username: 'logfly_user',
        password: 'Logfly22'
    });
}

