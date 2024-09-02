const {app, ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
var log = require('electron-log')
const gpsDumpFiles = require('../../settings/gpsdump-settings.js')
const gpsDumpParams = gpsDumpFiles.getParam()
const Store = require('electron-store')
const store = new Store()
const specOS = store.get('specOS')

let waypFilePath = null

ipcMain.on('wayplist', (event, gpsCom) => {
  readOnPorts(gpsCom)
  event.sender.send('gpsdump-wplist', waypFilePath)
})

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
        waypList = {
          manufacturer: null,
          model: null,
          serial: null,
          firmware: null,
          error: false,
          waypoint: [],
          otherlines:[]
        }       
        askWaypList(gpsCom[i])
      }    
    } catch (error) {
      log.error('Error from  gpsdump-read in readOnPorts '+error)
    }  
  }

  function askWaypList(gpsModel) {
    const execFileSync = require('child_process').execFileSync
    const spawn = require('child_process').spawnSync
    let data
    let paramGPS
    let paramPort
    let paramWayp
    let modelGPS = gpsModel.model  
    const wNoWin = '/win=0'  
    const wExit = '/exit'  
    const wOverw = "/overwrite"    
    const gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources',gpsDumpParams[specOS].gpsdump)
    paramFile = gpsDumpParams[specOS].wpfile
    paramWayp = gpsDumpParams[specOS].wpread+paramFile
    switch (modelGPS) {
      case 'FlymasterSD':
        paramGPS = gpsDumpParams[specOS].flym      
        console.log('Ask : '+paramGPS)       
        break      
      case 'FlymasterOld':
        paramGPS = gpsDumpParams[specOS].flymold      
        console.log('Ask : '+paramGPS)     
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
              break
          case 'mac32': 
            break            
          case 'mac64':
              paramPort = gpsModel.port.replace('/dev/tty','-cu')
              console.log(paramPort)
              // in terminal : gpsdumpMac64_14 -gyn -cu.usbmodem0000001 -w/var/folders/xm/5qm2lqc12v57x5qp7l4gmbh00000gn/T/tempwp.wpt
              log.info(path.basename(gpsDumpPath)+' '+paramGPS+' '+paramPort+' '+paramWayp)
              data = execFileSync(gpsDumpPath, [paramGPS,paramPort,paramWayp])
              break
          case 'linux':
              break
        }
      } catch (err) {
          log.error('askFlightList error : '+err)
      }
      // data has been declared but not not necessarily initialized if the communication fails
      if (data) {
        switch (modelGPS) {
          case 'FlymasterSD':
            waypFilePath = paramFile
            break
          case 'FlymasterOld':
            waypFilePath = paramFile        
            break                
          case 'Flytec20':
            waypFilePath = paramFile                             
            break      
          case 'Flytec15':
            waypFilePath = paramFile       
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