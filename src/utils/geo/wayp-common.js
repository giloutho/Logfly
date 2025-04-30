const DOMParser = require("xmldom").DOMParser
const tj = require('@tmcw/togeojson')

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

function readDump(lines) {
    let arrDump = []
    try {
        let idxPoint = 0
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim()
            if (line === '') continue // Ignorer les lignes vides

            // Extraire les informations des coordonnées
            const parts = line.split(/(\s+)/)
            if (parts.length < 19) {
                console.warn(`Skipping invalid line: ${parts.length}`)
                continue
            }

            const shortName = parts[0]
            const latHemisphere = parts[2]
            const latDegrees = parseInt(parts[4], 10)
            const latMinutes = parseInt(parts[6], 10)
            const latSeconds = parseFloat(parts[8])
            const lonHemisphere = parts[10]
            const lonDegrees = parseInt(parts[12], 10)
            const lonMinutes = parseInt(parts[14], 10)
            const lonSeconds = parseFloat(parts[16])
            const altitude = parseInt(parts[18], 10)

            // Convertir les coordonnées en format décimal
            const latitude = (latDegrees + latMinutes / 60 + latSeconds / 3600) * (latHemisphere === 'S' ? -1 : 1)
            const longitude = (lonDegrees + lonMinutes / 60 + lonSeconds / 3600) * (lonHemisphere === 'W' ? -1 : 1)
            idxPoint++
            let currWayp = {
                name : shortName,
                alt : altitude,
                desc : shortName,
                lat : latitude.toFixed(6),
                long : longitude.toFixed(6),
                index : idxPoint
            }
            arrDump.push(currWayp)
        }
    } catch (error) {
        console.error('Error parsing Dump file:', error.message)
    }
    return arrDump
}

function readKml(content) {
    let arrKml = []
    try {
        const kml = new DOMParser().parseFromString(content)
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

function readXCTrack(fileContent) {
    let arrXCTrack = []
    try {
        const xctrackData = JSON.parse(fileContent)
        // Vérifier la structure du fichier
        if (!xctrackData.taskType || !xctrackData.turnpoints) {
            throw new Error('Invalid XCTrack JSON format')
        }
        xctrackData.turnpoints.forEach((turnpoint, index) => {            
            let currWayp = {
                name : turnpoint.waypoint.name,
                alt : turnpoint.waypoint.altSmoothed,
                desc : turnpoint.waypoint.name,
                lat : turnpoint.waypoint.lat,
                long : turnpoint.waypoint.lon,
                index : 0
            }     
            arrXCTrack.push(currWayp)
        })
    } catch (error) {
        console.error('Error parsing XCTrack JSON:', error.message)
    }
    return arrXCTrack
}

function testXCTrack(fileContent) {
    try {
        const xctrackData = JSON.parse(fileContent)
        // Vérifier la structure du fichier
        if (!xctrackData.taskType || !xctrackData.turnpoints) {
            throw new Error('Invalid XCTrack JSON format')
        }
        return true 
    } catch (error) {
        console.error('Error parsing XCTrack JSON:', error.message)
        return false
    }
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

function decodeCupLat(sLat) {
    let res = ""
    let sDeg
    let sMn
    let sHem  
                   
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
    let sDeg
    let sMn
    let sHem  
                   
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
            res = calcLongitude.toFixed(5)
        }
    } catch (error) {
        res = "isNaN"
    }            
    
    return res
}


module.exports.readCup = readCup
module.exports.readKml = readKml
module.exports.readXCTrack = readXCTrack
module.exports.readDump = readDump
module.exports.testXCTrack = testXCTrack
module.exports.testCompeGPS = testCompeGPS
