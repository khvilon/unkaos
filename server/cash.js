let cash = { data: {} }

let data_model = require('./data_model')
var crud = require('./crud')
var sql = require('./sql')


cash.load = async function(){

    for (let table_name in data_model.model){

        data_model.model[table_name]
        if(table_name.contains('_to_') || data_model.model[table_name].columns['uuid'] === undefined || table_name == 'issues' || table_name == 'issue_types') continue

        console.log('cashel', table_name)

        let query = crud.make_query.read(table_name)

        console.log(query)

        let ans = await sql.query(query)

        cash.data[table_name] = ans
    }     
}

module.exports = cash