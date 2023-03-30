const {ipcMain} = require('electron')
const { dialog } = require('electron')
const fs = require('fs')
const path = require('path')

ipcMain.on('open-file', (event, arg) => { 
  let resultPath = {
    fullPath : null,
    directoryName : '',
    fileName : '',
    fileExt : ''
  }
  let filePath = dialog.showOpenDialogSync({
      defaultPath : arg,
      properties: ['openFile']
    })
    if (filePath !== undefined && filePath != null) {
      resultPath.fullPath = filePath[0]
      const pathParts = filePath[0].split(path.sep)
      const fileName = pathParts.pop()
      resultPath.directoryName = pathParts.join(path.sep)
      if ( fileName.includes('.') &&  fileName.lastIndexOf('.')!= 0) {
        // if fileName do not contain "." or starts with "." then it is not a valid file
        const rawExt = fileName.substring(fileName.lastIndexOf('.') + 1)
        resultPath.fileExt = rawExt.toUpperCase()
      }
      resultPath.fileName = fileName
    }
    event.returnValue = resultPath
})

ipcMain.on('choose-img', (event, arg) => {
  let imgPath = dialog.showOpenDialogSync({
    defaultPath : arg,
    properties: ['openFile']
    });
    event.returnValue = imgPath  
})

ipcMain.on('open-directory', (event,arg) => {
  let folderChoosed = null
  /**
   *  Asynchronous version
   *
      dialog.showOpenDialog({
        defaultPath : arg,
        properties: ['openDirectory']
      }).then(result => {
        if (!result.canceled) {           
          console.log('ok...'+result)
          pathChoosed = result.filePaths[0]
          event.sender.send('selected-directory', pathChoosed)
        }
      })
   *
  */
 
  // If I put "const" instead of "var", many errors appear in the console 
  // [18434:0731/145631.897096:ERROR:gles2_cmd_decoder.cc(19092)] [.DisplayCompositor]GL ERROR :GL_INVALID_OPERATION : DoBeginSharedImageAccessCHROMIUM: bound texture is not a shared image
  // six lines and the last
  // [18434:0731/145631.897815:ERROR:gles2_cmd_decoder.cc(19121)] [.DisplayCompositor]GL ERROR :GL_INVALID_OPERATION : DoEndSharedImageAccessCHROMIUM: bound texture is not a shared image
  // without the program stopping working     ??
  var path = dialog.showOpenDialogSync({
    defaultPath : arg,
    properties: ['openDirectory']
   });
  if (typeof path !== 'undefined') { 
      folderChoosed = path[0]
  }
  event.returnValue = folderChoosed 
})

ipcMain.on('save-igc', (event, stringIgc) => {
  let resultMsg = null
  filename = dialog.showSaveDialog(
    { title: 'Export IGC',
      filters: [{
        name: 'IGC format',
        extensions: ['igc']
      }]
    }
  )
  .then(result => {
      filename = result.filePath
      if (filename === undefined || filename === '') {
        event.returnValue = 'Error : the user clicked the btn but didn\'t created a file'        
      }
      fs.writeFile(filename, stringIgc, (err) => {
        if (err) {
          event.returnValue = 'Error : An error ocurred with file creation ' + err.message          
        }
        event.returnValue = result.filePath
      })      
    })
  .catch(err => {
    event.returnValue = 'Error : '+err
    })
})

ipcMain.on('save-json', (event, jsonData) => {
  let resultMsg = null
  filename = dialog.showSaveDialog(
    { title: 'Export JSON',
      filters: [{
        name: 'JSON format',
        extensions: ['json']
      }]
    }
  )
  .then(result => {
      filename = result.filePath
      if (filename === undefined || filename === '') {
        event.returnValue = 'Error : the user clicked the btn but didn\'t created a file'        
      }
      console.log(jsonData.length)
      fs.writeFile(filename, jsonData, (err) => {
        if (err) {
          event.returnValue = 'Error : An error ocurred with file creation ' + err.message          
        }
        event.returnValue = result.filePath        
      })      
    })
  .catch(err => {
    console.log(err)
    event.returnValue = 'Error : '+err
    })
})

ipcMain.on('save-open', (event, openData) => {
  let resultMsg = null
  filename = dialog.showSaveDialog(
    { title: 'Export OpenAir',
      filters: [{
        name: 'OpenAir format',
        extensions: ['txt']
      }]
    }
  )
  .then(result => {
      filename = result.filePath
      console.log('filename ; '+filename)
      if (filename === undefined || filename === '') {
        event.returnValue = 'Error : the user clicked the btn but didn\'t created a file'        
      }
      fs.writeFile(filename, openData, (err) => {
        if (err) {
          event.returnValue = 'Error : An error ocurred with file creation ' + err.message          
        }
        event.returnValue = result.filePath        
      })      
    })
  .catch(err => {
    console.log(err)
    event.returnValue = 'Error : '+err
    })
})