const {ipcMain} = require('electron')
const log = require('electron-log')
const fs = require('fs')

// TODO - Remove after migration of ValidPath
const Store = require('electron-store')
const store = new Store();
const currOS = store.get('currOS')
const path = require('path')
const homedir = require('os').homedir()

/**
 * Communication protocol with Syride is not published
 * User must use a software called SYS-PC-TOOL to download tracks
 * By default, Sys-PC-Tool create a folder in user.home directory called "parapente" where tracks are downloaded
 * In "parapente", there will be one folder by day named YYYY-MM-DD
 * After downloading operations in Logfly, day folders are moved to a folder called "archives"
 */

 var checkParapentepath = null
 var checkArchivepath = null

 var syridePath = {
  parapentepath : null,
  archivepath : null
 };

ipcMain.on('syride-check', (event, checkSyspctoolpath) => {
  switch (currOS) {
    case 'win':
      checkParapentepath =  path.join(checkSyspctoolpath,'Parapente') 
      checkArchivepath = path.join(checkSyspctoolpath,'archives') 
      break      
    case 'mac':
    case 'linux':
      checkParapentepath =  path.join(checkSyspctoolpath,'parapente')
      checkArchivepath =  path.join(checkSyspctoolpath,'archives') 
      break  
  }  
  if (checkSyspctoolpath != null && fs.existsSync(checkParapentepath)) { 
    syridePath.parapentepath = checkParapentepath
    if (fs.existsSync(checkArchivepath)) {
      syridePath.archivepath = checkArchivepath
    } else {
      try {
        fs.mkdirSync(checkArchivepath)
        syridePath.archivepath = checkArchivepath
      } catch (error) {
        log.error('[syride-check] unable to create '+checkArchivepath)
      }
    }    
  } else {
    log.error(syridePath.parapentepath+' not found ')
  }
  event.returnValue = syridePath
 })

// TODO - This code "ValidPath" must be moved to the settings module
function validPath() {
  switch (currOS) {
    case 'win':
      syspctoolpath = path.join(homedir,'Syride')
      parapentepath =  path.join(syspctoolpath,'Parapente') 
      archivepath = path.join(syspctoolpath,'archives') 
      break      
    case 'mac':
    case 'linux':
      syspctoolpath = path.join(homedir,'syride')
      parapentepath =  path.join(syspctoolpath,'parapente')
      archivepath =  path.join(syspctoolpath,'archives') 
      break  
  }  
  if (syspctoolpath != null && fs.existsSync(parapentepath)) { 
    log.info('Syride path found on '+parapentepath)
    if (fs.existsSync(archivepath)) {
      return true
    } else {
        fs.mkdirSync(archivepath)
        return true
    }    
  } else {
    log.warn('Syride path [/parapente] not found on '+syspctoolpath)
    return false
  }
}


