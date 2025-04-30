const fs = require('fs')
const log = require('electron-log')
const waypcom = require('./wayp-common.js')


function readFile(pathRte) {
    let content = fs.readFileSync(pathRte, 'utf8')
    let fileType = null
    let resParsing = {}
    try {
        if (content != null)  {    
            if (content.indexOf("OziExplorer") > -1) {                
                fileType = "OZI"
                originalType = "1"                
            } else if (content.indexOf("<kml xmlns") > -1) {
                fileType = "KML"
                originalType = "4"
            } else if (content.indexOf("<?xml version=\"1.0\"") > -1 || content.indexOf("version=\"1.1\"") > -1) {
                fileType = "GPX"
                originalType = "5"
            } else if (content.indexOf("rwdir") > -1) {    // Vérifier si cela fonctionne sans les majuscules
                fileType = "CUP"
                originalType = "6"
            } else if (content.indexOf("Rwdir") > -1) {    // Vérifier si cela fonctionne sans les majuscules
                fileType = "CUP" 
                originalType = "6"
            } else if (waypcom.testCompeGPS(content)) {
                fileType = "COM" 
                originalType = "2"
            } else if (content.indexOf("$FormatGEO") > -1){
                fileType = "DUP" 
                originalType = "8"            
            } else if (waypcom.testXCTrack(content)) {
                console.log('test 2 xctrac')
                fileType = "XCK" 
                originalType = "7"
            }
        }
        if (fileType == null) {
            alert('File format not recognized')
        } else {
            const resRte = []
            if (fileType != 'XCK') {
                let lines = content.split('\n')
                if (lines.length > 0) {
                    switch (fileType) {
                        case 'OZI':
                            resParsing = readOzi(lines)
                            console.log('retour readOzi '+resParsing.length)
                            break;       
                        case 'CUP' :                        
                            resParsing.rte = resRte
                            resParsing.wayp = waypcom.readCup(lines)  
                            break;
                        case 'COM' :
                            resParsing = readCompe(lines)     
                            break
                        case 'GPX' :
                            resParsing = readGpx(content)     
                            break     
                        case 'KML' :
                            resParsing.rte = resRte
                            resParsing.wayp = waypcom.readKml(content)     
                            break       
                        case 'DUP' :
                            resParsing.rte = resRte
                            resParsing.wayp = waypcom.readDump(lines)  
                            break                                                                                         
                        default:
                            break
                    }
                }
            } else {
                resParsing.rte = resRte
                resParsing.wayp = waypcom.readXCTrack(content)  
            }
        }
    } catch (error) {
        alert('Decoding problem')
        log.error('[rte-read.js] Error while decoding '+pathRte)
    }
    return resParsing
}

function readGpx(gpxString) {
    if (gpxString != null)  {    
        try {
            let resParsing = ipcRenderer.sendSync('gpx-parsing', gpxString)  // process-main/gpx/gpx-parsing.js
            if (Array.isArray(resParsing.rte)) {
                return resParsing
            }
        } catch (error) {
            console.log(error)
        }
    }
} 

function readCup(lines) {
    
}

module.exports.readFile = readFile