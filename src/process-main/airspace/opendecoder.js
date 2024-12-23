const {ipcMain} = require('electron')
// https://github.com/tbrams/OpenAirJS/blob/master/app.js
const geometry = require('spherical-geometry-js')
const turfbbox = require('@turf/bbox').default
const turfIntersect = require('@turf/boolean-intersects').default
const turfWithin = require('@turf/points-within-polygon').default
const turfHelper = require('@turf/helpers')

// Global variables
let mCenter = {
  lat: 0,
  lng: 0
}
let mStep_direction = 1
let AltLimit_Top
let AltLimit_Top_AGL
let AltLimit_Top_Ref
let AltLimit_Top_Unit
let AltLimit_Bottom
let AltLimit_Bottom_AGL
let AltLimit_Bottom_Ref
let AltLimit_Bottom_Unit
let oaGeojson
let coordArray
let modeDebug
let minLat
let minLon
let maxLat
let maxLon    

const STEP_SIZE = 1
const lineBreak = '\n'

let openPolygons = {}
let decodingReport

ipcMain.on('read-open', (event, openRequest) => {
    // Important to reset the variables at each call
    minLat = 100
    minLon = 200
    maxLat = -100
    maxLon = -200 
    openPolygons = {
      airspaceSet : [],
      report : '',
      center : {
        long : 0,
        lat : 0
      },
      bbox : {
        minlat : 0,
        minlon : 0,
        maxlat : 0, 
        maxlon : 0
      }
    } 
    decodingReport = ''
    const myPolygons = decodeOA(openRequest.oaText, openRequest.report)
    if(myPolygons.airspaceSet.length > 0) {
      openPolygons.bbox.minlat = minLat
      openPolygons.bbox.minlon = minLon
      openPolygons.bbox.maxlat = maxLat 
      openPolygons.bbox.maxlon = maxLon
    }
    if (openRequest.report) console.log(decodingReport)
    event.sender.send('open-airset', myPolygons)
})

ipcMain.on('check-open', (event, checkRequest) => {
  // Important to reset the variables at each call
  openPolygons = {
    airspaceSet : [],
    report : '',
    center : {
      long : 0,
      lat : 0
    },
  } 
  decodingReport = ''
  let checkResult = {
    airGeoJson : [],
    insidePoints : []
  }

  const myPolygons = decodeOA(checkRequest.oaText, false)
  if (myPolygons.airspaceSet.length > 0) {    
      /* As a reminder
        Track.fixes  structure      
        {
          "timestamp": 1436439971000,
          "time": "11:06:11",
          "latitude": 45.60595,
          "longitude": 6.2133666666666665,
          "valid": true,
          "pressureAltitude": 1722,
          "gpsAltitude": 1819,
          "extensions": {
              "FXA": "009",
              "GSP": "03231",
              "TRT": "045",
              "VAT": "00082"
          },
          "enl": null,
          "fixAccuracy": 9
        } 
    */
  
    // In order to use turfWithin below, the fixes array must be converted in a "turf multipoint object"
    let trackPoints = checkRequest.track.fixes.map(point => [point.longitude,point.latitude] )
    let altMaxPoint = checkRequest.track.stat.maxalt.gps
    let multiPt = turfHelper.multiPoint(trackPoints)
    let geoTrack = checkRequest.track.GeoJSON
    let turfNb = 0
    let nbInside = 0
    let intersectSpaces = []
    for (let index = 0; index < myPolygons.airspaceSet.length; index++) {
      const element = myPolygons.airspaceSet[index].dbGeoJson
      if (turfIntersect(element,geoTrack)) {
        //console.log('intersect '+myPolygons.airspaceSet[index].dbGeoJson.properties.Name)
        intersectSpaces.push(element)
        let pushGeoJson = false
        let ptsWithin = turfWithin(multiPt, element)
        for (let i = 0; i < ptsWithin.features.length; i++) {
          const feature = ptsWithin.features[i]
          for (let j = 0; j < feature.geometry.coordinates.length; j++) {
            turfNb ++               
            const vPoint = feature.geometry.coordinates[j]
            idxPoint = trackPoints.findIndex(e => e === vPoint)
            let floorLimit = element.properties.Floor
            let ceilingLimit = element.properties.Ceiling             
            if (element.properties.altLimitBottomAGL === true) floorLimit += checkRequest.ground[idxPoint]
            if (element.properties.altLimitTopAGL ===  true) ceilingLimit += checkRequest.ground[idxPoint]
            if (checkRequest.track.fixes[idxPoint].gpsAltitude > floorLimit && checkRequest.track.fixes[idxPoint].gpsAltitude < ceilingLimit) {
              nbInside++
              if (!pushGeoJson) {
                checkResult.airGeoJson.push(element)
                pushGeoJson = true
              }          
              checkResult.insidePoints.push(idxPoint)
            }              
          }
        }
      } 
    } 
    if (checkResult.insidePoints.length == 0) {
      for (let index = 0; index < intersectSpaces.length; index++) {        
          checkResult.airGeoJson.push(intersectSpaces[index])   
      }
    }
  }
  event.sender.send('check-result', checkResult)
})


