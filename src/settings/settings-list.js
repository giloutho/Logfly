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

function getLeagues() {
    let leagueList = [
        { key: 'FR', val: 'FFVL' },
        { key: 'XC', val: 'XContest' }
    ]

    return leagueList
}


module.exports.getAllGps = getAllGps
module.exports.getLeagues = getLeagues

