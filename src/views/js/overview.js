//const db = require('better-sqlite3')(store.get('fullPathDb'))

tableWithScroll()


function tableWithScroll() {
  let start = performance.now();
  let msgdbstate  
  if ($.fn.DataTable.isDataTable('#table_id')) {
    $('#table_id').DataTable().clear().destroy()
  }
  if (db.open) {
    const stmt = db.prepare('SELECT COUNT(*) FROM Vol')
    let countFlights = stmt.get()
    // on récupére la valeur avec counFlights['COUNT(*)']
    msgdbstate = (`Connected : ${countFlights['COUNT(*)']} flights`);
    const flstmt = db.prepare('SELECT V_ID, strftime(\'%d-%m-%Y\',V_date) AS Day, strftime(\'%H:%M\',V_date) AS Hour, V_sDuree, V_Site, V_Engin FROM Vol ORDER BY V_Date DESC').all()    
    var dataTableOption = {
      data: flstmt, 
      columns: [
        { title : 'Date', data: 'Day' },
        { title : 'Time', data: 'Hour' },
        { title : 'Duration', data: 'V_sDuree' },
        { title : 'Site', data: 'V_Site' },
        { title : 'Glider', data: 'V_Engin' }    
      ],
      bInfo : false,   // hide "Showing 1 to ...  row selected"
      scrollY: '75vh',
      scrollCollapse: true,
      paging: false,
      ordering: false,
      select: true
    }
    var table = $('#table_id').DataTable(dataTableOption )
    table.row(':eq(0)').select();
    $('#table_id').removeClass('d-none')
  } else {
    msgdbstate = 'db connection error'
  }
  let timeTaken = performance.now()-start;
  console.log(`Operation took ${timeTaken} milliseconds`);   
}

// inutilisée pour l'instant
function convertSQLDate(sqldate) {
  let a = sqldate.split(" ");
  let d = a[0].split("-");
  let t = a[1].split(":");

  return (new Date(d[0],(d[1]-1),d[2],t[0],t[1],t[2]))
}
