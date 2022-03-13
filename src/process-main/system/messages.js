const {ipcMain, dialog} = require('electron')
const log = require('electron-log');


ipcMain.on('open-confirmation-dialog', (event, arg) => {

  const options = {
    type: 'info',
    // some platforms will not display title
    title: arg.title,
    message: arg.message,
    // The buttons will be built from right to left
    buttons: [arg.yes, arg.no],
  }
  dialog.showMessageBox(options)
        .then((choice) => {
          if (choice.response === 0) {
            // Yes...
            event.sender.send('confirmation-dialog', true)
          } else if (choice.response === 1) {
            // bound to buttons array
            event.sender.send('confirmation-dialog', false)
          }
        }).catch(err => {
            log.error('[open-confirmation-dialog] '+err)
            event.sender.send('confirmation-dialog', false)
        });
})