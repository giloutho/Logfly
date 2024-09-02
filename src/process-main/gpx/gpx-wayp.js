const {ipcMain} = require('electron')
const gpxParser = require('gpxparser')   // https://github.com/Luuka/GPXParser.js

ipcMain.on('read-wayp-gpx', (event, gpxString) => {
    console.log('Parser lancé')
    const parser = new gpxParser()
    let arrGpx = []
    try {
        parser.parse(gpxString)
        let parsedWaypoints = parser.waypoints
        if (parsedWaypoints.length > 0) {
            let idxPoint = 0
            for (let index = 0; index < parsedWaypoints.length; index++) {
                let currWayp = {
                    name : parsedWaypoints[index].name,
                    alt : parsedWaypoints[index].ele,
                    desc : parsedWaypoints[index].desc,
                    lat : parsedWaypoints[index].lat,
                    long : parsedWaypoints[index].lon,
                    index : idxPoint
                }
                arrGpx.push(currWayp)                          
            }            
        }
        console.log('retour arrGpx : '+arrGpx.length)
        event.returnValue = arrGpx
    } catch (error) {
        event.returnValue = 'The GPX file cannot be decoded'
    }
})