function decodeOA(oaText, modeReport) {  
    modeDebug = modeReport
    let lines = oaText.split('\n')
    let groups = groupLines(lines) 
    const currentdate = new Date()
    decodingReport += groups.length+' groups found'+lineBreak
    groups.forEach((group) => {
      // reinitialisation
      let originalText = group.join(lineBreak)
      //let originalText = ''
      let oaObject = {
        openair : originalText,
        dbGeoJson : '',
        name :  '',
        class : '',
        floor : 0,
        ceiling : 0,  
        bbox: []
      }
      AltLimit_Top  = 0
      AltLimit_Top_AGL = false
      AltLimit_Top_Ref = 'STD'
      AltLimit_Top_Unit = 'F'
      AltLimit_Bottom = 0
      AltLimit_Bottom_AGL = false
      AltLimit_Bottom_Ref = 'STD'
      AltLimit_Bottom_Unit = 'F'      
      coordArray = []
      oaGeojson = {
        type :"Feature",
        properties : {
           Floor : 0,
           Cat : "1",
           Ceiling : 0,
           Class : "",
           Name : "",
           Comment : "",
           altLimitTopAGL : false,
           altLimitTopRef : '',
           altLimitTopUnit : '',
           altLimitBottomAGL : false,
           altLimitBottomRef : '',
           altLimitBottomUnit : '',                 
        },
        geometry : {
            type : "Polygon",
            coordinates : []
        } 
      }
      group.forEach((cmd) => {
        parseCommand(cmd)
      })     
      if (modeDebug) decodingReport += '========================================================='+lineBreak
      // The coordinates of the first point must be added to close the polygon.
      if (coordArray.length > 1 ) {
        coordArray.push(coordArray[0])   
        oaGeojson.geometry.coordinates.push(coordArray)  
        oaObject.dbGeoJson = oaGeojson
        oaObject.name = oaGeojson.properties.Name
        oaObject.class = oaGeojson.properties.Class
        oaObject.floor = oaGeojson.properties.Floor
        oaObject.ceiling = oaGeojson.properties.Ceiling
        // Compute bbbox        
        // let geobox = turfbbox(oaGeojson)
        let geobox = computeTotalBbox(oaGeojson)
        if (geobox.length = 4) oaObject.bbox = geobox
        openPolygons.airspaceSet.push(oaObject)    
      }
    })

    return openPolygons
}
  
/**
 * Read through the lines and group everything into definition groups.
 *
 * Create an array for each group of commands and add them all to an
 * array holding all command groups.
 *
 * @param  {Array of String} lines Raw file contents
 * @return {Array[ Array of String]}      Array with line groups each in array
 */
