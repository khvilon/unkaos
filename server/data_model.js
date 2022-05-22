let data_model = {}

let sql = require('./sql')
var tools = require('./tools')

const schema = 'public'
   
data_model.querys = 
{
    forein_keys:`
    SELECT
        tc.constraint_name, 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
    `
    ,
    columns:`
    SELECT
        table_name,
        column_name,
        data_type,
        column_default,
        is_nullable
    FROM
        information_schema.columns
    WHERE
        table_schema = 'public' AND table_name NOT LIKE '%_to%'
    ORDER BY
        table_name;
    `
}

data_model.load_columns = async function()
{
    let ans = await sql.query(schema, data_model.querys.columns)
    let columns = ans.rows
    data_model.model = {}
    let table_name
    for(let i in columns)
    {
        let column = columns[i]
        if (column.table_name != table_name)
        {
            table_name = column.table_name
            data_model.model[table_name] = {columns:{}}
        }

        data_model.model[table_name].columns[column.column_name] = column
    }
}



data_model.load_relations = async function()
{
    let ans = await sql.query(schema, data_model.querys.forein_keys)
    let forein_keys = ans.rows

    for(let i in forein_keys)
    {
        let fk = forein_keys[i]

        if(fk.table_name.contains('_to_')) //relation many to many via _to_ table
        {
            let table_name = fk.table_name.split('_to_')[0]

            if(table_name == fk.foreign_table_name) continue

            if(data_model.model[table_name]['fk'] == undefined) data_model.model[table_name]['fk'] = []
            data_model.model[table_name]['fk'].push(fk.foreign_table_name)
        }
        else //relation one to many
        {
            let local_name = fk.constraint_name.split('_to_')[0].replace('fk_', '')
            if(local_name == fk.table_name)
                data_model.model[fk.table_name].columns[fk.column_name]['fk'] = fk.foreign_table_name
            else if(local_name == fk.foreign_table_name)
            {     
                if(data_model.model[local_name]['fks'] == undefined) data_model.model[local_name]['fks'] = []
                data_model.model[local_name]['fks'].push(fk.table_name) 
            }
        }    
    }
}

data_model.load = async function()
{
    await data_model.load_columns()
    await data_model.load_relations()
}

module.exports = data_model