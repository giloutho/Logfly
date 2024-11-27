const {ipcMain} = require('electron')

function processItem(item) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
//        console.log(`Processing item ${item}`)
        let myair = {
            name : item.name,
            type : item.type
        }
        resolve(myair);
      }, '');
    });
  }

async function processDecoding(openAipArray) {
    const promiseArray = []
    for (const item of openAipArray) {
      promiseArray.push(processItem(item));
    }
    const result = await Promise.all(promiseArray);
    console.dir(result);
}

ipcMain.handle('openaip', async (event, openAipArray) => {
    const result = await processDecoding(openAipArray)
    return result
})