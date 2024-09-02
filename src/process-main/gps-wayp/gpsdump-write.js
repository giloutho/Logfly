const {app, ipcMain, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
const log = require('electron-log')
const gpsDumpFiles = require('../../settings/gpsdump-settings.js')
const gpsDumpParams = gpsDumpFiles.getParam()
const Store = require('electron-store')
const store = new Store()
const specOS = store.get('specOS')

let result

ipcMain.on('waypsend', (event, gpsCom, fullTempPath) => {
    readOnPorts(gpsCom, fullTempPath)
    event.sender.send('gpsdump-wpsent', result)
  })

function readOnPorts(gpsCom, fullTempPath) {
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
        sendOziWpt(gpsCom[i], fullTempPath)
        // if (waypList.error === false) {
        //   break
        // }    
      }    
    } catch (error) {
      log.error('Error on readOnPorts gpsCom[] loop '+error)
    }  
  }

  function sendOziWpt(gpsModel,fullTempPath)  {   
    console.log('ExecFile va être lancé')
    const execFileSync = require('child_process').execFileSync
    const spawn = require('child_process').spawnSync    
    let modelGPS = gpsModel.model  
    let paramGPS
    let sAction = ''    
    const wNoWin = '/win=0'  
    const wExit = '/exit'               
    gpsDumpPath = path.join(path.dirname(__dirname), '../../ext_resources',gpsDumpParams[specOS].gpsdump)
    const macType = '/wpttype=ozi'
    const macFile = '/wptname='+fullTempPath
    switch (modelGPS) {
        case 'FlymasterSD':
          paramGPS = gpsDumpParams[specOS].flym        
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
    try {
        switch (specOS) {
            case 'win':
                sAction = '/wr_wpt='+fullTempPath
                break
            case 'mac32': 
                sAction = '/wrwpt'
                break            
            case 'mac64':
                sAction ='-r'+fullTempPath
                paramPort = gpsModel.port.replace('/dev/tty','-cu')
                console.log('ExecFile sur Mac 64 '+paramPort)
                // in terminal : gpsdumpMac64_14 -gyn -cu.usbmodem0000001 -r/Users/gil/Documents/Logfly/wptemp.wpt
                log.info(path.basename(gpsDumpPath)+' '+paramGPS+' '+paramPort+' '+sAction)
                result = execFileSync(gpsDumpPath, [paramGPS,paramPort,sAction])            
                break
            case 'linux':
                sAction ='-r'+fullTempPath
                break
        }
    } catch (error) {
        log.error('Error on exexFileSync '+error)
    } 
    return    
}      