/**
 * https://stackoverflow.com/questions/14208651/javascript-sort-key-value-pair-object-based-on-value
 * .... JavaScript objects have no order
 * .... if you need a sort-able list, you'll have to store it as an array of objects:
 */

function getAllGps() {

    let gpsList = [
        { key: 'none', val: ' No GPS selected' },
        { key: '6020', val: '6020/6030' },
        { key: '6015', val: '6015' },
        { key: 'flynet', val: 'Flynet' },
        { key: 'flymold', val: 'Flymaster (old)' },
        { key: 'rever', val: 'Reversale' },
        { key: 'sky2', val: 'Skytraax 2' },
        { key: 'oudi', val: 'Oudie' },
        { key: 'elem', val: 'Element' },
        { key: 'sens', val: 'Sensbox' },
        { key: 'syri', val: 'Syride' },
        { key: 'flyma', val: 'Flymaster' },
        { key: 'conn', val: 'Connect' },
        { key: 'sky3', val: 'Skytraxx 3/4' },
        { key: 'cpil', val: 'C-Pilot Evo' },
        { key: 'xctra', val: 'XC Tracer' },
        { key: 'digi', val: 'Digifly' },
        { key: 'vard', val: 'Varduino' }                                 
    ]

    gpsList = gpsList.sort(function (a, b) {
        return a.val.localeCompare( b.val );
    });

    return gpsList
}

function getLanguages(i18n) {
    let langList = [
        { key: 'de', val: i18n.gettext('German') },
        { key: 'en', val: i18n.gettext('English') },
        { key: 'fr', val: i18n.gettext('French') },
        { key: 'it', val: i18n.gettext('Italian') }
    ]

    return langList
}

function getLeagues() {
    let leagueList = [
        { key: 'FR', val: 'FFVL' },
        { key: 'XC', val: 'XContest' }
    ]

    return leagueList
}

function getStart(i18n) {
    let startList = [
        { key: 'log', val: i18n.gettext('Logbook') },
        { key: 'ove', val: i18n.gettext('Overview') }
    ]

    return startList
}

function getOverview(i18n) {
    let overList = [
        { key: 'cal', val: i18n.gettext('Calendar year') },
        { key: 'last', val: i18n.gettext('Last twelve months') }
    ]

    return overList
}

function getMaps() {
    let overList = [
        { key: 'open', val: 'OpenTopo' },
        { key: 'ign', val: 'IGN' },
        { key: 'osm', val: 'OpenStreetMap' },
        { key: 'mtk', val: 'MTK' },
        { key: '4u', val: '4UMaps' },
        { key: 'out', val: 'Outdoor' },        
    ]

    return overList
}


module.exports.getAllGps = getAllGps
module.exports.getLeagues = getLeagues
module.exports.getLanguages = getLanguages
module.exports.getStart = getStart
module.exports.getOverview = getOverview
module.exports.getMaps = getMaps
