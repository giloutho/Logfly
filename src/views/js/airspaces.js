const {ipcRenderer, clipboard} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path')
const os = require('os')
const checkInternetConnected = require('check-internet-connected')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const moment = require('moment')
const menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
const btnSelect = document.getElementById('sel-open')
const btnLast = document.getElementById('last-used')
const btnBaz = document.getElementById('bazile')
const btnSaveOpen = document.getElementById('save-open')
const btnSaveGpx = document.getElementById('save-gpx')
const btnReset = document.getElementById('reset')
const selFloor = document.getElementById('sel-floor')
const checkRest = document.getElementById("ch-rest")
const labelFile = document.getElementById("lb-file")
const infoPanel = document.getElementById("info-panel")

let currLang
let currFileName = null
let currFilePath = null
let currPolygons

const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const layerTree = require('leaflet.control.layers.tree')
const turfBoolean = require('@turf/boolean-point-in-polygon').default
const turfIntersect =  require('@turf/boolean-intersects').default 
const areaSelect = require('../../leaflet/leaflet-areaselect.js')
const easyButton = require('leaflet-easybutton')
const baseMaps = tiles.baseMaps
const baseTree = [
    {
        label: 'Mapping',
        children: [
            {label: 'OSM', layer: baseMaps.OSM, name: 'OpenStreeMap'},
            {label: 'OpenTopoMap', layer: baseMaps.OpenTopo, name: 'Topographic - OSM'},
            {label: 'IGN', layer: baseMaps.IGN, name: 'IGN'},
            {label: 'MTK', layer: baseMaps.MTK, name: 'MTK'},
        ]
    }
]
const mapSidebar = require('../../leaflet/sidebar-tabless.js')

let mapOA
let layerscontrol
let sidebar
let toggleSelect = null

iniForm()

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile))
            let langjson = JSON.parse(content)
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang)
        }
      } catch (error) {
          log.error('[problem.js] Error while loading the language file')
      }  
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html()  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    labelFile.style.color = 'white'
    labelFile.style.backgroundColor = '#0275d8'
    btnSelect.innerHTML = i18n.gettext('Select a file')
    btnSelect.addEventListener('click', (event) => {callDisk()})
    btnLast.innerHTML = i18n.gettext('Last Used')
    btnLast.addEventListener('click', (event) => {callLastUsed()})
    btnBaz.innerHTML = '@Bazile'
    btnBaz.addEventListener('click', (event) => {downloadBazile()})
    btnSaveOpen.innerHTML = i18n.gettext('Open Air format')    
    btnSaveOpen.addEventListener('click', (event) => {save()})    
    btnSaveGpx.innerHTML = i18n.gettext('GPX Format')
    btnSaveGpx.addEventListener('click', (event) => {exportGPX()})  
    btnReset.innerHTML = i18n.gettext('Reset')
    btnReset.addEventListener('click', (event) => {totalUpdate()})    
    document.getElementById('lb-floor').innerHTML = i18n.gettext('Floor')
    document.getElementById('lb-rest').innerHTML = 'E,F,G, rest'
    $("#sel-floor").append('<option value=' + 0 + ' selected >' + i18n.gettext('All') + '</option>') 
    for (i=500; i <= 6000; i += 500){
        $("#sel-floor").append('<option value=' + i + '>'+i+'</option>') 
    }
    checkRest.checked = true
    defaultMap()
}

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName)    // main.js
}

btnMenu.addEventListener('click', (event) => {
    if (btnMenu.innerHTML === "Menu On") {
        btnMenu.innerHTML = "Menu Off"
    } else {
        btnMenu.innerHTML = "Menu On"
    }
    $('#sidebar').toggleClass('active')
})

ipcRenderer.on('open-airset', (event, airPolygons) => {
    $('#waiting-spin').addClass('d-none')
    if (airPolygons.airspaceSet.length > 0) {
        if(currFilePath != null && currFilePath != '') store.set('lastair',currFilePath)
        currPolygons = airPolygons
        totalUpdate()        
    } else {
        alert(i18n.gettext('Parsing error'))
    }
})

