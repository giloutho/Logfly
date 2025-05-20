/*  Unused code
*   Unlike nav*scoring, using this module crashes the generation of the HightCharts graph in fullmaplog. 
*   More precisely, it is the call to igc-xc-score that causes the crash
*   We finalyy keep the module in process-main : igc-map-score
*/
const { scoringRules, solver } = require('igc-xc-score')
const IGCParser = require('igc-parser')
const moment = require('moment')
const log = require('electron-log')

async function mapscoring(argsScoring) {
   // console.log(JSON.stringify(argsScoring))
    const res = await scoring(argsScoring)
    return res
}

async function scoring(argsScoring) {
    const igcData = argsScoring.igcString
    const rule = scoringRules[argsScoring.league]
    const league = argsScoring.league
    let newGeoJSON = {}
    try {
        const flight = IGCParser.parse(igcData, { lenient: true });        
        const result = solver(flight, rule,{ noflight : true }).next().value;
        if (result.optimal) {
            const geojson = result.geojson()
            const data = JSON.parse(JSON.stringify(geojson))
            const arrData   = Object.values(data)
            if (arrData.length == 3) {        
                newGeoJSON.type = "FeatureCollection"
                newGeoJSON.name = "EPSG:3857"
                newGeoJSON.league = league
                newGeoJSON.score = arrData[1].score
                newGeoJSON.bound = arrData[1].bound
                newGeoJSON.course = result.opt.scoring.name   // Triangle FAI ou Distance libre etc...
                console.log(result.opt.scoring.name)
                newGeoJSON.code = arrData[1].code
                newGeoJSON.distance = result.scoreInfo.distance
                newGeoJSON.multiplier = result.opt.scoring.multiplier
                newGeoJSON.legs = result.scoreInfo.legs
                // All that's left to do is go through all the legs
                newGeoJSON.features = []
                for (let i = 0; i < arrData[2].length; i++) {
                    const element = arrData[2][i]
                    const elemType = element.geometry.type
                    const elemId = element.properties.id
                    let elemSelected = true
                    if (elemId.includes('launch')) elemSelected = false
                    if (elemId.includes('land')) elemSelected = false
                    let feature = {}
                    let properties = {}
                    let geometry = {}
                    let coord = []
                    switch (elemType) {
                        case "Point":
                            if (elemSelected) {
                                properties.id = element.properties.id 
                                properties.r = element.properties.r
                                properties.timestamp = element.properties.timestamp
                                const hElement = moment(element.properties.timestamp).format("HH:mm:ss")
                                properties.popupContent = String(element.properties.id).toUpperCase()+'</br>'+hElement
                                geometry.type = element.geometry.type
                                geometry.coordinates = [element.geometry.coordinates[0],element.geometry.coordinates[1]]
                                feature.type = "Feature"
                                feature.id = element.id
                                feature.properties = properties
                                feature.geometry = geometry
                                newGeoJSON.features.push(feature)
                            }
                            break;
                        case "LineString":
                            properties.id = element.properties.id 
                            properties.d = element.properties.d
                            const dist =  (Math.round(element.properties.d * 100) / 100).toFixed(2);
                            properties.popupContent = dist+' km'
                            geometry.type = element.geometry.type
                            coord.push(element.geometry.coordinates[0])
                            coord.push(element.geometry.coordinates[1])
                            geometry.coordinates = coord                 
                            feature.type = "Feature"
                            feature.id = element.id
                            feature.properties = properties
                            feature.geometry = geometry
                            newGeoJSON.features.push(feature)                
                        break;
                    }
                }
            } 
        }            
    } catch (error) {
        log.info('[map-scoring.js] Error while scoring the IGC file')
    }       
    return newGeoJSON
}

module.exports.mapscoring = mapscoring