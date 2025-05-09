const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const mailing = require('../../../utils/sendmail.js')
const waypwrite = require('../../../utils/geo/wayp-write.js');
const btnCancel = document.getElementById('bt-cancel')
const btnOk = document.getElementById('bt-ok')
const mailAdress = document.getElementById('ipt-mail')

const originWindow = 1
let routeSet


// a template for a secondary window

iniForm()

ipcRenderer.on('route-to-save', (event, pRoute) => {    
    console.log(pRoute.length)
    routeSet = [...pRoute]
})

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile));
            let langjson = JSON.parse(content);
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang);            
        }
    } catch (error) {
        log.error('[downsites.js] Error while loading the language file')
    }  
    document.getElementById('lb-title').innerHTML = i18n.gettext('Waypoint prefix')
    document.getElementById('save-gpxrte').innerHTML = i18n.gettext('Save as GPX route only')
    document.getElementById('save-gpxtot').innerHTML = i18n.gettext('Save as GPX route and markers')
    document.getElementById('save-gpxwpt').innerHTML = i18n.gettext('Save as GPX waypoints (no markers)')
    document.getElementById('save-cup').innerHTML = i18n.gettext('Save as SeeYou (cup)')
    document.getElementById('save-kml').innerHTML = i18n.gettext('Save as Google Earth (kml)')
    document.getElementById('save-xctrack').innerHTML = i18n.gettext('Save as XCTrack')
    document.getElementById('save-dump').innerHTML = i18n.gettext('Save as GPSDump wpt')
    document.getElementById('lb-mail').innerHTML = i18n.gettext('Recipient adress')
    btnCancel.innerHTML = i18n.gettext('Close')
    btnCancel.addEventListener('click',(event)=>{window.close()})     
}

function savegpxroute(withMarkers, sending) {  
    let mailOk
    if (sending) {
        mailOk = validateEmailAddress()
    } else {
        mailOk = true
    }
    if (routeSet.length > 0 && mailOk) {
        let gpxTrack = gpxHeader()  
        gpxTrack += '   <rte>\r\n'
        // first array is rte markers
        for (let i = 0; i < routeSet[0].length; i++) {
            const rteItem = routeSet[0][i]
            let gpxtrkpt = '      <rtept lat="' + rteItem.lat.toFixed(6) + '" lon="' + rteItem.lng.toFixed(6) + '"></rtept>\r\n'
            //  console.log(gpxtrkpt)
            gpxTrack += gpxtrkpt
        }
        gpxTrack += '   </rte>\r\n'
        if (withMarkers && routeSet.length > 1) {
            // second array is simple markers
            for (let i = 0; i < routeSet[1].length; i++) {
                const mrkItem = routeSet[1][i]
                gpxTrack += '   <wpt lat="'+mrkItem.lat.toFixed(6) + '" lon="' + mrkItem.lng.toFixed(6) + '"></wpt>\r\n'
            }
        }
        gpxTrack += '</gpx>'
        try {
            const exportPath = ipcRenderer.sendSync('save-gpx',gpxTrack)
            if (exportPath.indexOf('Error') !== -1) {
                alert(exportPath)      
            } else {
                if (sending) {
                    sendEmail(exportPath)
                } else {
                    alert(i18n.gettext('Successful operation'))
                }
            }        
        } catch (error) {
            alert(error)
        }
    }
}

