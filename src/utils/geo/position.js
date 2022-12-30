class Position {
    constructor() {
        this.altitude = 0;
        this.hemisphere = "N";
        this.latDegres = 0;
        this.latDecimal = 0;
        this.latitude =0;
        this.latMin_mm = 0;
        this.latMin_ms = 0;
        this.latSec_ms = 0;
        this.longDegres = 0;
        this.longDecimal = 0
        this.longitude = 0;
        this.longMin_mm = 0;
        this.longMin_ms = 0;
        this.longSec_ms = 0;    
        this.meridian = "E";    
    }

    setLatitudeDd(degrees)  {
        this.latitude = Number(degrees)
        let iSign
        if (degrees < 0) {
            degrees = -degrees;
            iSign = -1;
        } else {
            iSign = 1;
        }
        this.latDegres = Math.floor(degrees)
        this.latDecimal = Number(degrees) - this.latDegres
        const dMinutesPart = (Number(degrees) - this.latDegres) * 60
        this.latMin_mm = dMinutesPart
        this.latSec_ms = ((dMinutesPart - Math.floor(dMinutesPart)) * 60)
        this.latMin_ms = Math.floor(dMinutesPart)
        if (iSign == 1)
            this.hemisphere = 'N'
        else
            this.hemisphere = 'S'     
    }

    setLongitudeDd(degrees)  {
        this.longitude = Number(degrees)
        let iSign
        if (degrees < 0) {
            degrees = -degrees;
            iSign = -1;
        } else {
            iSign = 1;
        }
        this.longDegres = Math.floor(degrees)
        this.longDecimal = Number(degrees) - this.longDegres
        const dMinutesPart = (Number(degrees) - this.longDegres) * 60
        this.longMin_mm = dMinutesPart
        this.longSec_ms = ((dMinutesPart - Math.floor(dMinutesPart)) * 60)
        this.longMin_ms = Math.floor(dMinutesPart)
        if (iSign == 1)
            this.meridian = "E";
        else
            this.meridian = "W"                
    }    

    setLatitudeDMm(pDeg, pMin, pHem) {
        const calcLatitude = Number(pDeg)+((Number(pMin)*60)/3600)
        if (pHem == 'S') calcLatitude = calcLatitude * - 1;
        this.latitude = calcLatitude;        
        this.latDegres = Number(pDeg)
        this.latDecimal = (calcLatitude - this.latDegres)
        this.latMin_ms = Math.floor(Number(pMin))
        this.latMin_mm = Number(pMin)
        this.latSec_ms = ((pMin- this.latMin_ms)*60)
        this.hemisphere = pHem               
    }    

    setLongitudeDMm(pDeg, pMin, pMer)  {
        const calcLongitude =  Number(pDeg)+((Number(pMin)*60)/3600)
        if (pMer == 'W') calcLongitude = calcLongitude * - 1;
        this.longitude = calcLongitude  
        this.longDegres = Number(pDeg) 
        this.longDecimal = (calcLongitude - this.longDegres) 
        this.longMin_ms = Math.floor(Number(pMin))
        this.longMin_mm = Number(pMin)
        this.longSec_ms = ((pMin- this.longMin_ms)*60)
        this.meridian = pMer   
    }    

    setLatitudeDMS(pDeg, pMin, pSec, pHem) {
        const decPart = ((Number(pMin)*60)+Number(pSec))/3600
        this.latDecimal = decPart
        this.latDegres = Number(pDeg)
        // https://stackoverflow.com/questions/14496531/adding-two-numbers-concatenates-them-instead-of-calculating-the-sum
        this.latitude =  +this.latDegres + +this.latDecimal
        if (pHem == 'S') this.latitude = this.latitude * - 1
        this.latMin_ms = Number(pMin)
        this.latMin_mm = +pMin+(pSec/60)
        this.latSec_ms = Number(pSec)
        this.hemisphere = pHem        
    }    

    setLongitudeDMS(pDeg, pMin, pSec, pMer)  {
        const decPart = ((Number(pMin)*60)+Number(pSec))/3600
        this.longDecimal = decPart
        this.longDegres = Number(pDeg)
        this.longitude = +this.longDegres + +this.longDecimal
        if (pMer == 'W') this.longitude = this.longitude * - 1
        this.longMin_ms = Number(pMin)
        this.longMin_mm = +pMin+(pSec/60)
        this.longSec_ms = Number(pSec)
        this.meridian = pMer          
    }    

  }

  module.exports = Position