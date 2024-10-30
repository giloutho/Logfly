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

const monthLabels = {} 
const monthTemplate = $('#template-month').html()
const gliderLabels = {} 
const gliderTemplate = $('#template-glider').html()

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
      const template = $(templates).filter('#temp-menu').html();  
      const rendered = Mustache.render(template, menuOptions)
      document.getElementById('target-sidebar').innerHTML = rendered
    })
    Mustache.parse(monthTemplate)
    monthLabels.Monthly = i18n.gettext('Monthly comparison')
    monthLabels.dates = '',
    monthLabels.select = i18n.gettext('You can select one or more months or the whole year')
    monthLabels.jan = i18n.gettext('Jan')
    monthLabels.feb = i18n.gettext('Feb')
    monthLabels.mar = i18n.gettext('Mar')
    monthLabels.apr = i18n.gettext('Apr')
    monthLabels.may = i18n.gettext('May')
    monthLabels.jun = i18n.gettext('Jun')
    monthLabels.jul = i18n.gettext('Jul')
    monthLabels.aug = i18n.gettext('Aug')
    monthLabels.sep = i18n.gettext('Sep')
    monthLabels.oct = i18n.gettext('Oct')
    monthLabels.nov = i18n.gettext('Nov')
    monthLabels.dec = i18n.gettext('Dec')
    monthLabels.all = i18n.gettext('All')
    monthLabels.display = i18n.gettext('Display')
    Mustache.parse(gliderTemplate)
    gliderLabels.gliders = i18n.gettext('You can select the number of gliders to be displayed in the graph')
    gliderLabels.top5 = i18n.gettext('Top 5')
    gliderLabels.top10 = i18n.gettext('Top 10')
    gliderLabels.top20 = i18n.gettext('Top 20')
    gliderLabels.all = i18n.gettext('All')
    gliderLabels.display = i18n.gettext('Display')
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
  $('#gr-header-month').addClass('d-none')
  $('#gr-header-glider').addClass('d-none')
  y1Series = []
  y2Series = []
  xSeries = []
  coloredYserie = []
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  // Retrieving yearly flight hours
  let sReq = "select strftime('%Y',V_date) as Year,Sum(V_Duree) as Dur from Vol WHERE strftime('%Y-%m',V_date) >= '"
  sReq += startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' group by strftime('%Y',V_date)"    
  const yearHr = db.prepare(sReq)
  let maxHours = 0
  for (const yr of yearHr.iterate()){
    const intHours =  Math.round(moment.duration(yr.Dur, 'seconds').asHours())
    if (intHours > maxHours) maxHours = intHours
    y1Series.push(intHours)
    xSeries.push(yr.Year)
  }

  // Retrieving yearly flight numbers
  let sReq2 = "select strftime('%Y',V_date),Count(V_ID) as Flights from Vol WHERE strftime('%Y-%m',V_date) >= '"
  sReq2 += startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' group by strftime('%Y',V_date)"
  const yearFl = db.prepare(sReq2)
  let maxFlights = 0
  for (const yr of yearFl.iterate()){
    if (yr.Flights > maxFlights) maxFlights = yr.Flights
    y2Series.push(yr.Flights)
  }

  // for (let index = 0; index < y2Series.length; index++) {
  //   console.log(y2Series[index])   
  // }
  // console.log(maxFlights)

  let chartTitle = i18n.gettext('Yearly')+' '+xSeries[0]+' - '+xSeries[xSeries.length-1]
  document.getElementById('footer-2').innerHTML = '<H2>'+chartTitle+'</H2>'
  for (let i = 0; i < y1Series.length; i++) {
    const element = y1Series[i]
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
      height: chartHeight,
      zooming: {
        type: 'xy'
      }
    },
    title: {
      text : null
    },
    xAxis: {
      categories: xSeries,
      crosshair: true
    },
    yAxis: [
      { // primary axis
        min: 0,
        title: {
          text: i18n.gettext('Flight hours'),
          style: {
            color: Highcharts.getOptions().colors[0]
          }
        },
        labels: {
          style: {
              color: Highcharts.getOptions().colors[0]
          }
        },
      },
      { // secondary axis
        title: {
          text: i18n.gettext('Number of flights'),
          style: {
            color: '#e555d3'
          }
        },
        labels: {
          style: {
              color: '#e555d3'
          }
        },
        opposite: true
      }
    ],
    tooltip: {
      shared: true
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0
      },
      series: {
        pointWidth: 20	
      }
    },
    colorAxis: {
      min: 0,
      max: maxHours,
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
      name: i18n.gettext('Flight hours'),
      type: 'column',
      colorKey: 'colorValue',
      yAxis: 1,
      tooltip: {
        valueSuffix: ' h'
      },
      data : coloredYserie      
    },
    {
      name: i18n.gettext('Flights'),
      type: 'spline', 
      colorKey: '#e555d3',
      tooltip: {
        valueSuffix: ' '+i18n.gettext('flights')
      },
      color: '#e555d3',
      lineWidth: 3,
      data : y2Series
    }
  ]


  })    

}

function displayMonthly(){
  $('#gr-header-glider').addClass('d-none')
  $('#gr-header-month').removeClass('d-none')
  monthLabels.dates = selYearBegin.value+' - '+selYearEnd.value
  const rendered = Mustache.render(monthTemplate, monthLabels)
  document.getElementById('gr-header-month').innerHTML = rendered
}

function displayGlider() {
  $('#gr-header-month').addClass('d-none')
  $('#gr-header-glider').removeClass('d-none')
  const rendered = Mustache.render(gliderTemplate, gliderLabels)
  document.getElementById('gr-header-glider').innerHTML = rendered
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

function displayMonthlyHeader() {
  let headerHtml = document.getElementById('gr-header')
  headerHtml += '<h4>Monthly comparison 2010 - 2024    You can select one or more months or the whole year</h4>'
  headerHtml += '<form>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check1">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check1" name="vehicle1" value="something">Jan'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check2">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check2" name="vehicle2" value="something">Feb'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label">'
  headerHtml += '      <input type="checkbox" class="form-check-input" d="check2" name="vehicle2" value="something">Mar'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check1">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check1" name="vehicle1" value="something">Apr'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check2">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check2" name="vehicle2" value="something">May'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label">'
  headerHtml += '      <input type="checkbox" class="form-check-input" d="check2" name="vehicle2" value="something">Jun'
  headerHtml += '    </label>'
  headerHtml += '  </div>'       
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check1">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check1" name="vehicle1" value="something">Jul'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check2">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check2" name="vehicle2" value="something">Aug'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label">'
  headerHtml += '      <input type="checkbox" class="form-check-input" d="check2" name="vehicle2" value="something">Sep'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check1">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check1" name="vehicle1" value="something">Oct'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label" for="check2">'
  headerHtml += '      <input type="checkbox" class="form-check-input" id="check2" name="vehicle2" value="something">Nov'
  headerHtml += '    </label>'
  headerHtml += '  </div>'
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label">'
  headerHtml += '      <input type="checkbox" class="form-check-input" d="check2" name="vehicle2" value="something">Dec'
  headerHtml += '    </label>'
  headerHtml += '  </div>'                
  headerHtml += '  <div class="form-check-inline">'
  headerHtml += '    <label class="form-check-label">'
  headerHtml += '      <input type="checkbox" class="form-check-input" d="check2" name="vehicle2" value="something">All'
  headerHtml += '    </label>'
  headerHtml += '  </div>'                                                                                                             
  headerHtml += '  <button type="submit" class="btn btn-primary">Submit</button>'
  headerHtml += '</form>'
  
}