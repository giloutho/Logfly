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
const Database = require('better-sqlite3')
const db = new Database(store.get('dbFullPath'))
let menuFill = require('../../views/tpl/sidebar.js');
const { point } = require('leaflet');
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
const siteLabels = {}
const siteTemplate = $('#template-site').html()

let currGraph = null
let yearsSerie
let yearsMonthesSerie
let glidersSerie
let glidersFlights
let sitesSerie
let sitesHours

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
    
    // Is the logbook empty?
    const stmt = db.prepare('SELECT COUNT(*) FROM Vol')
    let countFlights = stmt.get()
    if (countFlights['COUNT(*)'] < 1) ipcRenderer.send("changeWindow", 'noflights') 

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
    Mustache.parse(siteTemplate)
    siteLabels.sites = i18n.gettext('You can select the number of sites to be displayed in the graph')
    siteLabels.top5 = i18n.gettext('Top 5')
    siteLabels.top10 = i18n.gettext('Top 10')
    siteLabels.top20 = i18n.gettext('Top 20')
    siteLabels.all = i18n.gettext('All')
    siteLabels.display = i18n.gettext('Display')  
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
    displayMainFooter()
}

$(document).ready(function () {
    let selectedFixedMenu =  store.get('menufixed') 
    if (selectedFixedMenu === 'yes') {
      $("#sidebar").removeClass('active')
      $('#toggleMenu').addClass('d-none')
      document.getElementById("menucheck").checked = true
    }   
    console.log('ready')
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

function changeStart() {
  displayInfoCards()
  switch (currGraph) {
    case 'Y':
      displayYearly()
      break;  
    case 'M':
      displayMonthGraph()
      break;   
    case 'G':
      displayGliderGraph()
      break;             
    case 'S':
      displaySiteGraph()
      break;        
    default:
      displayMainFooter()
      break;
  }
}

function changeEnd() {
  displayInfoCards()
  switch (currGraph) {
    case 'Y':
      displayYearly()
      break;  
    case 'M':
      displayMonthGraph()
      break;   
    case 'G':
      displayGliderGraph()
      break;             
    case 'S':
      displaySiteGraph()
      break;        
    default:
      displayMainFooter()
      break;
  }
}

function displayYearly() {
  $('#gr-header-month').addClass('d-none')
  $('#gr-header-glider').addClass('d-none')
  $('#gr-header-site').addClass('d-none')
  $('#container-graphe').removeClass('d-none')
  currGraph = null
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

  let chartTitle = i18n.gettext('Yearly')+' '+xSeries[0]+' - '+xSeries[xSeries.length-1]
  document.getElementById('footer-2').innerHTML = '<H2>'+chartTitle+'</H2>'
  for (let i = 0; i < y1Series.length; i++) {
    const element = y1Series[i]
    let columnObj = new Object()
    columnObj.colorValue = element
    columnObj.y = element    
    coloredYserie.push(columnObj)
  }

  const chartHeight = computeSizeScreen()

  let maxY
  if (maxHours > maxFlights) {
    maxY = maxHours
  } else {
    maxY = maxFlights
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
        title: {
          text: i18n.gettext('Flight hours'),
          style: {
            color: Highcharts.getOptions().colors[0]
          }
        },
        max: maxY,
        min : 0,
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
        max: maxY,
        min : 0,
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
      yAxis: 0,
      tooltip: {
        valueSuffix: ' h'
      },
      data : y1Series    
    },
    {
      name: i18n.gettext('Flights'),
      type: 'spline', 
      colorKey: '#e555d3',
      yAxis: 1,
      tooltip: {
        valueSuffix: ' '+i18n.gettext('flights')
      },
      color: '#e555d3',
      lineWidth: 3,
      data : y2Series
    }
    ]
  })    
  currGraph = 'Y'
}

function displayMonthly(){
  $('#gr-header-glider').addClass('d-none')
  $('#gr-header-site').addClass('d-none')
  $('#gr-header-month').removeClass('d-none')
  $('#container-graphe').addClass('d-none')
  const rendered = Mustache.render(monthTemplate, monthLabels)
  document.getElementById('gr-header-month').innerHTML = rendered
}

