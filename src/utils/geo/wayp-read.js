const fs = require('fs')
const log = require('electron-log')
const waypcom = require('./wayp-common.js')

let originalType

/* For GPsDump FormatGEO contact Stein  Cf https://www.paraglidingforum.com/viewtopic.php?t=77524 
 */
function readFile(pathWayp) {
    let content = fs.readFileSync(pathWayp, 'utf8')
    let fileType = null
    let arrWayp = []
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
            }
        }
        if (fileType == null) {
            alert('File format not recognized')
        } else {
            let lines = content.split('\n')
            if (lines.length > 0) {
                switch (fileType) {
                    case 'OZI':
                        arrWayp = readOzi(lines)
                        break;       
                    case 'CUP' :
                        arrWayp = waypcom.readCup(lines)     
                        break;
                    case 'COM' :
                        arrWayp = readCompe(lines)     
                        break
                    case 'GPX' :
                        arrWayp = readGpx(content)     
                        break     
                    case 'KML' :
                        arrWayp = waypcom.readKml(content)     
                        break                                                              
                    default:
                        break;
                }
            }
        }
    } catch (error) {
        alert('Decoding problem')
        log.error('[wayp-read.js] Error while decoding '+pathWayp)
    }
    return arrWayp
}

function readOzi(lines) {
    let arrOzi = []
    try {
        let idxPoint = 0
        // First 4 lines jumped
        // Line 1 : File type and version information
        // Line 2 : Geodetic Datum used for the Lat/Lon positions for each waypoint
        // Line 3 : Reserved for future use
        // Line 4 : GPS Symbol set - not used yet 
        for (let i = 0; i < lines.length; i++) {
            const element = lines[i]

            // 1,A01037        ,  46.330236,   5.388291,42121.6437153,0, 1, 3, 0, 65535,Mt Myon                                 , 0, 0, 0, 1201
            let partPoint = element.split(",")
            if (partPoint.length > 14) {
                // Field 2 : Name - the waypoint name, use the correct length name to suit the GPS type.
                let wName = partPoint[1].trim()
                // Field 15 : Altitude - in feet (-777 if not valid)
                let piecePoint = partPoint[14]
                let wAlt = 0
                // We want to keep numbers only. We can find some endline character like char 10 or char 13
                piecePoint = piecePoint.replaceAll("[^0-9]", "")
                if (piecePoint != null && piecePoint != '' && piecePoint != '-777') {
                    wAlt = Math.round(piecePoint/ 3.2808)
                    if (wAlt < 0 ) wAlt = 0                
                } 
                if (wAlt == 0 && wName.length == 6) {
                    // On est sur du nom court avec 6 caractères selon le vieux format
                    // On essaye d'en déduire les altitudes
                    try {
                        wAlt = parseInt(wName.substring(4))
                    } catch (error) {
                        wAlt = 0
                    }
                }
                // Field 11 : Description (max 40), no commas 
                let wDesc = partPoint[10].trim()
                // Field 3 : Latitude - decimal degrees
                let wLat = partPoint[2].trim()
                // Field 4 : Longitude - decimal degrees
                let wLong = partPoint[3].trim()
                // Field5 : date -> the format of this date is Delphi TDateTime type
                // we're not using it at the moment
                // const dSeconds = partPoint[4].trim()* 60 * 60 * 24 * 1000
                // const totalSeconds = dSeconds + new Date("12-30-1899").getTime()
                // const dateFromDelphi = new Date(totalSeconds).toUTCString()
                // We must test lat and long null values . We can have a comment line like this
                //  1,B99999        ,   0.000000,   0.000000,36674.8250231,0, 1, 3, 0, 65535,Version 2022-05-2                       , 0, 0, 0, 0 
                if(wLat != 0 && wLong != 0) {
                    let currWayp = {
                        name : wName,
                        alt : wAlt,
                        desc : wDesc,
                        lat : wLat,
                        long : wLong,
                        index : idxPoint
                    }
                    //console.log(currWayp.index+' '+currWayp.name+' '+currWayp.desc+' '+currWayp.alt+' '+currWayp.lat+' '+currWayp.long)
                    arrOzi.push(currWayp)
                }
                idxPoint++
            }
        }
    } catch (error) {
        log.error('[wayp-read.js] Error whith readOzi function '+error)
    }
    return arrOzi
}

