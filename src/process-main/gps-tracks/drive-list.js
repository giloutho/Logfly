const {ipcMain} = require('electron')
const drivelist = require('drivelist');

async function listDrives() {
  const drives = await drivelist.list();
  return drives
}

/**
 * as usual, the solution came from the official documentation
 * https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args
 */
ipcMain.handle('drive-list', async (event, someArgument) => {
  const result = await listDrives()
  return result
})
