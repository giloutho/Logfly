function getNames() {
    let gpsdumpList = {
        'mac32' : 'GpsDump32_54',
        'mac64' : 'gpsdumpMac64_14',
        'win' : 'GpsDump542.exe',
        'linux' : 'gpsdumpLin64_3'    
    }         
    return gpsdumpList
}

module.exports.getNames = getNames