// Pose problème fait disparaitre le panneau devTools

const {ipcMain} = require('electron')
const { SerialPort } = require('serialport')

async function listPorts() {
  const ports = await serialPort.list()
  return ports
}

/**
 * as usual, the solution came from the official documentation
 * https://www.electronjs.org/docs/api/ipc-renderer#ipcrendererinvokechannel-args
 */
ipcMain.handle('ports-list', async (event, someArgument) => {
  const result = await listPorts()
  return result
})