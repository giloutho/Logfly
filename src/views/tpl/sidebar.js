/**
 * Translate and fill menu options
 * @param {} i18n 
 * @returns 
 */
const Store = require('electron-store')
const store = new Store()

function fillMenuOptions(i18n) {
    const lastYear = store.get('lastyear')
    const menuOptions = {
        logbook : i18n.gettext('Logbook'),
        overview : i18n.gettext('Overview')+' '+lastYear,
        import : i18n.gettext('Import'),
        external : i18n.gettext('External track'),
        stat : i18n.gettext('Statistics'),
        sites : i18n.gettext('Sites'),
        wayp : i18n.gettext('Waypoints'),
        airspaces : i18n.gettext('Airspaces'),
        equipment : i18n.gettext('Equipment'),
        nav : i18n.gettext('XC Nav'),
        settings : i18n.gettext('Settings'),
        support : i18n.gettext('Support'),
        utils : i18n.gettext('Utilities'),
        still : '  '+i18n.gettext('Still menu'),
    };  

    return menuOptions
}

module.exports.fillMenuOptions = fillMenuOptions