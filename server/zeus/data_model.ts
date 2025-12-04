import sql from "./sql";
import { createLogger } from '../server/common/logging';

const logger = createLogger('zeus');

let data_model:any = {}

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
    logger.debug('Loading database columns');
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
    logger.info({
        msg: 'Database columns loaded',
        tables: Object.keys(data_model.model).length
    });
}

data_model.load_relations = async function()
{
    logger.debug('Loading database relations');
    let ans = await sql.query(schema, data_model.querys.forein_keys)

    let forein_keys = ans.rows

    for(let i = 0; i <  forein_keys.length; i++)
    {
        let fk = forein_keys[i]

        if(fk.table_name.includes('_to_')) //relation many to many via _to_ table
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

    logger.info({
        msg: 'Database relations loaded',
        foreign_keys: forein_keys.length
    });
}

data_model.has_fk = function(table_name:string, fk_name:string)
{
    logger.debug({
        msg: 'Checking foreign key',
        table: table_name,
        fk: fk_name
    });

    let fk = data_model.model[table_name].fk
    if(fk == undefined) return false
    for(let i in fk)
    {
        if (fk_name == fk[i]) return true
    }
    return false
}

data_model.load = async function()
{
    logger.info('Loading data model');
    await data_model.load_columns()
    await data_model.load_relations()
    logger.info('Data model loaded successfully');
}

export default data_model