function displayMonthGraph() {
  monthLabels.dates = selYearBegin.value+' - '+selYearEnd.value
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  let chartTitle = i18n.gettext('Monthly view')+' '+startYear+' - '+endYear
  document.getElementById('footer-2').innerHTML = '<H2>'+chartTitle+'</H2>'
  let sReq = "select strftime('%Y',V_date) as year,strftime('%m',V_date) as month,Sum(V_Duree) as dur from Vol "
  sReq += "WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01' AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' "
  sReq += "group by strftime('%Y',V_date),strftime('%m',V_date)"  
  const dbMonthes = db.prepare(sReq)
  let currYear = 1900
  let maxHours = 0
  yearsSerie = []
  yearsMonthesSerie = []
  let currMonthSerie = Array(12).fill(0)
  for (const monthData of dbMonthes.iterate()) {
    const monthYear = monthData.year
    const monthNumber = monthData.month
    // round to one decimal
    const decHours =  Math.round(moment.duration(monthData.dur, 'seconds').asHours()*10)/10
    if (decHours > maxHours) maxHours = decHours
    if (monthYear > currYear) {
      if (currYear > 1900) {    // year is finished       
        const newYearMonthes = currMonthSerie.map(hours => hours) 
        yearsMonthesSerie.push(newYearMonthes)
      }
      // New year    
      currYear = monthData.year
      yearsSerie.push(monthYear)
      // Reset table of twelve monthly values to zero
      for (let i = 0; i < currMonthSerie.length; i++) {
        currMonthSerie[i] = 0                
      }              
    }
    // Add to list
    if (monthNumber > 0 && monthNumber < 13) {
      const idx = monthNumber - 1                                                        
      currMonthSerie[idx] = decHours 
    }
  }
  if (currYear > 1900) {    // we push last year  
    yearsMonthesSerie.push(currMonthSerie)
  }

  $('#container-graphe').removeClass('d-none')
  currGraph = null
  // Compute height of chart
  const chartHeight = computeSizeScreen()
  const [xData,yData] = filterMonthes()
   Highcharts.chart('container-graphe', {
    chart: {
      height: chartHeight,
      type: 'column'     
    },
    title: {
      text : null
    },
    xAxis: {
      categories: xData,
      crosshair: true
    },
    yAxis: [
      { // primary axis
        title: {
          text: i18n.gettext('Flight hours'),
          style: {
            color: Highcharts.getOptions().colors[0]
          }
        },
        min : 0,
        labels: {
          style: {
              color: Highcharts.getOptions().colors[0]
          }
        },
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
  series: yData
  })     
    currGraph = 'M'
}

function displayGlider() {
  $('#gr-header-month').addClass('d-none')
  $('#gr-header-site').addClass('d-none')
  $('#gr-header-glider').removeClass('d-none')
  $('#container-graphe').addClass('d-none')
  const rendered = Mustache.render(gliderTemplate, gliderLabels)
  document.getElementById('gr-header-glider').innerHTML = rendered
}    

function displayGliderGraph() {
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  let chartTitle = i18n.gettext('Gliders')+' '+startYear+' - '+endYear
  document.getElementById('footer-2').innerHTML = '<H2>'+chartTitle+'</H2>'
  let sReq = "SELECT V_Engin,Count(V_ID) AS nb,Sum(V_Duree) AS dur FROM Vol WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01'"
  sReq += " AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' GROUP BY upper(V_Engin) ORDER BY Sum(V_Duree) DESC"
  const dbGliders = db.prepare(sReq)
  glidersSerie = []
  glidersFlights = []
  for (const gl of dbGliders.iterate()){
    const decHours =  Math.round(moment.duration(gl.dur, 'seconds').asHours()*10)/10
    const gliderData = [gl.V_Engin,decHours]
    glidersSerie.push(gliderData)
    glidersFlights.push(gl.nb)
  }
  let glidersFiltered
  let glidersFlFiltered
  const rdGliders = document.getElementsByName('rdGliders')
  for (i = 0; i < rdGliders.length; i++) {
    if (rdGliders[i].checked)
      glidersFiltered = glidersSerie.slice(0,rdGliders[i].value)
      glidersFlFiltered = glidersFlights.slice(0,rdGliders[i].value)
  } 
  let maxY = 0
  for (let i = 0; i < glidersFiltered.length; i++) {
    if (glidersFiltered[i][1] > maxY) maxY = glidersFiltered[i][1]    
  }
  // Compute height of chart
  let chartHeight
  let screenHeight = store.get('screenHeight')
  if (screenHeight == null) {
    chartHeight = 480   // the base height is 800 -> 800 * 0.5 = 400
  } else {
    chartHeight = Math.round(screenHeight * 0.5)
  }
  $('#container-graphe').removeClass('d-none')
  currGraph = null
  Highcharts.chart('container-graphe', {
    chart: {
      height: chartHeight,
      type: 'bar',
      zooming: {
        type: 'xy'
      }     
    },
    title: {
      text : null
    },
    xAxis: {
      type: 'category'
    },
    yAxis: {
      min: 0,
      max: maxY,
      alignTicks: false,   //https://stackoverflow.com/questions/33931775/min-max-yaxis-not-working-correctly-in-highcharts
      endOnTick: false,
      title: {
          text: i18n.gettext('Flight hours')
      },
      labels: {
        overflow: 'justify'
      },
    },
    legend: {
      enabled: false
    },
    tooltip: {
      formatter: function() {
        let additionalString = ''
        let index = this.point.index
        if (index > -1 && glidersFlFiltered.length) {          
          additionalString = ' <i>'+glidersFlFiltered[index]+' '+i18n.gettext('Flights')+'</i>'         
        }
        return i18n.gettext('Flight hours')+' : <b>'+this.y+' h</b>'+additionalString
      }     
    },
    series: [{
      colorByPoint: true,
      data:  glidersFiltered
    }]
  })  
    currGraph = 'G'
}

function displayGlidersGraph2(glidersSerie, maxY) {
  // Envisager cette présentation : https://www.highcharts.com/demo/highcharts/bar-race
  // ou celle là : https://www.highcharts.com/demo/highcharts/column-rotated-labels
  $('#container-graphe').removeClass('d-none')
  currGraph = null
  // Compute height of chart
  let chartHeight
  let screenHeight = store.get('screenHeight')
  if (screenHeight == null) {
    chartHeight = 480   // the base height is 800 -> 800 * 0.6 = 480
  } else {
    chartHeight = Math.round(screenHeight * 0.5)
  }
  Highcharts.chart('container-graphe', {
    chart: {
      height: chartHeight,
      type: 'column',
      zooming: {
        type: 'xy'
      }       
    },
    title: {
      text : null
    },
    xAxis: {
      type: 'category',
      labels: {
          autoRotation: [-45, -90],
          style: {
              fontSize: '13px',
              fontFamily: 'Verdana, sans-serif'
          }
      }
    },
    yAxis: {
      min: 0,
      max: maxY,
      alignTicks: false,   //https://stackoverflow.com/questions/33931775/min-max-yaxis-not-working-correctly-in-highcharts
      endOnTick: false,
      title: {
          text: i18n.gettext('Flight hours')
      }
    },
    legend: {
        enabled: false
    },
    tooltip: {
      pointFormat: i18n.gettext('Flight hours')+' : <b>'+this.y+' h</b> '+i18n.gettext('Flights')+' :'
    },
    series: [{
      colorByPoint: true,
      groupPadding: 0,
      data:  glidersSerie,
      dataLabels: {
          enabled: true,
          rotation: -90,
          color: '#FFFFFF',
          inside: true,
          verticalAlign: 'top',
          format: '{point.y:.1f}', // one decimal
          y: 30, // 15 pixels down from the top
          style: {
              fontSize: '10px',
              fontFamily: 'Verdana, sans-serif'
          }
      }
    }]
  })
}

function displaySite() {
  $('#gr-header-month').addClass('d-none')
  $('#gr-header-glider').addClass('d-none')
  $('#container-graphe').addClass('d-none')
  $('#gr-header-site').removeClass('d-none')
  const rendered = Mustache.render(siteTemplate, siteLabels)
  document.getElementById('gr-header-site').innerHTML = rendered
}

function displaySiteGraph() {
  const startYear = selYearBegin.value
  const endYear = selYearEnd.value
  let chartTitle = i18n.gettext('Sites')+' '+startYear+' - '+endYear
  document.getElementById('footer-2').innerHTML = '<H2>'+chartTitle+'</H2>' 
  let sReq = "SELECT V_Site,Count(V_ID) AS nb,Sum(V_Duree) AS dur FROM Vol WHERE strftime('%Y-%m',V_date) >= '"+startYear+"-01'"
  sReq += " AND strftime('%Y-%m',V_date) <= '"+endYear+"-12' GROUP BY upper(V_Site) ORDER BY nb DESC"
  const dbSites = db.prepare(sReq)
  sitesSerie = []
  sitesHours = []
  for (const si of dbSites.iterate()){
    const decHours =  Math.round(moment.duration(si.dur, 'seconds').asHours()*10)/10
    const siteData = [si.V_Site,si.nb]
    sitesSerie.push(siteData)
    sitesHours.push(decHours)
  }  
  let sitesFiltered
  let sitesHrFiltered
  const rdSites = document.getElementsByName('rdSites')
  for (i = 0; i < rdSites.length; i++) {
    if (rdSites[i].checked)
      sitesFiltered = sitesSerie.slice(0,rdSites[i].value)
      sitesHrFiltered = sitesHours.slice(0,rdSites[i].value)
  } 
  let maxY = 0
  for (let i = 0; i < sitesFiltered.length; i++) {
    if (sitesFiltered[i][1] > maxY) maxY = sitesFiltered[i][1]    
  }
  // Compute height of chart
  let chartHeight
  let screenHeight = store.get('screenHeight')
  if (screenHeight == null) {
    chartHeight = 480   // the base height is 800 -> 800 * 0.5 = 400
  } else {
    chartHeight = Math.round(screenHeight * 0.5)
  }
  $('#container-graphe').removeClass('d-none')
  currGraph = null
  Highcharts.chart('container-graphe', {
    chart: {
      height: chartHeight,
      type: 'bar',
      zooming: {
        type: 'xy'
      }     
    },
    title: {
      text : null
    },
    xAxis: {
      type: 'category'
    },
    yAxis: {
      min: 0,
      max: maxY,
      alignTicks: false,   //https://stackoverflow.com/questions/33931775/min-max-yaxis-not-working-correctly-in-highcharts
      endOnTick: false,
      title: {
          text: i18n.gettext('Number of flights')
      },
      labels: {
        overflow: 'justify'
      },
    },
    legend: {
      enabled: false
    },
    tooltip: {
      formatter: function() {
        let additionalString = ''
        let index = this.point.index
        if (index > -1 && sitesHrFiltered.length) {          
          additionalString = ' <i>'+ sitesHrFiltered[index]+' h</i>'         
        }
        return '<b>'+this.y+' '+i18n.gettext('flights')+'</b>'+additionalString
      }     
    },
    series: [{
      colorByPoint: true,
      data: sitesFiltered
    }]
  })  
  currGraph = 'S'
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

function computeSizeScreen() {
    // Compute height of chart
    let chartHeight
    let screenHeight = store.get('screenHeight')
    if (screenHeight == null) {
      chartHeight = 480   // the base height is 800 -> 800 * 0.6 = 480
    } else {
      chartHeight = Math.round(screenHeight * 0.6)
    }
    return chartHeight
}

function checkgAll() {
  if (document.getElementById("checkg-all").checked == true){
    document.getElementById("checkg1").checked = true
    document.getElementById("checkg2").checked = true
    document.getElementById("checkg3").checked = true
  } else {
    document.getElementById("checkg1").checked = false
    document.getElementById("checkg2").checked = false
    document.getElementById("checkg3").checked = false
  }  
}

function checkAll() {
  if (document.getElementById("check-all").checked == true){
    document.getElementById("check1").checked = true
    document.getElementById("check2").checked = true
    document.getElementById("check3").checked = true
    document.getElementById("check4").checked = true
    document.getElementById("check5").checked = true
    document.getElementById("check6").checked = true
    document.getElementById("check7").checked = true
    document.getElementById("check8").checked = true
    document.getElementById("check9").checked = true
    document.getElementById("check10").checked = true
    document.getElementById("check11").checked = true
    document.getElementById("check12").checked = true
  } else {
    document.getElementById("check1").checked = false
    document.getElementById("check2").checked = false
    document.getElementById("check3").checked = false
    document.getElementById("check4").checked = false
    document.getElementById("check5").checked = false
    document.getElementById("check6").checked = false
    document.getElementById("check7").checked = false
    document.getElementById("check8").checked = false
    document.getElementById("check9").checked = false
    document.getElementById("check10").checked = false
    document.getElementById("check11").checked = false
    document.getElementById("check12").checked = false
  }
}

function filterMonthes() {
  let monthData = []
  let monthLabels = []
  const ch1 = document.getElementById("check1").checked
  const ch2 = document.getElementById("check2").checked
  const ch3 = document.getElementById("check3").checked
  const ch4 = document.getElementById("check4").checked
  const ch5 = document.getElementById("check5").checked
  const ch6 = document.getElementById("check6").checked
  const ch7 = document.getElementById("check7").checked
  const ch8 = document.getElementById("check8").checked
  const ch9 = document.getElementById("check9").checked
  const ch10 = document.getElementById("check10").checked
  const ch11 = document.getElementById("check11").checked
  const ch12 = document.getElementById("check12").checked
  for (let i = 0; i < 12; i++) {
    switch (i) {
      case 0:
        if (ch1) monthLabels.push(i18n.gettext('Jan'))
        break      
      case 1:
        if (ch2)monthLabels.push(i18n.gettext('Feb'))        
        break
      case 2:
        if (ch3) monthLabels.push(i18n.gettext('Mar'))
        break
      case 3:
        if (ch4) monthLabels.push(i18n.gettext('Apr'))
        break                
      case 4 : 
        if (ch5) monthLabels.push(i18n.gettext('May'))
        break;
      case 5:
        if (ch6) monthLabels.push(i18n.gettext('Jun'))
        break      
      case 6:
        if (ch7) monthLabels.push(i18n.gettext('Jul'))
        break
      case 7:
        if (ch8) monthLabels.push(i18n.gettext('Aug'))
        break
      case 8:
        if (ch9) monthLabels.push(i18n.gettext('Sep'))
        break                
      case 9 : 
        if (ch10) monthLabels.push(i18n.gettext('Oct'))
        break
      case 10:
        if (ch11) monthLabels.push(i18n.gettext('Nov'))
        break      
      case 11:
        if (ch12) monthLabels.push(i18n.gettext('Dec'))
        break                  
    }    
  }

  /*
  * We don't use array.filter because we don't find a solution to keep zero values
  * From the Array.prototype.filter() documentation:
  * filter() calls a provided callback function once for each element in an array, 
  * and constructs a new array of all the values 
  * for which callback returns a value that coerces to true
  */
  for (let i = 0; i < yearsMonthesSerie.length; i++) {
    let yearFiltered = []
    for (let j = 0; j < yearsMonthesSerie[i].length; j++) {
      const element = yearsMonthesSerie[i][j]
      switch (j) {
        case 0:
          if (ch1) yearFiltered.push(element)          
          break      
        case 1:
          if (ch2) yearFiltered.push(element)            
          break
        case 2:
          if (ch3) yearFiltered.push(element)          
          break
        case 3:
          if (ch4) yearFiltered.push(element)            
          break                
        case 4 : 
          if (ch5) yearFiltered.push(element)
          break;
        case 5:
          if (ch6) yearFiltered.push(element)
          break      
        case 6:
          if (ch7) yearFiltered.push(element)
          break
        case 7:
          if (ch8) yearFiltered.push(element)            
          break
        case 8:
          if (ch9) yearFiltered.push(element)
          break                
        case 9 : 
          if (ch10) yearFiltered.push(element)
          break
        case 10:
          if (ch11) yearFiltered.push(element)
          break      
        case 11:
          if (ch12) yearFiltered.push(element)
          break                  
      }
    }
    monthData.push({
      name: yearsSerie[i],
      data: yearFiltered    
    })  
  }
  return [monthLabels,monthData]
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

function displayMainFooter() {
  let chartTitle = i18n.gettext('Display interval')+' '+selYearBegin.value+' - '+selYearEnd.value
  document.getElementById('footer-2').innerHTML = '<H4>'+chartTitle+'</H4>'
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