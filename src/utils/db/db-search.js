const Store = require('electron-store');
const store = new Store();
const trigo = require('../geo/trigo.js')
const db = require('better-sqlite3')(store.get('dbFullPath'))

function flightByTakeOff(flLat, flLng, dayDate) {

  let maxDist = 300
  let maxDelay = 120
  let flFound = false
//  const db = require('better-sqlite3')(store.get('dbFullPath'))
  if (db.open) {
    // Convert timestamp to milliseconds
    let date = new Date(dayDate);
    let strDate =  date.getFullYear()+'-'+('0' + (date.getMonth()+1)).slice(-2) + '-'+('0' + date.getDate()).slice(-2)
    let debugDate = ('0'+date.getHours()).substr(-2)+':'+('0'+date.getMinutes()).substr(-2)+':'+('0'+date.getSeconds()).substr(-2)
    let dateStart = strDate+' 00:00:00'
    let dateEnd = strDate+' 23:59:59'
    // Javascript unixtimestamp is in milliseconds, conversion needed
    dayDate = dayDate /+ 1000
    // Are there any flights on that day ?
    // With strftime('%s', V_Date)  result is directly a timestamp in seconds
    const flightsOfDay = db.prepare(`SELECT strftime('%s', V_Date) AS tsDate,V_Duree,V_LatDeco,V_LongDeco FROM Vol WHERE V_Date >= '${dateStart}' and V_Date <= '${dateEnd}'`)
    for (const fl of flightsOfDay.iterate()) {
      let logLat = fl.V_LatDeco
      let logLng = fl.V_LongDeco
      let logDate = fl.tsDate
    //  console.log('logLat : '+logLat+' logLng : '+logLng+' flLat : '+flLat+' flLng : '+flLng)
      let distLogToFl = Math.abs(trigo.distance(logLat, logLng, flLat, flLng, "K") * 1000)     
      // We start by examining whether take-offs are confined to a 500m radius
      if (distLogToFl < maxDist) {
        // Compute difference between the respective take-off times
        let diffSeconds = Math.abs(logDate - dayDate);       
       // console.log(debugDate+' dist : '+distLogToFl+'logDate : '+logDate+' dayDate : '+dayDate+' diff : '+diffSeconds)   
        if (diffSeconds < maxDelay) {
          flFound = true;
          break;  // exit possible https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/api.md#iteratebindparameters---iterator
        }
      }
    }
  }
  
  return flFound

}

/**
 * From xLogfly V4 and new offset computation, it's not possible to compare takeoff hours
 * on GPS flight list, it's UTC time for Flymaster and local time in Flytec. Flights are stored in db in local time
 * Seach is now based on minutes of take off and flight duration... a bit far-fetched !
 * @param {*} takeoffDate 
 * @param {*} takeoffTime 
 * @param {*} takeoffDuration 
 */
