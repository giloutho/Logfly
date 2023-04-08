const {ipcMain} = require('electron')
var fs = require('fs')
var path = require('path')
var drivelist = require('drivelist')
const log = require('electron-log')
var glob = require('glob')

async function listDrives() {
  const drives = await drivelist.list();
  return drives
}

ipcMain.handle('check-usb-gps', async (event, typeGps) => {
  log.info('[check-usb-gps] called for '+typeGps)
  const result = await listDrives()
  let checkResult
  if (result instanceof Array) { 
    checkResult = await exploreDrives(typeGps,result)
  } else {
    checkResult = null
  }

  return checkResult
 
})

function exploreDrives(typeGPS,arrayDrives) {
  let pathFlights = null
  let nbUsb = 0
  log.info('   [exploreDrives] start');
  for (let index = 0; index < arrayDrives.length; index++) {        
    if (arrayDrives[index].isUSB && arrayDrives[index].size < 64011120640) {
      nbUsb++
      if (arrayDrives[index].mountpoints.length > 0) {
        let usbPath = arrayDrives[index].mountpoints[0].path
        log.info('   [exploreDrives] test '+usbPath);
        let validFlights = false
        let validSpecial = false   
        let arrFolders  
        pathFlights = null           
        switch (typeGPS) {
          case 'oudie':
            // Oudie : igc files are in a folder  called 'Flights' 
            // A folder called 'Settings' exists            
            arrFolders = getUsbFolders(usbPath) 
            if (arrFolders instanceof Array) { 
              for (let j = 0; j < arrFolders.length; j++) {
                switch (arrFolders[j]) {
                  case 'Flights':
                    validFlights = true
                    pathFlights = path.join(usbPath, path.sep+'Flights')
                    log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                    break;   
                  case 'Settings':
                    validSpecial = true
                    break;                           
                }                       
              }
            }             
            break; 
          case 'varduino':
            // Varduino : igc files are in a folder  called 'igc' 
            // A folder called 'audio' exists            
            arrFolders = getUsbFolders(usbPath) 
            if (arrFolders instanceof Array) { 
              for (let j = 0; j < arrFolders.length; j++) {
                switch (arrFolders[j]) {
                  case 'igc':
                    validFlights = true
                    pathFlights = path.join(usbPath, path.sep+'igc')
                    log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                    break;   
                  case 'audio':
                    validSpecial = true
                    break;                           
                }                       
              }
            }             
            break; 
          case 'connect':
              // Connect : igc files are in a folder called 'flights' 
              // A folder called 'config' exists            
              arrFolders = getUsbFolders(usbPath) 
              if (arrFolders instanceof Array) { 
                for (let j = 0; j < arrFolders.length; j++) {
                  switch (arrFolders[j]) {
                    case 'flights':
                      validFlights = true
                      pathFlights = path.join(usbPath, path.sep+'Flights')
                      log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                      break;   
                    case 'config':
                      validSpecial = true
                      break;                           
                  }                       
                }
              }             
              break;        
          case 'sensbox':
              // Sensbox : igc files are in a folder called 'tracks' 
              // A folder called 'System' or 'system' exists            
              arrFolders = getUsbFolders(usbPath) 
              if (arrFolders instanceof Array) { 
                for (let j = 0; j < arrFolders.length; j++) {
                  switch (arrFolders[j]) {
                    case 'tracks':
                      validFlights = true
                      pathFlights = path.join(usbPath, path.sep+'tracks')
                      log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                      break;   
                    case 'system':
                      validSpecial = true
                      break;      
                    case 'System':
                      validSpecial = true
                      break;                                              
                  }                       
                }
              }             
              break;                      
          case 'cpilot':
              // C-Pilot : igc files are in a folder called 'tracks' 
              // A folder called 'displays' exists            
              arrFolders = getUsbFolders(usbPath) 
              if (arrFolders instanceof Array) { 
                for (let j = 0; j < arrFolders.length; j++) {
                  switch (arrFolders[j]) {
                    case 'tracks':
                      validFlights = true
                      pathFlights = path.join(usbPath, path.sep+'tracks')
                      log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                      break;   
                    case 'displays':
                      validSpecial = true
                      break;                                                    
                  }                       
                }
              }             
              break;        
          case 'skydrop':
            // Skydrop : igc files are in a folder called 'LOGS' 
            // A folder called 'AIR' exists            
            arrFolders = getUsbFolders(usbPath) 
            if (arrFolders instanceof Array) { 
              for (let j = 0; j < arrFolders.length; j++) {
                switch (arrFolders[j]) {
                  case 'LOGS':
                    validFlights = true
                    pathFlights = path.join(usbPath, path.sep+'LOGS')
                    log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                    break;   
                  case 'AIR':
                    validSpecial = true
                    break;                                                    
                }                       
              }
            }             
            break;                            
          case 'element':
                // Element : igc files are in a folder called 'flights' 
                // A folder called 'config' exists      
                // A folder called 'waypoints' exists        
                arrFolders = getUsbFolders(usbPath) 
                if (arrFolders instanceof Array) { 
                  for (let j = 0; j < arrFolders.length; j++) {
                    switch (arrFolders[j]) {
                      case 'flights':
                        validFlights = true
                        pathFlights = path.join(usbPath, path.sep+'flights')
                        log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                        break;   
                      case 'config':
                        validSpecial = true
                        break;       
                      case 'waypoints':
                        validSpecial = true
                        break;                                                      
                    }                       
                  }
                }             
                break;     
          case 'syrideusb':
              // Nav XL : igc files are in a folder called 'IGC' 
              // A folder called 'KEYS' exists      
              // A folder called 'update' exists        
              arrFolders = getUsbFolders(usbPath) 
              if (arrFolders instanceof Array) { 
                for (let j = 0; j < arrFolders.length; j++) {
                  switch (arrFolders[j]) {
                    case 'IGC':
                      validFlights = true
                      pathFlights = path.join(usbPath, path.sep+'IGC')
                      log.info('   [exploreDrives] -> pathFlights = '+pathFlights);
                      break;   
                    case 'KEYS':
                      validSpecial = true
                      break;       
                    case 'update':
                      validSpecial = true
                      break;                                                      
                  }                       
                }
              }             
              break;                              
          case 'reverlog':
            // there is a settings file called PARAM.VGP  in root folder    
           // var vgpFile = glob.sync(usbPath + '/PARAM.VGP')
            let vgpFile = glob.sync(path.join(usbPath, 'PARAM.VGP'))
            if (vgpFile.length > 0) {
              pathFlights =  path.join(usbPath, path.sep+'LOG')
              validFlights = true
              validSpecial = true      
              // Reversale  : by default igc files are in a folder called 'LOG' 
              // This code was used to limit the exploration to the Log folder
              // We keep the code for historical purposes only       
              // validSpecial = true
              // arrFolders = getUsbFolders(usbPath) 
              // if (arrFolders instanceof Array) { 
              //   for (let j = 0; j < arrFolders.length; j++) {
              //     switch (arrFolders[j]) {
              //       case 'LOG':
              //         validFlights = true
              //         pathFlights = path.join(usbPath, path.sep+'LOG')
              //         break;                            
              //     }                       
              //   }
              // }     
            }                                            
            break;   
                       
          case 'sky2':
            // Skytraxx 2 igc files are in a set of sub folders in 'Flights' or 'FLIGHTS' folder
            // A folder called 'elevation' or 'ELEVATION' exists
            arrFolders = getUsbFolders(usbPath) 
            if (arrFolders instanceof Array) { 
              for (let j = 0; j < arrFolders.length; j++) {
                switch (arrFolders[j]) {
                  case 'FLIGHTS':
                    // Sytraxx 2.0 Uppercase
                    validFlights = true
                    pathFlights = path.join(usbPath, path.sep+'FLIGHTS')
                    break;
                  case 'flights':
                    // Skytraxx 2.1 lowercase
                    validFlights = true
                    pathFlights = path.join(usbPath, path.sep+'flights')
                    break;          
                  case 'elevation':
                    validSpecial = true
                    break;         
                  case 'ELEVATION':
                    validSpecial = true
                    break;                         
                }                       
              }
            }                    
            break 
          case 'sky3':
              // Skytraxx 3 is a USB GPS with a special tree structure of files/folders
              // in Folder FLIGHTS, there is a year folder with month subfolders
              // each track is named like : YYYY-MM-DD_HH.MM_TakeOfflocality
              // For a track dated :  2017 september 30th we got an IGC file called : 2017-09-30_17.35_takeoff.igc
              // A folder called 'pilot_profiles' exists
              arrFolders = getUsbFolders(usbPath) 
              if (arrFolders instanceof Array) { 
                for (let j = 0; j < arrFolders.length; j++) {
                  switch (arrFolders[j]) {
                    case 'flights':
                      // Skytraxx 2.1 lowercase
                      validFlights = true
                      pathFlights = path.join(usbPath, path.sep+'flights')
                      break;          
                      case 'pilot_profiles':
                        // exists on Skytraxx 3
                        validSpecial = true
                        break;        
                      case 'flightscreens':
                        // exists on Skytraxx 4
                        validSpecial = true
                        break;                            
                      case 'waypoints':
                        validSpecial = true
                        break;                         
                  }                       
                }
              }                    
              break             
          case 'xctracer':
            // igc files are in root folder
            // there is a settings file called XC**.txt
            var txtFiles = glob.sync(usbPath + '/XC*.txt')
            if (txtFiles.length > 0) {
              pathFlights = usbPath
              validFlights = true
              validSpecial = true
            }            
            break      
          case 'flynet':
            // igc files are in root folder
            // there is a settings file called CONFIG.TXT
            var txtFiles = glob.sync(usbPath + '/CONFIG.TXT')
            if (txtFiles.length > 0) {
              pathFlights = usbPath
              validFlights = true
              validSpecial = true
            }            
            break              
        }
        if (validFlights && validSpecial) {
          break;            
        } 
      }
    }        
  }

  return pathFlights 
}

function getUsbFolders(_path) {
  return fs.readdirSync(_path).filter(function (file) {
    return fs.statSync(_path+'/'+file).isDirectory();
  });
}