function savegpxtask(sending) {
    let mailOk
    if (sending) {
        mailOk = validateEmailAddress()
    } else {
        mailOk = true
    }
    if (routeSet.length > 0 && mailOk) {
        let wpPrefix = document.getElementById('ipt-prefix').value
        let gpxTrack = gpxHeader()  
        gpxTrack += '   <data>\r\n'
        for (let i = 0; i < routeSet[0].length; i++) {
            const rteItem = routeSet[0][i]
            let idx = i.toString().padStart(3,"0")
            idx = wpPrefix+idx
            let gpxwpt = '      <wpt lat="' + rteItem.lat.toFixed(6) + '" lon="' + rteItem.lng.toFixed(6) + '">\r\n'
            gpxwpt += '         <name>'+idx+'</name>\r\n'
            gpxwpt += '      </wpt>\r\n'
            gpxTrack += gpxwpt
        }
        gpxTrack += '   </data>\r\n'
        gpxTrack += '</gpx>'
        try {
            const exportPath = ipcRenderer.sendSync('save-gpx',gpxTrack)
            if (exportPath.indexOf('Error') !== -1) {
                alert(exportPath)      
            } else {
                if (sending) {
                    sendEmail(exportPath)
                } else {
                    alert(i18n.gettext('Successful operation'))
                }
            }        
        } catch (error) {
            alert(error)
        }
    }    
}

function savecup(sending) {
    let mailOk
    if (sending) {
        mailOk = validateEmailAddress()
    } else {
        mailOk = true
    }
    if (routeSet.length > 0 && mailOk) {
        let arrWayp = []
        let wpPrefix = document.getElementById('ipt-prefix').value
        for (let i = 0; i < routeSet[0].length; i++) {
            const rteItem = routeSet[0][i]
            const k = i+1
            let idx = k.toString().padStart(3,"0")
            idx = wpPrefix+idx
            let currWayp = {
                longName : idx,
                shortName : idx,
                lat : rteItem.lat.toFixed(6),
                long : rteItem.lng.toFixed(6),
                alti : 0
            }
            arrWayp.push(currWayp)
        }
        const reswrite = waypwrite.writeCup(arrWayp, '', '')
        alert(reswrite)
        if (reswrite != 'error' && sending) {
            sendEmail(reswrite)
        }
    }  
}

function savedump(sending) {
    let mailOk
    if (sending) {
        mailOk = validateEmailAddress()
    } else {
        mailOk = true
    }
    if (routeSet.length > 0 && mailOk) {
        let arrWayp = []
        let wpPrefix = document.getElementById('ipt-prefix').value
        for (let i = 0; i < routeSet[0].length; i++) {
            const rteItem = routeSet[0][i]
            const k = i+1
            let idx = k.toString().padStart(3,"0")
            idx = wpPrefix+idx
            let currWayp = {
                longName : idx,
                shortName : idx,
                lat : rteItem.lat.toFixed(6),
                long : rteItem.lng.toFixed(6),
                alti : 0
            }
            arrWayp.push(currWayp)
        }
        const reswrite = waypwrite.writeDump(arrWayp, '', '')
        if (reswrite != 'error' && sending) {
            sendEmail(reswrite)
        }
    }  
}

function savekml(sending) {
    let mailOk
    if (sending) {
        mailOk = validateEmailAddress()
    } else {
        mailOk = true
    }
    if (routeSet.length > 0 && mailOk) {
        let kmlTrack = kmlHeader()  
        // Draw the line between markers
        for (let i = 0; i < routeSet[0].length; i++) {
            const rteItem = routeSet[0][i]
            let kmlpt = rteItem.lng.toFixed(6)+','+rteItem.lat.toFixed(6)+',0'             
            kmlTrack += kmlpt
            if (i < routeSet[0].length - 1) kmlTrack += ' '
        }
        kmlTrack += '</coordinates>\r\n'
        kmlTrack += '	              <tessellate>1</tessellate>\r\n'
        kmlTrack += '             </LineString>\r\n'
        kmlTrack += '     </Placemark>\r\n'
        // Draw markers
        kmlTrack += '	  <Folder>\r\n'
		kmlTrack += '             <name>Waypoints</name>\r\n'
        let wpPrefix = document.getElementById('ipt-prefix').value
        for (let i = 0; i < routeSet[0].length; i++) {
            const rteItem = routeSet[0][i]
            const k = i+1
            let idx = k.toString().padStart(3,"0")
            idx = wpPrefix+idx
            kmlTrack += '             <Placemark>\r\n'
            kmlTrack += '	              <name>'+idx+'</name>\r\n'
            kmlTrack += '                 <Point>\r\n'
            kmlTrack += '                      <coordinates>'+rteItem.lng.toFixed(6)+','+rteItem.lat.toFixed(6)+',0</coordinates>\r\n'
            kmlTrack += '                 </Point>\r\n'
            kmlTrack += '             </Placemark>\r\n'
        }
        kmlTrack += '	  </Folder>\r\n'
        kmlTrack += ' </Document>\r\n'
        kmlTrack += '</kml>\r\n'
        try {
            const exportPath = ipcRenderer.sendSync('save-wpt',kmlTrack,'kml','')  //process-main/files-utils/open-file.js
            if (exportPath.indexOf('Error') !== -1) {
                alert(exportPath)      
            } else {
                if (sending) {
                    sendEmail(exportPath)
                } else {
                    alert(i18n.gettext('Successful operation'))
                }
            }        
        } catch (error) {
            alert(error)
        }
    }
}

