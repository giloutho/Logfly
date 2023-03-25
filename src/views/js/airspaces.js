const {ipcRenderer, clipboard} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
const btnSelect = document.getElementById('sel-open')
const btnLast = document.getElementById('last-used')
const btnBaz = document.getElementById('bazile')
const btnSave = document.getElementById('save')
const btnReset = document.getElementById('reset')
let currLang

const tiles = require('../../leaflet/tiles.js')
const L = tiles.leaf
const layerTree = require('leaflet.control.layers.tree')
const turfbbox = require('@turf/bbox').default
const turfcenter = require('@turf/center').default
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
let mapOA
let layerscontrol


iniForm()

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            let content = fs.readFileSync(path.join(__dirname, '../../lang/',currLangFile));
            let langjson = JSON.parse(content);
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang);
        }
      } catch (error) {
          log.error('[problem.js] Error while loading the language file')
      }  
    let menuOptions = menuFill.fillMenuOptions(i18n)
    $.get('../../views/tpl/sidebar.html', function(templates) { 
        var template = $(templates).filter('#temp-menu').html();  
        var rendered = Mustache.render(template, menuOptions)
        document.getElementById('target-sidebar').innerHTML = rendered
    })
    btnSelect.innerHTML = i18n.gettext('Select a file')
    btnSelect.addEventListener('click', (event) => {callDisk()})
    btnLast.innerHTML = i18n.gettext('Last Used')
    btnLast.addEventListener('click', (event) => {$('#ul-action').removeClass('d-none')})
    btnBaz.innerHTML = '@Bazile'
    btnSave.innerHTML = i18n.gettext('Save')
    btnReset.innerHTML = i18n.gettext('Reset')
    btnReset.addEventListener('click', (event) => {resetMap()})
    document.getElementById('dp-floor').innerHTML = i18n.gettext('Floor')



    defaultMap()
}

// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

btnMenu.addEventListener('click', (event) => {
    if (btnMenu.innerHTML === "Menu On") {
        btnMenu.innerHTML = "Menu Off";
    } else {
        btnMenu.innerHTML = "Menu On";
    }
    $('#sidebar').toggleClass('active');
})

ipcRenderer.on('open-airset', (event, airPolygons) => {
    console.log(airPolygons.airspaceSet.length+' reçus')
    if (airPolygons.airspaceSet.length > 0) {
        //mapAirspaces(airPolygons.airspaceSet)
     //   console.log('center lon '+airPolygons.center.long)
     console.log(airPolygons.bbox.minlat+' '+airPolygons.bbox.minlon+' '+airPolygons.bbox.maxlat+' '+airPolygons.bbox.maxlon)
        mapUpdate(airPolygons)
    }
})

function callDisk() {
    // const selectedFile = ipcRenderer.sendSync('open-file','')
    // if(selectedFile.fullPath != null) {
    //     alert(selectedFile.fullPath)
    // }    
    let testpath = []
    testpath[0] = '/Users/gil/Documents/Logfly/openair/Chamonix.txt'
    testpath[1] = '/Users/gil/Documents/Logfly/openair/Annecy_ctr.txt'
    testpath[2] = '/Users/gil/Documents/Logfly/openair/Reno.txt'
    testpath[3] = '/Users/gil/Documents/Logfly/openair/Annecy.txt'
    testpath[4] = '/Users/gil/Documents/Logfly/openair/montauban.txt'
    testpath[5] = '/Users/gil/Documents/Logfly/openair/Bazile_2022.txt'
    testpath[6] = '/Users/gil/Documents/Logfly/openair/160731__AIRSPACE_FRANCE_TXT_1604d.txt'
    testpath[7] = '/Users/gil/Documents/Logfly/openair/Bazile_2022_17740_Bad.txt'
    testpath[8] = '/Users/gil/Documents/Logfly/openair/Baden_B.txt'
    testpath[9] = '/Users/gil/Documents/Logfly/openair/Baden_B_Good.txt'
    testpath[10] = '/Users/gil/Documents/Logfly/openair/Bazile_2022_Good.txt'
    testpath[11] = '/Users/gil/Documents/Logfly/openair/sarlat.txt'
    let idxPath = 5
    decodeOA(testpath[idxPath])    
}