ipcRenderer.on("dl-complete", (event, fullPathFile) => {
    console.log('Téléchargement terminé : '+fullPathFile) // Full file path   
    if(fullPathFile != null) {    
        if (currPolygons != undefined && currPolygons.airspaceSet.length > 0 ) {
            // We remove all geoJson
            mapOA.eachLayer(function(layer){
            if (layer.hasOwnProperty('feature')) {
                mapOA.removeLayer(layer)       
            }      
            }) 
            currPolygons = {} 
        } 
      //  let fileName = fullPathFile.substring(fullPathFile.lastIndexOf('/')+1)
     //   currFileName = selectedFile.fileName.replace(/\.[^/.]+$/, "")
        currFileName = 'Bazile'
        currFilePath = fullPathFile
        decodeOA(fullPathFile)    
    }      
})

function callDisk() {
    const selectedFile = ipcRenderer.sendSync('open-file','')
    if(selectedFile.fullPath != null) {    
        runFile(selectedFile.fullPath,selectedFile.fileName)           
    }    
}

function callLastUsed() {
    let lastFilePath = store.get('lastair')
    if (lastFilePath != undefined && lastFilePath != '') {
        const pathParts = lastFilePath.split(path.sep)
        const fileName = pathParts.pop()
        runFile(lastFilePath,fileName) 
    } else {
        alert(i18n.gettext('No recorded file'))
    }
}

function runFile(fullPath,fileName) {
    $('#waiting-spin').removeClass('d-none')
    if (currPolygons != undefined && currPolygons.airspaceSet.length > 0 ) {
        // We remove all geoJson
        mapOA.eachLayer(function(layer){
        if (layer.hasOwnProperty('feature')) {
            mapOA.removeLayer(layer)       
        }      
        }) 
        currPolygons = {} 
    } 
    currFileName = fileName.replace(/\.[^/.]+$/, "")
    currFilePath = fullPath
    decodeOA(fullPath)     
}

function decodeOA(filename) {
    let modeDebug = true
    let content = fs.readFileSync(filename, 'utf8')
    let openRequest = {
        oaText : content, 
        report : false     // Mode debug with full decoding report 
    }
    const oaDecoding = ipcRenderer.send('read-open', openRequest)
  }

function defaultMap() {
    if (mapOA != null) {
      mapOA.off()
      mapOA.remove()
    }

    let mapLat, mapLong
    let defLong = store.get('finderlong')
    let defLat = store.get('finderlat')
    mapLat = defLat != undefined && defLat != '' ? defLat : 45.8326  // Mont Blanc
    mapLong = defLong != undefined && defLong != '' ? defLong : 6.865  // Mont Blanc
    mapOA = L.map('mapid').setView([mapLat, mapLong], 12)

    sidebar = L.control.sidebar({
        autopan: false,       // whether to maintain the centered map point when opening the sidebar
        closeButton: true,    // whether t add a close button to the panes
        container: 'infobar', // the DOM container or #ID of a predefined sidebar container that should be used
        position: 'left',     // left or right
      }).addTo(mapOA)


    // The tree containing the layers

    layerscontrol = L.control.layers.tree(baseTree).addTo(mapOA)

  //  L.control.layers(baseMaps).addTo(mapOA)
    const defaultMap = store.get('map')
    switch (defaultMap) {
      case 'open':
        baseMaps.OpenTopo.addTo(mapOA)  
        break
      case 'ign':
        baseMaps.IGN.addTo(mapOA)  
        break      
      case 'osm':
        baseMaps.OSM.addTo(mapOA) 
        break
      case 'mtk':
        baseMaps.MTK.addTo(mapOA)  
        break  
      case '4u':
        baseMaps.UMaps.addTo(mapOA)
        break     
      case 'out':
        baseMaps.Outdoor.addTo(mapOA)           
        break           
      default:
        baseMaps.OSM.addTo(mapOA)        
        break     
    }
}