function checkFlightList(flightList) {
  let regexMinSec = /:([0-5][0-9]):([0-5][0-9])/
 // const db = require('better-sqlite3')(store.get('dbFullPath'))
  if (db.open) {
    flightList.flights.forEach(flight => {
      let arrDate = flight['date'].split('.')
      if (arrDate.length === 3) {
        let strDate =  '20'+arrDate[2]+'-'+arrDate[1]+'-'+arrDate[0]
        arrTakeoff = flight['takeoff'].split(':')
        if (arrTakeoff.length === 3) {
          let takeoffMinSeconds = (parseInt(arrTakeoff[1])*60)+parseInt(arrTakeoff[2])
          arrDuration = flight['duration'].split(':')
          if (arrDuration.length > 2) {
            // this was gpsTotalSec in Rech_Vol_by_Duree of dbSearch.java 
            gpsDurationSeconds = (parseInt(arrDuration[0])*3600)+(parseInt(arrDuration[1])*60)+parseInt(arrDuration[2])
            let dateStart = strDate+' 00:00:00'
            let dateEnd = strDate+' 23:59:59'
            const flightsOfDay = db.prepare(`SELECT V_Date,V_Duree FROM Vol WHERE V_Date >= '${dateStart}' and V_Date <= '${dateEnd}'`)
            for (const fl of flightsOfDay.iterate()) {
              let diffSecOK 
              if (fl.V_Date.match(regexMinSec)) {
                let dbMinSec = regexMinSec.exec(fl.V_Date)
                // Minutes and seconds of takeoff time are converted to seconds
                let dbMinSeconds = (parseInt(dbMinSec[1])*60)+parseInt(dbMinSec[2])
                let diffSeconds = dbMinSeconds - takeoffMinSeconds;                
                // We can't compare LocalDateTime : in db this is local time, in GPS, this is depending of user settings -> unreliable 
                // We compute only with minute and seconds components. If hour change -> we compare 01:59 to 02:01
                // In Flytec 6015 and 6030, GPS start time displayed and track start point are not the same values. (few minutes)
                // We consider an offset of 5 mn (300 s)
                if (diffSeconds > 300) {
                  diffSeconds = 3600 - diffSeconds;
                  if (diffSeconds < 360)
                      diffSecOK = true;
                  else
                      diffSecOK = false;
                } else {
                    diffSecOK = true;
                }
                let dbDuration = parseInt(fl.V_Duree)
                let totalSec = gpsDurationSeconds - diffSeconds
                if (Math.abs(totalSec - dbDuration) < 180 && diffSecOK) {
                  flight['new'] = false
                  // iteration is stopped
                  break;
                }                
              }              
            }
            // database checking is complete                   
          }          
        }
      }             
    });
  } else {
    flightList.error = true
    flightList.otherlines.push('unable to open '+store.get('dbFullPath'))
  } 
  return flightList 
}

 /**
 * This method is called rechSiteCorrect in Logfly5
 * this name came from xLogfly where there was several rechSite methods
 * this is the name of the last one... the good one
 * pAlt (altitude) is not required for searching operation but it is necessary
 * to create a new site with addBlankSite method
 * @param pLat
 * @param pLong
 * @param exAtterro   if true, sites with "A" like landing (Atterrissage in french)are excluded of searching operation   
 * @return 
 */

 function searchSiteInDb(pLat, pLong, landingType) {
 //   const db = require('better-sqlite3')(store.get('dbFullPath'))

    // in Logfly 5, distance mini is stored in settings but we never changed the value of 300 m
    let distMini = 300;            
    /*
    * NOTE : under our latitudes, second decimal give a search perimeter of 1,11km. 
    * third decimal, perimeter is 222 meters ...      
    */
    const arrLat = Math.ceil(pLat*1000)/1000;
    const arrLong = Math.ceil(pLong*1000)/1000;
    const sLatMin = (arrLat - 0.01).toFixed(4).toString();
    const sLatMax = (arrLat + 0.01).toFixed(4).toString();
    const sLongMin = (arrLong - 0.01).toFixed(4).toString();
    const sLongMax = (arrLong + 0.01).toFixed(4).toString();
    // In old versions, search is limited to launching sites, but this information can be absent
    // Only landing sites are excluded
    let selectedSite = '';
    let surroundingSites;
    if (landingType == true) 
      surroundingSites = db.prepare(`SELECT S_ID,S_Nom,S_Latitude,S_Longitude,S_Alti,S_Localite,S_Pays FROM Site WHERE S_Latitude >'${sLatMin}' AND S_Latitude < '${sLatMax}' AND S_Longitude > '${sLongMin}' AND S_Longitude < '${sLongMax}' `)
    else {
      //console.log(`SELECT S_ID,S_Nom,S_Latitude,S_Longitude,S_Alti,S_Localite,S_Pays FROM Site WHERE S_Latitude >'${sLatMin}' AND S_Latitude < '${sLatMax}' AND S_Longitude > '${sLongMin}' AND S_Longitude < '${sLongMax}' AND S_Type <> 'A' `)
      surroundingSites = db.prepare(`SELECT S_ID,S_Nom,S_Latitude,S_Longitude,S_Alti,S_Localite,S_Pays FROM Site WHERE S_Latitude >'${sLatMin}' AND S_Latitude < '${sLatMax}' AND S_Longitude > '${sLongMin}' AND S_Longitude < '${sLongMax}' AND S_Type <> 'A' `)
    }
    for (const site of surroundingSites.iterate()) {
      let carnetLat = site.S_Latitude;
      let carnetLong = site.S_Longitude;
      let distSite = Math.abs(trigo.distance(pLat,pLong,carnetLat,carnetLong, "K") * 1000)   
      if (distSite < distMini)  {
        distMini = distSite;
        selectedSite = site.S_Nom+'*'+site.S_Pays;  // since V3, we add the country
      }    
    }

    return selectedSite;
}

module.exports.flightByTakeOff = flightByTakeOff
module.exports.checkFlightList = checkFlightList
module.exports.searchSiteInDb = searchSiteInDb