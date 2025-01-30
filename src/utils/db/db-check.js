const Store = require('electron-store');
const store = new Store();
const db = require('better-sqlite3')(store.get('dbFullPath'))
const log = require('electron-log')

function checkEquipTable() {    
    let equipTableOk = false
    if (db.open) {
        const stmtEquip = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`);
        const resEquip = stmtEquip.get('Equip')  
        if (resEquip != undefined && resEquip != null) {
            if (resEquip['name'] == 'Equip') equipTableOk = true
        } else {
            try {
                let creaEquip = 'CREATE TABLE Equip (M_ID integer NOT NULL PRIMARY KEY, M_Date TimeStamp, M_Engin varchar(30),'
                creaEquip += 'M_Event varchar(30), M_Price double, M_Comment Long Text)'
                const stmtCreaEquip= db.prepare(creaEquip)
                const infoEquip = stmtCreaEquip.run()
                if (infoEquip.changes == 0) {
                    equipTableOk = true
                }     
            } catch (error) {
                log.error('Error occured during creation of table Equip '+' : '+error)
            }
        }
    }  
    return equipTableOk 
}

module.exports.checkEquipTable = checkEquipTable