const {app, ipcMain} = require('electron')
const fs = require('fs')
const path = require('path');
const FormData = require('form-data');

ipcMain.on('upload-igc', (event, igcText) => {
    let result
    let tempFileName  = path.join(app.getPath('temp'), 'flyxc.igc')  
    console.log(tempFileName)
    fs.writeFileSync(tempFileName, igcText)    
	if (fs.existsSync(tempFileName)) {
        let tempFicName = '123456789.igc'
        let CrLf = "\r\n";
        let header1 = "-----------------------------4664151417711"+CrLf;
        header1 += "Content-Disposition: form-data; name=\"uploadedfile\"; filename=\""+tempFicName+"\""+CrLf;
        header1 += "Content-Type: text/plain"+CrLf;        
        let form = new FormData();
        form.append('logfly', fs.createReadStream(tempFileName));
        var options = {
          header: header1
        };
        form.submit({
          host: 'logfly.org',
          path: 'http://logfly.org/Visu/jsupload.php',
          options
        }, function(err, res) {
          const body = []
          res.on('data', (chunk) => body.push(chunk))
          res.on('end', () => {
            const resString = Buffer.concat(body).toString()
            console.log(resString)
            result = resString
            event.returnValue = result
          })
        });        
    } else {
        result = 'Error = Temp file not found'
        event.returnValue = result
    }
    
})