function decodeOA(filename) {
    //$('#title').text(filenameOpen)
    let modeDebug = true
    let content = fs.readFileSync(filename, 'utf8');
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
    mapOA = L.map('mapid').setView([51.505, -0.09], 13);

    // The tree containing the layers

    layerscontrol = L.control.layers.tree(baseTree).addTo(mapOA);

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

function mapAirspaces(airspaceSet) {
    // map is already intialized by defaultMap()
    // Impossible to add children dynamically on the tree
    // https://github.com/jjimenezshaw/Leaflet.Control.Layers.Tree/issues/26
    layerscontrol.remove()
    var thunderAttr = {attribution: '© OpenStreetMap contributors. Tiles courtesy of Andy Allan'}
    var transport = L.tileLayer(
        '//{s}.tile.thunderforest.com/transport/{z}/{x}/{y}.png',
        thunderAttr
    );

    var cycle = L.tileLayer(
        '//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
        thunderAttr
    );
    let newLayer = {
        label: 'Thunder',
        children: [
            {label: 'Cycle', layer: cycle},
            {label: 'Transport', layer: transport},
        ]
    }
    baseTree.push(newLayer)
    layerscontrol = L.control.layers.tree(baseTree).addTo(mapOA)

    // Modify layertree

    let totalGeo = {    
        "type": "FeatureCollection",
          "crs": { 
            "type": "name", 
            "properties": { 
              "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } 
          },
          "features": []
    }
    // We build the global geojson for all the spaces    
    for (let i = 0; i < airspaceSet.length; i++) {
        totalGeo.features.push(airspaceSet[i].dbGeoJson)
    }
    // console.log((JSON.stringify(totalGeo)))
    let Aff_Zone = new L.geoJson(totalGeo,{style:styleReg, onEachFeature : evenement})

    let info = L.control({position: 'bottomleft'})

    info.onAdd = function (mapOA) {
        this._div = L.DomUtil.create('div', 'info') 
        this.update()
        return this._div
    }
  
    info.update = function (txtLegende) {
        if (txtLegende === undefined) { txtLegende = 'Passez la souris sur un espace'; }
        this._div.innerHTML = txtLegende
    }
  
    info.addTo(mapOA)

  
    mapOA.addLayer(Aff_Zone);
    var boundMap = Aff_Zone.getBounds()
    mapOA.fitBounds(boundMap,{maxZoom : 15})

    function styleReg(feature){
        return{
            fillColor: getColor(feature.properties.Cat),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.4
        };
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
                '#9999CC'; 
    }

    function evenement(feature, layer) {
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
            });
    }    

    function javahighlightFeature(e) {
        var layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.5
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }        

        var txtLegende = '<h6><small>'+layer.feature.properties.Name+'</small></h6>';
        txtLegende +=  'Floor : '+ layer.feature.properties.Floor + '<br />';
        txtLegende +=  'Ceiling : '+ layer.feature.properties.Ceiling;
        info.update(txtLegende);            
    }

    function highlightFeature(e) {
        var layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }        

        var txtLegende = '<h6><small>'+layer.feature.properties.Name+'</small></h6>';
        txtLegende +=  'Class : '+ layer.feature.properties.Class + '<br />';
        txtLegende +=  'Floor : '+ layer.feature.properties.Floor + ' m<br />';
        txtLegende +=  'Ceiling : '+ layer.feature.properties.Ceiling+' m';
        info.update(txtLegende);
    }

    function resetHighlight(e) {
        Aff_Zone.resetStyle(e.target);
        info.update('Passez la souris sur un espace');
    }    

    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }
}

function resetMap() {
    $('#ul-action').removeClass('d-none')
}

