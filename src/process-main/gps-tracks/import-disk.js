const {ipcMain} = require('electron')
const log = require('electron-log')
const path = require('path')
const {globSync} = require('glob')
const fs = require('fs')
const IGCParser = require('igc-parser')   // https://github.com/Turbo87/igc-parser
const Store = require('electron-store')
const store = new Store()
const offset = require('../../utils/geo/offset-utc.js')
const dblog = require('../../utils/db/db-search.js')
const gpxIgc = require('../gpx/gpx-to-igc.js')
const { file } = require('fs-jetpack')

ipcMain.on('tracks-disk', (event,importPath) => {
    scanFolders(event,importPath)
})

// Syride case
ipcMain.on('tracks-igc', (event,importPath) => {
  scanOnlyIgc(event,importPath)
})

function scanFolders(event,importPath) {  
    log.info('[scanFolders] for '+importPath)
    let usbLimit = store.get('limit-disk') 
    if(usbLimit == undefined || usbLimit == '' || usbLimit == null ) {usbLimit = '99'}
    const searchIgc = runSearchIgc(importPath,usbLimit)
    searchIgc.totalIGC =searchIgc.igcForImport.length
    log.info('Igc : '+searchIgc.igcForImport.length)
    const searchGpx = runSearchGpx(importPath, usbLimit)
    log.info('Gpx : '+searchGpx.igcForImport.length)
    if (searchGpx.igcForImport.length > 0) {
        for (let index = 0; index < searchGpx.igcForImport.length; index++) {
            searchIgc.igcForImport.push(searchGpx.igcForImport[index])  
        }
    }
    searchIgc.totalIGC += searchGpx.igcForImport.length
    if (searchGpx.igcBad.length > 0) {
        for (let index = 0; index < searchGpx.igcBad.length; index++) {
            searchIgc.igcBad.push(searchGpx.igcBad[index])      
        }
    }
    if (searchGpx.errReport != '') {
        searchIgc.errReport += searchGpx.errReport
    }
    if (searchIgc.igcForImport.length > 0) {
        let nbInsert = 0
        searchIgc.igcForImport.forEach(element => {
        if (element.forImport === true ) {
            nbInsert++
        }
        })       
        searchIgc.totalInsert = nbInsert
        console.log('nbInsert '+searchIgc.totalInsert)
        searchIgc.igcForImport.sort((a, b) => {
        let da = a.dateStart,
            db = b.dateStart
        return db - da
        })       
    }
    event.sender.send('tracks-result', searchIgc)  
}

function scanOnlyIgc(event,importPath) {  
  log.info('[scanOnlyIgc] for '+importPath)
  let usbLimit = store.get('limit-disk')
  if(usbLimit == undefined || usbLimit == '' || usbLimit == null ) {usbLimit = '99'}
  const searchIgc = runSearchIgc(importPath,usbLimit)
  searchIgc.totalIGC =searchIgc.igcForImport.length
  log.info('Igc : '+searchIgc.igcForImport.length)
  if (searchIgc.igcForImport.length > 0) {
      let nbInsert = 0
      searchIgc.igcForImport.forEach(element => {
      if (element.forImport === true ) {
          nbInsert++
      }
      })       
      searchIgc.totalInsert = nbInsert
      console.log('nbInsert '+searchIgc.totalInsert)
      searchIgc.igcForImport.sort((a, b) => {
      let da = a.dateStart,
          db = b.dateStart
      return db - da
      })       
  }
  event.sender.send('tracks-result', searchIgc)  
}

function runSearchIgc(importPath, limitMonths) {
  let searchResult = {
    errReport: '',
    totalIGC : 0,
    totalInsert : 0,
    igcBad: [],
    igcForImport : []
  }
  // if necessary, it is possible to put an array of patternb parameters
  // const arrayIGC = globSync([path.join(usbPath,'**/*.igc'),path.join(usbPath,'**/*.gpx')],{nocase : true,windowsPathsNoEscape:true})
  // but we must treat igc and gpx separately
  const arrayIGC = globSync(path.join(importPath,'**/*.igc'),{nocase : true,windowsPathsNoEscape:true})
  if (arrayIGC != null && arrayIGC instanceof Array) {
    log.info('[runSearchTracks] in '+importPath+' returns '+arrayIGC.length+' files')

    const recentFiles = filterRecentFiles(arrayIGC, limitMonths)
    for (let index = 0; index < recentFiles.length; index++) {   

      let igcData = fs.readFileSync(recentFiles[index], 'utf8')      
      try {
        let flightData = IGCParser.parse(igcData, { lenient: true })  
        checkedIgc = new validIGC(recentFiles[index],flightData, igcData)
        if (checkedIgc.validtrack) searchResult.igcForImport.push(checkedIgc)
      } catch (error) {
        log.warn('   [IGC] decoding error on '+recentFiles[index]+' -> '+error)
        searchResult.igcBad.push(recentFiles[index])
      }          
    } 
    log.info('[runSearchTracks] after filtering returns : '+searchResult.igcForImport.length)     
  } else {
    log.error('[runSearchTracks] no files returned from '+importPath)
    searchResult.errReport = errormsg 
  }

  return searchResult
}

