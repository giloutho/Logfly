/* 
***** from https://bufferwall.com/posts/330881001ji1a/ 
*/
function pie(cx, cy, radius, data) {

    //var decimals = 4; devient 10000 pour 4 chiffres après la virgule
    var decimals = 10000;
    var total = 0;
    var offset = 0;
    var offset2;
    var arr = [];
    var x;
    var y;
    var la;
    var radians;

    for (var i = 0; i < data.length; i++)
        total += data[i].value;

    for (var i = 0; i < data.length; i++) {

        var item = data[i];
        var tmp = {};

        tmp.index = i;
        tmp.value = item.value;
        // radians = (Math.round(((((item.value / total) * 360) * Math.PI) / 180)*decimals))/decimals;
        // offset2 = (Math.round(((offset / total) * 360)*decimals))/decimals
        radians = (((item.value / total) * 360) * Math.PI) / 180;
        offset2 = ((offset / total) * 360);

        tmp.data = item;

        // x = (Math.round((cx + Math.sin(radians) * radius)*decimals))/decimals;
        // y = (Math.round((cy - Math.cos(radians) * radius)*decimals))/decimals;
        x = cx + Math.sin(radians) * radius;
        y = cy - Math.cos(radians) * radius;
        la = radians > Math.PI ? 1 : 0;

        // Arc
        tmp.d = `M${cx} ${cy},L${cx} ${cy - radius},A${radius} ${radius},0 ${la} 1,${x} ${y}Z`;
     //  tmp.transform = 'rotate({0}, {1}, {2})'.format(offset2, cx, cy);
        tmp.transform = `rotate(${offset2}, ${cx}, ${cy})`;
        // Text
        x = (Math.round((cx + Math.sin(radians / 2) * radius / 2)*decimals))/decimals;
        y = (Math.round((cy - Math.cos(radians / 2) * radius / 2)*decimals))/decimals;
   //     tmp.text = 'x="{0}" y="{1}" transform="rotate({2},{0},{1})"'.format(x, y, -offset2);
        tmp.text = `x="${x}" y="${y}" transform="rotate(${-offset2},${x},${y})`;
        offset += item.value;
        arr.push(tmp);
    }

    return arr;
} 

module.exports.pie = pie