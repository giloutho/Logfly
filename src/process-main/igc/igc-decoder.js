const IGCParser = require('igc-parser')   // https://github.com/Turbo87/igc-parser
const smooth = require('array-smooth')
const trigo = require('../../utils/geo/trigo.js')
const offset = require('../../utils/geo/offset-utc.js')

class IGCDecoder {

	constructor (igcString) {
		this.info = {				
      		'date' : '',
			'isodate' : '',
			'offsetUTC' : '',
			'numFlight' : '',
			'pilot' : '',
			'gliderType' : '',
			'registration' : '',
			'callsign' : '',
			'competitionClass' : '',
			'loggerId' : '',
			'loggerManufacturer' : '',
			'loggerType' : '',
			'security' : '',  
			'parsingError' : '',
			'interval' : 0  
		}
    	this.fixes = []; 			// all gps fixes
		this.vz = [];
		this.speed = [];
    	this.stat = {				 //  track statistics
			'distance' : 0,
			'maxalt' : {
				'gps' : -100000,
				'gpsindex' : 0,
				'baro' : -100000,
				'baroindex' : 0,		
			},
			'minialt' : {
				'gps' : 100000,
				'gpsindex' : 0,
				'baro' : 100000,
				'baroindex' : 0
			},
			'latMini' : 90,
			'latMaxi' : -90,
			'longMini' : 180,
			'longMaxi' : -180,					
			'maxaltitudegain' : 0,
			'maxclimb' : 0,
			'maxsink' : 0,
			'maxspeed' : 0,
			'duration' : 0,
			'left-thermaling-duration' : 0,   // inutilisé
			'right-thermaling-duration' : 0,   // inutilisé
		};    
		this.GeoJSON =  {
			'name': '',
			'type': 'FeatureCollection',
			'features': [{
				'type': 'Feature',
				'properties' : {
					'name':'',
					'time':'',
					'_gpxType':'trk',
					'coordTimes': []
				},
				'geometry': {
					'type': 'LineString',
					'coordinates': []
				},
			}]
		}
		this.params = [] 			// all points with complete data : spedd, vario etc...
    	this.igcData = igcString
		this.xcscore = null
  	}

  	// pour l'instant extracalculations et filter ne sont pas utilisés A VIRER et ménage c'est qd on songeait à fusionner avec igc-anayzer
  	// il y a des champs à enlever aussi que l'on remet dans IGCAnalyzer.
	parse(extracalculations = false, filter = false){
		// https://github.com/Turbo87/igc-parser/pull/20    Implement `lenient` parsing modet
		try {
			let result = IGCParser.parse(this.igcData, { lenient: true });
			try {
			// on passe de YYYY-MM-DD à DD/MM/YYYY
			this.info.date =  result.date.split("-").reverse().join("/")
			this.info.numFlight = result.numFlight
			this.info.pilot = result.pilot
			this.info.gliderType = result.gliderType
			this.info.registration = result.registration
			this.info.callsign = result.callsign
			this.info.competitionClass = result.competitionClass
			this.info.loggerId = result.loggerId
			this.info.loggerManufacturer = result.loggerManufacturer
			this.info.loggerType = result.loggerType
			this.info.security = result.security   
			this.fixes = result.fixes  
			if (this.fixes.length > 2) {
				// original code commented
				this.info.offsetUTC = offset.computeOffsetUTC(this.fixes[0].latitude, this.fixes[0].longitude, this.fixes[1].timestamp)
				// this.computeOffsetUTC()    
				// to temporarily solve the problem, we give a null default value to offsetUTC
				//this.info.offsetUTC = 0
				this.analyzeFixes()
			} else {
				this.info.parsingError = 'No points after decoding'
			}
			} catch (error) {
				this.info.parsingError = error
			}
		} catch (error) {
			console.log(error)
			//console.log()
		}
  	}

