const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../../views/tpl/sidebar.js')
const dbadd = require('../../utils/db/db-add.js');
const { geoJSON } = require('leaflet');
const btnMenu = document.getElementById('toggleMenu')
const btnOption1 = document.getElementById('option1')
const btnOption2 = document.getElementById('option2')
const btnOption3 = document.getElementById('option3')
const btnOption4 = document.getElementById('option4')
const statusContent = document.getElementById("status")
let currLang

iniForm()

function iniForm() {
    try {    
        document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'  
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
    document.getElementById('tx_1').innerHTML = i18n.gettext('Utilities')
    document.getElementById('tx_2').innerHTML = i18n.gettext('Coming soon')+'...'
    btnOption1.innerHTML = i18n.gettext('Logbook copy')
    btnOption2.innerHTML = i18n.gettext('Json export')
    btnOption3.innerHTML = i18n.gettext('Csv import')
    btnOption4.innerHTML = i18n.gettext('Serial ports')
    btnOption1.addEventListener('click',(event) => {logbookCopy()})
    btnOption2.addEventListener('click',(event) => {jsonExport()})
    btnOption3.addEventListener('click',(event) => {csvChoose()})
    btnOption4.addEventListener('click',(event) => {listSerialPorts()})
}

$(document).ready(function () {
    let selectedFixedMenu =  store.get('menufixed') 
    if (selectedFixedMenu === 'yes') {
      $("#sidebar").removeClass('active')
      $('#toggleMenu').addClass('d-none')
      document.getElementById("menucheck").checked = true;
    }
  })
  
  function changeMenuState(cbmenu) {
    if (cbmenu.checked) {
      $("#sidebar").removeClass('active')
      $('#toggleMenu').addClass('d-none')
      store.set('menufixed','yes') 
    } else {
      $("#sidebar").addClass('active')
      $('#toggleMenu').removeClass('d-none')
      store.set('menufixed','no') 
    }
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

function logbookCopy() {
    $('#status').hide()
    $('#div_text').removeClass('d-none')
    document.getElementById('tx_1').innerHTML = 'test OpenAIP'
    document.getElementById('tx_2').innerHTML = '...'
    testOpenAIP()
}

function jsonExport() {
    $('#status').hide();
    $('#div_text').removeClass('d-none')
}

function csvChoose() {
    clearStatus()
    $('#div_text').addClass('d-none')
    const msg1 = i18n.gettext('This option is reserved for files exported by Logfly 5')
    const mgs2 = i18n.gettext('Choose a file')
    let msg = msg1+'&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<button class="btn btn-info" style="margin-bottom: 10px" onclick="loadCsv()" id="btn-export">'
    msg += mgs2+'</button>'
    displayStatus(msg)     
}

function loadCsv() {
    const selectedFile = ipcRenderer.sendSync('open-file','')
    if(selectedFile.fullPath != null) {
        let selExt = selectedFile.fileExt.toUpperCase()
        if (selExt == 'CSV') {
            let content = fs.readFileSync(selectedFile.fullPath, 'utf8')
            let arrData = CSVToArray(content,';')
            if (arrData.length > 0) {
                const regexDuree = /^([0-1]?[0-9]|2[0-3])h([0-5]?[0-9])mn$/     
                let arrFlights = []
                arrData.forEach(element => {
                    /* norme bug de Logfly5 qui ne prenait pas le premier caractère pour l'heure
                    * En partant de 2008-08-21 11:06:00
                    * on obtenait pour l'élément[0] "2008-08-21 " avec un espace
                    * on obtenait pour l'élément[1] "1:06:00" où le premier caractère était tronqué
                    * on reconstitue sqlDate en ajoutant systématiquement un 1
                    */
                    let iDuree= 0
                    if (element[0] != '' && element[0] != 'Date') {
                        if (element[3].match(regexDuree)) {
                            let arrDuree = regexDuree.exec(element[3])
                            try {
                                let hours = arrDuree[1]
                                let min = arrDuree[2]
                                let sec = (hours*3600)+(min*60)
                                iDuree = sec 
                            } catch (error) {
                                iDuree = 0
                            }
                        } 
                        const flight = { 
                            sqlDate : element[0]+'1'+element[1],            // V_date
                            utc : element[2] != '' ? element[2] : 0,        // V_UTC                
                            sduree : element[3],                            // V_sDuree
                            duree : iDuree,                                 // V_Duree
                            site : element[4],                              // V_Site
                            pays : element[5],                              // V_Pays
                            alt : element[6],                               // V_AltDeco
                            lat : element[7],                               // V_LatDeco 
                            long : element[8],                              // V_LongDeco
                            engin : element[9],                             // V_Engin
                            comment : element[10]                          // V_Commentaire
                        }
                        console.log(flight.sqlDate+' '+flight.comment)
                        arrFlights.push(flight)                
                    }
                })
                if (arrFlights.length > 0) {
                    let nbInserted = dbadd.importFlights(arrFlights)            
                    alert(nbInserted+' '+i18n.gettext('flights inserted in logbook'))
                } else {
                    alert(i18n.gettext('Decoding problem'))
                }
            } else {
                alert(i18n.gettext('File decoding problem'))
            }
        } else {
            alert(i18n.gettext('You must select a csv file'))
        }
    }
}

function listSerialPorts() {
    clearStatus()
    $('#div_text').addClass('d-none')
    let msg =''
    const regexProlif = /prolific/i
    const regexFlym = /flymas/i
    const regexFlymOld = /FTDI/i
    ipcRenderer.invoke('ports-list').then((result) => {
        if (result instanceof Array) { 
            msg = result.length+' '+i18n.gettext('ports detected')+'<br>'
            msg += '<table><tr><th>Serial Number</th><th>Path</th><th>Manufacturer</th></tr>'
            for (let i = 0; i < result.length; i++) {
                let manuF = ''
                if (typeof result[i].manufacturer != 'undefined') {
                    if (result[i].manufacturer.search(regexProlif) >= 0) {
                        manuF = result[i].manufacturer+' (Flytec)'
                    } else if (result[i].manufacturer.search(regexFlym) >= 0) {
                        manuF = result[i].manufacturer+' (Flymaster)'
                    } else if (result[i].manufacturer.search(regexFlymOld) >= 0) {
                        manuF = result[i].manufacturer+' (Flymaster Old)'     
                    }
                }               
                msg += ' <tr><td>'+result[i].serialNumber+'</td><td>'+result[i].path+'</td><td>'+manuF+'</td></tr>'                             
            }         
            msg += '</table>'
        } else {
          msg =(' No serial port found')
        }
        displayStatus(msg)
      })    
}

async function testOpenAIP() {
    const airspaces = await downloadAirspaces()
    const nbDownl = airspaces.length
    const filejson = path.join('/Users/gil/Documents/Flyxc', 'openaip.json');
    // console.log(filename)
    fs.writeFileSync(filejson, JSON.stringify(airspaces))
    if (Array.isArray(airspaces)) {
        ipcRenderer.invoke('openaip',airspaces,true).then((aipGeojson) => {      
            const nbAip = aipGeojson.features.length        
            if (nbAip > 0) {
                alert(`${nbAip} concernés / ${nbDownl} reçus  `)
            } else {
                alert(`Pas d'espaces concernés / ${nbDownl} reçus  `)
            }
            // debugging
            const filename = path.join('/Users/gil/Documents/Flyxc', 'geoaip.json');
            fs.writeFileSync(filename, JSON.stringify(aipGeojson))
            console.log('Ecriture OK...')
        })
    } 


    // const filename = path.join('/Users/gil/Documents/Flyxc', 'openaip.json');
    // console.log(filename)
    // fs.writeFileSync(filename, JSON.stringify(airspaces))
    // ipcRenderer.invoke('openaip',airspaces).then((result) => {
    //     console.log('Ouf...')
    //   })


/*     for (let i = 0; i < airspaces.length; i++) {
        const element = airspaces[i];
        console.log('type '+element.type)
    } */
   // let airspaceObj = JSON.parse(airspaces)
   // console.log(airspaceObj.length)
}

async function downloadAirspaces() {
  //  const OPENAIP_AIRSPACE_ENDPOINT = `https://api.core.openaip.net/api/airspaces?limit=1000&apiKey={key}&page={page}`;
    const openAipKey = '11241005d00b083e0a4ed1e66fdf05d3'
    // Semnoz
 //   const bbox = '6.0345,45.780233,6.102883,45.8245333'
    // planfait veyrier
   // const bbox = '6.17943333,45.83916,6.2298,45.8935'
   // on teste avec une marge de 11 km soit 0.1 degrés
   // mini -0.1   maxi +0.1
   const bbox = '6.079433,45.73916,6.3298,45.9935'
    //6.179433333333334,45.839166666666664,6.2298,45.8935
    // Governador
    //const bbox ='-41.985783,-18.993833,-41.903100,-18.869367'
    const airspaces = [];
    let delayMs = 10;
    let page = 1;
    let totalPages = 1;
    const openAip_Url = `https://api.core.openaip.net/api/airspaces?page=${page}&limit=1000&bbox=${bbox}&apiKey=${openAipKey}`
    console.log(openAip_Url)
    while (page <= totalPages) {       
    
    // test Annecy
    //const url =  'https://api.core.openaip.net/api/airspaces?page=1&limit=100&pos=45.863,6.1725&dist=35000&sortBy=name&sortDesc=true&apiKey=11241005d00b083e0a4ed1e66fdf05d3'
    // test bbox planfait veyrier
   //  const url =  'https://api.core.openaip.net/api/airspaces?page=1&limit=100&bbox=6.17943333,45.83916,6.2298,45.8935&sortBy=name&sortDesc=true&apiKey=11241005d00b083e0a4ed1e66fdf05d3'
   // test Planfait veyrier avec une marge de 11km soit 0,1 degrés

     // planfait + petit
     //               https://api.core.openaip.net/api/airspaces?page=1limit=1000&bbox=6.0345,45.780233,6.102883,45.8245333&apiKey=1124100…
   //   const url =  'https://api.core.openaip.net/api/airspaces?page=1&limit=1000&bbox=6.0345,45.780233,6.102883,45.8245333&apiKey=11241005d00b083e0a4ed1e66fdf05d3'
     // test gourdon
   //  const url =  'https://api.core.openaip.net/api/airspaces?page=1&limit=100&bbox=6.941416666666667,43.700183333333335,7.019166666666667,43.7297&sortBy=name&sortDesc=true&apiKey=11241005d00b083e0a4ed1e66fdf05d3'
      try {
        console.log(`fetching page ${page}/${totalPages}`);
        const response = await fetch(openAip_Url);
        // Delay to avoid too many requests.
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (response.ok) {
          const info = await response.json();
          totalPages = info.totalPages;
          airspaces.push(...info.items);
     //     console.dir(airspaces)
          page++;
          delayMs = 10;        
        } else {
          delayMs *= 2;
          console.error(`HTTP status ${response.status}`);
        }
      } catch (e) {
        console.error(`Error`, e);
      }
    }
    return airspaces;
  }

function displayStatus(content) {
    statusContent.innerHTML = content
    $('#status').show();
}

function clearStatus() {
    statusContent.innerHTML = ''
    $('#status').hide()
}

// ref: http://stackoverflow.com/a/1293163/2343
// This will parse a delimited string into an array of
// arrays. The default delimiter is the comma, but this
// can be overriden in the second argument.
function CSVToArray( strData, strDelimiter ){
    // Check to see if the delimiter is defined. If not,
    // then default to comma.
    strDelimiter = (strDelimiter || ",");

    // Create a regular expression to parse the CSV values.
    var objPattern = new RegExp(
        (
            // Delimiters.
            "(\\" + strDelimiter + "|\\r?\\n|\\r|^)" +

            // Quoted fields.
            "(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|" +

            // Standard fields.
            "([^\"\\" + strDelimiter + "\\r\\n]*))"
        ),
        "gi"
        );


    // Create an array to hold our data. Give the array
    // a default empty first row.
    var arrData = [[]];

    // Create an array to hold our individual pattern
    // matching groups.
    var arrMatches = null;


    // Keep looping over the regular expression matches
    // until we can no longer find a match.
    while (arrMatches = objPattern.exec( strData )){

        // Get the delimiter that was found.
        var strMatchedDelimiter = arrMatches[ 1 ];

        // Check to see if the given delimiter has a length
        // (is not the start of string) and if it matches
        // field delimiter. If id does not, then we know
        // that this delimiter is a row delimiter.
        if (
            strMatchedDelimiter.length &&
            strMatchedDelimiter !== strDelimiter
            ){

            // Since we have reached a new row of data,
            // add an empty row to our data array.
            arrData.push( [] );

        }

        var strMatchedValue;

        // Now that we have our delimiter out of the way,
        // let's check to see which kind of value we
        // captured (quoted or unquoted).
        if (arrMatches[ 2 ]){

            // We found a quoted value. When we capture
            // this value, unescape any double quotes.
            strMatchedValue = arrMatches[ 2 ].replace(
                new RegExp( "\"\"", "g" ),
                "\""
                );

        } else {

            // We found a non-quoted value.
            strMatchedValue = arrMatches[ 3 ];

        }


        // Now that we have our value string, let's add
        // it to the data array.
        arrData[ arrData.length - 1 ].push( strMatchedValue );
    }

    // Return the parsed data.
    return( arrData );
}

function displayStatus(content) {
    document.getElementById('status').innerHTML = content
    $('#status').show(); 
  }

  function hideStatus() {
    if ($('#status').show().is(":visible")) $('#status').hide();  
  }