function totalUpdate() {
    labelFile.innerHTML = '&ensp;'+currFileName+' : '+currPolygons.airspaceSet.length+'&ensp;'
    displaySubNavbar()
    // First it's necessary to sort the array of airspaces
    let classPolygons = currPolygons.airspaceSet.sort((oaObject1, oaObject2) => {
        if(oaObject1.class+oaObject1.name > oaObject2.class+oaObject2.name){
            return 1
        }else{
            return -1
        }
    })
    mapUpdate(classPolygons)
}

function changeFloor() {
    const ceilingLimit = selFloor.value
    const polygonsFloor = currPolygons.airspaceSet.filter(element => {
        return element.floor < ceilingLimit
    })
   if (polygonsFloor.length > 0) {
        // We remove all geoJson
        mapOA.eachLayer(function(layer){
            if (layer.hasOwnProperty('feature')) {
                mapOA.removeLayer(layer)       
            }        
        }) 
        // it's necessary to sort the new array of filtered airspaces
        let classPolygons = polygonsFloor.sort((oaObject1, oaObject2) => {
            if(oaObject1.class+oaObject1.name > oaObject2.class+oaObject2.name){
                return 1
            }else{
                return -1
            }
        })
        labelFile.innerHTML = currFileName+' : '+classPolygons.length
        mapUpdate(classPolygons)
   }
}

function changeRestricted(){
    if (checkRest.checked === false){
        // Airspaces E,F, G and res are removed        
        const polygonsNoRest = currPolygons.airspaceSet.filter(element => {
            return element.class != 'E' && element.class != 'F' && element.class != 'G'
        })        
        if (polygonsNoRest.length > 0) {
            // We remove all geoJson
            mapOA.eachLayer(function(layer){
                if (layer.hasOwnProperty('feature')) {
                    mapOA.removeLayer(layer)       
                }        
            }) 
            // it's necessary to sort the new array of filtered airspaces
            let classPolygons = polygonsNoRest.sort((oaObject1, oaObject2) => {
                if(oaObject1.class+oaObject1.name > oaObject2.class+oaObject2.name){
                    return 1
                }else{
                    return -1
                }
            })
            labelFile.innerHTML = currFileName+' : '+classPolygons.length
            mapUpdate(classPolygons)        
        }        
      } else {
        console.log('checked true')
      }    
}

function mapArea(areaCoord) {
    let areaGeojson = {
        type :"Feature",
        properties : {
            "name": "area select"
          },
        geometry : {
            type : "Polygon",
            coordinates : areaCoord
        } 
    }
    let selectPolygons = []
    mapOA.eachLayer(function(layer){
        if (layer.hasOwnProperty('feature')) {
            if (turfIntersect(areaGeojson,layer.feature)) {
                let selected = currPolygons.airspaceSet.find(e => {    
                    if (e.dbGeoJson.properties.Name === layer.feature.properties.Name) {
                    return e
                }
                })
                selectPolygons.push(selected)                
            }
        
        }
    })
    if (selectPolygons.length > 0) {
        // We remove all geoJson
        mapOA.eachLayer(function(layer){
            if (layer.hasOwnProperty('feature')) {
                mapOA.removeLayer(layer)       
            }        
        })     
        // it's necessary to sort the new array of filtered airspaces
        let finalPolygons = selectPolygons.sort((oaObject1, oaObject2) => {
            if(oaObject1.class+oaObject1.name > oaObject2.class+oaObject2.name){
                return 1
            }else{
                return -1
            }
        })
        labelFile.innerHTML = currFileName+' : '+finalPolygons.length
        mapUpdate(finalPolygons)
    }      
}

function mapReset() {
    totalUpdate()
}

