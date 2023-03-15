const {ipcRenderer} = require('electron')
const Highcharts = require('highcharts')
const i18n = require('../../lang/gettext.js')()
const Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const db = require('better-sqlite3')(store.get('dbFullPath'))
const moment = require('moment')
const momentDurationFormatSetup = require('moment-duration-format')

const menuFill = require('../../views/tpl/sidebar.js')
const btnMenu = document.getElementById('toggleMenu')
const btnGliders = document.getElementById('bt-gliders')
const btnSites = document.getElementById('bt-sites')
const btnGrFlights = document.getElementById('bt-gr-flights')
const btnGrHours = document.getElementById('bt-gr-hours')
const selRefYear = document.getElementById('sel-ref-year')
const selPrevYear = document.getElementById('sel-prev-year')
let currLang
let centerGraph
let formatter
let graphState
let fullMonth = {
  refFlights : 0,
  refHours : 0,
  prevFlights : 0,
  prevHours : 0
}
let fullYear
let lbMonth = []
let labelFlights
let labelHours
let labelTitleHours
let labelTitleFights
let labelRef
let labelPrev
let refFlSeries
let prevFlSeries
let refHrSeries
let prevHrSeries
let graphCumRefFlights
let graphCumRefHours
let graphCumPrevFlights
let graphCumPrevHours
let cumCurrGliders
let cumCurrSites

iniForm()

function iniForm() {
    // pas de vols -> direction le Mont Blanc
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
    translateLabels()
    browseYears()
    iniGraphe()
    graphState = 'F'
    changeRef()
}


// Calls up the relevant page 
function callPage(pageName) {
    ipcRenderer.send("changeWindow", pageName);    // main.js
}

btnGrHours.addEventListener('click', (event) => {
  updateGraphHours()
})

btnGrFlights.addEventListener('click', (event) => {
  updateGrapheFlights()
})

btnGliders.addEventListener('click', (event) => {
  fillDataGliders(selRefYear.value)
})

btnSites.addEventListener('click', (event) => {
  fillDataSites(selRefYear.value)
})

btnMenu.addEventListener('click', (event) => {
    if (btnMenu.innerHTML === "Menu On") {
        btnMenu.innerHTML = "Menu Off";
    } else {
        btnMenu.innerHTML = "Menu On";
    }
    $('#sidebar').toggleClass('active');
})

function iniGraphe() {
  formatter = formatter1
  centerGraph =
  Highcharts.chart('graphe', {
    chart: {
      type: 'column'
    },
    tooltip: {
      formatter: function() {
          return formatter.call(this)
      }
    },
    xAxis: {
      categories: lbMonth,
      crosshair: true
    },
    yAxis: {
      min: 0,
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0
      },
      series: {
        pointWidth: 12	
      }
    },
    series: [{
      name: '',
      data: []      
    }, {
      name: '',
      data: []      
    }]
  })  
}

function getRefFlights() {
  const clone = [...refFlSeries]
  return clone
} 

function getPrevFlights() {
  const clone = [...prevFlSeries]
  return clone
}

function getRefHours() {
  const clone = [...refHrSeries]
  return clone
}

function getPrevHours() {
   const clone = [...prevHrSeries]
   return clone
}
function formatter1() {
  let strName = this.series.name.toString()
  strName = strName.substring(0,4)
  return strName + '  ' + this.y
}
      
function formatter2() {
  let hhmm =  moment.duration(this.y, 'hours').format('HH:mm')
  let strName = this.series.name.toString()
  strName = strName.substring(0,4)
  return strName + '  ' + hhmm
}

/* 
* Update the graph with hours data
*/
function updateGraphHours() {
  formatter = formatter2
  graphState = 'H'  
  centerGraph.setTitle({ text: labelTitleHours })
  centerGraph.yAxis[0].axisTitle.attr({
    text: labelHours
  })  
  let duration = moment.duration(graphCumRefHours, 'seconds')
  const refTime = duration.format('h[h]mm[mn]')
  let refName = labelRef+'  ['+refTime+']'
  centerGraph.series[0].update({
    name: refName,
    data: getRefHours(),
    color : '#D9534f',
    labelRef
  }, true)  
  let prevDuration = moment.duration(graphCumPrevHours, 'seconds')
  const prevTime = prevDuration.format('h[h]mm[mn]')
  let prevName = labelPrev+'  ['+prevTime+']'
  centerGraph.series[1].update({
    name: prevName,
    data: getPrevHours(),
    color : '#4FD5D9',
    labelPrev
  }, true)
  centerGraph.redraw()
  let debugStr
  for (let index = 0; index < prevFlSeries.length; index++) {
    debugStr += prevFlSeries[index]
    debugStr += ' '
  }
}

