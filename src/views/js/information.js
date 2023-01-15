var {ipcRenderer} = require('electron')
var i18n = require('../../lang/gettext.js')()
const os = require('os')
var Mustache = require('mustache')
const fs = require('fs')
const path = require('path');
const log = require('electron-log');
var Store = require('electron-store')
var store = new Store()
let menuFill = require('../../views/tpl/sidebar.js')
const { event } = require('jquery')
let btnMenu = document.getElementById('toggleMenu')
let infoTitle = document.getElementById('info-title')
let infoTextFr = document.getElementById('info-text-fr')
let infoTextEn = document.getElementById('info-text-en')
let btnDownload = document.getElementById('bt-downl')
let currLang
let releaseInfo
const currOS = store.get('currOS')

iniForm()

function iniForm() {
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
    btnDownload.innerHTML = i18n.gettext('Download')
    btnDownload.addEventListener('click',(event) => {
        downloadRelease()
    })
    ipcRenderer.send("ask-infos");    // main.js
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

ipcRenderer.on('read-infos', (event, result) => {
    releaseInfo = result
    const currVersion = store.get('version')
    if (releaseInfo.release !== undefined) {
        if (releaseInfo.release > currVersion) {
            infoTitle.innerHTML = i18n.gettext('An update is available')        
            infoTextFr.innerHTML = releaseInfo.date+'<br>      6.'+currVersion+'  ==>  6.'+releaseInfo.release
            infoTextEn.innerHTML = releaseInfo.info
            $('#div-downl').removeClass('d-none')
            $('#div-downl').addClass('d-block')     
        } else {
            infoTitle.innerHTML = i18n.gettext('Your version is up to date')        
            infoTextFr.innerHTML = i18n.gettext('Installed')+'  ==>  6.'+currVersion+'<br>'+i18n.gettext('Available')+'  ==>  6.'+releaseInfo.release 
        }   
    } else if ((releaseInfo.message !== undefined)) {
        infoTitle.innerHTML = i18n.gettext('Important message')
    }
})

ipcRenderer.on("dl-complete", (event, file) => {
    // console.log('Téléchargement terminé : '+file) // Full file path
    ipcRenderer.send('run-update', file)
    // $('#div-progress').removeClass('d-block')
    // $('#div-progress').addClass('d-none')
    // $('#div-msg-mac').removeClass('d-none')
    // $('#div-msg-mac').addClass('d-block')      
    // switch (currOS) {
    //     case 'mac':
    //         document.getElementById('msg-mac').innerHTML = 'Double click on Logfly6.dmg AND drag the Logfly icon to the Applications icon'  
    //         document.getElementById("drag-mac").src='../../assets/img/drag_mac.jpg'
    //         break;
    //     case 'win':
    //         console.log(releaseInfo.win)
    //         break;            
    //     case 'linux':
    //         console.log(releaseInfo.linux)
    //         break;   
    // }        
});

ipcRenderer.on('dl-progress', (event, progress) => {
    const cleanPercent = Math.floor(progress.percent * 100); // Without decimal point
    $('.progress-bar').css('width', `${cleanPercent}%`).text(`${cleanPercent} %`)
});

function downloadRelease() {
    $("#bt-downl").addClass('disabled')
    $('#div-progress').removeClass('d-none')
    $('#div-progress').addClass('d-block')
    $('#div-msg-mac').removeClass('d-none')
    $('#div-msg-mac').addClass('d-block')
    switch (currOS) {
        case 'mac':
            document.getElementById('msg-mac1').innerHTML = i18n.gettext('When the download is finished, in the finder, double click on Logfly6.dmg')
            document.getElementById("drag-mac").src='../../assets/img/drag_mac.jpg'
            document.getElementById('msg-mac2').innerHTML = i18n.gettext('Drag the Logfly icon to the Applications icon')
            const cpuCore = os.cpus()
            if (cpuCore[0].model.includes("Apple")) {
                console.log('Go pour '+releaseInfo.macapple)
                ipcRenderer.send('dl-file-progress', releaseInfo.macapple)
            } else {
                console.log('Go pour '+releaseInfo.macintel)
                ipcRenderer.send('dl-file-progress', releaseInfo.macintel)
            }
            break;
        case 'win':
            console.log(releaseInfo.win)
            document.getElementById('msg-mac1').innerHTML = i18n.gettext('When the download is finished, in the File Explorer, double click on Logfly_Install.exe')  
            document.getElementById("drag-mac").src='../../assets/img/drag_win.jpg'
            document.getElementById('msg-mac2').innerHTML = i18n.gettext('Wait until the installation is complete')
            ipcRenderer.send('dl-file-progress', releaseInfo.win)
            break;            
        case 'linux':
            console.log(releaseInfo.linux)
            break;   
    }
}