// The principle is simple : the GPX is read and immediately encoded in IGC
function runSearchGpx(importPath, limitMonths) {
    let searchResult = {
      errReport: '',
      totalIGC : 0,
      igcBad: [],
      igcForImport : []
    }
    const arrayGPX = globSync(path.join(importPath,'**/*.gpx'),{nocase : true,windowsPathsNoEscape:true})
    // const  arrayUpGPX = glob.sync(path.join(importPath, '**/*.GPX'))
    // const  arrayMinGPX = glob.sync(path.join(importPath, '**/*.gpx'))
    // const arrayGPX = [...arrayUpGPX, ...arrayMinGPX]
    if (arrayGPX != null && arrayGPX instanceof Array) {
      log.info('[runSearchGpx] getDirectories returns '+arrayGPX.length+' files limite : '+limitMonths)
     // let limitMonthes = 99
      const recentFiles = filterRecentFiles(arrayGPX, limitMonths)
      for (let index = 0; index < recentFiles.length; index++) {   
        const gpxString = fs.readFileSync(recentFiles[index], 'utf8')
        const newIgc = gpxIgc.encodeIGC(gpxString, false) 
        const igcData = newIgc.igcString
        try {
          let flightData = IGCParser.parse(igcData, { lenient: true })  
          checkedIgc = new validIGC(recentFiles[index],flightData, igcData)
          if (checkedIgc.validtrack) searchResult.igcForImport.push(checkedIgc)
        } catch (error) {
          log.warn('   [IGC] decoding error on '+recentFiles[index]+' -> '+error)
          searchResult.igcBad.push(recentFiles[index])
        }          
      }      
    } else {
      log.error('[runSearchGpx] no files returned from '+importPath)
      searchResult.errReport = errormsg 
    }
  
    return searchResult
  }

function validIGC(path, flightData, igcData) {
  this.path = path
  // from https://stackoverflow.com/questions/423376/how-to-get-the-file-name-from-a-full-path-using-javascript
  this.filename = path.replace(/^.*[\\\/]/, '')
  if (flightData.fixes.length > 2) {
    this.igcFile = igcData
    this.pointsNumber = flightData.fixes.length  
    this.startGpsAlt = flightData.fixes[0].gpsAltitude
    this.firstLat = flightData.fixes[0].latitude
    this.firstLong = flightData.fixes[0].longitude
    this.pilotName = flightData.pilot
    this.glider = flightData.gliderType
    this.offsetUTC = offset.computeOffsetUTC(flightData.fixes[0].latitude, flightData.fixes[0].longitude,flightData.fixes[1].timestamp)   
    /**
     * IMPORTANT : when a date oject is requested from the timestamp, 
     * the time difference is returned with the local configuration of the computer. 
     * So if I take a flight from Argentina in January it will return UTC+1, in July UTC+2.
     * it's necessary to request an UTC date object 
     */
    // offsetUTC is in minutes, original timestamp in milliseconds
    this.startLocalTimestamp = flightData.fixes[0].timestamp + (this.offsetUTC*60000)
    const isoLocalStart = new Date(this.startLocalTimestamp).toISOString()
    const dateLocal = new Date(isoLocalStart.slice(0, -1))
    this.dateStart = dateLocal
    // format of flightData.date is not good -> YYYY-MM-DD
    this.date = String(dateLocal.getDate()).padStart(2, '0')+'-'+String((dateLocal.getMonth()+1)).padStart(2, '0')+'-'+dateLocal.getFullYear()
    this.startLocalTime = String(dateLocal.getHours()).padStart(2, '0')+':'+String(dateLocal.getMinutes()).padStart(2, '0')+':'+String(dateLocal.getSeconds()).padStart(2, '0')  
    const isoLocalEnd = new Date(flightData.fixes[flightData.fixes.length - 1].timestamp+(this.offsetUTC*60000)).toISOString()
    this.dateEnd = new Date(isoLocalEnd.slice(0, -1))
    this.errors = [] 
    // check if track is present in the logbook     
    let inLogbook = dblog.flightByTakeOff(this.firstLat, this.firstLong, this.startLocalTimestamp) 
    // ne peut pas être coché donc ne sera pas dans l'import inutile de refaire la vérif
    // Opposite boolean value : if present in the logbook, it's not for import
    this.forImport = !inLogbook
    this.validtrack = true
  } else {
    this.pointsNumber = 0
    this.errors = flightData.errors  // igc-parser returns an array
    this.validtrack = false
  }
}

function filterRecentFiles(files, months) {
  let recentFiles
  if (months == 99) {
      // Si months est égal à 99, copier tous les fichiers sans filtrage
      recentFiles = [...files]
      console.log('recentFiles à 99 : '+recentFiles.length)
  } else {
      const dateThreshold = new Date()
      dateThreshold.setMonth(dateThreshold.getMonth() - months) 

      recentFiles = files.filter(selectedFile => {
          const fileDate = fs.statSync(selectedFile).birthtime // Date de création du fichier
          return fileDate >= dateThreshold // Vérifie si le fichier a été créé dans les "months" derniers mois
      })
  }

  return recentFiles // Retourne les fichiers récents pour un traitement ultérieur si nécessaire
}