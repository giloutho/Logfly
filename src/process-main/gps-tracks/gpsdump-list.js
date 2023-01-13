const {app, ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
var log = require('electron-log')
const dblog = require('../../utils/db/db-search.js')
const gpsDumpFiles = require('../../settings/gpsdump-settings.js')
const gpsDumpParams = gpsDumpFiles.getParam()
const Store = require('electron-store')
const store = new Store()
const currOS = store.get('currOS')
const specOS = store.get('specOS')

let flightList = {}

ipcMain.on('flightlist', (event, gpsCom) => {
  //openWindow(event,gpsCom)
  readOnPorts(gpsCom)
  event.sender.send('gpsdump-flist', flightList)
})

// function openWindow(event,gpsCom) {
//   const modalPath = path.join('file://', __dirname, '../../views/html/waiting2.html')
//   let win = new BrowserWindow({ 
//     width: 300,
//     height: 300,
//     frame: false 
//   })
//   win.loadURL(modalPath)
//   win.webContents.on('did-finish-load', function() {
//     win.show()
//     readOnPorts(gpsCom)
//     event.sender.send('gpsdump-flist', flightList)
//     win.close()
//   })
// }

function readOnPorts(gpsCom) {
  /**
   *      GpsCom is an array of
   *        gpsReq =  {
   *          'chip': result[i].manufacturer,
   *          'model': gpsModel,    (FlymasterSD, FlymasterOld, Flytec20, Flytec15)
   *          'port': result[i].path
   *        }            
  */  
  try {
    for (let i = 0; i < gpsCom.length; i++) {
      flightList = {
        manufacturer: null,
        model: null,
        serial: null,
        firmware: null,
        error: false,
        flights: [],
        otherlines:[]
      }       
      askFlightList(gpsCom[i])
      if (flightList.error === false) {
        break
      }    
    }    
  } catch (error) {
    log.error('Error on gpsCom[] loop '+error)
  }  
}


function askFlightList(gpsModel) {
  const execFileSync = require('child_process').execFileSync
  let gpsDumpPath
  let data
  let paramGPS
  let paramPort
  let paramList
  let paramFile
  let modelGPS = gpsModel.model  
  const wNoWin = '/win=0'  
  const wExit = '/exit'  
  const wOverw = "/overwrite"    
  gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources',gpsDumpParams[specOS].gpsdump)
  paramList = gpsDumpParams[specOS].list
  paramFile = gpsDumpParams[specOS].listfile
  switch (modelGPS) {
    case 'FlymasterSD':
      paramGPS = gpsDumpParams[specOS].flym      
      console.log(paramGPS)       
      break      
    case 'FlymasterOld':
      paramGPS = gpsDumpParams[specOS].flymold          
      break                
    case 'Flytec20':
      // Compeo/Compeo+/Galileo/Competino/Flytec 5020,5030,6030
      paramGPS = gpsDumpParams[specOS].fly20              
      break      
    case 'Flytec15':
      // IQ-Basic / Flytec 6015
      paramGPS = gpsDumpParams[specOS].fly15                 
      break                     
  }      
  if (gpsDumpPath != null && fs.existsSync(gpsDumpPath)) { 
    try {
      switch (specOS) {
        case 'win':
            const numPort = gpsModel.port.replace('COM','')
            paramPort = '/com='+numPort
            // Stein himself was surprised when I told him that notify could send to a file
            // I found this on change log of version 5.12 
            // Our mail exchange 08 2019
            const wParamFile = '/notify='+paramFile
            // L5 -> new String[]{pathGpsDump,wNoWin, wComPort, sTypeGps, sAction, sNotify, sOverw,wExit};
            let wParam = [wNoWin, paramPort, paramGPS, paramList, wParamFile, wOverw, wExit ]
            // Unlike the Mac and Linux versions, the Windows version does not return the list on the screen
            // It is saved in a file whose path is in paramFile
            log.info(path.basename(gpsDumpPath)+wParam)
            let result = execFileSync(gpsDumpPath, wParam)
            if(result) {
              data = fs.readFileSync(paramFile, 'utf8')
            }
            break
        case 'mac32':
          paramPort = gpsModel.port.replace('/dev/tty','-cu')
          // in terminal ./GpsDump /gps=flymaster /name=temp.igc /flightlist
          log.info(path.basename(gpsDumpPath)+' '+paramGPS+' '+paramPort+' '+paramList)
          data = execFileSync(gpsDumpPath, [paramGPS,paramPort, paramList])
          // L5 -> new String[]{pathGpsDump,sTypeGps, sAction};     
          break            
        case 'mac64':
            paramPort = gpsModel.port.replace('/dev/tty','-cu')
            console.log(paramPort)
            // in terminal :  ./GpsDumpMac64_9 -gyn -cu.usbmodem0000001 -ltempo.txt -f0  
            log.info(path.basename(gpsDumpPath)+' '+paramGPS+' '+paramPort+' '+paramFile+' '+paramList)
            data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,paramList])
            break
        case 'linux':
            // A définir sur le modèle mac -> paramPort = gpsModel.port.replace('/dev/tty','-cu')
            log.info(path.basename(gpsDumpPath)+' '+paramGPS+' '+paramPort+' '+paramFile+' '+paramList)
            data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,paramList])
            break
      }
    } catch (err) {
        log.error('askFlightList error : '+err)
    }
    // data has been declared but not not necessarily initialized if the communication fails
    if (data) {
      switch (modelGPS) {
        case 'FlymasterSD':
          flightlistFlymaster(data,modelGPS,paramGPS,paramPort)      
          break
        case 'FlymasterOld':
          flightlistFlymaster(data,modelGPS,paramGPS,paramPort)           
          break                
        case 'Flytec20':
          // For Compeo/Compeo+/Galileo/Competino/Flytec 5020,5030,6030
          // same decoding process          
          flightlistFlymaster(data,modelGPS,paramGPS,paramPort)                            
          break      
        case 'Flytec15':
          flightlistFlytec(data,modelGPS,paramGPS,paramPort)              
          break    
          }
    } else {
      flightList.error = true
      flightList.otherlines.push('no response from GPSDump for '+gpsDumpPath)
    }
  } else {
    flightList.error = true
    flightList.otherlines.push('GPSDump not found')
  } 
  // if the communication was successful, data were decoded and added to flightList 
  return
}

