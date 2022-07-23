const IGCDecoder = require('../../utils/igc-decoder.js')
const i18n = require('../../lang/gettext.js')()


function buildElements(track) {

    const dateTkoff = new Date(track.fixes[0].timestamp)
    const dTkOff = String(dateTkoff.getDay()).padStart(2, '0')+'/'+String(dateTkoff.getMonth()).padStart(2, '0')+'/'+dateTkoff.getFullYear()      
    const hTkoff = String(dateTkoff.getHours()).padStart(2, '0')+':'+String(dateTkoff.getMinutes()).padStart(2, '0')
    let trackOptions = {
        color: 'red',
        weight: 2,
        opacity: 0.85
    }
    let mapElements = {
        ready : true,
        trackjson : track.GeoJSON,
        trackOptions : {
            color: 'red',
            weight: 2,
            opacity: 0.85
        },
        startIcon : {
            iconUrl: '../../leaflet/images/windsock22.png',
            shadowUrl: '../../leaflet/images/marker-shadow.png',
            iconSize: [18, 18],
            iconAnchor: [0, 18],
            popupAnchor: [1, -34],
            shadowSize: [25, 25]
        },
        endIcon : {
            iconUrl: '../../leaflet/images/Arrivee22.png',
            shadowUrl: '../../leaflet/images/marker-shadow.png',
            iconSize: [18, 18],
            iconAnchor: [4, 18],
            popupAnchor: [1, -34],
            shadowSize: [25, 25]
        },    
        startLatlng : { 
            lat : track.fixes[0].latitude, 
            long : track.fixes[0].longitude 
        },
        endLatlng : {
            lat : track.fixes[track.fixes.length - 1].latitude, 
            long : track.fixes[track.fixes.length - 1].longitude
        },
        flDate : dTkOff,
        flToffTime : hTkoff,
        glider : i18n.gettext('Glider')+' : '+track.info.gliderType+'<br>',
        maxAlti : i18n.gettext('Max GPS Alt')+' : '+track.stat.maxalt.gps+'m<br>',
        maxVario : i18n.gettext('Max climb')+' : '+track.stat.maxclimb+'m/s<br>'
      }   

      return mapElements
}

function buildMapElements(strIgc) {    
	const track = new IGCDecoder(strIgc)
	track.parse(true, true)     
    if (track.fixes.length> 0) {
        return buildElements(track)  
      } else {
        let mapElements = {ready : false}
        return mapElements
      }        
}

module.exports.buildMapElements = buildMapElements