function mapUpdate(classPolygons) {
    // Impossible to add children dynamically on the tree
    // https://github.com/jjimenezshaw/Leaflet.Control.Layers.Tree/issues/26
    // We must remove
    layerscontrol.remove()
    // We build the overlay tree
    let overlaysTree = {
        label: 'Airspaces',
        selectAllCheckbox: true,
        children: []
    }
    overlaysTree.children.push({label: '<div id="onlysel">-Show only selected-</div>'})
    let refClass = ''
    let subSet = new Object()
    subSet.children = []
    for (let i = 0; i < classPolygons.length; i++) {
        if (classPolygons[i].class != refClass) {
            if (subSet.children.length > 0) {
                overlaysTree.children.push(subSet)
                subSet = new Object()
                subSet.children = []
            }
            subSet.label = classPolygons[i].class
            subSet.selectAllCheckbox = true
            subSet.children = []        
            refClass = classPolygons[i].class
        }
        let layerProp =  {
            label : classPolygons[i].class+' '+classPolygons[i].name,
            layer : new L.GeoJSON(classPolygons[i].dbGeoJson, {
                style : styleReg,
                // onEachFeature: function (feature, layer) {       
                //     layer.on('mouseover', function () {
                //    //     console.log({feature})
                //     info.update(layer.feature.properties.Name)                
                //    console.log(layer.feature.properties.Name)
                //         this.setStyle({
                //             weight: 3,
                //             color: '#666',
                //             dashArray: '',
                //             fillOpacity: 0.7                            
                //         });
                //     });
                //     layer.on('mouseout', function () {
                //         console.log('mouse out')
                //         info.update('')   
                //         this.setStyle({
                //             fillColor: getColor(feature.properties.Cat),
                //             weight: 1,
                //             opacity: 1,
                //             color: 'white',
                //             fillOpacity: 0.4
                //         });
                //     });

                // }
            })
        }
        subSet.children.push(layerProp)  
        mapOA.addLayer(layerProp.layer)     
    }
    // Last class must be added
    if (subSet.children.length > 0) {
        overlaysTree.children.push(subSet)
    }

    layerscontrol = L.control.layers.tree(baseTree, overlaysTree,
        {
            namedToggle: true,
            selectorBack: false,
            closedSymbol: '&#8862; &#x1f5c0;',
            openedSymbol: '&#8863; &#x1f5c1;',
            collapseAll: 'Collapse all',
            expandAll: 'Expand all',
            collapsed: false,
            selectAll : true
        })

    layerscontrol.addTo(mapOA).collapseTree().expandSelected().collapseTree(true)
    L.DomEvent.on(L.DomUtil.get('onlysel'), 'click', function() {
        layerscontrol.collapseTree(true).expandSelected(true)
    })
   

    let areaSelect = null
    if (toggleSelect === null || toggleSelect === undefined) {
        // https://github.com/cliffcloud/Leaflet.EasyButton
        toggleSelect = L.easyButton({
            states: [{
                stateName: 'add-rect',
                icon: 'fa-square',
                title: i18n.gettext('Show the selection rectangle'),
                onClick: function(control) {
                    Add_Rect()
                    control.state('remove-rect')
                }
            }, {
                icon: 'fa-check',
                stateName: 'remove-rect',
                onClick: function(control) {
                    Remove_Rect()
                    control.state('add-rect')
                },
                title: i18n.gettext('Removes the selection rectangle')
            }]
            })
        
        toggleSelect.addTo(mapOA)
    }

    let cMin = L.latLng(currPolygons.bbox.minlat,currPolygons.bbox.minlon)
    let cMax = L.latLng(currPolygons.bbox.maxlat,currPolygons.bbox.maxlon)
    mapOA.fitBounds(L.latLngBounds(cMin, cMax))

    mapOA.on('click',function(e){
        let infoPanel = ''  
		lat = e.latlng.lat
		lon = e.latlng.lng
        let titleText = i18n.gettext('Lat')+' : '+(Math.round(lat * 1000) / 1000).toFixed(3)+'   '+i18n.gettext('Long')+' : '+(Math.round(lon * 1000) / 1000).toFixed(3)     
        let pointClick = [e.latlng.lng, e.latlng.lat]
        mapOA.eachLayer(function(layer){
            if (layer.hasOwnProperty('feature')) {
                if (turfBoolean(pointClick, layer.feature)) {
                    infoPanel += infoLayout(layer.feature.properties)
                  }
            }
          
        })
        if (infoPanel != '') {
            infoPanel = infoPanel.replace (/^/,'<br>')
            sidebar.removePanel('summary')
            sidebar.addPanel({
                id:   'summary',
                tab:  '<i class="fa fa-gear"></i>',
                title: titleText,
                pane: infoPanel
              })
            sidebar.open('summary')
        }
    })

    function Add_Rect() {
        areaSelect = L.areaSelect({width:200, height:200})
        areaSelect.addTo(mapOA)
    }

    function Remove_Rect() {
        let bounds = areaSelect.getBounds()
        const corner1 = [bounds.getSouthWest().lng,bounds.getNorthEast().lat]
        const corner2 = [bounds.getNorthEast().lng,bounds.getNorthEast().lat]
        const corner3 = [bounds.getNorthEast().lng,bounds.getSouthWest().lat]
        const corner4 = [bounds.getSouthWest().lng,bounds.getSouthWest().lat]        
        const areaCoord = [[corner1,corner2,corner3,corner4,corner1]]
        areaSelect.remove()
        mapArea(areaCoord)
    }    

    function styleReg(feature){
        return{
            fillColor: getColor(feature.properties.Cat),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.4
        }
    }

    function getColor(a){
        return  a>22 ? '#999999':   
                a>21 ? '#999999':
                a>20 ? '#FFCC00':
                a>19 ? '#5B900A':
                a>18 ? '#00FF00':
                a>17 ? '#66CCFF':
                a>16 ? '#FF9999':            
                a>15 ? '#FF00FF':
                a>14 ? '#000000':
                a>13 ? '#9999CC':
                a>12 ? '#99FFFF':
                a>11 ? '#FFFF00':
                a>10 ? '#19BFBF':   
                a>9 ? '#7FBC58':
                a>8 ? '#A47A11':
                a>7 ? '#900A68':
                a>6 ? '#4B0A90':
                a>5 ? '#FFCCCC':
                a>4 ? '#FF0000':            
                a>3 ? '#0000FF':
                a>2 ? '#1971BF':
                a>1 ? '#FFCCCC':
                a>0 ? '#FE9A2E':                                                 
                '#9999CC' 
    }

    function getColBack(a){
        return  a>22 ? '#999999; color: black;':   
                a>21 ? '#999999; color: black;':
                a>20 ? '#FFCC00; color: black;':
                a>19 ? '#5B900A; color: white;':
                a>18 ? '#00FF00; color: black;':
                a>17 ? '#66CCFF; color: black;':
                a>16 ? '#FF9999; color: black;':            
                a>15 ? '#FF00FF; color: white;':
                a>14 ? '#000000; color: white;':
                a>13 ? '#9999CC; color: black;':
                a>12 ? '#99FFFF; color: black;':
                a>11 ? '#FFFF00; color: black;':
                a>10 ? '#19BFBF; color: white;':   
                a>9 ? '#7FBC58; color: black;':
                a>8 ? '#A47A11; color: white;':
                a>7 ? '#900A68; color: white;':
                a>6 ? '#4B0A90; color: white;':
                a>5 ? '#FFCCCC; color: black;':
                a>4 ? '#FF0000; color: white;':            
                a>3 ? '#0000FF; color: white;':
                a>2 ? '#1971BF; color: white;':
                a>1 ? '#FFCCCC; color: black;':
                a>0 ? '#FE9A2E; color: black;':                                                 
                '#9999CC; color: black;' 
    }

    function infoLayout(pProperties) {
        let htmlText = '<p style="text-align: center;font-size:16px;background-color: '+getColBack(pProperties.Cat)+'">'
        htmlText += i18n.gettext('Class')+' : '+pProperties.Class+'&ensp;'+pProperties.Name+'</p>'
        htmlText += '<p style="text-align: center;"><span style="background-color: #292b2c; color: white;margin-right: 50px">&ensp;'
        htmlText += i18n.gettext('Floor')+' : '+pProperties.Floor+' m&ensp;</span>'
        htmlText += '<span style="background-color:  #d9534f; color: white;">&ensp;'
        htmlText += i18n.gettext('Ceiling')+' : '+pProperties.Ceiling+'m&ensp;</span></p><br>'
        htmlText += '<p>'+pProperties.Comment+'</p>'

        return htmlText
    }
}

