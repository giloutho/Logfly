/* Unused code
* this module in the main process and called synchronously triggers an error 
* We use nav-scoring in src/utils
*/
const {ipcMain} = require('electron')
const { scoringRules, solver } = require('igc-xc-score')
const miniIgcPoints = 5

ipcMain.handle('ask-nav-score', async (event,argsScoring) => {
    const res = await scoring(event,argsScoring)
    const finalScore = res.scoreInfo
    const scoreObj = {
        flighttype : res.opt.scoring.code,
        flightcoeff : res.opt.scoring.multiplier,
        flightname : res.opt.scoring.name,
        scoreinfo : res.scoreInfo
    }
    
    //console.log(`score is ${res.score} name is ${res.opt.scoring.name}`)
    return scoreObj
})

async function scoring(event,argsScoring) {
    const route = argsScoring.route
    const speed = argsScoring.speed
    const rule = scoringRules[argsScoring.league]
    if (route.length == 0) {
        throw new Error('Empty track');
      }
      let firstStamp = Date.now()
      const todayDate = new Date(Date.now()).toISOString().split('T')[0];
      console.log(`Today's date: ${todayDate}`);
      let firstTime = new Date(firstStamp).toISOString().split('T')[1].split('Z')[0];
      firstTime = firstTime.split('.')[0]; // Supprime les millisecondes
      console.log(`First timestamp: ${firstStamp} dateIso ${firstTime}`);
      let fixes = []
      // first point
      fixes.push(new fixpoint(firstStamp, firstTime, Number(route[0].lat).toFixed(6), Number(route[0].lng).toFixed(6)))
      for (let index = 1; index < route.length; index++) {
          const point1 = route[index - 1];
          const point2 = route[index];
          const dist = distance(Number(point1.lat), Number(point1.lng), Number(point2.lat), Number(point2.lng), 'K')
          const timeToTravel = timeInterPoints(dist, speed);
          console.log('ineterpoints ok '+timeToTravel)
          const timePoint = new Date(firstStamp + timeToTravel)
          console.log(`timePoint ${timePoint}`)
          const timePointIso = timePoint.toISOString().split('T')[1].split('Z')[0];
          console.log(`timePointIso ${timePointIso}`)
          const timePointIsoWithoutMs = timePointIso.split('.')[0]; // Supprime les millisecondes
          console.log(`Distance from ${index-1} to ${index}: ${dist.toFixed(2)} km - Time to travel: ${timeToTravel} ms - Time point: ${timePointIsoWithoutMs}`);
          firstStamp += timeToTravel; // Update the timestamp for the next point
          firstStamp = Math.round(firstStamp); // Round to avoid floating point issues
          fixes.push(new fixpoint(firstStamp, timePointIsoWithoutMs, Number(point2.lat).toFixed(4), Number(point2.lng).toFixed(4)))
      }
      if (fixes.length < miniIgcPoints) {
          while (fixes.length < miniIgcPoints) {
              const lastPoint = fixes[fixes.length - 1];
              fixes.push({ 
                  ...lastPoint, 
                  timestamp : lastPoint.timestamp + 60, 
                  latitude: (Number(lastPoint.latitude) + 0.000001).toFixed(6),                  
              }); 
            }
      }
      const flight = {
          date: todayDate,
          fixes: fixes
        }
    const xcscore = solver(flight, rule).next().value;

    return xcscore
}

// Calculate the time to travel between two points      
function timeInterPoints(dist, speed){
    const timeInHours = dist / speed;
    const timeInMinutes = timeInHours * 60;
    const timeInMilliseconds = timeInMinutes * 60000; // Conversion en millisecondes
    return timeInMilliseconds
}

function fixpoint( pTimestamp, pTime, pLatitude,pLongitude){
    this.timestamp = pTimestamp
    this.time = pTime
    this.latitude = pLatitude
    this.longitude = pLongitude
    this.valid = true
    this.pressureAltitude = null
    this.gpsAltitude = 500    // valeur arbitraire
    this.extensions = {}
    this.fixAccuracy = null
    this.enl = null
    }

function distance(lat1, lon1, lat2, lon2, unit) {
    let theta = lon1 - lon2;
    let dist = Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) +  Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(theta));
    dist = Math.acos(dist);
    dist = rad2deg(dist);
    let miles = dist * 60 * 1.1515;
    unit = unit.toUpperCase();
    if (unit === "K") {
        return (miles * 1.609344);
    } else if (unit === "N") {
        return (miles * 0.8684);
    } else {
        return miles;
    }
}

function rad2deg (angle) {
    return angle * 57.29577951308232 // angle / Math.PI * 180
}

function deg2rad (angle) {
    return angle * 0.017453292519943295 // (angle / 180) * Math.PI;
}  