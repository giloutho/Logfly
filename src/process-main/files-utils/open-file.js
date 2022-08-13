const {ipcMain} = require('electron')
const { dialog } = require('electron')
const fs = require('fs')

ipcMain.on('open-file', (event, arg) => {
  let fileChoosed = null
  /** 
   * Asynchronous version
   * 
      dialog.showOpenDialog('',{
        properties: ['openFile']
      }).then(result => {
        if (!result.canceled) {           
          fileChoosed = result.filePaths[0]
          event.sender.send('selected-file', fileChoosed)
        }
      })
  */
  if (arg != null) {
    let path = dialog.showOpenDialogSync({
      defaultPath : arg,
      properties: ['openFile']
     });
    if (typeof path !== 'undefined') { 
        folderChoosed = path[0]
    }    
  }
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
      if (filename === undefined) {
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