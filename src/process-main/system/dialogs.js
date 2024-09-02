const {ipcMain, dialog} = require('electron')

async function showYesNo(dialogProp) {
    const options = {
        type: 'info',
        // some platforms will not display title
        title: dialogProp.title,
        message: dialogProp.message,
        // The buttons will be built from right to left
        buttons: [dialogProp.yes, dialogProp.no],
      }
    const myChoice = dialog.showMessageBox(options)
    .then((choice) => {
        if (choice.response === 0) {
            // Yes...
            return true
          } else if (choice.response === 1) {
            // bound to buttons array
            return false
          }
        }).catch(err => {
            return false
        })
    const res = await myChoice;
    
    return res      
}

/**
 * as usual, the solution came from the official documentation
 * https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args
 */
ipcMain.handle('yes-no', async (event, dialogProp) => {
  const result = await showYesNo(dialogProp)
  return result
})