/* 
* Update the graph with flights data
*/
function updateGrapheFlights() {
  formatter = formatter1
  graphState = 'F'
  centerGraph.setTitle({ text: labelTitleFights })
  centerGraph.yAxis[0].axisTitle.attr({
    text: labelFlights
  })
  let refName = labelRef+'  ['+graphCumRefFlights+']'
  centerGraph.series[0].update({
    name : refName,
    data: getRefFlights(),
    color : '#4FC44F',
    labelRef
  }, false);
  let prevName = labelPrev+'  ['+graphCumPrevFlights+']'
  centerGraph.series[1].update({
    name : prevName,
    data: getPrevFlights(),
    color : '#C44FC4',
    labelPrev
  }, false)
  centerGraph.redraw()
}

function changePrev() {
  fillData()
  if (graphState == 'F') {
    updateGrapheFlights()
  } else {
    updateGraphHours()
  }
}

function changeRef() {
  fillData()
  formatResult()
  fillDataGliders(selRefYear.value)
  if (graphState == 'F') {
    updateGrapheFlights()
  } else {
    updateGraphHours()
  }
}


/* 
* Browse the logbook to find all the years
* fill the main "reference" selectbox 
* fill the "comparison" selectbox
*/
function browseYears() {
  const yearSet = db.prepare(`SELECT strftime('%Y',V_date) AS V_Year FROM Vol GROUP BY strftime('%Y',V_date) ORDER BY strftime('%Y',V_date) DESC`)
  // get first value [last year]
  const lastYear = yearSet.get().V_Year
  for (const yr of yearSet.iterate()) {
    let option = document.createElement("option");
    option.value = yr.V_Year
    option.text = yr.V_Year
    selRefYear.appendChild(option)
    let optionPrev = document.createElement("option");
    optionPrev.value = yr.V_Year
    optionPrev.text = yr.V_Year
    selPrevYear.appendChild(optionPrev)
  } 
  // selects the year before last
  let iPrevYear = parseInt(lastYear)-1
  selPrevYear.value = iPrevYear.toString()
}

/* 
* Fills in an object table with the reference year and the comparison year
*/
function fillData() {
  const currYear = selRefYear.value
  labelRef = currYear
  const prevYear = selPrevYear.value
  labelPrev = prevYear
  // Empty the array
  fullYear = []
  refFlSeries = []
  prevFlSeries = []
  refHrSeries = []
  prevHrSeries = []
  graphCumRefFlights = 0
  graphCumRefHours = 0
  graphCumPrevFlights = 0
  graphCumPrevHours = 0
  for (let i = 0; i < 12; i++) {
      const fullMonth = new Object()
      fullMonth.refFlights = 0
      fullMonth.refHours = 0
      fullMonth.prevFlights = 0
      fullMonth.prevHours = 0
      try {
          let currYearMonth = moment(currYear).add(i, 'M')
          const paramYM = currYearMonth.format("YYYY MM")
          const currMonth = db.prepare(`SELECT strftime('%m',V_date),Count(V_ID) AS Nb,Sum(V_Duree) AS Dur FROM Vol WHERE strftime('%Y %m',V_date) = '${paramYM}'`)
          const resCurrMonth = currMonth.get()
          fullMonth.refFlights = resCurrMonth.Nb
          graphCumRefFlights += resCurrMonth.Nb
          fullMonth.refHours = resCurrMonth.Dur
          graphCumRefHours += resCurrMonth.Dur
          let prevYearMonth = moment(prevYear).add(i, 'M')
          const prevYM = prevYearMonth.format("YYYY MM")
          const prevMonth = db.prepare(`SELECT strftime('%m',V_date),Count(V_ID) AS Nb,Sum(V_Duree) AS Dur FROM Vol WHERE strftime('%Y %m',V_date) = '${prevYM}'`)
          const resPrevMonth = prevMonth.get()
          fullMonth.prevFlights = resPrevMonth.Nb
          graphCumPrevFlights += resPrevMonth.Nb
          fullMonth.prevHours = resPrevMonth.Dur
          graphCumPrevHours += resPrevMonth.Dur
          refFlSeries.push(fullMonth.refFlights)
          prevFlSeries.push(fullMonth.prevFlights)
          let refDecimalHr =  moment.duration(fullMonth.refHours, 'seconds').asHours()
          refHrSeries.push(refDecimalHr)
          let prevDecimalHr = moment.duration(fullMonth.prevHours, 'seconds').asHours()
          prevHrSeries.push(prevDecimalHr)
      } catch (error) {
          console.log(error)
      }
      fullYear.push(fullMonth)
  }   
  // compute number of gliders for the selected year
  const stGliders = db.prepare(`SELECT COUNT(V_Engin) AS TotGlider FROM (SELECT V_Engin,Count(V_ID) AS Nb,Sum(V_Duree) As Dur FROM Vol WHERE strftime('%Y',V_date) = '${currYear}' GROUP BY V_Engin)`)
  cumCurrGliders = stGliders.get().TotGlider
  // compute number of sites for the selected year
  const stSites = db.prepare(`SELECT COUNT(V_Site) AS TotSites FROM (SELECT V_Site,Count(V_ID) As Nb,Sum(V_Duree) As Dur FROM Vol WHERE strftime('%Y',V_date) = '${currYear}' GROUP BY upper(V_Site))`)
  cumCurrSites = stSites.get().TotSites
}


