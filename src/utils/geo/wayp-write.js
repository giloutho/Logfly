const fs = require('fs')
const log = require('electron-log')

function writeOzi(arrWayp, filePath) {
    // In OziExplorer File Format description, field 5 is a date
    // the format of this date is Delphi TDateTime type
    // from https://stackoverflow.com/questions/57184472/javascript-date-to-delphi-tdatetime
    const date = new Date() // without arguments, creates a date object with the current date and time
    const seconds = (new Date(date).getTime() - new Date("12-30-1899").getTime()) / 1000
    const delphiDate = seconds / 60 / 60 / 24
    const delphiDate7dig = (Math.round(delphiDate * 10000000) / 10000000).toFixed(7)
    // Unused fields are defined by constants
    // Field 6 : Symbol - 0 to number of symbols in GPS
    // Field 7 : Status - always set to 1
    // Field 8 : Map Display Format
    // Field 9 : Foreground Color (RGB value)
    // Field 10 : Background Color (RGB value)
    const field6to10 = ' 0, 1, 3,         0,     65535'
    // Field 12 : Pointer Direction
    // Field 13 : Garmin Display Format
    // Field 14 : Proximity Distance - 0 is off any other number is valid
    const field12to14 = ' 0, 0,    0'
    // Field 16 : Font Size - in points
    // Field 17 : Font Style - 0 is normal, 1 is bold.
    // Field 18 : Symbol Size - 17 is normal size
    const field16to18 = '6,0,17'
    if (arrWayp.length > 0) {
        let oziText = ''
        // Line 1 : File type and version information
        oziText += 'OziExplorer Waypoint File Version 1.0\r\n'
        // Line 2 : Geodetic Datum used for the Lat/Lon positions for each waypoint
        oziText += 'WGS 84\r\n'
        // Line 3 : Reserved for future use
        oziText += 'Reserved 2\r\n'
        // Line 4 : GPS Symbol set - not used yet
        oziText += 'Reserved 3\r\n'
        for (let i = 0; i < arrWayp.length; i++) {
            const element = arrWayp[i]
            // It would appear that the format used by the rench league is more demanding than the standard format
            // standard format : https://www.oziexplorer4.com/eng/help/fileformats.html
            let orderNumber = i+1
            let sOrder = orderNumber.toString().padStart(4, ' ')
            // limit to six characters but not absolutely required -> use the correct length name to suit the GPS type.
            let shortName = element.shortName.length > 6 ? element.shortName.substring(0,7) : element.shortName
            shortName = shortName.toString().padEnd(14, ' ')  // 13-character mandatory frame for GPSDump Linux
            // latitude and longitude must have 6 decimal digits and the whole part must be 4 characters long.
            let lat6digit = (Math.round(element.lat * 1000000) / 1000000).toFixed(6)
            // We want 4 characters+point+6 digits -> total 11
            let sLat = lat6digit.toString().padStart(11,' ')
            let long6digit = (Math.round(element.long * 1000000) / 1000000).toFixed(6)
            let sLong = long6digit.toString().padStart(11,' ')
            // LongName max length is 40
            let longName
            if (element.longName != null && element.longName != '') {
                longName = element.longName.length > 6 ? element.longName.substring(0,41) : element.longName
                longName = longName.toString().padEnd(40,' ')
            } else {
                // Special for GPSDump with short names
                longName = element.shortName.toString().padEnd(40,0)
            }
            altiFeet = Math.round(element.alti * 3.280839895)
            sAlti = altiFeet.toString().padStart(5,' ')
            oziText += sOrder+'\,'+shortName+'\,'+sLat+'\,'+sLong+'\,'+delphiDate7dig+'\,'+field6to10+'\,'+longName+'\,'+field12to14+'\,'+sAlti+'\,'+field16to18+'\r\n'
        // console.log(sOrder+'\,'+shortName+'\,'+sLat+'\,'+sLong+'\,'+delphiDate7dig+'\,'+field6to10+'\,'+longName+'\,'+field12to14+'\,'+sAlti+'\,'+field16to18+'\r\n')        
        }
        try {
            if (filePath === '') {
                const exportResult = ipcRenderer.sendSync('save-wpt',oziText,'ozi',filePath)
                if (exportResult.indexOf('Error') !== -1) {
                    alert(exportResult)      
                } else {
                    alert(i18n.gettext('Successful operation'))
                }     
            } else if (filePath.indexOf('@') > -1) {
                filePath = filePath.substring(1)
                const exportResult = ipcRenderer.sendSync('save-wpt',oziText,'ozi',filePath)
                if (exportResult.indexOf('Error') !== -1) {
                    alert(exportResult)      
                } else {
                    alert(i18n.gettext('Successful operation'))
                }     
            } else {
                try {
                    fs.writeFileSync(filePath, oziText)
                } catch (error) {
                    log.error('Error in writeOzi during temp file creation ['+filePath+'] '+error)   
                }
            }
        } catch (error) {
            alert(error)
        }
    }
}


