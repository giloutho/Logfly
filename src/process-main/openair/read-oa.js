const {ipcMain} = require('electron')
const OpenDecoder  = require('../../utils/open-decoder.js')

ipcMain.on('read-oa', (event, arg) => {
  const currOpenAir = new OpenDecoder(arg[0],arg[1])
  // True to active console report
  currOpenAir.decode()     
  event.returnValue = currOpenAir
})
