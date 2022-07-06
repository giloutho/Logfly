/**
 * Translate and fill menu options
 * @param {} i18n 
 * @returns 
 */
function fillMenuOptions(i18n) {
    const menuOptions = {
        logbook : i18n.gettext('Logbook'),
        overview : i18n.gettext('Overview'),
        import : i18n.gettext('Import'),
        external : i18n.gettext('External track'),
        stat : i18n.gettext('Statistics'),
        sites : i18n.gettext('Sites'),
        wayp : i18n.gettext('Waypoints'),
        airspaces : i18n.gettext('Airspaces'),
        photos : i18n.gettext('Photos'),
        settings : i18n.gettext('Settings'),
        support : i18n.gettext('Support'),
        tools : i18n.gettext('Tools'),
    };  

    return menuOptions
}

module.exports.fillMenuOptions = fillMenuOptions