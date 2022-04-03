// Adapted from https://github.com/nitinhepat/spa-without-framework
const Router = require('./router.js')
const Routes = require("./routes.js") 
const fs = require('fs')
const path = require('path')
const log = require('electron-log')
const Store = require('electron-store')
const store = new Store();

const routeConfig = [
  new Routes({
    path:'logbook',
    url: './views/html/logbook.html'
  }),
  new Routes({
    path:'overview',
    url: './views/html/overview.html'
  },true),
  new Routes({
    path:'import',
    url: './views/html/import.html'
  },true),
  new Routes({
    path:'external',
    url: './views/html/external.html'
  },true),
  new Routes({
    path:'stat',
    url: './views/html/statistics.html'
  },true),
  new Routes({
    path:'sites',
    url: './views/html/sites.html'
  },true),
  new Routes({
    path:'waypoints',
    url: './views/html/waypoints.html'
  },true), 
  new Routes({
    path:'airspaces',
    url: './views/html/airspaces.html'
  },true),
  new Routes({
    path:'photos',
    url: './views/html/photos.html'
  },true), 
  new Routes({
    path:'settings',
    url: './views/html/settings.html'
  },true),   
  new Routes({
    path:'logfile',
    url: './views/html/logfile.html'
  },true),   
  new Routes({
    path:'about',
    url: './views/html/about.html'
  },true)
]

const myRouter = new Router(routeConfig,'app');

//  TO DO
// log.info('Start of Chrome : '+store.get('chromeVersion'))

try {
  let currLang = store.get('lang')
  let currLangFile = currLang+'.json'
  let content = fs.readFileSync(path.join(__dirname, 'lang/',currLangFile));
  let langjson = JSON.parse(content);
  i18n.setMessages('messages', currLang, langjson)
  i18n.setLocale(currLang);
} catch (error) {
  console.log('renderer : '+error)
}

// menu translation
document.getElementById('logbook').innerHTML = i18n.gettext('Logbook')
document.getElementById('overview').innerHTML = i18n.gettext('Overview')
document.getElementById('import').innerHTML = i18n.gettext('Import')
document.getElementById('external').innerHTML = i18n.gettext('External track')  
document.getElementById('stat').innerHTML = i18n.gettext('Statistics')  
/**
 * Home page choice in production will be
 * if (store.get('checkDb')) {
 *  myRouter.navigate('logbook')
 * } else {
 *   myRouter.navigate('import')
 * }
 */
// for debugging settings
myRouter.navigate('logbook')

function rendererCoucou() {
   alert('coucou Renderer ')
}