function writeCup(arrWayp, filePath) {
      if (arrWayp.length > 0) {
        let cupText = ''
        // Line 1 : header
        cupText += 'name,code,country,lat,lon,elev,style,rwdir,rwlen,freq,desc\r\n'
        for (let i = 0; i < arrWayp.length; i++) {
            const element = arrWayp[i]
            const sName = element.longName
            const sCode = element.shortName
            const cupLat = encodeCupLat(element.lat)
            const cupLong = encodeCupLong(element.long)
            cupText += '\"'+sName+'\",'+sCode+',,'+cupLat+','+cupLong+','+element.alti.toString()+'m,1,,,,'+'\r\n'
        }
        try {            
            if (filePath === '') {
                const exportResult = ipcRenderer.sendSync('save-wpt',cupText,'cup',filePath)
                if (exportResult.indexOf('Error') !== -1) {
                    alert(exportResult)      
                } else {
                    alert(i18n.gettext('Successful operation'))
                }     
            } else if (filePath.indexOf('@') > -1) {
                filePath = filePath.substring(1)
                const exportResult = ipcRenderer.sendSync('save-wpt',cupText,'cup',filePath)
                if (exportResult.indexOf('Error') !== -1) {
                    alert(exportResult)      
                } else {
                    alert(i18n.gettext('Successful operation'))
                }     
            }       
        } catch (error) {
            log.error('Error in writeCup : '+error)   
        }
        
      }
}

function writeCompe(arrWayp, filePath) {
    if (arrWayp.length > 0) {
        let compeText = ''
        // Line 1 : header
        compeText += 'G  WGS 84\r\n'
        compeText += 'U  1\r\n'
        for (let i = 0; i < arrWayp.length; i++) {
            const element = arrWayp[i]
            const sName = element.longName
            const sCode = element.shortName
            const compLat = encodeCompLat(parseFloat(element.lat))
            const compLong = encodeCompLong(parseFloat(element.long))
            console.log(element.alti+' -> '+parseFloat(element.alti))
            const sAlt = parseFloat(element.alti).toFixed(6)
            compeText+= 'W  '+sCode+' A '+compLat+' '+compLong+' 27-MAR-62 00:00:00 '+sAlt+' '+sName+'\r\n'
        }
        try {
            if (filePath === '') {
                const exportResult = ipcRenderer.sendSync('save-wpt',compeText,'com',filePath)
                if (exportResult.indexOf('Error') !== -1) {
                    alert(exportResult)      
                } else {
                    alert(i18n.gettext('Successful operation'))
                }     
            } else if (filePath.indexOf('@') > -1) {
                filePath = filePath.substring(1)
                const exportResult = ipcRenderer.sendSync('save-wpt',compeText,'com',filePath)
                if (exportResult.indexOf('Error') !== -1) {
                    alert(exportResult)      
                } else {
                    alert(i18n.gettext('Successful operation'))
                }     
            }
        } catch (error) {
            log.error('Error in writeCompe : '+error) 
        }
        
    }
}

