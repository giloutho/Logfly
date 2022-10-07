const {app} = require('electron')
const path = require('path')
const fs = require('fs')
const log = require('electron-log')
const gpsDumpFiles = require('../../settings/gpsdump-name.js')

const Store = require('electron-store')
const store = new Store()
const currOS = store.get('currOS')

let gpsDumpNames = gpsDumpFiles.getNames()
let gpsDumpPath = null
switch (currOS) {
    case 'win':
      gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_win',gpsDumpNames['win'])
        break
    case 'mac':
        if (store.get('macversion') == 'mac64') {    
          gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_darwin',gpsDumpNames['mac64'])
        } else {
          gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_darwin',gpsDumpNames['mac32'])
        }
        break
    case 'linux':
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_linux',gpsDumpNames['linux'])
        break
}

function getGpsdumpFlight(gpsParam, flightIndex) {
    // gpsParam contains parameters for GpsDump
    // something like -giq,-cu.usbserial-14140
    // First one is gps type, second serial port
    let paramGPS
    let paramPort
    let paramFile
    let paramFlightIndex
    const execFileSync = require('child_process').execFileSync
    const tempFileName  = path.join(app.getPath('temp'), 'gpsdump.igc')
    if (fs.existsSync(tempFileName)) {
      try {
        fs.unlinkSync(tempFileName)
      } catch(err) {
        log.error('The gpsDump temporary file was not deleted : '+err)
      }
    }
    let res = null
  
    try {
      const gpsParamArray = gpsParam.split(",")
      paramGPS = gpsParamArray[0]
      paramPort = gpsParamArray[1]
      paramFile = '-l'+tempFileName  
      flightIndex +=1
      paramFlightIndex = '-f'+flightIndex.toString()
      data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramFile,paramFlightIndex])   
      if (data) {
          res = tempFileName
      }     
    } catch (error) {
      res = 'Error on calling GpsDump ['+paramGPS+','+paramPort+','+paramFile+','+paramFlightIndex+']'
      log.error(res+' : '+error)
    }
  
    return res    
  }

  module.exports.getGpsdumpFlight = getGpsdumpFlight