function fillDataGliders(currYear) {  
  let cumCurrHours = 0
  $("#right-table tr").remove(); 
  let tableTitle = '<tr><th style="width: 45%">'+i18n.gettext('Glider')+'</th>'
  tableTitle += '<th style="width: 25%;text-align: center;">'+i18n.gettext('Flights')+'</th>'
  tableTitle += '<th style="width: 30%">'+i18n.gettext('Duration')+'</th></tr>'
  $('#right-table').append(tableTitle)

  const GliderSet = db.prepare(`SELECT V_Engin,Count(V_ID) AS Nb,Sum(V_Duree) As Dur FROM Vol WHERE strftime('%Y',V_date) = '${currYear}' GROUP BY V_Engin ORDER BY Sum(V_Duree) DESC`)
  for (const gl of GliderSet.iterate()) {
      let duration = moment.duration(gl.Dur, 'seconds')
      const hTime = duration.format('HH[h]mm[mn]')
      cumCurrHours += gl.Dur
      $('#right-table').append('<tr><td>'+gl.V_Engin+'</td><td style="text-align: center;">'+gl.Nb+'</td><td>'+hTime+'</td></tr>')
  }
  const cumCurrDuration = moment.duration(cumCurrHours, 'seconds')
  const cumCurrTime = cumCurrDuration.format('h[h]mm[mn]')
  document.getElementById('cumr-flights').innerHTML = i18n.gettext('Gliders')+' : '+cumCurrGliders
  document.getElementById('cumr-hours').innerHTML = cumCurrTime
}

function fillDataSites(currYear) {
  let cumCurrHours = 0
  $("#right-table tr").remove(); 
  let tableTitle = '<tr><th style="width: 55%">'+i18n.gettext('Site')+'</th>'
  tableTitle += '<th style="width: 15%;text-align: center;">'+i18n.gettext('Fl.')+'</th>'
  tableTitle += '<th style="width: 30%">'+i18n.gettext('Duration')+'</th></tr>'
  $('#right-table').append(tableTitle) 
  const SitesSet = db.prepare(`SELECT V_Site,Count(V_ID) As Nb,Sum(V_Duree) As Dur FROM Vol WHERE strftime('%Y',V_date) = '${currYear}' GROUP BY upper(V_Site) ORDER BY Count(V_ID) DESC`)
  for (const si of SitesSet.iterate()) {
      let duration = moment.duration(si.Dur, 'seconds')
      const hTime = duration.format('HH[h]mm[mn]')
      cumCurrHours += si.Dur
      $('#right-table').append('<tr><td>'+si.V_Site+'</td><td style="text-align: center;">'+si.Nb+'</td><td>'+hTime+'</td></tr>');
  }
  const cumCurrDuration = moment.duration(cumCurrHours, 'seconds')
  const cumCurrTime = cumCurrDuration.format('h[h]mm[mn]')
  document.getElementById('cumr-flights').innerHTML = i18n.gettext('Sites')+' : '+cumCurrSites
  document.getElementById('cumr-hours').innerHTML = cumCurrTime
}

