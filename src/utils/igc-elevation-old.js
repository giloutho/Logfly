const fs = require('fs')
const path = require('path');
var SyncTileSet = require('srtm-elevation').SyncTileSet;
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store();
const pathW  = store.get('pathw')

class IGCElevation {
    constructor () {
        this.elePoints = [];
    }

    getElevation(locations) {
        let pathOk = false
        let strmEle = []; 
        let pathSrtm =  path.join(pathW,'Srtm') 
        if (fs.existsSync(pathSrtm)) {
            pathOk = true
        } else {
            try {
                fs.mkdirSync(pathSrtm)
                pathOk = true
            } catch (error) {
                log.error('[IGCElevation] unable to create '+pathSrtm)
            }            
        }
        if (pathOk) {

        }
       this.elePoints = [...strmEle];
    }

}

async function myDisplay() {
    let myPromise = new Promise(function(resolve) {
      setTimeout(function() {resolve("I love You !!");}, 3000);
    });
    document.getElementById("demo").innerHTML = await myPromise;
}

module.exports = IGCElevation;