function save() {
    let openText = ''
    mapOA.eachLayer(function(layer){
        if (layer.hasOwnProperty('feature')) {
            let selected = currPolygons.airspaceSet.find(e => {    
                if (e.dbGeoJson.properties.Name === layer.feature.properties.Name) {
                    return e
                }
            })
            openText += selected.openair+"\r\n\r\n"
        }      
    })
    if (openText != '') {
        const currentdate = new Date()
        let dateOp = moment(currentdate).format("DD MM YYYY")
        let headerFile = "**********************************************************************\r\n"
        headerFile += "*                                                                    *\r\n"
        headerFile += "*                         OPEN AIR FILE                              *\r\n"
        headerFile += "*                      Generated by LOGFLY 6                         *\r\n"
        headerFile += "*                            "+dateOp+"                              *\r\n"
        headerFile += "*                                                                    *\r\n"
        headerFile += "**********************************************************************\r\n\r\n"
        let totalText = headerFile+openText
        const exportResult = ipcRenderer.sendSync('save-open',totalText)
        if (exportResult.indexOf('Error') !== -1) {
            alert(exportResult)      
        } else {
            alert(i18n.gettext('Successful operation'))
        }  
    }    
}

function exportGPX() {
    const togpx = require('togpx')
    let totalGeoJson = {    
        "type": "FeatureCollection",
        "features": []
    }
    let nbGeoJson = 0
    mapOA.eachLayer(function(layer){
        if (layer.hasOwnProperty('feature')) {
            let selected = currPolygons.airspaceSet.find(e => {    
                if (e.dbGeoJson.properties.Name === layer.feature.properties.Name) {
                    return e
                }
            })
            totalGeoJson.features.push(selected.dbGeoJson)
            nbGeoJson++
        }      
    })
    if (nbGeoJson > 0) {
        //console.log(JSON.stringify(totalGeoJson))
        let gpxText = togpx(totalGeoJson)
        const exportResult = ipcRenderer.sendSync('save-gpx',gpxText)
        if (exportResult.indexOf('Error') !== -1) {
            alert(exportResult)      
        } else {
            alert(i18n.gettext('Successful operation'))
        }  
    }
}

