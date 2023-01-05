const {ipcRenderer} = require('electron')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const dbadd = require('../../../utils/db/db-add.js')

let langTable
let nbFiles = 0

iniForm()
// debug loadJson(null)

ipcRenderer.on('current-list', (event, sitesJson) => {  
    loadJson(sitesJson)    
})

ipcRenderer.on('dl-progress', (event, progress) => {
    const cleanPercent = Math.floor(progress.percent * 100); // Without decimal point
    $('.progress-bar').css('width', `${cleanPercent}%`).text(`${cleanPercent} %`)
});

ipcRenderer.on("dl-complete", (event, fullPathFile) => {
    console.log('Téléchargement terminé : '+fullPathFile) // Full file path
    //loadCsv(fullPathFile)
    loadJsonSites(fullPathFile)
    $('#div-progress').removeClass('d-block')
    $('#div-progress').addClass('d-none')       
});

function iniForm() {
    try {    
        currLang = store.get('lang')
        if (currLang != undefined && currLang != 'en') {
            currLangFile = currLang+'.json'
            langTable = path.join(__dirname, '../../../lang/',currLang+'_table.json')
            let content = fs.readFileSync(path.join(__dirname, '../../../lang/',currLangFile));
            let langjson = JSON.parse(content);            
            i18n.setMessages('messages', currLang, langjson)
            i18n.setLocale(currLang);            
           // translateLabels()
        }
    } catch (error) {
        log.error('[downsites.js] Error while loading the language file')
    }  
    document.getElementById("bt-close").innerHTML = i18n.gettext('Close')
    document.getElementById("bt-close").addEventListener('click',(event)=>{
        winClose()
    })
}

function loadJson(sitesJson) {
 //  let jsonPath = '/Users/gil/Documents/Logfly_Sites/Json/sites_list.json'
 //  sitesJson = fs.readFileSync(jsonPath, 'utf8')
    const sitesList = JSON.parse(sitesJson)  
    const dataTableOption = {
        data: sitesList,
        columns: [
            { title : i18n.gettext('Country'), data: 'country' },
            { title : i18n.gettext('Area'), data: 'area' },
            { title : i18n.gettext('Source'), data: 'source' },
            { title : i18n.gettext('File'), data: 'file' }
        ],
        columnDefs: [
            {
                "targets": 3, 
                "className": 'filename',
                render: function (data, type, row, meta) {
                    return '<input type="button" class="name" id=n-"' + meta.row + '" value="'+i18n.gettext('Download')+'"/>'
                },
                "searchable": false
            }
        ],
        bInfo : false,          // hide "Showing 1 to ...  row selected"
        lengthChange : false,   // hide "show x lines"  end user's ability to change the paging display length 
        language: {             // cf https://datatables.net/examples/advanced_init/language_file.html
            url: langTable,
            paginate: {
            first: '<<',
            last: '>>',
            next: '>', // or '→'
            previous: '<' // or '←' 
            }
        }, 
    }
    table = $('#table_id').DataTable(dataTableOption )
} 

$('#table_id').on('click', '.filename', function () {        
    let data = table.row( $(this).parents('tr') ).data()
    downloadSitesFile(data.file)
});

function downloadSitesFile(fileName) {
    const baseSitesUrl = 'http://logfly.org/download/sites/json/'   
    const fileUrl = baseSitesUrl+fileName 
    $('#div-progress').removeClass('d-none')
    ipcRenderer.send('dl-file-progress', fileUrl)
}

function loadJsonSites(jsonPath) {
    let content = fs.readFileSync(jsonPath, 'utf8')
    const arrSites = JSON.parse(content) 
    if (arrSites.length > 0) {
        let nbInserted = dbadd.importSites(arrSites)
        nbFiles++
        alert(i18n.gettext('imported sites')+' : '+nbInserted)
    } else {
        alert(i18n.gettext('File decoding problem'))
    }    
}

function loadCsv(csvPath) {
    let content = fs.readFileSync(csvPath, 'utf8')
    console.log(content)
    let arrData = CSVToArray(content,';')
    //let arrData = parseCSV(content)
    console.log({arrData})
    if (arrData.length > 0) {
        let nbInserted = dbadd.importSites(arrData)
        nbFiles++
        alert(i18n.gettext('imported sites')+' : '+nbInserted)
    } else {
        alert(i18n.gettext('File decoding problem'))
    }
}

function parseCSV(str) {
    var arr = [];
    var quote = false;
    for (var row = col = c = 0; c < str.length; c++) {
        var cc = str[c], nc = str[c+1];
        arr[row] = arr[row] || [];
        arr[row][col] = arr[row][col] || '';
        
        if (cc == '"' && quote && nc == '"') { arr[row][col] += cc; ++c; continue; }
        if (cc == '"') { quote = !quote; continue; }
        if (cc == ';' && !quote) { ++col; continue; }
        if (cc == '\n' && !quote) { ++row; col = 0; continue; }
        
        arr[row][col] += cc;
    }
    return arr;
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

function winClose() {
    if (nbFiles > 0) {
        // https://stackoverflow.com/questions/40251411/communication-between-2-browser-windows-in-electron
        // The number in sendTo is the ID of the window. Windows in electron are numbered automatically 
        // in ascending order from what I've noticed. This means that first window you create has an ID of 1, 
        // the second window has an ID of 2 and so on...
        ipcRenderer.sendTo(1, "back_sitedown", true)
    } else {
        // pour debug
        ipcRenderer.sendTo(1, "back_sitedown", false)
    }
    window.close()
}
