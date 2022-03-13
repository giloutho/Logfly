const {ipcMain} = require('electron')
const fs = require('fs')
var lineReader = require('reverse-line-reader');

ipcMain.on('read-log-main', (event, mainPath) => {
  let logLines = []
    if (fs.existsSync(mainPath)) {
      lineReader.eachLine(mainPath, function(line) {
        let logline = {}
        logline['content'] = line
        if (line.includes('[info]')) {
          logline['class'] = 'info'
        } else if (line.includes('[warn]')) {
          logline['class'] = 'warning'
        } else if (line.includes('[error]')) {
          logline['class'] = 'error'
        }
        logLines.push(logline)
      }).then(function () {
        event.sender.send('log-lines-array',logLines) 
      });
    } else {
      event.sender.send('log-lines-array',logLines) 
    }
})

ipcMain.on('read-log-render', (event, renderPath) => {
  let logLines = []
  if (fs.existsSync(renderPath)) {
    lineReader.eachLine(renderPath, function(line) {
      let logline = {}
      logline['content'] = line
      if (line.includes('[info]')) {
        logline['class'] = 'info'
      } else if (line.includes('[warn]')) {
        logline['class'] = 'warning'
      } else if (line.includes('[error]')) {
        logline['class'] = 'error'
      }
      logLines.push(logline)
    }).then(function () {
      event.sender.send('log-lines-array',logLines) 
    });
  } else {
    event.sender.send('log-lines-array',logLines) 
  }    
})