const fs = require('fs')
const log = require('electron-log')
const tj = require('@tmcw/togeojson')
const DOMParser = require("xmldom").DOMParser

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
            } else if (testCompeGPS(content)) {
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
                        console.log('retour readOzi '+arrWayp.length)
                        break;       
                    case 'CUP' :
                        arrWayp = readCup(lines)     
                        break;
                    case 'COM' :
                        arrWayp = readCompe(lines)     
                        break
                    case 'GPX' :
                        arrWayp = readGpx(content)     
                        break     
                    case 'KML' :
                        arrWayp = readKml(content)     
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

function testCompeGPS(content) {
    let res
    try {
        let lines = content.split('\n')       
        if (lines.length > 2) {
            // first line is like "G  WGS 84"     [ Headboard : Line G: It identifies the datum of the map ]  
            // Normally 2 spaces between G and WGS 84 but sometimes only one
            let line1 = lines[0].replace(/\s/g, '')                        
            if (line1.indexOf('GWGS84') > -1) {
                // second line is like "U  1"   [ Headboard : Line U: It identifies the system of coordinate -> 0 UTM 1 Lat/Lon]
                // Normally 2 spaces between U and 1 but sometimes only one
                let line2 = lines[1].replace(/\s/g, '')   
                if (line2.indexOf('U1') > -1) {      
                    res = true
                }                 
            }
        }
    } catch (error) {
        res = false
    }
    return res
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

function readCup(lines) {
    // https://github.com/naviter/seeyou_file_formats/blob/main/CUP_file_format.md
    /* We want to extract
        - name : designed as "code" in header
        - alt  : designed as "elev" in header
        - desc : designed as "name" in header
        - lat  : designed as "lat" in header
        - long : designed as "lon" in header
    Usually a header contained at line number 1 is like this : 
        name,code,country,lat,lon,elev,style,rwdir,rwlen,rwwidth,freq,desc,userdata,pics 
    but the order of the columns is arbitrary, a valid header line can be :
        lat,lon,elev,name,code,country,style,rwdir,rwlen,rwwidth,freq,desc   
    
    */

    let arrCup = []
    let idxName = -1
    let idxAlt = -1
    let idxDesc = -1
    let idxLat = -1
    let idxLon = -1
    let goodHeader = false

    try {

        // Parse header line
        const headerLine = lines[0]
        let partHeader = headerLine.split(",")
        for (let j = 0; j < partHeader.length; j++) {
            switch (partHeader[j]) {
                case 'code':
                    idxName = j
                    break
                case 'elev':
                    idxAlt = j
                    break
                case 'name' :
                    idxDesc = j
                    break
                case 'lat' :
                    idxLat = j
                case 'lon' :
                    idxLon = j
                    break
            }
            
        }
        if (idxName > -1 && idxAlt > -1 && idxDesc > -1 && idxLat > -1 && idxLon > -1) {
            goodHeader = true
        } else {
            alert('Invalid header line:')
        }

        if (goodHeader) {
            let idxPoint = 0
            for (let i = 1; i < lines.length; i++) {
                // the file can have a task part. Normally the first line of this part is '-----Related Tasks-----'
                // but sometimes we read a simple 'task'
                if (lines[i].indexOf("task") > -1 || lines[i].indexOf("Task") > -1 ) {
                    break }
                else {    
                    const element = lines[i]
                    if (element != '') {
                        let partPoint = element.split(",")
                        let wName = partPoint[idxName].replaceAll("\"", "")
                        let wDesc = partPoint[idxDesc].replaceAll("\"", "")
                        // elevation decoding
                        let iAlt
                        const altParsed = Number.parseInt(partPoint[idxAlt])
                        if (Number.isNaN(altParsed)) {
                        iAlt = 0
                        }
                        if (partPoint[idxAlt].indexOf("ft") > - 1) {
                            iAlt = altParsed * 0.3048
                        } else if (partPoint[idxAlt].indexOf("m") > - 1) {
                            iAlt = altParsed
                        }
                        let wAlt = iAlt
                        let wLat = decodeCupLat(partPoint[idxLat])
                        let wLong = decodeCupLon(partPoint[idxLon])
                        if(wLat != 'isNaN' && wLong != 'isNaN') {
                            let currWayp = {
                                name : wName,
                                alt : wAlt,
                                desc : wDesc,
                                lat : wLat,
                                long : wLong,
                                index : idxPoint
                            }
                            arrCup.push(currWayp)
                        }
                        idxPoint++
                    }
                }
            }
            console.log(arrCup.length+' waypoints decoded')
        }
    } catch (error) {
        log.error('[wayp-read.js] Error whith readCup function '+error)
    }
    return arrCup
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
    let arrGpx =  ipcRenderer.sendSync('read-wayp-gpx', gpxString)  // process-main/gpx/gpx-wayp-read.js
    if (Array.isArray(arrGpx)) {
        console.log(arrGpx.length+' waypoints');
      } else {
        console.log("arrGpx is not an array");
      }
    return arrGpx
}

function readKml(content) {
    let arrKml = []
    try {
        const kml = new DOMParser().parseFromString(content);
        const converted = tj.kml(kml)
        const data = JSON.parse(JSON.stringify(converted))
        const arrData   = Object.values(data)
        let idxPoint = 0
        if (arrData.length > 1) {
            for (let i = 0; i < arrData[1].length; i++) {
                const element = arrData[1][i]
                const elemType = element.geometry.type
                if (elemType == 'Point') {
                    if (element.geometry.coordinates.length > 2) {
                        let wAlt = parseInt(element.geometry.coordinates[2])
                        let wLat = parseFloat(element.geometry.coordinates[1]).toFixed(5)
                        let wLong = parseFloat(element.geometry.coordinates[0]).toFixed(5)
                        let wName = element.properties.name
                        let currWayp = {
                            name : wName,
                            alt : wAlt,
                            desc : wName,
                            lat : wLat,
                            long : wLong,
                            index : idxPoint
                        }                
                        arrKml.push(currWayp)
                    }
                }      
            }
        }
    } catch (error) {
        console.log(error)
    }
    return arrKml
}

function decodeCupLat(sLat) {
    let res = ""
    let sDeg;
    let sMn;
    let sHem;  
                   
    try {
        // Latitude is a decimal number (eg 4553.445N )where 1-2 characters are degrees, 3-4 characters are minutes,
        // 5  decimal point, 6-8 characters are decimal minutes. The ellipsoid used is WGS-1984
        sDeg = sLat.substring(0,2)
        sMn = sLat.substring(2,8)
        sHem = sLat.substring(8)

        const degParsed = Number.parseInt(sDeg)
        const minParsed = Number.parseFloat(sMn)
        if (!Number.isNaN(degParsed) && !Number.isNaN(minParsed)) {
            let calcLatitude = degParsed+((minParsed*60)/3600)
            if (sHem == 'S') calcLatitude = calcLatitude * - 1
            res = calcLatitude.toFixed(5)
        }
    } catch (error) {
        res = "isNaN"
    }            
    
    return res
}

function decodeCupLon(sLong) {
    let res = ""
    let sDeg;
    let sMn;
    let sHem;  
                   
    try {
        // Longitude is a decimal number (eg 00627.076E) where 1-3 characters are degrees, 4-5 characters are minutes,
        // 6 decimal point, 7-9 characters are decimal minutes. The ellipsoid used is WGS-1984
        sDeg = sLong.substring(0,3)
        sMn = sLong.substring(3,9)
        sMer = sLong.substring(9)

        const degParsed = Number.parseInt(sDeg)
        const minParsed = Number.parseFloat(sMn)
        if (!Number.isNaN(degParsed) && !Number.isNaN(minParsed)) {
            let calcLongitude = degParsed+((minParsed*60)/3600)
            if (sMer == 'W') calcLongitude = calcLongitude * - 1
            res = calcLongitude.toFixed(5);
        }
    } catch (error) {
        res = "isNaN"
    }            
    
    return res;
}

module.exports.readFile = readFile