/* 
* Format data to update header, tables and graphe
*/
function formatResult() {
  let cumCurrFlights = 0
  let cumCurrHours = 0
  let cumPrevFlights = 0
  let cumPrevrHours = 0
  for (let index = 0; index < fullYear.length; index++) {
      const element = fullYear[index]
      const currDuration = moment.duration(element.refHours, 'seconds')
      const currTime = currDuration.format('h[h]mm[mn]')
      const prevDuration = moment.duration(element.prevHours, 'seconds')
      const prevTime = prevDuration.format('h[h]mm[mn]')
      cumCurrFlights += element.refFlights
      cumCurrHours += element.refHours
      cumPrevFlights += element.prevFlights
      cumPrevrHours += element.prevHours
      let idx = index+1
      let idxF = 'tb-F'+idx.toString()
      let idxD = 'tb-D'+idx.toString()
      if (element.refFlights > 0) {
        document.getElementById(idxF).innerHTML = element.refFlights
      } else {
        document.getElementById(idxF).innerHTML = ''
      }
      if (element.refHours > 0) {
        document.getElementById(idxD).innerHTML = currTime
      } else {
        document.getElementById(idxD).innerHTML = ''
      }
  }
  const cumCurrDuration = moment.duration(cumCurrHours, 'seconds')
  const cumCurrTime = cumCurrDuration.format('h[h]mm[mn]')
  const cumPrevDuration = moment.duration(cumPrevrHours, 'seconds')
  const cumPrevTime = cumPrevDuration.format('h[h]mm[mn]')
  document.getElementById('cumFlights').innerHTML = i18n.gettext('Flights')+' : '+cumCurrFlights
  document.getElementById('val-flights').innerHTML = cumCurrFlights
  document.getElementById('cumHours').innerHTML = cumCurrTime
  document.getElementById('val-hours').innerHTML = cumCurrDuration.format('h[.]mm')
  document.getElementById('val-year').innerHTML = '&ensp;&ensp;&ensp;'+selRefYear.value
  document.getElementById('val-gliders').innerHTML = cumCurrGliders
  document.getElementById('val-sites').innerHTML = cumCurrSites
  document.getElementById('right-year').innerHTML = selRefYear.value
}


function translateLabels() {
  labelFlights = i18n.gettext('Flights')
  labelHours = i18n.gettext('Hours')
  labelTitleHours = i18n.gettext('Flight time comparison')
  labelTitleFights = i18n.gettext('Flight comparison')
  document.getElementById('hd-flights').innerHTML = labelFlights
  document.getElementById('hd-hours').innerHTML = labelHours
  document.getElementById('hd-gliders').innerHTML = i18n.gettext('Gliders')
  document.getElementById('hd-sites').innerHTML = i18n.gettext('Sites')
  document.getElementById('tb-month').innerHTML = i18n.gettext('Months')
  document.getElementById('tb-fl').innerHTML = i18n.gettext('Flights')
  document.getElementById('tb-dur').innerHTML = i18n.gettext('Duration')  
  document.getElementById('lb-reference').innerHTML = i18n.gettext('Reference')  
  btnGliders.innerHTML = i18n.gettext('Gliders')
  btnSites.innerHTML = i18n.gettext('Sites')
  btnGrFlights.innerHTML = labelFlights
  btnGrHours.innerHTML = labelHours
  lbMonth[0] = i18n.gettext('Jan')
  lbMonth[1] = i18n.gettext('Feb')
  lbMonth[2] = i18n.gettext('Mar')
  lbMonth[3] = i18n.gettext('Apr')
  lbMonth[4] = i18n.gettext('May')
  lbMonth[5] = i18n.gettext('Jun')
  lbMonth[6] = i18n.gettext('Jul')
  lbMonth[7] = i18n.gettext('Aug')
  lbMonth[8] = i18n.gettext('Sep')
  lbMonth[9] = i18n.gettext('Oct')
  lbMonth[10] = i18n.gettext('Nov')
  lbMonth[11] = i18n.gettext('Dec')
  document.getElementById('tb-M1').innerHTML = lbMonth[0]
  document.getElementById('tb-M2').innerHTML = lbMonth[1]
  document.getElementById('tb-M3').innerHTML = lbMonth[2]
  document.getElementById('tb-M4').innerHTML = lbMonth[3]
  document.getElementById('tb-M5').innerHTML = lbMonth[4]
  document.getElementById('tb-M6').innerHTML = lbMonth[5]
  document.getElementById('tb-M7').innerHTML = lbMonth[6]
  document.getElementById('tb-M8').innerHTML = lbMonth[7]
  document.getElementById('tb-M9').innerHTML = lbMonth[8]
  document.getElementById('tb-M10').innerHTML = lbMonth[9]
  document.getElementById('tb-M11').innerHTML = lbMonth[10]
  document.getElementById('tb-M12').innerHTML = lbMonth[11]
}