function groupLines(lines) {
    let groups = []
    let i = 0

    while (i < lines.length) {
      let g = []

      // get ready for first group by ignoring repeating blank lines
      while (i < lines.length && lines[i].trim() == '') {
        i++
      }

      while (i < lines.length && lines[i].trim() != '') {
        // add all this to group g
        g.push(lines[i++])
      }

      groups.push(g)
    }

    return groups
}

function addToGeojson(lng,lat) {    
    coordArray.push([lng,lat])
}

function parseCommand(cmd) {
    let commentText = ''
    if (cmd.charAt(0) === '*') {
      // The French openair reference files have a comment without space between the asterisk and the text        
      // This requires a special treatment

      // insert a space to match with the first regex
      let comment = cmd.slice(0, 1) + " " + cmd.slice(2)
      commentText = cmd.slice(2)
      cmd = comment
    }
    // First pattern matches two groups - the main command and the rest of the line
    let pattern = /^(AN|AC|AL|AT|AH|DC|DA|DP|DB|V|\*) ([\w\d\s\:\.\=\+\-\,]*)/g
    let m = pattern.exec(cmd)

    if (m != null) {
      try {
        let command = m[1].toUpperCase()
        let rest = ''
        if (m.length > 1) rest = m[2].trim().toUpperCase()     
        let pos = null
        let radius = 0
        let fromDeg = 0
        let toDeg = 0
        let patternAlti
        let iAlt = 0
        let strRef
        let patternAlt
        let altMeter
        switch (command) {
          case "*":
            // Comment - do nothing
            if (modeDebug) decodingReport += '[*] '+cmd+' -> comment'+lineBreak
            oaGeojson.properties.Comment += '[*] '+commentText+'<br>'
            break
          case "AC":
            // Airspace Class - expect a simple one letter argument
            if (modeDebug) decodingReport += '[AC] '+cmd+' -> '+rest+lineBreak
            oaGeojson.properties.Class = rest
            oaGeojson.properties.Cat = setCatColor(rest)
            break
  
          case "AT":
            // Airspace Type - expect a type like "TMA", "CTR" etc.
            if (modeDebug) decodingReport += '[AC] '+cmd+' -> '+rest+lineBreak
            // implement coloring for different airspace type
            break
  
          case "AN":
            // Airport name, expect string parameter    
            oaGeojson["properties"]["Name"] = rest
            if (modeDebug) {
                decodingReport +=  '[AN] '+cmd+' -> '+ rest+lineBreak
            } else {
                decodingReport +=  rest+lineBreak
            }
            break
  
          case "AL":
            // Altitude Low, expect a parameters like "3500 ft" or "SFC"
            patternAlti = /([\d]+)/g
            iAlt = parseInt('0'+findRegex(patternAlti,cmd))
            let patternRefL = /(\bMSL|\bFL|\bFT|\bSFC|\bUNLIM|\bAGL|\bGND)/g
            strRef = findRegex(patternRefL,cmd)
            if (strRef === "UNLIM") AltLimit_Bottom = 999999   
            AltLimit_Bottom_Ref = parseReference(strRef)  
            AltLimit_Bottom_Unit = parseUnit(strRef) 
            if (AltLimit_Bottom_Ref === 'AGL') {
              AltLimit_Bottom_AGL = true
              patternAlt = /([Mm])/g
              altMeter = findRegex(patternAlt, cmd)
              if (altMeter.includes('M') || altMeter.includes('m')) {
                  // unit altitude is meters. Not current but possible
                  AltLimit_Bottom = iAlt
              } else {
                  // unit altitude is feets.
                  AltLimit_Bottom = Math.round(iAlt * 0.3048)                
              }            
            } else {
              switch (AltLimit_Bottom_Unit) {
                case 'F' :
                    AltLimit_Bottom = Math.round(iAlt * 0.3048)                  
                    break
                case 'FL' :
                    AltLimit_Bottom = Math.round(iAlt *100 * 0.3048)                  
                    break
              }
            }    
            oaGeojson.properties.Floor = AltLimit_Bottom
            oaGeojson.properties.altLimitBottomAGL = AltLimit_Bottom_AGL
            oaGeojson.properties.altLimitBottomRef = AltLimit_Bottom_Ref
            oaGeojson.properties.altLimitBottomUnit = AltLimit_Bottom_Unit
            if (modeDebug) decodingReport +='[AL] '+cmd+' -> '+rest+" * "+iAlt+' * ref :'+strRef+' floor : '+AltLimit_Bottom+' AltlimitBottomAGL '+AltLimit_Bottom_AGL+lineBreak
            break
          case "AH":
            // Altitude High, expect a parameters like "35000ft" or "35000 ft"
            patternAlti = /([\d]+)/g
            iAlt = parseInt('0'+findRegex(patternAlti,cmd))
            let patternRefH = /(\bMSL|\bFL|\bFT|\bSFC|\bUNLIM|\bAGL)/g
            strRef = findRegex(patternRefH,cmd)
            if (strRef === "UNLIM") AltLimit_Top = 100000
            AltLimit_Top_Ref = parseReference(strRef)
            AltLimit_Top_Unit = parseUnit(strRef)
            if (AltLimit_Top_Ref === 'AGL') {
              AltLimit_Top_AGL = true
              patternAlt = /([Mm])/g
              altMeter = findRegex(patternAlt, cmd)
              if (altMeter.includes('M') || altMeter.includes('m')) {
                  // unit altitude is meters. Not current but possible
                  AltLimit_Top = iAlt
              } else {
                  // unit altitude is feets.
                  AltLimit_Top = Math.round(iAlt * 0.3048)
              }            
            } else {
              switch (AltLimit_Top_Unit) {
                case 'F' :
                    AltLimit_Top = Math.round(iAlt * 0.3048)
                    break
                case 'FL' :
                    AltLimit_Top = Math.round(iAlt *100 * 0.3048)
                    break
                }
            }
            oaGeojson.properties.Ceiling = AltLimit_Top
            oaGeojson.properties.altLimitTopAGL = AltLimit_Top_AGL
            oaGeojson.properties.altLimitTopRef = AltLimit_Top_Ref
            oaGeojson.properties.altLimitTopUnit = AltLimit_Top_Unit
            if (modeDebug) decodingReport += '[AH] '+cmd+' -> '+rest+" * "+iAlt+' * ref :'+strRef+' ceiling : '+AltLimit_Top+' AltlimitTopAGL '+AltLimit_Top_AGL+lineBreak
            break
          case "DC":
            if (modeDebug) decodingReport +='[DC] '+cmd+' -> '+rest+lineBreak
            // Draw Circle command - expect an decimal argument
            radius = Math.floor(parseFloat(rest) * 1852)
            pos = null
            if (mCenter != null) {
              for (let deg = 0; deg < 360; deg++) {
                pos = {
                  lat: 1,
                  lng: 1
                }
                pos = geometry.computeOffset(mCenter, radius, deg)
                // x est la longitude   y la la latitude (la librairie est conçue pour Google Map)
                if (pos.y > 52) {
                  decodingReport += '[BAD] '+cmd+'  lat :'+pos.y+lineBreak
                }
                addToGeojson(pos.x,pos.y)
              }
            }
            break
          case "V":
            // Variable Assignment Command
            // The pattern matches a variable name and the value argument from the rest of the line above
            if (modeDebug) decodingReport +='[V] '+cmd+lineBreak
            let assignPattern = /([\w]+)\s*=([\s\w\d\:\.\+\-]*)/g
            m = assignPattern.exec(rest)
            if (m != null) {
              if (m[1] == "D") {
                // Variable name D means this is a Direction assignment
                if (modeDebug) decodingReport +='     Direction command, sign: ' + m[2]+lineBreak
                if (m[2] == "+") {
                  mStep_direction = 1
                } else {
                  mStep_direction = -1
                }
  
              } else {
                // A position variable assignment, any variable name us supported although I have only seen X used
                if (modeDebug) decodingReport +='     Variable assignment: ' + m[1] +' identified, remaining arguments: ' + m[2]+lineBreak
                pos = parseCoordinateString(rest)
                if (pos != null) {
                  if (modeDebug) decodingReport +=`    Setting mCenter to: (${pos.lat}, ${pos.lng})\n`
                  mCenter = pos
                } else {
                  // If we cannot parse this as a position, we need to look into this later
                  if (modeDebug) decodingReport +="     Unsupported assignment..."+lineBreak
                }
              }
  
            } else {
              // We did not find anything useful in the arugument string after the name
              if (modeDebug) decodingReport +="     Variable argument parsing error"+lineBreak
            }
            break
          case "DA":
            // Draw Arc Command
            // Pattern matches three comma separated integer aruments
            if (modeDebug) decodingReport +='[DA] '+cmd+lineBreak
            let threeArgsPattern = /([\d]+)\s*\,\s*([\d]+)\s*\,\s*([\d]+)/g
            m = threeArgsPattern.exec(rest)
  
            if (m != null) {
              radius = parseInt(m[1]) * 1852
              fromDeg = parseInt(m[2])
              toDeg = parseInt(m[3])
              drawArcFromTo(radius, fromDeg, toDeg)
            } else {
              // We did not find the expected three integers in the argument string
              if (modeDebug) decodingReport +="     Draw arc parameters not recognized"+lineBreak
            }
            break
          case "DP":
            // Define Point Command
            // Pattern matches a potential coordinate string
            if (modeDebug) decodingReport +='[DP] '+cmd+lineBreak
            let coordPattern = /([\d\:\. \w]+)/g
            m = coordPattern.exec(rest)
            if (m != null) {
              pos = parseCoordinateString(m[1])      
              addToGeojson(pos.lng,pos.lat)
              if (modeDebug) decodingReport +=`     Got a coordinate: (${pos.lat}, ${pos.lng})\n`
              if (pos.lat > 52) {
                decodingReport += '     [BAD] '+cmd+'  lat :'+pos.lat+lineBreak
              }
            } else {
              if (modeDebug) decodingReport +="     Problem parsing DP argument"+lineBreak
            }
            break
  
          case "DB":
            // Draw Between Command
            if (modeDebug) decodingReport +='[DB] '+cmd+lineBreak
            // Pattern matches two possible coordinates separated by a comma
            let betweenPattern = /([\d\:\. \w]+) *, *([\d\:\. \w]+)/g
            m = betweenPattern.exec(rest)
  
            if (m != null) {
              let pos1 = parseCoordinateString(m[1])
              let pos2 = parseCoordinateString(m[2])
              if (modeDebug) decodingReport +=`     parseCommand: Got two coordinates :  (${pos1.lat.toFixed(4)}, ${pos1.lng.toFixed(4)}) and (${pos2.lat.toFixed(4)}, ${pos2.lng.toFixed(4)})\n`
              if (pos1 != null && pos2 != null) {
                fromDeg = (geometry.computeHeading(mCenter, pos1) + 360) % 360
                toDeg = (geometry.computeHeading(mCenter, pos2) + 360) % 360
                radius = geometry.computeDistanceBetween(mCenter, pos1)
                drawArcFromTo(radius, fromDeg, toDeg)
              }
            } else {
              if (modeDebug) decodingReport +="     Problem parsing draw between arguments"+lineBreak
            }
            break
  
          default:
            if (modeDebug) decodingReport +="     not recognized"+lineBreak
            break
        } // Switch ending here        
      } catch (error) {
        decodingReport += '!!!! Error catched with ' + m +lineBreak
      }
      
    } else {
      if (modeDebug) decodingReport +='!!!! Problems parsing command : '+cmd+lineBreak
    }
  }

