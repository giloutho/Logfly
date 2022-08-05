const {app} = require('electron')
const path = require('path')
const fs = require('fs')
var log = require('electron-log');

const Store = require('electron-store');
const store = new Store();
const currOS = store.get('currOS')

let gpsDumpPath = null
switch (currOS) {
    case 'win':
        gpsDumpPath = './ext_resources/bin_win'
        break
    case 'mac':
        // https://stackoverflow.com/questions/46022443/electron-how-to-add-external-files
        gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources/bin_darwin/gpsdumpMac64_9')
        testPath = path.join(path.dirname(__dirname), '../../docs/flight_list.txt')
        break
    case 'linux':
        gpsDumpPath = './ext_resources/bin_linux'
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
    const execFileSync = require('child_process').execFileSync;
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