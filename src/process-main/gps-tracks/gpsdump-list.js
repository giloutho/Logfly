const {ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
var log = require('electron-log');
const dblog = require('../../utils/db/db-search.js')
const gpsDumpFiles = require('../../settings/gpsdump-name.js')

const Store = require('electron-store');
const store = new Store();
const currOS = store.get('currOS')

let gpsDump
let testPath
let gpsDumpPath = null
let gpsDumpNames = gpsDumpFiles.getNames()
switch (currOS) {
    case 'win':
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_win',gpsDumpNames['win'])
        break
    case 'mac':
        // https://stackoverflow.com/questions/46022443/electron-how-to-add-external-files
      //  gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_darwin/gpsdumpMac64_14')
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_darwin',gpsDumpNames['mac'])
        // only fir debug purpose
        testPath = path.join(path.dirname(__dirname), '../../docs/flight_list.txt')
        break
    case 'linux':
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_linux',gpsDumpNames['linux'])
        break
}

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
  if (gpsDumpPath != null && fs.existsSync(gpsDumpPath)) { 
    const execFileSync = require('child_process').execFileSync
    let data
    let paramGPS
    let paramPort
    let modelGPS = gpsModel.model    
    try {
      switch (modelGPS) {
        case 'FlymasterSD':
          switch (currOS) {
            case 'win':
              paramGPS = '/gps=flymaster'
              break
            case 'mac':
            case 'linux':
              paramGPS = '-gyn'  
              break
          }                    
          break      
        case 'FlymasterOld':
          switch (currOS) {
            case 'win':
              paramGPS = '/gps=flymasterold'
              break
            case 'mac':
            case 'linux':
              paramGPS = '-gy'   // Whatever the model, this old protocol displays the list of flights
              break
          }                    
          break                
        case 'Flytec20':
          // Compeo/Compeo+/Galileo/Competino/Flytec 5020,5030,6030
          switch (currOS) {
            case 'win':
              paramGPS = '/gps=iqcompeo';	
              break;
            case 'mac':
            case 'linux':
              paramGPS = '-gc'  
              break
          }                    
          break      
        case 'Flytec15':
          // IQ-Basic / Flytec 6015
          switch (currOS) {
            case 'win':
              paramGPS = '/gps=iqbasic'	
              break;
            case 'mac':
            case 'linux':
              paramGPS =  '-giq'
              break
          }                    
          break                     
      }
      // formatting of the serial port expression depends of operating system
      switch (currOS) {
        case 'win':
            // ...
            break
        case 'mac':
            // In Logfly5, we got /dev/cu in ports list
            // with this module, it seems that it is tty !!
            paramPort = gpsModel.port.replace('/dev/tty','-cu')
            break
        case 'linux':
            // ..
            break
      }
      let paramFile = '-lnomatter.txt'  // required, but not used when f = 0
      // terminal command is : 
      // ./GpsDumpMac64_9 -gyn -cu.usbmodem0000001 -ltempo.txt -f0  
      // last parameter -f"N" -> if N=0 a flightlist is displayed
      // success test for a Flymaster SD -> data = execFileSync(gpsDumpPath, ['-gyn','-cu.usbmodem0000001','-ltempo.txt','-f0'])
      log.info('[GpsDump called] with '+paramGPS+','+paramPort+','+paramFile)
      data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,'-f0'])
    } catch (err) {
        log.error('askFlightList error : '+err)
    }
    // data has been declared but not not necessarily initialized if the communication fails
    if (data) {
      switch (modelGPS) {
        case 'FlymasterSD':
          flightlistFlymaster(data,modelGPS,paramGPS,paramPort)      
          break;      
        case 'FlymasterOld':
          flightlistFlymaster(data,modelGPS,paramGPS,paramPort)           
          break;                
        case 'Flytec20':
          // For Compeo/Compeo+/Galileo/Competino/Flytec 5020,5030,6030
          // same decoding process          
          flightlistFlymaster(data,'Flytec 20/30 Compeo',paramGPS,paramPort)                            
          break;      
        case 'Flytec15':
          flightlistFlytec(data,modelGPS,paramGPS,paramPort)              
          break;     
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
    if (lines.length > 0) {
      // excellent site for regex testing : https://www.regextester.com/
      // it displays the group by passing the cursor over the expression
      // line with product name is for Flymaster : Product: Flymaster GpsSD  SN02988  SW2.03h
      // For Flytec, it is                         Product: 6030, SN07172, SW3.38
      // regexProduct don't match for Flytec... For the time being, we do not include flytec decoding
      // By default we fill in the flightList.model field
      flightList.model = gpsModel

      let regexProduct = /(Product:)[ ]{1,}(\w*)[ ]{1,}(\S*)[ ]{1,}(\S*)[ ]{1,}(\S*)/
      // line with a flight is like :  1   23.07.20   06:08:16   01:21:57
      let regexDateHours = /((\d{1,2}\.){2}\d{2}(\d{2})?)[ ]{1,}((\d{1,2}:){2}\d{2}(\d{2})?)[ ]{1,}((\d{1,2}:){2}\d{2}(\d{2})?)/
      for (let i = 0; i < lines.length; i++) {
        if(lines[i].match(regexProduct)) {
          let arrProduct = regexProduct.exec(lines[i])
          flightList.manufacturer = arrProduct[2]
          flightList.model = gpsModel = arrProduct[2]+' '+arrProduct[3]
          flightList.serial = arrProduct[4]
          flightList.firmware = arrProduct[5]         
        } else if (lines[i].match(regexDateHours)) {
          let flDate = regexDateHours.exec(lines[i])
          let flight = {}
          // If a flight is "new", this means that it must be added to the logbook
          // By default, all the flights are to be added to the logbook.  
          // A check in the logbook is made by dblog.checkFlightList
          flight['new'] = true
          flight['date'] = flDate[1]
          flight['takeoff'] = flDate[4]
          flight['duration'] = flDate[7]
          flight['gpsdump'] = gpsdumpGPS+','+gpsdumpPort
          flightList.flights.push(flight)     
        } else {
          flightList.otherlines.push('Line '+i.toString()+' '+lines[i])
        }
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
          flight['gpsdump'] = gpsdumpGPS+','+gpsdumpPort
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