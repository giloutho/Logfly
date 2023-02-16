const gpxParser = require('gpxparser')   // https://github.com/Luuka/GPXParser.js

function encodeIGC(gpxString, logbook) {
    let stringIGC = ''
    let result = {
        igcString : stringIGC,
        nbPoints : 0,
        nbTracks : 0
    }
    const CrLf = '\r\n'
    // A remanier dans Logfly
    let sPilot = ''
    let sGlider = ''
    if (logbook) {
        // sPilote and sGlider will be redefined by settings
    } 
    const parser = new gpxParser()
    parser.parse(gpxString)
    let nbPt = 0
    let parsedTracks = parser.tracks
    if (parsedTracks.length > 0) {
        const firstTrack = parsedTracks[0]
        const startTime = firstTrack.points[0].time
        const startDate = String(startTime.getDate()).padStart(2, '0')+String((startTime.getMonth()+1)).padStart(2, '0')+startTime.getFullYear()

        stringIGC += 'AXLF'+CrLf
        stringIGC += 'HFDTE'+startDate+CrLf          
        // for external tracks we have not pilot and glider name
        stringIGC += 'HFPLTPILOT:'+sPilot+CrLf        
        stringIGC += 'HFGTYGLIDERTYPE:'+sGlider+CrLf 
        stringIGC += 'HFGIDGLIDERID:'+CrLf 
        stringIGC += 'HODTM100GPSDATUM: WGS-84'+CrLf 
        stringIGC += 'HOCIDCOMPETITIONID:'+CrLf         
        stringIGC += 'HOCCLCOMPETITION CLASS:'+CrLf 
        stringIGC += 'HOSITSite:'+CrLf 
        firstTrack.points.forEach(function(pt){
            nbPt++
            // let strDate = String(pt.time.getDate()).padStart(2, '0')+'/'+String((pt.time.getMonth()+1)).padStart(2, '0')+'/'+pt.time.getFullYear()
            //let strTime = String(pt.time.getHours()).padStart(2, '0')+String(pt.time.getMinutes()).padStart(2, '0')+String(pt.time.getSeconds()).padStart(2, '0')        
            let igcLat = Lat_Dd_IGC(pt.lat)
            let igcLong = Long_Dd_IGC(pt.lon)
            let utcTime = fixUTC(pt.time)
            let bRecord = 'B'+utcTime+igcLat+igcLong+'A00000'+pt.ele.toString().padStart(5, '0')
            stringIGC += bRecord+CrLf
        })

        if(parsedTracks.length > 1) {
            // iteration sur les tracks supplémentaires
        } else {
            console.log('Une seule trace')
        }

        // footer
        stringIGC += 'LXLF Logfly 6'+CrLf 
        const genDate = new Date();  
        // utiliser moment
        let strDate = String(genDate.getDate()).padStart(2, '0')+'-'+String((genDate.getMonth()+1)).padStart(2, '0')+'-'+genDate.getFullYear()
        let strTime = String(genDate.getHours()).padStart(2, '0')+':'+String(genDate.getMinutes()).padStart(2, '0')+':'+String(genDate.getSeconds()).padStart(2, '0')     
        stringIGC += 'LXLF generated '+strDate+' '+strTime+CrLf      
    }
    result.igcString = stringIGC
    result.nbPoints = nbPt
    result.nbTracks = parsedTracks.length
    
    return result
}

function fixUTC(gpxTime) {
    const isoLocalStart = new Date(gpxTime).toISOString()
    const dateLocal = new Date(isoLocalStart.slice(0, -1))
    let utcTime = String(dateLocal .getHours()).padStart(2, '0')+String(dateLocal .getMinutes()).padStart(2, '0')+String(dateLocal .getSeconds()).padStart(2, '0')
    return utcTime  
}

function Lat_Dd_IGC(dLat)  {    
    let igcLat          
    try {
        const AbsLat = Math.abs(dLat);
        // Getting the integer portion
        const fDeg = Math.floor(AbsLat)
        const fMin = (AbsLat - fDeg)*60
        // format with 3 decimals
        const dMin = (Math.round(fMin * 1000) / 1000).toFixed(3)
        const sMin = dMin.toString()
        igcLat = fDeg.toString().padStart(2, '0')+sMin.split(".")[0]+sMin.split(".")[1]
        if (dLat < 0)
            igcLat += 'S'
        else
        igcLat += 'N'
       // console.log(dLat+' '+AbsLat+' '+fDeg+' '+fMin+' '+dMin+' '+sMin)
    } catch (error) {
        igcLat = ''
    }        

    return igcLat
}

function Long_Dd_IGC(dLong)  {
    let igcLong
    try {
        const AbsLong = Math.abs(dLong);
        // En faisant un cast integer on ne garde que la partie entière
        const fDeg = Math.floor(AbsLong)
        const fMin = (AbsLong - fDeg)*60
        // format with 3 decimals
        const dMin = (Math.round(fMin * 1000) / 1000).toFixed(3)
        const sMin = dMin.toString()
        igcLong = fDeg.toString().padStart(3, '0')+sMin.split(".")[0]+sMin.split(".")[1]
        if (dLong < 0) 
            igcLong += 'W'
        else
            igcLong += 'E'         
    } catch (error) {
        igcLong = ''
    }                

    return igcLong
}

module.exports.encodeIGC = encodeIGC