function downloadBazile() {
    $('#waiting-spin').removeClass('d-none')
    
    const memBazile = store.get('urlairspace')
    const defBazile = 'http://pascal.bazile.free.fr/paraglidingFolder/divers/GPS/OpenAir-Format/files/LastVers_ff-French-outT.txt'
    let baziUrl
    if (memBazile != 'undefined' && memBazile != '') {
        baziUrl = memBazile
    } else {
        baziUrl = 'http://pascal.bazile.free.fr/paraglidingFolder/divers/GPS/OpenAir-Format/files/LastVers_ff-French-outT.txt'
        store.set('urlairspace',baziUrl)
    } 
    const config = {
        timeout: 5000, 
        retries: 3,
        domain: baziUrl
    }
    checkInternetConnected(config)
        .then((result) => {
            ipcRenderer.send('dl-file-progress', baziUrl)
        })
        .catch((ex) => {
            alert(i18n.gettext('Bad download URL'))
        });
}

function displaySubNavbar() {
    $('#lb-file').removeClass('d-none')
    $('#lb-floor').removeClass('d-none')
    $('#sel-floor').removeClass('d-none')
    $('#lb-rest').removeClass('d-none')
    $('#lb-checkbox').removeClass('d-none')
    $('#reset').removeClass('d-none')
    $('#save').removeClass('d-none')
    $('#drop-save').removeClass('d-none')
}

function hideSubNavbar() {
    $('#lb-file').addClass('d-none')
    $('#lb-floor').addClass('d-none')
    $('#sel-floor').addClass('d-none')
    $('#lb-rest').addClass('d-none')
    $('#lb-checkbox').addClass('d-none')
    $('#reset').addClass('d-none')
    $('#save').addClass('d-none')
    $('#drop-save').addClass('d-none')
}