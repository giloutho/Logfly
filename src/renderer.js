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
  let content = fs.readFileSync(path.join(__dirname, 'lang/fr.json'));
  let langjson = JSON.parse(content);
  i18n.setMessages('messages', 'fr', langjson)
  i18n.setLocale('fr');

  // let content = fs.readFileSync(path.join(__dirname, 'lang/de.json'));
  // let langjson = JSON.parse(content);
  // i18n.setMessages('messages', 'de', langjson)
  // console.log('avant : '+i18n.getLocale())
  // i18n.setLocale('de');
  // console.log('après : '+i18n.getLocale())  

} catch (error) {
  console.log('renderer : '+error)
}

// menu translation
document.getElementById('logbook').innerHTML = i18n.gettext('Logbook')
document.getElementById('overview').innerHTML = i18n.gettext('Overview')
document.getElementById('import').innerHTML = i18n.gettext('Import')
document.getElementById('external').innerHTML = i18n.gettext('External')  
document.getElementById('stat').innerHTML = i18n.gettext('Statistics')  
// Home page choice
if (store.get('checkDb')) {
  myRouter.navigate('logbook')
} else {
  myRouter.navigate('import')
}