/**
 * Parse coordinates in the String 'openAir format.
 *
 * Uses a Regular Expression to parse the components of a coordinate string, convert into double
 * and create a LatLng object that can be used in Google Maps.
 *
 * @param coordString for example "39:29.9 N 119:46.1W" or "39 : 29:9 N 119:46 :1W" for KRNO airport
 * @return LatLng object
 */
function parseCoordinateString(coord) {
    let lat = 0
    let lng = 0
    // for coordinates like 45:57:02 N 006:53:57 E
    let doubleRegexp = /([\d]+) *: *([\d]+) *[:] *([\d]+) *([NS]) *([\d]+) *: *([\d]+) *[:] *([\d]+) *([EW])/g
    let m = doubleRegexp.exec(coord)
    if (m != null && m.length == 9) {
      //  we will get 8 matches: "45", "57", "2", "N" and "6", "53", "57", "E" starting at index 1
      if (modeDebug) decodingReport +='     parseCoordinateString('+coord+') -> m1 :'+m[1]+'  m2 : '+m[2]+'  m3 : '+m[3]+' m5 :'+m[5]+'  m6 : '+m[6]+'  m7 : '+m[7]+lineBreak
      lat = parseFloat(m[1]) + parseFloat(m[2]) / 60. + parseFloat(m[3]) / 3600
      lng = parseFloat(m[5]) + parseFloat(m[6]) / 60. + parseFloat(m[7]) / 3600
      if (m[4].toUpperCase() == "S") lat *= -1
      if (m[8].toUpperCase() == "W") lng *= -1
    } else {
      // for coordinates like 44:27.9333 N 3:42.9333 E
      let simpleRegexp = /([\d]+) *: *([\d.]+) *([NS]) *([\d]+) *: *([\d.]+) *([EW])/g
      let n = simpleRegexp.exec(coord)
      if (n != null && n.length == 7) {
        //  we will get 6 matches: "44","9.83333","N","3","37.8833","E" starting at index 1  
        if (modeDebug) decodingReport +='     parseCoordinateString('+coord+') -> n1 :'+n[1]+'  n2 : '+n[2]+'  n4 : '+n[4]+' n5 :'+n[5]+lineBreak
        lat = parseFloat(n[1]) + parseFloat(n[2]) / 60.
        lng = parseFloat(n[4]) + parseFloat(n[5]) / 60.
        if (n[3].toUpperCase() == "S") lat *= -1
        if (n[6].toUpperCase() == "W") lng *= -1
      } else {
        if (modeDebug) decodingReport +='    parseCoordinateString('+cooord+'): Cannot parse coordinate \n'
      }
    }
    return {
      lat: lat,
      lng: lng
    }
    
}

