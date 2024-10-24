const {ipcRenderer} = require('electron')
const Highcharts = require('highcharts')
require('highcharts/modules/coloraxis')(Highcharts); 
const i18n = require('../../lang/gettext.js')()
var Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const moment = require('moment')
const momentDurationFormatSetup = require('moment-duration-format')
const log = require('electron-log');
const Store = require('electron-store')
const store = new Store()
const db = require('better-sqlite3')(store.get('dbFullPath'))
let menuFill = require('../../views/tpl/sidebar.js')
const btnGrYearly = document.getElementById('gr-yearly')
const btnGrMonthly = document.getElementById('gr-monthly')
const btnGrGlider = document.getElementById('gr-glider')
const btnGrSite = document.getElementById('gr-site')
const selYearBegin = document.getElementById('sel-year-begin')
const selYearEnd = document.getElementById('sel-year-end')
const currPeriod = {}
let btnMenu = document.getElementById('toggleMenu')
let currLang

iniForm()

function iniForm() {
    // pas de vols -> direction le Mont Blanc
    document.title = 'Logfly '+store.get('version')+' ['+store.get('dbName')+']'  
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
    btnGrYearly.innerHTML = i18n.gettext('Yearly chart')
    btnGrYearly.addEventListener('click', (event) => {displayYearly()})
    btnGrMonthly.innerHTML = i18n.gettext('Monthly chart')
    btnGrMonthly.addEventListener('click',(event) => {displayMonthly()})
    btnGrGlider.innerHTML = i18n.gettext('Gliders chart')
    btnGrGlider.addEventListener('click',(event) => {displayGlider()})    
    btnGrSite.innerHTML = i18n.gettext('Sites chart')
    btnGrSite.addEventListener('click',(event) => {displaySite()})
    browseYears()
    displayInfoCards()
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

function displayYearly() {
  ySeries = []
  xSeries = []
  coloredYserie = []
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  // Retrieving yearly data
  let sReq = "select strftime('%Y',V_date) as Year,Sum(V_Duree) as Dur from Vol WHERE strftime('%Y-%m',V_date) >= '"
  sReq += startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' group by strftime('%Y',V_date)"    
  const yearSet = db.prepare(sReq)
  // for debug
  let maxValue = 0
  for (const yr of yearSet.iterate()){
    const intHours =  Math.round(moment.duration(yr.Dur, 'seconds').asHours())
    if (intHours > maxValue) maxValue = intHours
    ySeries.push(intHours)
    xSeries.push(yr.Year)
  }
  let chartTitle = i18n.gettext('Yearly')+' '+xSeries[0]+' - '+xSeries[xSeries.length-1]
  document.getElementById('footer-2').innerHTML = '<H2>'+chartTitle+'</H2>'
  for (let i = 0; i < ySeries.length; i++) {
    const element = ySeries[i]
    let columnObj = new Object()
    columnObj.colorValue = element
    columnObj.y = element    
    coloredYserie.push(columnObj)
  }
  // Compute height of chart
  let chartHeight
  let screenHeight = store.get('screenHeight')
  if (screenHeight == null) {
    chartHeight = 480   // the base height is 800 -> 800 * 0.6 = 480
  } else {
    chartHeight = Math.round(screenHeight * 0.6)
  }
  Highcharts.chart('container-graphe', {
    chart: {
      height: chartHeight
    },
    title: {
      text : null
     // text: 'Yearly 1988 2024',
//      align: 'center'
    },
    xAxis: {
      categories: xSeries,
      crosshair: true
    },
    yAxis: {
      min: 0,
      title: {
        text: i18n.gettext('Flight hours')
      }
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
    colorAxis: {
      min: 0,
      max: maxValue,
      stops: [
        [0.1, '#6FE3E1'],
        [0.2, '#6CD3E1'],
        [0.3, '#69C4E2'],
        [0.4, '#65B4E2'],
        [0.5, '#62A5E3'],
        [0.6, '#5F95E3'],
        [0.7, '#5C86E4'],
        [0.8, '#5876E4'],
        [0.9, '#5567E5'],
        [1, '#5257E5']
      ]
  },
  series: [{
    name: '',
    type: 'column',
    colorKey: 'colorValue',
    //data: ySeries    
    data : coloredYserie      
  }]


  })    

}

function displayMonthly(){
  alert('Monthly')
}

function displayGlider() {
  alert('Glider')
}    

function displaySite() {
  alert('Site')
}

function displayInfoCards() {
  getDatesOfSelection()
  getNbFlights()
  getNbHours()
  getAverages()
  getNbGliders()
  getNbSites()

  try {
    document.getElementById('card-year').innerHTML = currPeriod.beginYear+' - '+currPeriod.endYear
    if (currPeriod.monthes < 1) {
      document.getElementById('card-period').innerHTML = currPeriod.years+i18n.gettext('years')
    } else {
      document.getElementById('card-period').innerHTML = currPeriod.years+' '+i18n.gettext('years')+' '+currPeriod.monthes+' '+i18n.gettext('monthes')
    }
    document.getElementById('card-hours').innerHTML = currPeriod.hours
    document.getElementById('card-flights').innerHTML = currPeriod.flights+' '+i18n.gettext('Flights')
    document.getElementById('card-avg-hr').innerHTML = currPeriod.avghours+' / '+i18n.gettext('year')
    document.getElementById('card-avg-fl').innerHTML = currPeriod.avgfligths+' '+i18n.gettext('Flights')+' / '+i18n.gettext('year')
    document.getElementById('card-gliders').innerHTML = currPeriod.gliders+' '+i18n.gettext('Gliders')
    document.getElementById('card-sites').innerHTML = currPeriod.sites+' '+i18n.gettext('Sites')
  } catch (error) {
    
  }
}

/* 
* Browse the logbook to find all the years
* fill the selectbox selYearBegin with years in asc order
* fill the selectbox selYearEnd with years in desc order
*/
function browseYears() {
  const yearBegin = db.prepare(`SELECT strftime('%Y',V_date) AS V_Year FROM Vol GROUP BY strftime('%Y',V_date) ORDER BY strftime('%Y',V_date) ASC`)
  for (const yr of yearBegin.iterate()) {
    let option = document.createElement("option");
    option.value = yr.V_Year
    option.text = yr.V_Year
    selYearBegin.appendChild(option)
  } 
  const yearEnd = db.prepare(`SELECT strftime('%Y',V_date) AS V_Year FROM Vol GROUP BY strftime('%Y',V_date) ORDER BY strftime('%Y',V_date) DESC`)
  for (const yr of yearEnd.iterate()) {
    let option = document.createElement("option");
    option.value = yr.V_Year
    option.text = yr.V_Year
    selYearEnd.appendChild(option)
  } 

}

function getDatesOfSelection() {
  try {
    const startYear = selYearBegin.value
    const endYear = selYearEnd.value
    const sReq1 = "select V_Date from Vol WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' order by V_Date";
    const sReq2 = "select V_Date from Vol WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' order by V_Date DESC LIMIT 1";
    const stBegin = db.prepare(sReq1)
    const result1 = stBegin.get()
    const beginDate = result1.V_Date
    const stEnd = db.prepare(sReq2)
    const result2 = stEnd.get()
    const endDate = result2.V_Date    
    computeDurations(beginDate, endDate)    
    currPeriod.beginYear = startYear
    currPeriod.endYear = endYear
  } catch (error) {
    log.error('getDatesOfSelection] error during database request')  
  }

}

function getNbFlights() {
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  const sReq = "select Count(V_ID) from Vol WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12'"
  const stFligths = db.prepare(sReq)
  const countFlights = stFligths.get()
  currPeriod.flights = countFlights['Count(V_ID)']
}

function getNbGliders() {
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  let sReq = "SELECT COUNT(*) FROM "
  sReq += "(SELECT V_Engin,Count(V_ID) FROM Vol WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12'"
  sReq += " GROUP BY upper(V_Engin)) as nbgliders"
  const stGliders = db.prepare(sReq)
  const result = stGliders.get()
  currPeriod.gliders = result['COUNT(*)']
}

function getNbSites() {
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  let sReq = "SELECT COUNT(*) FROM "
  sReq += "(SELECT V_Site,Count(V_ID) FROM Vol l WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12'"
  sReq += "GROUP BY upper(V_Site) ) AS nbsites"
  const stSites = db.prepare(sReq)
  const result = stSites.get()
  currPeriod.sites = result['COUNT(*)'] 
}

function getNbHours() {
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  const sReq = "select SUM(V_Duree) from Vol WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12'";
  const stHours = db.prepare(sReq)
  const result2 = stHours.get()
  const totalSeconds = result2['SUM(V_Duree)']
  currPeriod.seconds = totalSeconds
  const duration = moment.duration(totalSeconds, 'seconds')
  let strHours = duration.format("hh:mm")
  strHours = strHours.replace(':','h')
  strHours = strHours.replace(',',' ')
  currPeriod.hours = strHours
}

/* Compute the average annual flight hours and the average annual flights*/
function getAverages() {
  let avgSeconds
  let avgMonthFligths
  if (currPeriod.years < 1) {
    if (currPeriod.monthes < 0) {
      avgSeconds = currPeriod.seconds / currPeriod.monthes
      avgMonthFligths = currPeriod.flights /  currPeriod.monthes

    } else {
      avgSeconds = currPeriod.seconds 
      avgMonthFligths = currPeriod.flights
    }
  } else {
      avgSeconds = (currPeriod.seconds / ((currPeriod.years *12)+currPeriod.monthes))*12
      avgMonthFligths = (currPeriod.flights / ((currPeriod.years *12)+currPeriod.monthes))
  }
  const duration = moment.duration(avgSeconds, 'seconds')
  let strAvgHours = duration.format("hh:mm")
  strAvgHours = strAvgHours.replace(':','h')
  strAvgHours = strAvgHours.replace(',',' ')
  currPeriod.avghours = strAvgHours
  currPeriod.avgfligths = Math.trunc(avgMonthFligths *12)
}

/*
* Compute duration between first day of the start year and last day of the end year
*/
function computeDurations(beginDate, endDate) {
  // in database, V_Date is in principle YYYY-MM-DD HH:MM:SS      
  // but sometimes in very old versions we have only YYYY-MM-DD
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  let firstDay
  if (dateTimeRegex.test(beginDate)) {
    firstDay = moment(beginDate, 'YYYY-MM-DD hh:mm:ss').format('YYYY-MM-DD')
  } else {
    if (dateRegex.test(beginDate)) {
      firstDay = moment(beginDate, 'YYYY-MM-DD').format('YYYY-MM-DD')
    } else {
      firstDay = moment('2000-01-01', 'YYYY-MM-DD').format('YYYY-MM-DD')
    }
  }
  let lastDay
  if (dateTimeRegex.test(endDate)) {
    lastDay = moment(endDate, 'YYYY-MM-DD hh:mm:ss').format('YYYY-MM-DD')
  } else {
    if (dateRegex.test(endDate)) {
      lastDay = moment(endDate, 'YYYY-MM-DD').format('YYYY-MM-DD')
    } else {
      lastDay = moment('2000-01-01', 'YYYY-MM-DD').format('YYYY-MM-DD')
    }
  }
  const m1 = moment(firstDay)
  const m2 = moment(lastDay)
  const monthDiff = m2.diff(m1, 'months')
  const totalYears = Math.trunc(monthDiff/12)
  const totalMonthes = (monthDiff - (totalYears *12)) - 1
  currPeriod.years = totalYears
  currPeriod.monthes = totalMonthes
  currPeriod.beginDate = moment(firstDay, 'YYYY-MM-DD').format('DD-MM-YYYY')
  currPeriod.endDate = moment(lastDay, 'YYYY-MM-DD').format('DD-MM-YYYY')
}
