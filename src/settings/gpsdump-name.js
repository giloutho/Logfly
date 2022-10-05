function getNames() {
    let gpsdumpList = {
        'mac' : 'gpsdumpMac64_14',
        'win' : 'GpsDump542.exe',
        'linux' : 'gpsdumpLin64_3'    
    }         
    return gpsdumpList
}

module.exports.getNames = getNames