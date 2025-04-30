const {ipcMain} = require('electron')
const gpxParser = require('gpxparser')   // https://github.com/Luuka/GPXParser.js

ipcMain.on('gpx-parsing', (event, gpxString) => {
    const parser = new gpxParser()
    let totalResult = {}
    let waypGpx = []
    let rteptGpx = []
    try {
        parser.parse(gpxString)
        let parsedWaypoints = parser.waypoints
        if (parsedWaypoints.length > 0) {
            for (let index = 0; index < parsedWaypoints.length; index++) {
                let currWayp = {
                    name : parsedWaypoints[index].name,
                    alt : parsedWaypoints[index].ele,
                    desc : parsedWaypoints[index].desc,
                    lat : parsedWaypoints[index].lat,
                    long : parsedWaypoints[index].lon,
                    index : index
                }
                waypGpx.push(currWayp)                          
            }            
        }
        totalResult.wayp = waypGpx
        let parsedRoutes = parser.routes
        if (parsedRoutes.length > 0) {
            let route = parsedRoutes[0]
            for (let i = 0; i < route.points.length; i++) {
                const element = route.points[i]
                // only this parameters are decoded :
                // { lat: 45, lon: 2.20023, ele: null, time: null },
                let currRtept = {
                    alt : element.ele,
                    time : element.time,
                    lat : element.lat,
                    long : element.lon,
                    index : i               
                }
                rteptGpx.push(currRtept)
            }
        }
        totalResult.rte = rteptGpx
        event.returnValue = totalResult
    } catch (error) {
        event.returnValue = 'The GPX file cannot be decoded'
    }
})