/**
 * Utility function producing Arc coodinates with a given radius between to headings.
 *
 * Requires a center point to be in place - will ignore command if not defined.
 *
 * @param int radius
 * @param int fromDeg
 * @param int toDeg
 */
function drawArcFromTo(radius, fromDeg, toDeg) {
    if (mCenter != null) {
      let x = 0
      let y = 0
      let newPos = {}
      let degrees = fromDeg
      let step = mStep_direction * STEP_SIZE
      do {
        newPos = geometry.computeOffset(mCenter, radius, degrees)
        // x est la longitude   y la la latitude (la librairie est conçue pour Google Map)
        if (newPos.y > 52) {
          decodingReport += '[BAD] '+cmd+'  lat :'+newPos.y+lineBreak
        }
        addToGeojson(newPos.x,newPos.y)
        degrees += step
        if (Math.abs(((degrees + 360) % 360) - toDeg) < STEP_SIZE)
          break
      } while (true)
    }
}


/**
 * Utility function converting navigation headings to normal math angle notation.
 *
 * For example in Navigation 270 degrees is West, but in a coordinate system this is more like south.
 * Though i would need this, but will just leave it here anyway...
 *
 * @param compass navigational degrees
 * @return corodinate system degrees
 */
function compasToMathDegrees(compass) {
    return (((90 - compass) + 360) % 360)
  }  

