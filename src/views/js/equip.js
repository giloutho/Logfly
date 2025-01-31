const {ipcRenderer} = require('electron')

const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store()
const menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
const statusContent = document.getElementById("status")
const db = require('better-sqlite3')(store.get('dbFullPath'))
const dbcheck = require('../../utils/db/db-check.js')

let currLang
let tableLines = 8

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
    const equipTest = dbcheck.checkEquipTable()
    if (equipTest) {
        tableStandard()
    } else {
        alert(i18n.gettext('Unable to create Equip table'))
    }
}

$(document).ready(function () {
    let selectedFixedMenu =  store.get('menufixed') 
    if (selectedFixedMenu === 'yes') {
      $("#sidebar").removeClass('active')
      $('#toggleMenu').addClass('d-none')
      document.getElementById("menucheck").checked = true
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


function tableStandard() {
    if ($.fn.DataTable.isDataTable('#table_id')) {
        $('#table_id').DataTable().clear().destroy()
    }
    if (db.open) {
        let sqlReq = 'SELECT M_ID, strftime(\'%d-%m-%Y\',M_Date) AS Day, M_Engin, M_Event, M_Comment FROM Equip ORDER BY M_Date DESC'
        const stmtEq = db.prepare(sqlReq).all()
        const dataTableOption = {
          data: stmtEq, 
          autoWidth : false,
          columns: [           
              { title : i18n.gettext('Date'), data: 'Day' },
              { title : i18n.gettext('Equipment'), data: 'M_Engin' },
              { title : i18n.gettext('Operation'), data: 'M_Event' },
              { title : i18n.gettext('Comment'), data: 'M_Comment' },  
              {
                title :'',
                data: null,
                className: 'dt-center editor-edit',
                defaultContent: '<button><i class="fa fa-pencil"></i></button>',
                orderable: false
            },
            {
                title : '',
                data: null,
                className: 'dt-center editor-delete',
                defaultContent: '<button><i class="fa fa-trash"></i></button>',
                orderable: false
            }, 
            { title : 'id', data: 'M_ID' }
          ],      
          columnDefs : [
              { "width": "15%", "targets": 0 },
              { "width": "20%", "targets": 1 },
              { "width": "20%", "targets": 2 },
              { "width": "35%", "targets": 3 },
              { "width": "5%", "targets": 4 },
              { "width": "5%", "targets": 5 },
              { "targets": 6, "visible": false, "searchable": false },     
          ],      
          bInfo : false,          // hide "Showing 1 to ...  row selected"
          lengthChange : false,   // hide "show x lines"  end user's ability to change the paging display length 
         // searching : false,      // hide search abilities in table
          //dom: 'lptir',
          dom: 'lrtip',
          ordering: false,        // Sinon la table est triée et écrase le tri sql mais ds ce cas addrow le met à la fin
          pageLength: tableLines,         // ce sera à calculer avec la hauteur de la fenêtre
          pagingType : 'full',
          language: {             // cf https://datatables.net/examples/advanced_init/language_file.html
              paginate: {
              first: '<<',
              last: '>>',
              next: '>', // or '→'
              previous: '<' // or '←' 
              }
          },     
          select: true,            // Activation du plugin select
          }
        table = $('#table_id').DataTable(dataTableOption )
        $('#tx-search').on( 'keyup', function () {
          table.search( this.value ).draw()
        })
        table.on( 'select', function ( e, dt, type, indexes ) {
            if ( type === 'row' ) {
                console.log(dt.row(indexes).data().M_ID+' '+dt.row(indexes).data().Day+' '+dt.row(indexes).data().M_Engin+' '+dt.row(indexes).data().M_Event)
            }        
        } )
        table.on('click', 'td.editor-edit button', function (e) {
            // From https://editor.datatables.net/examples/simple/inTableControls.html
            console.log(table.row(this).data());
            console.log(e.target.closest('tr'))
            const tr = e.target.closest('tr')
            const row = table.row( tr ).data();
            console.log(row);
            alert('Edit id : '+row.M_ID)

        })
        if (table.data().count() > 0) {
          $('#table_id').removeClass('d-none')
          table.row(':eq(0)').select()    // Sélectionne la première lmigne
        }
    } else {
        displayStatus(i18n.gettext('Database connection failed'))
    }
}    // End of tableStandard

function displayStatus(content) {
    statusContent.innerHTML = content
    $('#status').show()
}

function clearStatus() {
    statusContent.innerHTML = ''
    $('#status').hide()
}
