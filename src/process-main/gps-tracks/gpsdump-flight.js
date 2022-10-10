const {app} = require('electron')
const path = require('path')
const fs = require('fs')
const log = require('electron-log')
const gpsDumpFiles = require('../../settings/gpsdump-settings.js')
const gpsDumpParams = gpsDumpFiles.getParam()
const Store = require('electron-store')
const store = new Store()
const specOS = store.get('specOS')

function getGpsdumpFlight(gpsParam, flightIndex) {
    // gpsParam contains parameters for GpsDump
    // something like -giq,-cu.usbserial-14140,FlymasterSD
    // First one is gps type, second serial port
    let data
    const execFileSync = require('child_process').execFileSync
    const gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources',gpsDumpParams[specOS].gpsdump)
    const tempFileName  = path.join(app.getPath('temp'), 'gpsdump.igc')
    if (fs.existsSync(tempFileName)) {
      try {
        fs.unlinkSync(tempFileName)
      } catch(err) {
        log.error('[getGpsdumpFlight] The gpsDump temporary file was not deleted : '+err)
      }
    }
    const paramFile = gpsDumpParams[specOS].temp+tempFileName
    let paramFlightIndex
    let callString
    let res = null 
    try {
      const gpsParamArray = gpsParam.split(",")
      const paramGPS = gpsParamArray[0]
      const paramPort = gpsParamArray[1]
      const gpsModel = gpsParamArray[2]
      // console.log(gpsParamArray)
      // app.quit()
      const wNoWin = '/win=0'  
      const wExit = '/exit'  
      switch (gpsModel) {
        case 'FlymasterSD':
          // e.g. -f4
          flightIndex +=1          
          paramFlightIndex = gpsDumpParams[specOS].track+flightIndex.toString()
          break
        case 'FlymasterOld':
          if (specOS != 'win') {
            flightIndex +=1
          }
          paramFlightIndex = gpsDumpParams[specOS].track+flightIndex.toString()         
          break                
        case 'Flytec20':
          if (specOS != 'win') {
            flightIndex +=1
          }
          paramFlightIndex = gpsDumpParams[specOS].track+flightIndex.toString()                              
          break      
        case 'Flytec15':
          if (specOS != 'win') {
            flightIndex +=1
          }
          paramFlightIndex = gpsDumpParams[specOS].track+flightIndex.toString()               
          break    
      }
      switch (specOS) {
        case 'win':            
            callString = path.basename(gpsDumpPath)+' '+wNoWin+' '+paramPort+' '+paramGPS+' '+paramFile+' '+paramFlightIndex+' '+wExit
            console.log(callString)
            data = execFileSync(gpsDumpPath, [wNoWin, paramPort, paramGPS, paramFile, paramFlightIndex, wExit ])
            // L5 -> new String[]{pathGpsDump,wNoWin,wComPort,sTypeGps, logIGC, numberIGC, wExit};
            break
        case 'mac32':
          callString = path.basename(gpsDumpPath)+' '+paramGPS+' '+paramFile+' '+paramFlightIndex
          console.log(callString)
          data = execFileSync(gpsDumpPath, [paramGPS,paramFile, paramFlightIndex])
          // L5 -> new String[]{pathGpsDump,sTypeGps, name32IGC, numberIGC}; 
          break            
        case 'mac64':
            callString = path.basename(gpsDumpPath)+' '+paramGPS+' '+paramPort+' '+paramFile+' '+paramFlightIndex
            console.log(callString)
            data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,paramFlightIndex])
            // L5 -> new String[]{pathGpsDump,sTypeGps, macPort, name64IGC, numberIGC};
            break
        case 'linux':
            callString = path.basename(gpsDumpPath)+' '+paramGPS+' '+paramPort+' '+paramFile+' '+paramFlightIndex
            console.log(callString)
            data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,paramFlightIndex])
            // L5 -> new String[]{pathGpsDump,sTypeGps, linuxPort, tempIGC, numberIGC};
            break
      }
 
      // data has been declared but not not necessarily initialized if the communication fails
      if (data) {
          res = tempFileName
      }     
    } catch (error) {
      res = 'Error on calling ['+callString+']'
      log.error(res+' : '+error)
    }
  
    return res    
  }

  module.exports.getGpsdumpFlight = getGpsdumpFlight