function savexctrack(sending) {
    let mailOk
    if (sending) {
        mailOk = validateEmailAddress()
    } else {
        mailOk = true
    }
    if (routeSet.length > 0 && mailOk) {
        let xctrack = {
            taskType: 'CLASSIC',
            version : 1,
            turnpoints : []
        }
        let arrWayp = []
        let wpPrefix = document.getElementById('ipt-prefix').value
        for (let i = 0; i < routeSet[0].length; i++) {
            const rteItem = routeSet[0][i]
            const k = i+1
            let idx = k.toString().padStart(3,"0")
            idx = wpPrefix+idx
            let currWayp = {
                name : idx,
                lat : Number(rteItem.lat.toFixed(6)),
                lon : Number(rteItem.lng.toFixed(6)),
                altSmoothed : 0
            }
            let currPoint = {
                radius : 400,
                waypoint : currWayp
            }
            xctrack.turnpoints.push(currPoint)
        }
        const jsonXctrack = JSON.stringify(xctrack, null, 2)
        try {
            const exportPath = ipcRenderer.sendSync('save-wpt',jsonXctrack,'xctsk','')  //process-main/files-utils/open-file.js
            if (exportPath.indexOf('Error') !== -1) {
                alert(exportPath)      
            } else {
                if (sending) {
                    sendEmail(exportPath)
                } else {
                    alert(i18n.gettext('Successful operation'))
                }
            }        
        } catch (error) {
            alert(error)
        }
    }
}

function gpxHeader() {
    let header = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>\r\n'
    header += '<gpx creator="Logfly"\r\n'
    header +='    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://www.topografix.com/GPX/1/1" version="1.1" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\r\n'
    
    return header
}

function kmlHeader() {
    let header = '<?xml version="1.0" encoding="utf-8"?>\r\n'
    header += '<kml xmlns="http://www.opengis.net/kml/2.2">\r\n'
    header += ' <Document>\r\n'
    header += '     <Placemark>\r\n'
    header += '         <name>Logfly route </name>\r\n'
    header += '             <LineString>\r\n'
    header += '                 <coordinates>'

    return header
}

async function sendEmail(filePath) {
    try {
        $('#waiting-spin').removeClass('d-none')
        const adress = mailAdress.value;
        const msg = i18n.gettext('Attached is the route worked out with Logfly')
        const resMail = await mailing.sendByGmail('', adress, msg, filePath)

        // Vérification du résultat
        if (resMail && resMail.messageId) {
            alert(i18n.gettext('Email sent successfully'))
        } else {
            alert(i18n.gettext('Failed to send email'))
        }
    } catch (error) {
        log.error('Error while sending email : ', error);
        alert(i18n.gettext('Error sending mail')+' : ' + error.message);
    }
    $('#waiting-spin').addClass('d-none')
}

function validateEmailAddress() {
    const email = mailAdress.value

    if (!email || email.trim() === '') {
        alert(i18n.gettext('Email address cannot be empty'))
        return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
        alert(i18n.gettext('Invalid email address format'))
        return false
    }

    return true
}