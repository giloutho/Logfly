let osmlayer = {
  url : 'http://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  options : {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
  }
}

let OpenTopoMap = {
  url : 'http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  options : {
    maxZoom: 16,
    attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a             href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
  }
}

let mtklayer = {
  url : 'http://tile2.maptoolkit.net/terrain/{z}/{x}/{y}.png'
}

let fouryoulayer = {
  url :'http://4umaps.eu/{z}/{x}/{y}.png'
}

module.exports = {
  osmlayer,
  OpenTopoMap,
  mtklayer,
  fouryoulayer
};