// for debugging purposes
function decodingTest() {
  try {
    const data = fs.readFileSync(testPath, 'utf8')
    if (data) {
      flightlistDecoding(data)
    } else {
      flightList.error = true
      flightList.otherlines.push('no response from GPSDump for '+gpsDumpPath)
    }
  } catch (error) {
    flightList.error = true
    flightList.otherlines.push('testDecodage failed')    
  }
}

// Flymaster and Flytec 6020/6030 decoding
// data begin with something like this
//    Product: Flymaster GpsSD  SN02988  SW2.03h
//    Track list:
//    1   23.07.20   06:08:16   01:21:57
function flightlistFlymaster(gpsdumpOutput,gpsModel,gpsdumpGPS,gpsdumpPort) {
  try {
    let lines = gpsdumpOutput.toString().trim().split('\n')
    let typeGPS = gpsModel
    if (gpsModel == 'Flytec20') {
      flightList.model = 'Flytec 20/30 Compeo'
    } else {  
      flightList.model = gpsModel
    }
    let gpsdumpOrder = gpsdumpGPS+','+gpsdumpPort+','+typeGPS
    if (lines.length > 0) {
      switch (specOS) {
        case 'win':
            winDecoding(lines,gpsdumpOrder)
            break
        case 'mac32':
            mac32Decoding(lines, gpsdumpOrder)
          break            
        case 'mac64':
            mac64Decoding(lines, gpsdumpOrder)
            break
        case 'linux':
            break
      }
    }
    if (flightList.manufacturer != null) {
      if (flightList.flights.length > 0) {
        let flightListChecked = dblog.checkFlightList(flightList) 
        flightList = flightListChecked
      } else {
        flightList.error = true
        flightList.otherlines.push('No flights listed by GPSDump')         
      }
    } else {
      flightList.error = true
      flightList.otherlines.push('Unknown manufacturer') 
    }
  } catch (err) {
    log.error('flightlistFlymaster exception : '+err)
  }  
}

// Flytec 6015 decoding
// date begin with something like this
//     Line 2 6015, SW 1.3.07, S/N 1068
//     Line 3 Track list:
//     Line 4      1; 21.06.25; 14:38:50;        1; 00:17:45;  
function flightlistFlytec(gpsdumpOutput,gpsModel,gpsdumpGPS,gpsdumpPort) {
  try {
    let lines = gpsdumpOutput.toString().trim().split('\n')
    if (lines.length > 0) {
      if (gpsModel === 'Flytec15') {
        // We don't decode id line -> Line 2 6015, SW 1.3.07, S/N 1068
        flightList.model = 'Flytec 6015 / Brau IQ basic'
      }
      // excellent site for regex testing : https://www.regextester.com/      
      let regexDateHours = /;([^;]*);([^;]*);([^;]*);([^;]*);/
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(regexDateHours)) {
          let flDate = regexDateHours.exec(lines[i])
          let flight = {}
          // If a flight is "new", this means that it must be added to the logbook
          // By default, all the flights are to be added to the logbook.  
          // A check in the logbook is made by dblog.checkFlightList
          flight['new'] = true
          flight['date'] = flDate[1]
          flight['takeoff'] = flDate[2]
          flight['duration'] = flDate[4]
          flight['gpsdump'] = gpsdumpGPS+','+gpsdumpPort+','+gpsModel
          flightList.flights.push(flight)     
        } else {
          flightList.otherlines.push('Line '+i.toString()+' '+lines[i])
        }
      }
    }
    if (flightList.flights.length > 0) {
      let flightListChecked = dblog.checkFlightList(flightList) 
      flightList = flightListChecked
    } else {
      flightList.error = true
      flightList.otherlines.push('No flights listed by GPSDump')         
    }
  } catch (err) {
    log.error('flightlistFlytec exception : '+err)
  }  
}