function findRegex(pattern, input)
{
    let result = ''
    try {
      let matchRes = pattern.exec(input)
      if (matchRes.length > 1) {
        result = matchRes[1]
      }
    } catch (error) {
      if (modeDebug) decodingReport +='    Error in findRegex('+input+')\n'
    }
    return result    
}    

function parseReference(value)
{
    value = value.toUpperCase()
    if (value === 'MSL') return 'MSL'
    if (value === 'AGL') return 'AGL'
    if (value === 'FT') return 'MSL'
    if (value === 'FL') return 'STD'
    if (value === 'GND'|| value === 'SFC') return 'GND'

    return 'MSL'
}    

function parseUnit(value)
{
    value = value.toUpperCase()
    if (value === 'MSL') return 'F'
    if (value === 'AGL') return 'F'
    if (value === 'FT') return 'F'
    if (value === 'FL') return 'FL'
    if (value  === 'GND'|| value === 'SFC') return 'F'

    return 'F'
}  

function setCatColor(value) {
  let catColor = '1'
  switch (value) {
    case  'A' :
        catColor = '1'
        break
    case  'AWY' :                                    
        catColor = '2'                                    
        break
    case  'B' :                                    
        catColor = '3'                                    
        break
    case  'C' :                                    
        catColor = '4'                                    
        break
    case  'CTR' :                                    
        catColor = '5'                                    
        break
    case  'CTA' :                                    
        catColor = '6'                                    
        break
    case  'D' :                                    
        catColor = '7'                                    
        break
    case  'DANGER' :                                    
        catColor = '20'                                    
        break
    case  'Q' :                                    
        catColor = '8'                                    
        break
    case  'E' :                                    
        catColor = '9'                                    
        break
    case  'F' :                                    
        catColor = '10'                                    
        break
    case  'G' :                                    
        catColor = '11'                                    
        break
    case  'GP' :                                    
        catColor = '12'                                    
        break
    case  'GLIDING' :                                    
        catColor = '13'                                    
        break
    case  'GSEC' :                                    
        catColor = '14'                                    
        break
    case  'OTH' :                                    
        catColor = '14'                                    
        break
    case  'RESTRICTED' :                                    
        catColor = '15'                                    
        break
    case  'R' :                                    
        catColor = '15'                                    
        break
    case  'TMA' :                                    
        catColor = '6'                                    
        break
    case  'TMZ' :                                    
        catColor = '16'                                 
        break
    case  'TSA' :                                    
        catColor = '17'                                    
        break
    case  'WAVE' :                                    
        catColor = '18'                                 
        break
    case  'W' :                                    
        catColor = '19'                                 
        break
    case  'PROHIBITED' :                                    
        catColor = '20'                                 
        break
    case  'P' :                                    
        catColor = '20'                                    
        break
    case  'FIR' :                                   
        catColor = '21'                                    
        break
    case  'UIR' :                                    
        catColor = '21'                                 
        break
    case  'RMZ' :                                    
        catColor = '22'                                 
        break
    case  'Z' :                                    
        catColor = '23'                                    
        break
    case  'ZP' :                                    
        catColor = '23'                                   
        break
    case  'ZSM' :                                    
        catColor = '12'                                    
        break                                    
    case  'UKN' :
        catColor = '14'                                 
        break
  }  

  return catColor
}

function computeTotalBbox(oaGeojson) {
  let oaBbox = []
  try {
    oaBbox = turfbbox(oaGeojson)
    if (oaBbox[1] < minLat) minLat = oaBbox[1]
    if (oaBbox[0] < minLon) minLon = oaBbox[0]
    if (oaBbox[3] > maxLat) maxLat = oaBbox[3]
    if (oaBbox[2] > maxLon) maxLon = oaBbox[2]
  } catch (error) {
    console.log(error)
  }

  return oaBbox
}