  analyzeFixes() {
    let nbanalyzed = 0
    let flTime = 0;
    let flDistance = 0
	const BadAlti = 9000
	const rawspeed = []
	const rawvario = []
	// Cf https://stackoverflow.com/questions/33708680/leaflet-add-features-to-a-json-object-and-put-the-result-on-the-map
	this.GeoJSON["name"] = this.info.pilot
	this.GeoJSON.features[0]["properties"]["name"] = this.info.pilot
	let datePoint = new Date(this.fixes[1].timestamp)
	datePoint.setSeconds(datePoint.getSeconds() + (this.info.offsetUTC * 60));
	// To simplify, the local date was initiated as a UTC date.
	this.info.isodate = datePoint.toISOString().split('.')[0]+'Z'
	this.GeoJSON.features[0]["properties"]["time"] = this.info.isodate
    for (let i=1; i<this.fixes.length; i++){
		const geopoint = []
		geopoint.push(this.fixes[i].longitude)
		geopoint.push(this.fixes[i].latitude) 
		geopoint.push(this.fixes[i].gpsAltitude)		
		this.GeoJSON.features[0].geometry.coordinates.push(geopoint);
		let dtPoint = new Date(this.fixes[i].timestamp)
		dtPoint.setSeconds(dtPoint.getSeconds() + (this.info.offsetUTC * 60));
		const isoDate = dtPoint.toISOString().split('.')[0]+'Z'
		this.GeoJSON.features[0]['properties']['coordTimes'].push(isoDate)
		let pointData = {}; 
      	let duration =  this.fixes[i].timestamp - this.fixes[i-1].timestamp  
		// arrêté au calcul de prevdelay qu'est ce qu'on fait si c'est inf à un
      	// Reversale GPS can record several points at the same second
      	if (duration > 999) {      // duration is in milliseconds
			let t = (this.fixes[i].timestamp - this.fixes[i-1].timestamp) / 1000
			pointData['prevtime'] = t
        	flTime += t				
        	let d = trigo.distance(this.fixes[i].latitude, this.fixes[i].longitude, this.fixes[i-1].latitude, this.fixes[i-1].longitude, "K") * 1000;        
			if (isNaN(d)) d = 0
			pointData['prevdistance'] = d
			flDistance += d	
			let speed = 0		
			let vario = 0
			if (t > 0) {
				speed = (d / t * 3.6)
				if (this.fixes[i].pressureAltitude > 0) {
					vario = (this.fixes[i].pressureAltitude - this.fixes[i-1].pressureAltitude)/t
					if (vario > 20 || vario < -55) {
						// bad Vz , we take GPS altitude
						vario = (this.fixes[i].gpsAltitude - this.fixes[i-1].gpsAltitude)/t
					}                                  
				} else {
					vario = (this.fixes[i].gpsAltitude - this.fixes[i-1].gpsAltitude)/t
				}
				if (vario > 20 || vario < -55) {
					if (i > 1) {
						vario = rawvario[i-1]
					} else {
						vario = 0
					}
				}
			}
			rawspeed.push(speed)
			rawvario.push(vario)
		}
		if (this.fixes[i].gpsAltitude > this.stat.maxalt.gps && this.fixes[i].gpsAltitude < BadAlti) {
			this.stat.maxalt.gps = this.fixes[i].gpsAltitude
		}
		if (this.fixes[i].gpsAltitude < this.stat.minialt.gps && this.fixes[i].gpsAltitude > 0) {
			this.stat.minialt.gps = this.fixes[i].gpsAltitude
		}			
		if (this.fixes[i].pressureAltitude > this.stat.maxalt.baro && this.fixes[i].pressureAltitude < BadAlti) {
			this.stat.maxalt.baro = this.fixes[i].pressureAltitude
		}
		if (this.fixes[i].pressureAltitude < this.stat.minialt.gps && this.fixes[i].pressureAltitude > 0) {
			this.stat.minialt.baro = this.fixes[i].pressureAltitude
		}	
		if (this.fixes[i].latitude > this.stat.latMaxi) this.stat.latMaxi = this.fixes[i].latitude;
		if (this.fixes[i].longitude > this.stat.longMaxi) this.stat.longMaxi = this.fixes[i].longitude;
		if (this.fixes[i].latitude < this.stat.latMini) this.stat.latMini = this.fixes[i].latitude;
		if (this.fixes[i].longitude < this.stat.longMini) this.stat.longMini = this.fixes[i].longitude;   		
		this.params.push(pointData)			
    }
	
    this.stat.duration = flTime // Flight time computed in seconds 
	this.stat.interval = Math.round(this.stat.duration/this.fixes.length)
		// console.log('flTime : '+flTime+' Calcul intervalle : '+this.stat.duration+' / '+this.fixes.length+'  interval : '+this.stat.interval)
		// console.log('Time 2 : '+this.GeoJSON.features[0]['properties']['coordTimes'][2]);
		// const arrayHour = this.GeoJSON.features[0]['properties']['coordTimes'].map(hour => hour);
		// console.log(arrayHour)

    this.stat.distance = flDistance / 1000    // convert to km
		try {
			// ponderation
			const smoothOffset = 10
			const smoothed = smooth(rawspeed, smoothOffset)			
			const varioSmoothOffset = 10
			const varioSmoothed = smooth(rawvario, varioSmoothOffset)	
			const sinkSmoothOffset = 10
			const sinkSmoothed = smooth(rawvario, sinkSmoothOffset)	
			let maxRawSpeed = 0
			let maxSmoothed = 0
			let maxRawVario = 0
			let maxVarioSmoothed = 0
			let minRawVario = 0
			let minVarioSmoothed = 0

			// Il y a plusieurs méthodes pour extraire le minimum et le maximum
			// mais selon plusieurs articles comme par exemple :
			// https://medium.com/coding-at-dawn/the-fastest-way-to-find-minimum-and-maximum-values-in-an-array-in-javascript-2511115f8621
			// la boucle reste la plus rapide quand il y a un grand nombre d'éléments à examiner
			for (let i=1; i<this.params.length; i++){
				if (rawspeed[i] > maxRawSpeed) maxRawSpeed = rawspeed[i]
				if (smoothed[i] > maxSmoothed) maxSmoothed = smoothed[i]
				if (rawvario[i] > maxRawVario) maxRawVario = rawvario[i]
				if (varioSmoothed[i] > maxVarioSmoothed) maxVarioSmoothed = varioSmoothed[i]		
				if (rawvario[i] < minRawVario) minRawVario = rawvario[i]
				if (sinkSmoothed[i] < minVarioSmoothed) minVarioSmoothed = sinkSmoothed[i]	
			}		
			this.speed = smoothed
			this.vz = varioSmoothed
			this.stat.maxclimb = maxVarioSmoothed.toFixed(2)
			this.stat.maxspeed = maxSmoothed.toFixed(2) 
			this.stat.maxsink = minVarioSmoothed.toFixed(2)  
		} catch (error) {
			console.log(error)
		}

  }

}

module.exports = IGCDecoder