function writeGpx(arrWayp, filePath, withDesc) {
    let header = '<?xml version="1.0" encoding="UTF-8"?>'+'\r\n'
    header += '<gpx xmlns="http://www.topografix.com/GPX/1/1"'+'\r\n'
    header += '     creator="Logfly"'+'\r\n'
    header += '     version="1.1"'+'\r\n'
    header += '     xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+'\r\n'
    header += '     xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">'+'\r\n'
    header += '     <metadata>'+'\r\n'
    let creation_date = new Date()
    header += '          <time>'+creation_date+'</time>'+'\r\n'
    header += '     </metadata>'+'\r\n'
    let footer = '</gpx>'
    if (arrWayp.length > 0) {        
        let gpxText = header
        for (let i = 0; i < arrWayp.length; i++) {
            const element = arrWayp[i]
            gpxText += '     <wpt lat="'+parseFloat(element.lat).toFixed(6)+'" lon="'+parseFloat(element.long).toFixed(6)+'">'+'\r\n'
            gpxText += '        <ele>'+parseFloat(element.alti).toFixed(1)+'</ele>'+'\r\n'
            gpxText += '        <name>'+element.shortName+'</name>'+'\r\n'
            gpxText += '        <cmt>'+element.longName+'</cmt>'+'\r\n'
            gpxText += '        <desc>'+element.longName+'</desc>'+'\r\n'
            gpxText += '     </wpt>'+'\r\n'
        }
        gpxText += footer
        try {
            const exportResult = ipcRenderer.sendSync('save-wpt',gpxText,'gpx','')  //process-main/files-utils/open-file.js
            if (exportResult.indexOf('Error') !== -1) {
                alert(exportResult)      
            } else {
                alert(i18n.gettext('Successful operation'))
            }        
        } catch (error) {
            log.error('Error in writeGpx : '+error) 
        }
    }
}

function writeKml(arrWayp, filePath, withDesc) {
    let header = '<?xml version="1.0" encoding="UTF-8"?>'+'\r\n'
    header += '<kml xmlns="http://www.opengis.net/kml/2.2"'+'\r\n'
    header += '    xmlns:gx="http://www.google.com/kml/ext/2.2">'+'\r\n'
    header += '       <Document>'+'\r\n'
    header += '       <name>GPS device</name>'+'\r\n'
    header += '       <snippet>Created Thu Jul 18 05:14:56 2024</snippet>'+'\r\n'
    header += '       <LookAt>'+'\r\n'
    header += '          <longitude>21.693067</longitude>'+'\r\n'
    header += '          <latitude>40.318158</latitude>'+'\r\n'
    header += '          <range>257874.084315</range>'+'\r\n'
    header += '       </LookAt>'+'\r\n'
    header += '<!-- Normal waypoint style -->'+'\r\n'
    header += '       <Style id="waypoint_n">'+'\r\n'
    header += '          <IconStyle>'+'\r\n'
    header += '             <Icon>'+'\r\n'
    header += '               <href>http://maps.google.com/mapfiles/kml/pal4/icon61.png</href>'+'\r\n'
    header += '             </Icon>'+'\r\n'
    header += '          </IconStyle>'+'\r\n'
    header += '       </Style>'+'\r\n'
    header += '<!-- Highlighted waypoint style -->'+'\r\n'
    header += '       <Style id="waypoint_h">'+'\r\n'
    header += '          <IconStyle>'+'\r\n'
    header += '             <scale>1.2</scale>'+'\r\n'
    header += '             <Icon>'+'\r\n'
    header += '                <href>http://maps.google.com/mapfiles/kml/pal4/icon61.png</href>'+'\r\n'
    header += '             </Icon>'+'\r\n'
    header += '          </IconStyle>'+'\r\n'
    header += '       </Style>'+'\r\n'
    header += '       <StyleMap id="waypoint">'+'\r\n'
    header += '          <Pair>'+'\r\n'
    header += '             <key>normal</key>'+'\r\n'
    header += '             <styleUrl>#waypoint_n</styleUrl>'+'\r\n'
    header += '          </Pair>'+'\r\n'
    header += '          <Pair>'+'\r\n'
    header += '             <key>highlight</key>'+'\r\n'
    header += '             <styleUrl>#waypoint_h</styleUrl>'+'\r\n'
    header += '          </Pair>'+'\r\n'
    header += '       </StyleMap>'+'\r\n'
    header += '   <Folder>'+'\r\n'
    header += '      <name>Waypoints</name>'+'\r\n'
    let footer = '   </Folder>'+'\r\n'
    footer += '</Document>'+'\r\n'
    footer += '</kml>'+'\r\n'    
    if (arrWayp.length > 0) {        
        let kmlText = header
        for (let i = 0; i < arrWayp.length; i++) {
            const element = arrWayp[i]
            kmlText += '      <Placemark>'+'\r\n'
            kmlText += '         <name>'+element.shortName+'</name>'+'\r\n'
            kmlText += '         <styleUrl>#waypoint</styleUrl>'+'\r\n'
            kmlText += '         <Point>'+'\r\n'
            kmlText += '            <coordinates>'+parseFloat(element.long).toFixed(6)+','+parseFloat(element.lat).toFixed(6)+','+parseFloat(element.alti).toFixed(2)+'</coordinates>'+'\r\n'
            kmlText += '         </Point>'+'\r\n'
            kmlText += '      </Placemark>'+'\r\n'
        }
        kmlText += footer
        try {
            const exportResult = ipcRenderer.sendSync('save-wpt',kmlText,'kml','')  //process-main/files-utils/open-file.js
            if (exportResult.indexOf('Error') !== -1) {
                alert(exportResult)      
            } else {
                alert(i18n.gettext('Successful operation'))
            }        
        } catch (error) {
            log.error('Error in writeKml : '+error) 
        }
    }
}

