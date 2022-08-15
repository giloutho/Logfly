const { truncate } = require("original-fs");

/**
 * It's a pure adaptation of analyze class in igc2Kmz/track.py, an effective code of Tom Payne
 * This is probably not a very good translation :
 *  because of our poor knowledge of the python language
 *  Initially adapted from python to java and later java to javascript
 * 
 *  We kept the names of the variables and followed step by step original code
 * 
 * testing in igc2Kmz/bin with : python igc2kmz.py -i xxxx.igc -o xxxx.kmz
 * testing in igc2Kmz/bin with : python igc2kmz.py -i 858umbh1.igc -o 858umbh1.kmz
 */
 class IGCAnalyzer {

    constructor () {
        this.elevation = [];
        this.thermals = [];
        this.dives = [];
        this.glides = [];
        this.course = [];
        this.geoThermals = {};
        this.geoGlides = {};
        this.maxaltitudegain = 0;   
        this.bestGain = 0;
        this.bestGainEnd;
        this.bestGlide = 0.0;
        this.bestGlideEnd;
        this.progressValue = 0.7;   
        this.avgThermalClimb = 0;        
        this.avgThermalEffi = 0;  
        this.avgTransSpeed = 0
        this.extractTime = 0
        this.percThermals = 0;
        this.percGlides = 0;
        this.percDives = 0;
    }

    compute(fixes) { 

        let R = 6371000.0;
        const cardinals = ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"];
        let UNKNOWN = 0;
        let THERMAL = 1;
        let GLIDE = 2;
        let DIVE = 3;
        let _bestGain = 0;
        let _bestGainEnd;
        let _avgThermalClimb = 0;
        let _avgThermalEffi = 0;
        let _avgTransSpeed = 0
        let _extractTime = 0
        let _percThermals = 0;
        let _percGlides = 0;
        let _percDives = 0;
        let _bestGlide = 0.0;
        let _bestGlideEnd;
        let progressValue = 0.7;   
        let coords = [];   
        let t = [];  
        let climb = [];
        let ele = [];   
        let finalThermals = []; 
        let finalDives = [];
        let finalGlides = [];
        let progList = [];
        let geoTh = {};
        geoTh['type'] = 'FeatureCollection';
        geoTh['features'] = [];     
        let geoGlides = {};   
        geoGlides['type'] = 'FeatureCollection';
        geoGlides['features'] = [];
 
        for (let f of fixes) {
            t.push(f.timestamp/1000)
            let rad_lat = Math.PI * f.latitude / 180.0;
            let rad_lon = Math.PI * f.longitude / 180.0;
            let ele = f.gpsAltitude;
            let _coord = new radCoord(rad_lat, rad_lon, ele,f.timestamp);
            coords.push(_coord)
        }
    
        var dt = 20;   // dt est le péridoe d'exploration fixé à 20 secondes par défaut  (ligne 39)
        let n = coords.length;  
        // in java code, period is casted to integer. In javascript, it seems that Math.floor or Math.trunc are used 
        let period = Math.floor(((fixes[n-1].timestamp-fixes[0].timestamp)/1000)/ n);  
        if (dt < 2 * period) dt = Math.floor(2 * period);  
        var s = [];
        s.push(0.0);       
        for (let i = 1; i < n; i++) {
            s.push(s[i-1]+distanceTo(coords[i-1], coords[i]));        
        }                    
        for (let i = 1; i < n; i++) {        
            ele.push((coords[i-1].ele + coords[i].ele) / 2.0);        
        }      
        let total_dz_positive = 0;
        let max_dz_positive = 0;
        let min_ele = coords[0].ele;      
        let dz;
        let speed = [];
        let tec = [];
        let progress = [];
        let valProgress;        
        for (let i = 1; i < n; i++) {            
            let dz = coords[i].ele - coords[i-1].ele;     
            if (dz > 0) total_dz_positive += dz;
            if (coords[i].ele < min_ele) 
                min_ele = coords[i].ele;
            else if (coords[i].ele - min_ele > max_dz_positive)
                max_dz_positive = coords[i].ele - min_ele;
        } 
            
        let i0 = 0;
        let i1 = 0;
        let coord0;
        let coord1;
        let s0;
        let s1;
        let delta0;
        let delta1;    
        for (let i = 1; i < n; i++) {              
            let t0 = (t[i - 1] + t[i]) / 2 - dt / 2;          
            while (t[i0] <= t0) { 
                i0 += 1; 
            }
            if (i0 == 0) {
                coord0 = coords[0];
                s0 = s[0];            
            } else {                
                delta0 = (t0 - t[i0-1]) / (t[i0] - t[i0 -1]);
                coord0 = interpolate(coords[i0 - 1],coords[i0],delta0);               
                s0 = (1.0 - delta0) * s[i0 - 1] + delta0 * s[i0];                
            }
            let t1 = t0 + dt;
            while (i1 < n && t[i1] < t1) {
                i1 += 1;
            }
            if (i1 == n) {
                coord1 = coords[n - 1];
                s1 = s[n - 1];
            } else {
                delta1 = (t1 - t[i1 - 1]) / (t[i1] - t[i1 - 1]);  
                coord1 = interpolate(coords[i1 - 1],coords[i1],delta1);               
                s1 = (1.0 - delta1) * s[i1 - 1] + delta1 * s[i1];
            }
            let ds = s1 - s0;
            let ds2 = s1 * s1 - s0 * s0;
            dz = coord1.ele - coord0.ele;            
            let dp = distanceTo(coord0, coord1);           
             if (ds == 0.0)
                valProgress = 0.0;
             else if (dp > ds)
                valProgress = 1.0;
            else
                valProgress = dp / ds;
            speed.push(3.6 * ds / dt);
            climb.push(dz / dt);
            tec.push(dz / dt + ds2 / (2 * 9.80665));
            progress.push(valProgress);      
        }
        let state = new Array(n-1).fill(0);  // array must  be initialized to zero -> state UNKNOWN
        let lstGlide = [];    //  new ArrayList<specialSegment>();
        let lstDive = [];     //  new ArrayList<specialSegment>();
        let lstThermal = [];  //  new ArrayList<specialSegment>();
        // glide detection
        let inGlide = false; 
        let startPoint = 0;
        for (let j = 1; j < progress.length; j++) {
            if (progress[j] >= progressValue) {
                if (!inGlide) {                     
                    startPoint = j;     
                    inGlide = true;
                }                
            } else {
                if (inGlide) {
                    let pGlide = new specialSegment(startPoint,j,GLIDE);
                    lstGlide.push(pGlide);
                    inGlide = false;
                }
            }            
        }
        // Group and condense
        let mergeZone = false;
        let realStart = 0;
        let realEnd;
        let beginNext;
        let nextPrevDelta;    
        for (let i = 0; i < lstGlide.length; i++) {
            if (i < lstGlide.length-1) {
                beginNext = lstGlide[i+1].idxStart;
                let prevEnd = lstGlide[i].idxEnd;
                nextPrevDelta = t[beginNext]-t[prevEnd];
            } else {
                nextPrevDelta = 100;
            }                                     
            if ( nextPrevDelta < 60) {            
                if (!mergeZone) {
                    mergeZone = true;
                    realStart = lstGlide[i].idxStart;                  
                    realEnd = lstGlide[i].idxEnd;                  
                } 
            } else {
                if (!mergeZone) {
                    realStart = lstGlide[i].idxStart;
                    realEnd = lstGlide[i].idxEnd;
                } else {
                    realEnd = lstGlide[i].idxEnd; 
                    mergeZone = false;
                } 
                for (let k = realStart; k < realEnd; k++) {
                    state[k] = GLIDE;
                }
            }
        }  
        // dive detection
        let inDive = false;         
        for (let j = 1; j < progress.length; j++) {
            if (progress[j] < progressValue && climb[j] < 1.0) {
                if (!inDive) {                     
                    startPoint = j;     
                    inDive = true;
                }                
            } else {
                if (inDive) {
                    let pDive = new specialSegment(startPoint,j,DIVE);
                    lstDive.push(pDive);
                    inDive = false;
                }            
            }
        }
        // Group and condense
        mergeZone = false;
        realStart = 0;
        for (let i = 0; i < lstDive.length; i++) {
            if (i < lstDive.length-1) {
                beginNext = lstDive[i+1].idxStart;
                let prevEnd = lstDive[i].idxEnd;
                nextPrevDelta = t[beginNext]-t[prevEnd];
            } else {
                nextPrevDelta = 100;
            }                                     
            if ( nextPrevDelta < 30) {     
                    if (!mergeZone) {
                        mergeZone = true;
                        realStart = lstDive[i].idxStart;                  
                        realEnd = lstDive[i].idxEnd;                  
                    } 
            } else {
                if (!mergeZone) {
                    realStart = lstDive[i].idxStart;
                    realEnd = lstDive[i].idxEnd;
                } else {
                    realEnd = lstDive[i].idxEnd; 
                    mergeZone = false;
                }
                if (coords[realEnd].ele - coords[realStart].ele < -100) {
                    for (let k = realStart; k < realEnd; k++) {
                        state[k] = DIVE;
                    }
                }
            }
        }      
        // thermal detection
        let inThermal = false;         
        for (let j = 1; j < progress.length; j++) {
            //if ((progress.get(j) < progressValue && climb.get(j) > 0.0) || (speed.get(j) < 10.0 && climb.get(j) > 0.0) || (climb.get(j) > 1.0)) {
            // we remove last condition climb.get(j) > 1.0
            // In a load-bearing air mass, it is possible to glide with a Vz greater than 1.0 m/s
            if ((progress[j] < progressValue && climb[j] > 0.0) || (speed[j] < 10.0 && climb[j] > 0.0)) {    
                if (!inThermal) {                     
                    startPoint = j;     
                    inThermal = true;
                }   
            } else {
                if (inThermal) {
                    let pThermal = new specialSegment(startPoint,j,THERMAL);
                    lstThermal.push(pThermal);
                    inThermal = false;                    
                }
            }
        }    
        // Group and condense
        mergeZone = false;
        realStart = 0;        
        for (let i = 0; i < lstThermal.length; i++) {
            if (i < lstThermal.length-1) {
                beginNext = lstThermal[i+1].idxStart;
                let prevEnd = lstThermal[i].idxEnd;
                nextPrevDelta = t[beginNext]-t[prevEnd];
            } else {
                nextPrevDelta = 100;
            }                                     
            if ( nextPrevDelta < 60) {            
                if (!mergeZone) {
                    mergeZone = true;
                    realStart = lstThermal[i].idxStart;                  
                    realEnd = lstThermal[i].idxEnd;                  
                } 
            } else {
                if (!mergeZone) {
                    realStart = lstThermal[i].idxStart;
                    realEnd = lstThermal[i].idxEnd;
                } else {
                    realEnd = lstThermal[i].idxEnd; 
                    mergeZone = false;
                }   
                for (let k = realStart; k < realEnd; k++) {
                    state[k] = THERMAL;
                }
            }
        } 
        
        let currState;
        let endPoint;
        for (let i = 0; i < state.length-1; i++) {
            startPoint = i;
            currState = state[i];
            while (i < state.length && state[i] == currState) {
                i += 1;
            }
            endPoint = i;
            i = i -1;
            currState = state[i];
    
            let diffT = t[endPoint] - t[startPoint];
            let diffEle = coords[endPoint].ele - coords[startPoint].ele;
            if (state[i] == THERMAL) {
                // Only gains in altitude above 100 m will be taken into consideration
                if (diffT >= 60 && diffEle > 100) {
                   addDetails(startPoint, endPoint, THERMAL);
                }                
            } else {
                if (state[i] == DIVE) {
                    if (diffT >= 30 && diffEle / diffT < -2) {
                        addDetails(startPoint, endPoint, DIVE);                        
                    }
                } else {
                    if (state[i] == GLIDE) {   
                        let dp = distanceTo(coords[startPoint], coords[endPoint]);                                 
                        if (dp >= 2000) {
                          addDetails(startPoint, endPoint, GLIDE);                            
                        }
                    }
                }                
            }
        }    
        fillProgressList();    
        this.thermals = [...finalThermals];
        this.dives = [...finalDives];
        this.glides = [...finalGlides];
        this.course = [...progList];
        this.geoThermals = geoTh;
        this.geoGlides = geoGlides;
        this.bestGain = _bestGain;
        this.bestGainEnd = _bestGainEnd;  
        this.avgThermalClimb = _avgThermalClimb;
        this.avgThermalEffi = _avgThermalEffi;
        this.avgTransSpeed = _avgTransSpeed
        this.extractTime = _extractTime
        this.percThermals = _percThermals
        this.percGlides = _percGlides;
        this.percDives = _percDives;
        this.bestGlide = _bestGlide;
        this.bestGlideEnd = _bestGlideEnd;
        
        // fin de compute

        function addDetails(idxStart, idxEnd, category) {

            /*     public remarkable() {
                    category = 0;
                    DeltaAlt = 0;
                    idxStart = 0;
                    idxEnd = 0;
                    climbAverage = 0.0;
                    climbMax = 0.0;
                    climbMin = 0.0;
                    climbPeakMax = 0.0;
                    climbPeakMin = 0.0; 
                    efficiency = 0;   // gérer si c'est -1, il met la string 'n/a'
                    average_ld = 0.0;   // gérer si c'est négatif, il le met à inf
                    average_speed = 0.0;
                    maximum_descent = 0.0;        
                }     */  
                let segment = {
                    idxStart : idxStart,
                    idxEnd : idxEnd
                };
                let coord0 = coords[idxStart];
                let coord1 = coords[idxEnd];
                let total_dz_positive = 0;
                let total_dz_negative = 0;
                let peak_climb_max = 0;
                let peak_climb_min = 0;
                let climb_max = 0;
                let climb_min = 0;
                let dz;
                let dt;
                let dp = distanceTo(coord0, coord1); 
                for (let i = idxStart; i < idxEnd; i++) {
                    dz = coords[i + 1].ele - coords[i].ele;
                    dt = t[i + 1] - t[i];
                    if (dz > 0)
                        total_dz_positive += dz;
                    else if (dz < 0)
                        total_dz_negative += dz;
                    let peak_climb = dz / dt;  
                    if (peak_climb > peak_climb_max) peak_climb_max = peak_climb;
                    if (peak_climb < peak_climb_min) peak_climb_min = peak_climb;     
                    let currClimb = climb[i];
                    if (currClimb > climb_max) climb_max = currClimb;
                    if (currClimb < climb_min) climb_min = currClimb;          
                }    
                dz = coords[idxEnd].ele - coords[idxStart].ele;
                dt = t[idxEnd] - t[idxStart];  
                let theta = initial_bearing(coord0,coord1);
                let deltaAlt = Math.round(dz);
                if (deltaAlt > _bestGain) {
                    _bestGain = deltaAlt;
                    _bestGainEnd = idxEnd;
                }    
                segment.deltaAlt = deltaAlt;
                segment.climbAverage = dz / dt;
                segment.climbMax = climb_max;
                segment.climbPeakMax = peak_climb_max;
                let divisor = dt * climb_max;
                if (divisor == 0)
                    segment.efficiency = -1;                
                else
                    segment.efficiency = Math.round(100.0 * dz / divisor);
                    segment.bruteDistance = dp;
                if (dp > _bestGlide) {
                    _bestGlide = dp;
                    _bestGlideEnd = idxEnd;
                }
                let average_ld = (-dp / dz);
                segment.distance_metres = dp;
                segment.average_ld = average_ld;
                segment.average_speed = 3.6 * dp / dt;
                segment.maximum_descent = climb_min;
                segment.peak_descent = peak_climb_min;
                segment.start_time = coord0.timestamp;
                segment.finish_time = coord1.timestamp;       
                segment.start_altitude = coord0.ele;
                segment.finish_altitude = coord1.ele;        
                segment.accumulated_altitude_gain = total_dz_positive;
                segment.accumulated_altitude_loss = total_dz_negative;  
                segment.drift_direction = rad_to_cardinal(theta + Math.PI);
                segment.duration = dt;
                segment.category = category;
                switch (category) {
                    case THERMAL:               
                        finalThermals.push(segment);
                        break;
                    case GLIDE:
                        finalGlides.push(segment);
                        break;
                    case DIVE:
                        finalDives.push(segment);
                        break;                
                }                            
            }  // end addEtails 

        /**
         * 
         * on a pas à priori besoin de générer du httml maintenant
         * il faut préparer la liste ORDONNEE du déroulement du vol, on aura
         *    - timestamp (pour le tri)
         *    - date debut en clair
         *    - category  : elle permettra de jouer sur la couleur et l'affichage selon tyhermal ou glide
         *    - altitude arrivée
         *    - duration : durée du segment qui permttra de calculer Elapsed après le tri
         *    - elapsed temps écoulé depuis le décollage
         *    - comment  qui sera selon la nature thermal -> [+1028m 1,3 m/s] ou transition -> [4,3 km 28km/h]
         *    - coordbox : jeu de coordonnées utilisé pour "displaysegment" dans fullmap ( Cf genChronoData dans L5.map_visu)
         *    - le texte final 12:53:42  00:15mn 2873m [+1028m 1,3 m/s] sera généré dans fullmap.js (cText dans L5)
         *    - le html sera également généré dans fullmap.js
         *    
         *    Je verrai une nouvelle présentation comme cela :
         *          12:57:34  00:00 Takeoff
         *          13:12:34  00:15 2873m +1028m 1,3 m/s  (Icone voir)
         *          14:03:09  00:24 2110m 4,3 km  28km/h  (Icone voir)
         *          14:22:30  00:44 2629m +368m  0,8m/s   (Icone voir)
         * 
         * pour le tri voir https://stackoverflow.com/questions/1129216/sort-array-of-objects-by-string-property-value
        */
       
        function fillProgressList() {
            let totPeriod = Math.floor((fixes[fixes.length - 1].timestamp-fixes[0].timestamp)/1000);
            // Take off
            const dateTkoff = new Date(fixes[0].timestamp);
            const hTkoff = String(dateTkoff.getHours()).padStart(2, '0')+':'+String(dateTkoff.getMinutes()).padStart(2, '0')+':'+String(dateTkoff.getSeconds()).padStart(2, '0');         
            let progTkoff = new progSegment('K',fixes[0].timestamp,hTkoff,0,fixes[0].gpsAltitude,'','','')
            progList.push(progTkoff);
            // landing
            const dateLand = new Date(fixes[fixes.length - 1].timestamp);
            const hLand = String(dateLand.getHours()).padStart(2, '0')+':'+String(dateLand.getMinutes()).padStart(2, '0')+':'+String(dateLand.getSeconds()).padStart(2, '0');     
            let totalFormatted = new Date(totPeriod*1000).toUTCString().match(/(\d\d:\d\d)/)[0];
            let progLand = new progSegment('L',fixes[fixes.length - 1].timestamp,hLand,totalFormatted,fixes[fixes.length - 1].gpsAltitude,'','','');
            progList.push(progLand);

            let totThermals = 0;
            let totAvgThermalClimb = 0;
            let totAvgThermalEffi = 0;
            let nbThermals = finalThermals.length;

            for (let i = 0; i < nbThermals; i++) {
                //(pTimestamp, pTime, pElapsed, pAlt, pData1, pData2, pCoords)  
                let dateStart = new Date(finalThermals[i].start_time);
                let hStart = dateStart.getHours()+':'+dateStart.getMinutes()+':'+dateStart.getSeconds();  
                // extractTime computing
                const dateTkoff = new Date(fixes[0].timestamp);
                let dateEnd = new Date(finalThermals[i].finish_time);
                let hEnd = String(dateEnd.getHours()).padStart(2, '0')+':'+String(dateEnd.getMinutes()).padStart(2, '0')+':'+String(dateEnd.getSeconds()).padStart(2, '0');
                let elapsedSeconds = (finalThermals[i].finish_time - fixes[0].timestamp)/1000;                   
                // from https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
                let elapsedFormatted = new Date(elapsedSeconds* 1000).toUTCString().match(/(\d\d:\d\d)/)[0];
                let durationFormatted = new Date(finalThermals[i].duration* 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
                let driftFormatted = Math.round(finalThermals[i].average_speed*10)/10+'km/h '+finalThermals[i].drift_direction;
                // coordinates lat-long formating
                let segCoords = (Math.round(fixes[finalThermals[i].idxStart].latitude * 100000) / 100000).toFixed(5)+',';
                segCoords += (Math.round(fixes[finalThermals[i].idxStart].longitude * 100000) / 100000).toFixed(5)+',';
                segCoords += (Math.round(fixes[finalThermals[i].idxEnd].latitude * 100000) / 100000).toFixed(5)+',';
                segCoords += (Math.round(fixes[finalThermals[i].idxEnd].longitude * 100000) / 100000).toFixed(5);
                let progTh =  new progSegment('T',finalThermals[i].finish_time, hEnd, elapsedFormatted, finalThermals[i].finish_altitude, finalThermals[i].deltaAlt,finalThermals[i].climbAverage,segCoords);                
                progList.push(progTh);
                // total calculations
                totAvgThermalClimb += finalThermals[i].climbAverage;
                totAvgThermalEffi += finalThermals[i].efficiency;
                totThermals += (finalThermals[i].finish_time - finalThermals[i].start_time)/1000;   
                let bestTh = false;              
                if (finalThermals[i].deltaAlt == _bestGain) bestTh = true;
                // geojson generation
                let featurePoint = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [(Math.round(fixes[finalThermals[i].idxEnd].longitude * 100000) / 100000), (Math.round(fixes[finalThermals[i].idxEnd].latitude * 100000) / 100000)]
                    },
                    "properties": {
                        "alt_gain": finalThermals[i].deltaAlt,
                        "avg_climb": Math.round(finalThermals[i].climbAverage*10)/10,
                        "max_climb" : Math.round(finalThermals[i].climbMax*10)/10,
                        "peak_climb" : Math.round(finalThermals[i].climbPeakMax*10)/10,
                        "efficiency" : Math.round(finalThermals[i].efficiency),
                        "start_alt" : finalThermals[i].start_altitude,
                        "finish_alt" : finalThermals[i].finish_altitude,
                        "start_time" : hStart,
                        "finish_time" : hEnd,
                        "duration" : durationFormatted,
                        "acc_gain" : finalThermals[i].accumulated_altitude_gain,
                        "acc_loss" : finalThermals[i].accumulated_altitude_loss,
                        "drift" : driftFormatted,
                        "best_thermal" : bestTh
                    }
                }
                geoTh['features'].push(featurePoint);
                let linecoord = [];
                for (let j = finalThermals[i].idxStart; j < finalThermals[i].idxEnd+1; j++) {
                    let lonlat = [];
                    lonlat.push((Math.round(fixes[j].longitude * 100000) / 100000));
                    lonlat.push((Math.round(fixes[j].latitude * 100000) / 100000));
                    linecoord.push(lonlat);
                } 
                let featureLine = {
                    "type": "Feature",
                    "properties": {
                        "id": "thermal "+i,
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": linecoord
                    }
                }
                geoTh['features'].push(featureLine);                
            }
            if (nbThermals > 0) {
                _avgThermalClimb = totAvgThermalClimb/nbThermals;
                _avgThermalEffi = totAvgThermalEffi/nbThermals;
            } else
                _avgThermalClimb = 0.00;

            let totGlides = 0;
            let totSpeed = 0;
            let nbGlides = finalGlides.length
            for (let i = 0; i < nbGlides; i++) {
                //(pTimestamp, pTime, pElapsed, pAlt, pData1, pData2, pCoords)  
                let dateStart = new Date(finalGlides[i].start_time);
                let hStart = dateStart.getHours()+':'+dateStart.getMinutes()+':'+dateStart.getSeconds();  
                if (i==0) {
                    _extractTime = (finalGlides[i].start_time - fixes[0].timestamp)/1000    // seconds
                }
                let dateEnd = new Date(finalGlides[i].finish_time);
                let hEnd = String(dateEnd.getHours()).padStart(2, '0')+':'+String(dateEnd.getMinutes()).padStart(2, '0')+':'+String(dateEnd.getSeconds()).padStart(2, '0');
                let elapsedSeconds = (finalGlides[i].finish_time - fixes[0].timestamp)/1000;                   
                // from https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
                let elapsedFormatted = new Date(elapsedSeconds* 1000).toUTCString().match(/(\d\d:\d\d)/)[0];
                let durationFormatted = new Date(finalGlides[i].duration* 1000).toUTCString().match(/(\d\d:\d\d:\d\d)/)[0];
                // coordinates lat-long formating
                let segCoords = (Math.round(fixes[finalGlides[i].idxStart].latitude * 100000) / 100000).toFixed(5)+',';
                segCoords += (Math.round(fixes[finalGlides[i].idxStart].longitude * 100000) / 100000).toFixed(5)+',';
                segCoords += (Math.round(fixes[finalGlides[i].idxEnd].latitude * 100000) / 100000).toFixed(5)+',';
                segCoords += (Math.round(fixes[finalGlides[i].idxEnd].longitude * 100000) / 100000).toFixed(5);
                let progGl =  new progSegment('G',finalGlides[i].finish_time, hEnd, elapsedFormatted, finalGlides[i].finish_altitude, (finalGlides[i].distance_metres/1000).toFixed(2),Math.round(finalGlides[i].average_speed),segCoords);                
                progList.push(progGl);
                // geojson generation
                // We want to place a marker on center of a line string
                // a Simple linear math seems to work  (https://gis.stackexchange.com/questions/18584/how-to-find-a-point-half-way-between-two-other-points)
                let latMiddle = fixes[finalGlides[i].idxEnd].latitude + ((fixes[finalGlides[i].idxStart].latitude - fixes[finalGlides[i].idxEnd].latitude) / 2);
                let longMiddle = fixes[finalGlides[i].idxEnd].longitude + ((fixes[finalGlides[i].idxStart].longitude - fixes[finalGlides[i].idxEnd].longitude) / 2);
                let glToRight;
                if (fixes[finalGlides[i].idxStart].longitude < fixes[finalGlides[i].idxEnd].longitude )
                    glToRight = true
                else
                    glToRight = false;            
                let featurePoint = {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [(Math.round(longMiddle * 100000) / 100000), (Math.round(latMiddle * 100000) / 100000)]
                    },
                    "properties": {
                        "alt_change": finalGlides[i].deltaAlt,
                        "avg_descent": Math.round(finalGlides[i].climbAverage*10)/10,
                        "distance" : Math.round((finalGlides[i].distance_metres/1000)*10)/10,
                        "avg_glide" : Math.round(finalGlides[i].average_ld*10)/10,
                        "avg_speed" : Math.round(finalGlides[i].average_speed*10)/10,
                        "start_alt" : finalGlides[i].start_altitude,
                        "finish_alt" : finalGlides[i].finish_altitude,
                        "start_time" : hStart,
                        "finish_time" : hEnd,
                        "duration" : durationFormatted,
                        "acc_gain" : finalGlides[i].accumulated_altitude_gain,
                        "acc_loss" : finalGlides[i].accumulated_altitude_loss,
                        "glideToRight" : glToRight
                    }
                }
                geoGlides['features'].push(featurePoint);            
                let linecoord = [];
                // start line point
                let startPoint = [];
                startPoint.push((Math.round(fixes[finalGlides[i].idxStart].longitude * 100000) / 100000));
                startPoint.push((Math.round(fixes[finalGlides[i].idxStart].latitude * 100000) / 100000));
                linecoord.push(startPoint);
                let endPoint = [];
                endPoint.push((Math.round(fixes[finalGlides[i].idxEnd].longitude * 100000) / 100000));
                endPoint.push((Math.round(fixes[finalGlides[i].idxEnd].latitude * 100000) / 100000));
                linecoord.push(endPoint);                
                let featureLine = {
                    "type": "Feature",
                    "properties": {
                        "id": "glide "+i,
                    },
                    "geometry": {
                        "type": "LineString",
                        "coordinates": linecoord
                    }
                }
                geoGlides['features'].push(featureLine);                       
                
                // total calculations
                totSpeed += finalGlides[i].average_speed;
                totGlides += (finalGlides[i].finish_time - finalGlides[i].start_time)/1000; 
            }    
            if (nbGlides > 0)
                _avgTransSpeed = totSpeed/nbGlides;
            else
                _avgTransSpeed = 0;
            
            let totDives = 0;
            for (let i = 0; i < finalDives.length; i++) {
                totDives += (finalDives[i].finish_time - finalDives[i].start_time)/1000; 
            }
            // Array must be sorted
            progList.sort((a,b) => a.timestamp - b.timestamp); 
            // percentage calculation
            _percThermals = totThermals/totPeriod;
            _percGlides = totGlides/totPeriod;
            _percDives = totDives/totPeriod;   
        }

        function distanceTo(c, other) {
            let d = Math.sin(c.lat) * Math.sin(other.lat) + Math.cos(c.lat) * Math.cos(other.lat) * Math.cos(c.lon - other.lon);
            let res = 0;
            if(d < 1.0) res = R * Math.acos(d);
            
            return res;
        }

        function interpolate(c, other, delta) {
                    
            let d = Math.sin(c.lat) * Math.sin(other.lat) + Math.cos(c.lat) * Math.cos(other.lat) * Math.cos(other.lon - c.lon);
            if (d < 1.0)
                d = delta * Math.acos(d);
            else 
                d = 0.0;    
            let y = Math.sin(other.lon - c.lon) * Math.cos(other.lat);
            let x = Math.cos(c.lat) * Math.sin(other.lat) - Math.sin(c.lat) * Math.cos(other.lat) * Math.cos(other.lon - c.lon);
            let theta = Math.atan2(y, x);          
            let lat = Math.asin(Math.sin(c.lat) * Math.cos(d) + Math.cos(c.lat) * Math.sin(d) * Math.cos(theta));
            let lon = c.lon + Math.atan2(Math.sin(theta) * Math.sin(d) * Math.cos(c.lat),Math.cos(d) - Math.sin(c.lat) * Math.sin(lat));
            let ele = (1.0 - delta) * c.ele + delta * other.ele;        
    
            let res = new radCoord(lat, lon, ele); 
            
            return res;
        }
    
        function radCoord(lat, lon, ele, timestamp) {
            this.lat = lat;
            this.lon = lon;
            this.ele = ele;
            this.timestamp = timestamp;
        }

        function rad_to_cardinal(rad) {        
            let res = "";
            while (rad < 0.0) {
                rad += 2 * Math.PI;
            }
            let idx = Math.trunc((8 * rad / Math.PI + 0.5) % 16);
            if (idx >= 0 && idx < cardinals.length) res = cardinals[idx];
            
            return res;
        }        
    
        function specialSegment(idxStart, idxEnd, typePoint) {
            this.idxStart = idxStart;
            this.idxEnd = idxEnd;
            this.typePoint = typePoint;
        }

        function progSegment(pCategory,pTimestamp, pTime, pElapsed, pAlt, pData1, pData2, pCoords) {
            this.category = pCategory;  // K  Take Off L  Landing  T thermal  G  Glide   D  Dive
            // pas de localdatetime, il suffira de faire un new Date(pTimestamp);
            this.timestamp = pTimestamp;
            this.time = pTime;
            this.elapsed = pElapsed;
            this.alt = pAlt;
            this.data1 = pData1;
            this.data2 = pData2;
            this.coords = pCoords;
          }
    
        function initial_bearing(c, other) {
            // return the initial bearing from self to other
            let y = Math.sin(other.lon - c.lon) * Math.cos(other.lat);
            let x = Math.cos(c.lat) * Math.sin(other.lat) - Math.sin(c.lat) * Math.cos(other.lat) * Math.cos(other.lon - c.lon);
            
            return Math.atan2(y, x);
        }        

    }
}

module.exports = IGCAnalyzer;