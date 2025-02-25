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
const Database = require('better-sqlite3')
const db = new Database(store.get('dbFullPath'))
const dbcheck = require('../../utils/db/db-check.js')
const moment = require('moment')
const { event } = require('jquery')

const inputDate = document.getElementById('tx-date')
const inputEngin = document.getElementById('tx-engin')
const inputEvent = document.getElementById('tx-event')
const inputComment = document.getElementById('tx-comment')
const inputPrice = document.getElementById('tx-price')
const selectGlider = document.getElementById('select-glider')
const btnOk = document.getElementById('bt-ok')
const btnCancel = document.getElementById('bt-cancel')
const btnGlider = document.getElementById('bt-glider')

let currLang
let tableLines = 7
const currEquip = {}

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
    // Traduction à faire
 //   inputEngin.placeholder = i18n.gettext('Free input or retrieve a name from the glider\'s list')
    btnGlider.textContent = i18n.gettext('Glider')
    fillSelectGlider()
    const equipTest = dbcheck.checkEquipTable()
    if (equipTest) {
        infoStatus()
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

function infoStatus() {
    if (db.open) {
        const stmt = db.prepare('SELECT COUNT(*) FROM Equip')
        let countRec = stmt.get()
        let contentStatus = '<form class="form-inline">'
        contentStatus += '<span class="badge badge-dark">'+i18n.gettext('Equipment')+'</span>'
        contentStatus += '<span style="margin-left: 10px;">'+i18n.gettext('You can record all operations ')+' : '
        contentStatus += i18n.gettext('purchase')+', '
        contentStatus += i18n.gettext('sale')+', '
        contentStatus += i18n.gettext('overhaul')+', '
        contentStatus += i18n.gettext('emergency folding')+', '
        contentStatus += i18n.gettext('chocking')+', '
        contentStatus += i18n.gettext('etc')+'...</span>'
        contentStatus +='<span style="margin-left: 15px;"><button type="button" class="btn btn-info"  onclick="newRec()">'+i18n.gettext('Add')+'</button></span>'
        contentStatus +='<span style="margin-left: 15px;"><input type="search" id="tx-search" style="text-transform: uppercase" '
        contentStatus += 'aria-label="Search" placeholder="'+i18n.gettext('Search')+'...'+'"></form></span>'
        displayStatus(contentStatus)
        if (countRec['COUNT(*)'] > 0) tableStandard()
    }
}

function tableStandard() {
    if ($.fn.DataTable.isDataTable('#table_id')) {
        $('#table_id').DataTable().clear().destroy()
    }
    if (db.open) {
        let sqlReq = 'SELECT M_ID, strftime(\'%d-%m-%Y\',M_Date) AS Day, strftime(\'%Y-%m-%d\',M_Date) AS Calendar, M_Engin, M_Event, M_Comment, M_Price FROM Equip ORDER BY M_Date DESC'
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
            { title : 'id', data: 'M_ID' },
            { title : 'Cal', data: 'Calendar' },
            { title : 'Pr', data: 'M_Price' }
          ],      
          columnDefs : [
              { "width": "15%", "targets": 0 },
              { "width": "20%", "targets": 1 },
              { "width": "20%", "targets": 2 },
              { "width": "35%", "targets": 3 },
              { "width": "5%", "targets": 4 },
              { "width": "5%", "targets": 5 },
              { "targets": 6, "visible": false, "searchable": false },   
              { "targets": 7, "visible": false, "searchable": false },   
              { "targets": 8, "visible": false, "searchable": false }  
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
        // Update record
        table.on('click', 'td.editor-edit button', function (e) {
            // From https://editor.datatables.net/examples/simple/inTableControls.html
            const tr = e.target.closest('tr')
            const row = table.row( tr ).data()
            updateRec(row)

        })
        // Delete record
        table.on('click', 'td.editor-delete button', function (e) {
            const tableTr = $(this).parents('tr')
            const row = table.row( tr ).data()
            deleteRec(row,tableTr)
        //https://datatables.net/reference/api/row().remove()
       // table.row($(this).parents('tr')).remove().draw()
        })
        if (table.data().count() > 0) {
          $('#table_id').removeClass('d-none')
          table.row(':eq(0)').select()    // Sélectionne la première lmigne
        }
    } else {
        displayStatus(i18n.gettext('Database connection failed'))
    }
}    // End of tableStandard


function newRec() {
    currEquip.id = -1
    currEquip.calendar = ''
    inputDate.value = ''
    currEquip.engin = ''
    inputEngin.value = ''
    currEquip.event = ''
    inputEvent.value = ''
    currEquip.price = ''
    inputPrice.value = ''
    currEquip.comment = ''
    inputComment.value = ''
    $('#table_id').addClass('table-disabled')
    $('#input-equip').removeClass('d-none')
}

function updateRec(row) {
    currEquip.id = row.M_ID
    currEquip.calendar = row.Calendar
    inputDate.value = row.Calendar
    currEquip.engin = row.M_Engin
    inputEngin.value = row.M_Engin
    currEquip.event = row.M_Event
    inputEvent.value = row.M_Event
    currEquip.price = row.M_Price
    inputPrice.value = row.M_Price
    currEquip.comment = row.M_Comment
    inputComment.value = row.M_Comment
    $('#table_id').addClass('table-disabled')
    $('#input-equip').removeClass('d-none')
}

function dbUpdate() {
    const sqlDate = inputDate.value +' 00:00:00'
    currEquip.engin = inputEngin.value.toUpperCase()
    currEquip.event = inputEvent.value.toUpperCase()
    currEquip.price = inputPrice.value
    currEquip.comment = inputComment.value
    if (db.open) {
        try {
            if (currEquip.id > 0) {
                const stmtUp =  db.prepare('UPDATE Equip SET M_Date=?, M_Engin=?, M_Event=?, M_Price=?, M_Comment=? WHERE M_ID =?')   
                const updSite = stmtUp.run(sqlDate, currEquip.engin, currEquip.event, currEquip.price, currEquip.comment,currEquip.id)            
            } else {
                const stmtAdd = db.prepare('INSERT INTO Equip (M_Date, M_Engin, M_Event, M_Price, M_Comment) VALUES (?,?,?,?,?)')       
                const addSite = stmtAdd.run(sqlDate, currEquip.engin, currEquip.event, currEquip.price, currEquip.comment)            
            }     
            tableStandard()     
        } catch (error) {
            alert(i18n.gettext('Problem while updating the logbook'))
            log.error('[equip.js/dbUpadte] error : '+error)  
        }        
    } else {
        alert(i18n.gettext('Problem while updating the logbook'))
        log.error('[equip.js/dbUpadte] db not open')  
    }   
}

function deleteRec(row, tableTr) {
    const dialogLang = {
        title: i18n.gettext('Please confirm'),
        message: i18n.gettext('Are you sure you want to continue')+' ?',
        yes : i18n.gettext('Yes'),
        no : i18n.gettext('No')
    }

    ipcRenderer.invoke('yes-no',dialogLang).then((result) => {
        if (result) {
            let id = row.M_ID
            if (db.open) {
                let smt = 'DELETE FROM Equip WHERE M_ID = ?'            
                const stmt = db.prepare(smt)
                const delRec = stmt.run(id)  
                //https://datatables.net/reference/api/row().remove()
                table.row(tableTr).remove().draw() 
            }
        }
    })
}

function fillSelectGlider() {
    // https://stackoverflow.com/questions/5805059/how-do-i-make-a-placeholder-for-a-select-box
    let firstOption = document.createElement("option")
    firstOption.value = ""
    firstOption.disabled = true
    firstOption.selected = true
    firstOption.innerHTML = i18n.gettext('Glider from logbook')
    selectGlider.appendChild(firstOption)
    const GliderSet = db.prepare(`SELECT V_Engin, strftime('%Y-%m',V_date) FROM Vol GROUP BY upper(V_Engin) ORDER BY strftime('%Y-%m',V_date) DESC`)
    let nbGliders = 0
    for (const gl of GliderSet.iterate()) {
        if (gl.V_Engin != null && gl.V_Engin != '') {
            nbGliders++
            let newOption = document.createElement("option")
            newOption.value= nbGliders.toString()
            newOption.innerHTML= (gl.V_Engin)
            selectGlider.appendChild(newOption)
        }
    } 
}

function gliderChoice() {
    $('#select-glider').removeClass('d-none')
}

//onChange event on SelectGlider
function grabGlider() {
    inputEngin.value = selectGlider.options[selectGlider.selectedIndex].text
}

function validFields() {
    // currEquip.id = row.M_ID
    // currEquip.calendar = row.Calendar
    // inputDate.value = row.Calendar
    // currEquip.engin = row.M_Engin
    // inputEngin.value = row.M_Engin
    // currEquip.event = row.M_Event
    // inputEvent.value = row.M_Event
    // currEquip.price = row.M_Price
    // inputPrice.value = row.M_Price
    // currEquip.comment = row.M_Comment
    // inputComment.value = row.M_Comment

    // if (inputDate.value == '' || inputDate.value == null) {
    //     alert(i18n.gettext('Name must not be null'))
    // } 
    if (inputDate.value == null || inputDate.value == "") {
        $('#tx-date').val('').css( "border-color", "red" )
    } else if (inputEngin.value == null || inputEngin.value == "") {
        $('#tx-engin').val('').css( "border-color", "red" )
    } else if (inputEvent.value == null || inputEvent.value == "") {
        $('#tx-event').val('').css( "border-color", "red" )
    } else {
        dbUpdate()
        inputEvent.value = ''        
        $('#input-equip').addClass('d-none')
        $('#select-glider').addClass('d-none')
        $('#table_id').removeClass('table-disabled')
    }
    
}

btnOk.addEventListener('click', (event) => {
    validFields()
})

btnCancel.addEventListener('click', (event)=> {
    $('#input-equip').addClass('d-none')
    $('#table_id').removeClass('table-disabled')
})

function displayStatus(content) {
    statusContent.innerHTML = content
    $('#status').show()
}

function clearStatus() {
    statusContent.innerHTML = ''
    $('#status').hide()
}