function readCompe(lines) {
    /**
     *  Pattern de l'expression régulière
     *     W                          La ligne commencera par un W majuscule
     *    \\s{2}                      sera suivie de deux espaces
     *    ([a-zA-Z0-9_\\s]{2,})       une séquence de lettres ou de chiffres ou du caractères _ ou de l'espace d'au moins deux lettres
     *                                mis entre parenthèse = groupe isolable et récupérable
     *    \\s{1}                      sera suivie d' un espace
     *    A                           comportera un A majuscule
     *    \\s                         sera suivie d' un espace
     *    (\\d+\\.\\d*)               comportera un nombre positif avec un séparateur décimal sous forme de point
     *                                mis entre parenthèse = groupe isolable et récupérable
     *    \\W([N|S])                  comportera un caractère N ou S
     *                                mis entre parenthèse = groupe isolable et récupérable
     *    \\s                         sera suivie d' un espace
     *    (\\d+\\.\\d*)               comportera un nombre positif avec un séparateur décimal sous forme de point
     *                                mis entre parenthèse = groupe isolable et récupérable
     *    \\W([E|W])                  comportera un caractère E ou W
     *                                mis entre parenthèse = groupe isolable et récupérable
     *    \\s\\d{2}-\\w{3}-\\d{2}\\s\\d{2}:\\d{2}:\\d{2}\\s
     *                                sera suivi d'une séquence espace27-MAR-62 00:00:00espace
     *    (\\d+\\.?\\d*)              comportera un nombre avec ou sans séparateur décimal sous forme de point
     *    \\s                         sera suivi d' un espace
     *    (.*)                        séquence de caractère quelconque
     *                                mise entre parenthèse = groupe isolable et récupérable 
     */
    let regexp = "W\\s{2}([a-zA-Z0-9_\\s]{2,})\\s{1}A\\s(\\d+\\.\\d*)\\W([N|S])\\s(\\d+\\.\\d*)\\W([E|W])"
    // ^ 27-MAR-62 00:00:00 $
    regexp += "\\s\\d{1,2}-\\w{3}-\\d{2,4}\\s\\d{2}:\\d{2}:\\d{2}\\s"
    regexp += "(\\d+\\.?\\d*)\\s(.*)"
    let myRegexp = new RegExp(regexp, "g")
    let arrComp = []
    try {
        let idxPoint = 0
        // First 2 lines jumped
        for (let i = 2; i < lines.length; i++) {
            const element = lines[i]
            if (element.match(regexp)) {
                myRegexp.lastIndex = 0  // Important specifies the index at which to start the next match (only works if the "g" modifier is set)
                let matches = myRegexp.exec(element)
                console.log({matches})
                if (matches.length > 6) {                   
                    let wName = matches[1]
                    let wDesc = matches[7]
                    let wAlt = parseInt(matches[6])
                    let wLat = parseFloat(matches[2])
                    let wHem = matches[3]
                    if( wHem == 'S') wLat = wLat * -1
                    wLat = wLat.toFixed(5)
                    let wLong = parseFloat(matches[4])
                    let wMer = matches[5]
                    if (wMer == 'W') wLong = wLong * - 1
                    wLong = wLong.toFixed(5)   
                    if(wLat != 0 && wLong != 0) {
                        let currWayp = {
                            name : wName,
                            alt : wAlt,
                            desc : wDesc,
                            lat : wLat,
                            long : wLong,
                            index : idxPoint
                        }                
                        arrComp.push(currWayp)
                    }
                    idxPoint++                    
                }     
            }         
        }
    } catch (error) {
        log.error('[wayp-read.js] Error whith readCompe function '+error)
    }
    return arrComp
}

function readGpx(gpxString) {
    let resParsing =  ipcRenderer.sendSync('gpx-parsing', gpxString)  // process-main/gpx/gpx-parsing.js
    if (Array.isArray(resParsing.wayp)) {
        return resParsing.wayp
    } else {
        console.log("arrGpx is not an array")
        let arrGpx = []
        return arrGpx
    }
}

module.exports.readFile = readFile