function encodeCompLat(degrees) {    
    let iSign
    if (degrees < 0) {
        iSign = -1
        degrees = degrees *-1
    } else {
        iSign = 1
    }    
    let strLat = degrees.toFixed(10).padStart(13,0)
    let hemisphere = iSign == 1 ? 'N' : 'S'

    let compeLat = strLat+String.fromCharCode(186)+hemisphere

    return compeLat
}

function encodeCompLong(degrees) {
    let iSign
    if (degrees < 0) {
        iSign = -1
        degrees = degrees *-1
    } else {
        iSign = 1
    }
    let strLong = degrees.toFixed(10).padStart(14,0)
    let meridian = iSign == 1 ? 'E' : 'W'
    let compeLong = strLong+String.fromCharCode(186)+meridian

    return compeLong
}

function encodeCompeLat(degrees) {
        let iSign
    if (degrees < 0) {
        degrees = -degrees
        iSign = -1
    } else {
        iSign = 1
    }
    const latDegres = Math.floor(degrees)

}

function encodeCupLat(degrees) {
    let iSign
    if (degrees < 0) {
        degrees = -degrees
        iSign = -1
    } else {
        iSign = 1
    }
    const latDegres = Math.floor(degrees)
    const sLatDegres = latDegres.toString().padStart(2,'0')
    let latDecimal = Number(degrees) - latDegres
    const dMinutesPart = (Number(degrees) - latDegres) * 60
    let hemisphere = iSign == 1 ? 'N' : 'S'

    let cupLat = sLatDegres+dMinutesPart.toFixed(3)+hemisphere

    return cupLat
}

function encodeCupLong(degrees) {
    let iSign
    if (degrees < 0) {
        degrees = -degrees
        iSign = -1
    } else {
        iSign = 1
    }
    const longDegres = Math.floor(degrees)
    const sLongDegres = longDegres.toString().padStart(3,'0')
    let longDecimal = Number(degrees) - longDegres
    const dMinutesPart = (Number(degrees) - longDegres) * 60
    let meridian = iSign == 1 ? 'E' : 'W'

    let cupLong = sLongDegres+dMinutesPart.toFixed(3)+meridian

    return cupLong   
}


module.exports.writeOzi = writeOzi
module.exports.writeCup = writeCup
module.exports.writeCompe = writeCompe
module.exports.writeGpx = writeGpx
module.exports.writeKml = writeKml