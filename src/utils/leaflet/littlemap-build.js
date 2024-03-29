const IGCDecoder = require('../../process-main/igc/igc-decoder.js')
const i18n = require('../../lang/gettext.js')()
const Store = require('electron-store')
const store = new Store()
try {    
    let currLang = store.get('lang')
    if (currLang != undefined && currLang != 'en') {
        currLangFile = currLang+'.json'
        let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
        let langjson = JSON.parse(content);
        i18n.setMessages('messages', currLang, langjson)
        i18n.setLocale(currLang);
    }
  } catch (error) {
    log.error('[littlemap-build.js] Error while loading the language file')
  }


function buildElements(track) {
    const dateTkoff = new Date(track.fixes[0].timestamp)
    // getMonth returns integer from 0(January) to 11(December)
    const dTkOff = String(dateTkoff.getDate()).padStart(2, '0')+'/'+String((dateTkoff.getMonth()+1)).padStart(2, '0')+'/'+dateTkoff.getFullYear()   
    const hTkoff = String(dateTkoff.getHours()).padStart(2, '0')+':'+String(dateTkoff.getMinutes()).padStart(2, '0')
    let totalSeconds = track.stat.duration
    let hours = Math.floor(totalSeconds / 3600)
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    const sDuration = String(hours).padStart(2, "0")+':'+String(minutes).padStart(2, "0")
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
        startLatlng : { // (Math.round(track.fixes[0].latitude * 10000) / 10000).toFixed(4).toString()+','+(Math.round(track.fixes[0].longitude * 10000) / 10000).toFixed(4).toString(),
            lat : (Math.round(track.fixes[0].latitude * 10000) / 10000).toFixed(4),
            long : (Math.round(track.fixes[0].longitude * 10000) / 10000).toFixed(4)
            },
        endLatlng : { //(Math.round(track.fixes[track.fixes.length - 1].latitude * 10000) / 10000).toFixed(4).toString()+','+(Math.round(track.fixes[track.fixes.length - 1].longitude * 10000) / 10000).toFixed(4).toString(),
            lat : (Math.round(track.fixes[track.fixes.length - 1].latitude * 10000) / 10000).toFixed(4),
            long : (Math.round(track.fixes[track.fixes.length - 1].longitude * 10000) / 10000).toFixed(4)
        },        
        flDate : track.info.date,
        flToffTime : hTkoff,
        flDuration : sDuration,
        pilot : track.info.pilot,
        lbGlider : i18n.gettext('Glider')+' : '+track.info.gliderType,   // without <br>
        infoGlider : i18n.gettext('Glider')+' : '+track.info.gliderType+'<br>',
        maxAlti : i18n.gettext('Max GPS alt')+' : '+track.stat.maxalt.gps+'m<br>',
        maxVario : i18n.gettext('Max climb')+' : '+track.stat.maxclimb+'m/s<br>',
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

module.exports.buildElements = buildElements
module.exports.buildMapElements = buildMapElements