/**
 * excellent site for regex testing : https://www.regextester.com/
 * it displays the group by passing the cursor over the expression
 * line with product name is for Flymaster : Product: Flymaster GpsSD  SN02988  SW2.03h
 * For Flytec, it is                         Product: 6030, SN07172, SW3.38
 * regexProduct don't match for Flytec... For the time being, we do not include flytec decoding
 * By default we fill in the flightList.model field
*/

function mac64Decoding(rawLines, gpsdumpOrder) {
  let regexProduct = /(Product:)[ ]{1,}(\w*)[ ]{1,}(\S*)[ ]{1,}(\S*)[ ]{1,}(\S*)/
  // line with a flight is like :  1   23.07.20   06:08:16   01:21:57
  let regexDateHours = /((\d{1,2}\.){2}\d{2}(\d{2})?)[ ]{1,}((\d{1,2}:){2}\d{2}(\d{2})?)[ ]{1,}((\d{1,2}:){2}\d{2}(\d{2})?)/
  for (let i = 0; i < rawLines.length; i++) {
    if(rawLines[i].match(regexProduct)) {
      let arrProduct = regexProduct.exec(rawLines[i])
      flightList.manufacturer = arrProduct[2]
      flightList.model = gpsModel = arrProduct[2]+' '+arrProduct[3]
      flightList.serial = arrProduct[4]
      flightList.firmware = arrProduct[5]         
    } else if (rawLines[i].match(regexDateHours)) {
      let flDate = regexDateHours.exec(rawLines[i])
      let flight = {}
      // If a flight is "new", this means that it must be added to the logbook
      // By default, all the flights are to be added to the logbook.  
      // A check in the logbook is made by dblog.checkFlightList
      flight['new'] = true
      flight['date'] = flDate[1]
      flight['takeoff'] = flDate[4]
      flight['duration'] = flDate[7]
      flight['gpsdump'] = gpsdumpOrder
      flightList.flights.push(flight)     
    } else {
      flightList.otherlines.push('Line '+i.toString()+' '+rawLines[i])
    }
  } 
}

function mac32Decoding(rawLines, gpsdumpOrder) {
  if (rawLines.length > 0) {
    // line with a flight is like : '  1 Flight date 29.07.22, time 06:00:54, duration 00:00:34'
    let regexDateHours = /Flight date ([0-9]+(\.[0-9]+)+), time ([0-9]+(:[0-9]+)+), duration ([0-9]+(:[0-9]+)+)/
    // flightList.model is already initialized with our expression (FymasterSD, FlymaterOld, etc..)
    // Decoding the line concerning the GPS characteristics is too random
    // The first lines are :
    // Port: /dev/cu.usbmodem000001
    // Trying port /dev/cu.usbmodem000001
    // Flymaster GpsSD  SN02988  SW2.03h
    for (let i = 1; i < rawLines.length; i++) {     
      if (rawLines[i].match(regexDateHours)) {
        let flDate = regexDateHours.exec(rawLines[i])
        let flight = {}
        // If a flight is "new", this means that it must be added to the logbook
        // By default, all the flights are to be added to the logbook.  
        // A check in the logbook is made by dblog.checkFlightList
        flight['new'] = true
        flight['date'] = flDate[1]
        flight['takeoff'] = flDate[3]
        flight['duration'] = flDate[5]
        flight['gpsdump'] = gpsdumpOrder
        flightList.flights.push(flight)     
      } else {
        flightList.otherlines.push('Line '+i.toString()+' '+rawLines[i])
      }
    } 
  }
}

function winDecoding(rawLines, gpsdumpOrder) {
  if (rawLines.length > 0) {
    // line with a flight is like : '2022.06.18,13:06:13,1:25:54'
    let regexDateHours = /((\d{1,2}\.){2}\d{2}(\d{2})?)[,]{1,}((\d{1,2}:){2}\d{2}(\d{2})?)[,]{1,}((\d{1,2}:){2}\d{2}(\d{2})?)/
    // flightList.model is initialized with our expression (FymasterSD, FlymaterOld, etc..)
    // No line concerning the GPS characteristics in windows list
    for (let i = 1; i < rawLines.length; i++) {     
      if (rawLines[i].match(regexDateHours)) {
        let flDate = regexDateHours.exec(rawLines[i])
        let flight = {}
        // If a flight is "new", this means that it must be added to the logbook
        // By default, all the flights are to be added to the logbook.  
        // A check in the logbook is made by dblog.checkFlightList
        flight['new'] = true
        // 2022.06.18 -> 18.06.2022
        flight['date'] = flDate[1].substring(6)+flDate[1].substring(2,6)+flDate[1].substring(0,2)
        flight['takeoff'] = flDate[4]
        flight['duration'] = flDate[7]
        flight['gpsdump'] = gpsdumpOrder
        flightList.flights.push(flight)     
      } else {
        flightList.otherlines.push('Line '+i.toString()+' '+rawLines[i])
      }
    }
  }
}