function mapUpdate(airPolygons) {
    // First it's necessary to sort the array of airspaces
    let classPolygons = airPolygons.airspaceSet.sort((oaObject1, oaObject2) => {
        if(oaObject1.class > oaObject2.class){
            return 1;
        }else{
            return -1;
        }
    })

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
            console.log('refClass : '+refClass)
        }
        let layerProp =  {
            label : classPolygons[i].class+' '+classPolygons[i].name,
            layer : new L.GeoJSON(classPolygons[i].dbGeoJson, {
                style : styleReg,
                onEachFeature: function (feature, layer) {       
                    layer.on('mouseover', function () {
                        console.log({feature})
                        this.setStyle({
                            weight: 3,
                            color: '#666',
                            dashArray: '',
                            fillOpacity: 0.7                            
                        });
                    });
                    layer.on('mouseout', function () {
                        console.log({feature})
                        console.log({layer})
                        console.log(feature.properties.Cat)
                        this.setStyle({
                            fillColor: getColor(feature.properties.Cat),
                            weight: 1,
                            opacity: 1,
                            color: 'white',
                            fillOpacity: 0.4
                        });
                    });

                }
            })
        }
        subSet.children.push(layerProp)  
        mapOA.addLayer(layerProp.layer)     
    }
    // Last class must be added
    if (subSet.children.length > 0) {
        overlaysTree.children.push(subSet)
    }
    console.log({overlaysTree})

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
        });

    layerscontrol.addTo(mapOA).collapseTree().expandSelected().collapseTree(true)
    L.DomEvent.on(L.DomUtil.get('onlysel'), 'click', function() {
        console.log('clic onlysel')
        layerscontrol.collapseTree(true).expandSelected(true);
    })

    let info = L.control({position: 'bottomleft'})

    info.onAdd = function (mapOA) {
        this._div = L.DomUtil.create('div', 'info') 
        this.update()
        return this._div
    }
  
    info.update = function (txtLegende) {
        if (txtLegende === undefined) { txtLegende = 'Passez la souris sur un espace'; }
        this._div.innerHTML = txtLegende
    }
  
    info.addTo(mapOA)
  
   // console.log('center map '+airPolygons.center.lat+' '+airPolygons.center.long)
    //mapOA.setView([airPolygons.center.lat,airPolygons.center.long], 8)
    // mapOA.addLayer(Aff_Zone);
    // var boundMap = Aff_Zone.getBounds()
    // mapOA.fitBounds(boundMap,{maxZoom : 15})

    let cMin = L.latLng(airPolygons.bbox.minlat,airPolygons.bbox.minlon)
    let cMax = L.latLng(airPolygons.bbox.maxlat,airPolygons.bbox.maxlon)
    mapOA.fitBounds(L.latLngBounds(cMin, cMax))

    mapOA.on('click',function(e){  
		lat = e.latlng.lat;
		lon = e.latlng.lng;
		//alert(lat+' '+lon)	
        mapOA.eachLayer(function(layer){
          //  let toto = layer.feature.properties
          //if (('properties' in layer)) {
            if (layer.hasOwnProperty('feature')) {
                //console.log('OK '+layer.feature.hasOwnProperty('properties'))
                if (layer.feature.hasOwnProperty('properties')) {
                    console.log(layer.feature.properties.Name)
                }
            }
         // }
          
        });

    });

    function styleReg(feature){
        return{
            fillColor: getColor(feature.properties.Cat),
            weight: 1,
            opacity: 1,
            color: 'white',
            fillOpacity: 0.4
        };
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
                '#9999CC'; 
    }

    function evenement(feature, layer) {
        console.log('ev')
        console.log({feature})
        console.log({layer})
        layer.on({
            mouseover: highlightFeature,
            mouseout: resetHighlight,
            click: zoomToFeature
            });
    }    

    function javahighlightFeature(e) {
        var layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.5
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }        

        var txtLegende = '<h6><small>'+layer.feature.properties.Name+'</small></h6>';
        txtLegende +=  'Floor : '+ layer.feature.properties.Floor + '<br />';
        txtLegende +=  'Ceiling : '+ layer.feature.properties.Ceiling;
        info.update(txtLegende);            
    }

    function highlightFeature(e) {
        var layer = e.target;
        layer.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }        

        var txtLegende = '<h6><small>'+layer.feature.properties.Name+'</small></h6>';
        txtLegende +=  'Class : '+ layer.feature.properties.Class + '<br />';
        txtLegende +=  'Floor : '+ layer.feature.properties.Floor + ' m<br />';
        txtLegende +=  'Ceiling : '+ layer.feature.properties.Ceiling+' m';
        info.update(txtLegende);
    }

    function resetHighlight(e) {
        Aff_Zone.resetStyle(e.target);
        info.update('Passez la souris sur un espace');
    }    

    function zoomToFeature(e) {
        map.fitBounds(e.target.getBounds());
    }
}

function computeBbox(airspaceSet) {
    let totalGeo = {    
        "type": "FeatureCollection",
          "crs": { 
            "type": "name", 
            "properties": { 
              "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } 
          },
          "features": []
    }
    //We build the global geojson for all the spaces    
    for (let i = 0; i < airspaceSet.length; i++) {
        totalGeo.features.push(airspaceSet[i].dbGeoJson)
    }
    totalGeo.features = airspaceSet
    let totalbox = turfbbox(totalGeo)
    console.log({totalbox})
}