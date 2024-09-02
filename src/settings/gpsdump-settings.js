const {app} = require('electron')
const path = require('path')

let gpsdumpName = {
    'mac32' : 'gpsdumpMac32_54',
    'mac64' : 'gpsdumpMac64_14',
    'win' : 'GpsDump542.exe',
    'linux' : 'gpsdumpLin64_28' 
}         

function getParam() {  
  let gpsParameters = {
    'win' :  {
      gpsdump : path.join('bin_win',gpsdumpName['win']),
      flym : '/gps=flymaster',          // Flymaster SD
      flymold : '/gps=flymasterold',    // Flymaster Old
      fly20 : '/gps=iqcompeo',         // Compeo/Compeo+/Galileo/Competino/Flytec 5020,5030,6030 
      fly15 : '/gps=iqbasic',          // IQ-Basic / Flytec 6015
      list : '/flightlist',
      listfile : path.join(app.getPath('temp'), 'gpslist.txt'),
      temp : '/igc_log=',
      track : '/track=',
      wpread : '/rd_wpt',
      wpwrite : '/wr_wpt'  // it can be '/wr_wpt=' (short name) or '/wr_wpt2=' mixed name : short+long name
    },
    'mac32' :  {
      gpsdump : path.join('bin_darwin',gpsdumpName['mac32']),
      flym : '/gps=flymaster',
      flymold : '/gps=flymasterold',
      fly20 : '/gps=flytec',
      fly15 : '/gps=iqbasic',
      list : '/flightlist',
      temp : '/name=',
      track : '/track=',
      wpread : '/rdwpt',
      wpwrite : '/wrwpt'
    }, 
    'mac64' :  {
      gpsdump : path.join('bin_darwin',gpsdumpName['mac64']),
      flym : '-gyn',
      flymold : '-gy',
      fly20 : '-gc',
      fly15 : '-giq',
      list : '-f0',
      listfile : '-lnomatter.txt',
      temp : '-l',
      track : '-f',
      wpread : '-w',
      wpfile : path.join(app.getPath('temp'), 'tempwp.wpt'),
      wpwrite : '-r' 
    },     
    'linux' :  {
      gpsdump :  path.join('bin_linux',gpsdumpName['linux']),
      flym : '-gyn',
      flymold : '-gy',
      fly20 : '-gc',
      fly15 : '-giq',
      list : '-f0',
      listfile : '-lnomatter.txt', 
      temp : '-l',
      track : '-f',
      wpread : '-w',
      wpfile : path.join(app.getPath('temp'), 'tempwp.wpt'),
      wpwrite : '-r'
    },          
  }  
  return gpsParameters
}

function getGpsdumpNames() {
  return gpsdumpName
}

module.exports.getParam = getParam
module.exports.getGpsdumpNames = getGpsdumpNames


