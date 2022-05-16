let crud = {}

let data_model = require('./data_model')
var tools = require('./tools')
var sql = require('./sql')

crud.json_sql = function(table_name)
{
    return "CASE WHEN COUNT(" + table_name + ") = 0 then '[]' ELSE JSONB_AGG(DISTINCT " + table_name + ") END"
}
  
crud.make_read_query_template = function(table_name, num)
{
    if (num == undefined) num = 1
    let select = "'" + table_name + "' AS table_name"
    let join = ''
    let group = ''
    
    let forein_table_num = 1

    for(let i in data_model.model[table_name].columns){
        let column = data_model.model[table_name].columns[i]

        if(group != '') group += ', '

        group += 't' + num + '.' + column.column_name
        select += ', t' + num + '.' + column.column_name
        
        if(column.fk != undefined){
            let forein_table_num_str = num + '' + forein_table_num

            join += ' LEFT JOIN (' + crud.make_read_query_template(column.fk, forein_table_num_str) +') f'  + forein_table_num_str + 
            ' ON t' + num + '.' + column.column_name + ' = f' + forein_table_num_str + '.uuid'

            select += ', ' + crud.json_sql('f' + forein_table_num_str) + ' AS ' + column.column_name.replace('_uuid', '')

            forein_table_num++
        }
    }
    for(let i in data_model.model[table_name]['fk']){
        let fk_table_name = data_model.model[table_name]['fk'][i]
        let relations_table_name = table_name + '_to_' + fk_table_name
        let forein_table_num_str = num + '' + forein_table_num

        //console.log('lll', fk_table_name, relations_table_name)
        
        select += ', ' + crud.json_sql('ff' + forein_table_num_str) + ' AS ' + fk_table_name

        join += 
        ' LEFT JOIN ' + relations_table_name + ' r' + forein_table_num_str + 
        ' ON ' + 'r' + forein_table_num_str + '.' + table_name + '_uuid = t' + num + '.uuid ' +
        ' LEFT JOIN (' + crud.make_read_query_template(fk_table_name, forein_table_num_str) + ') ff' + forein_table_num_str + 
        ' ON ' + 'r' + forein_table_num_str + '.' + fk_table_name + '_uuid = ff' + forein_table_num_str + '.uuid'
    }
    for(let i in data_model.model[table_name]['fks']){
        let fk_table_name = data_model.model[table_name]['fks'][i]
        console.log('fk_table_name', table_name, fk_table_name)

        let forein_table_num_str = num + '' + forein_table_num + '_' + i

        select += ', ' + crud.json_sql('f' + forein_table_num_str) + ' AS ' + fk_table_name

        join += 
        ' LEFT JOIN (' + crud.make_read_query_template(fk_table_name, forein_table_num_str) + ') f' + forein_table_num_str + 
        ' ON ' + 'f' + forein_table_num_str + '.' + table_name + '_uuid = t' + num + '.uuid'
    }

    let and = ''
    let del = 'TRUE'
    if(num == 1) {
        and = '$1 '
        //del = 't' + num + '.deleted_at IS NULL ' 
    }
    del = 't' + num + '.deleted_at IS NULL '

    if(join == '') group = ''
    else group = ' GROUP BY ' + group

    let query = 'SELECT ' + select + ' FROM ' + table_name + ' t' + num + ' ' + join + 
        ' WHERE ' + del + and + group

    if(num == 1) console.log('q', table_name, query)
    return query
}

crud.load = async function(){
    await data_model.load()

    crud.querys = {}

    for (let table_name in data_model.model){
        crud.querys[table_name] = {
            create: 'INSERT INTO ' + table_name + '($1) VALUES ($2)',
            read: crud.make_read_query_template(table_name),
            update: 'UPDATE ' + table_name + ' SET $2 WHERE uuid = $1',
            delete: 'UPDATE ' + table_name + ' SET deleted_at = NOW() WHERE uuid = $1',
            upsert: ''
        }
    }

    crud.querys['issues']['read'] = `SELECT 
    'issues' AS TABLE_NAME,
    T1.UUID,
    T1.NUM,
    T1.TYPE_UUID,
    T11.NAME AS TYPE_NAME,
    T1.CREATED_AT,
    T1.UPDATED_AT,
    T1.DELETED_AT,
    T1.PROJECT_UUID,
    T12.NAME AS PROJECT_NAME,
    T12.SHORT_NAME AS PROJECT_SHORT_NAME,
    JSONB_AGG(T13) AS VALUES
    FROM 
    ISSUES T1
    JOIN
    ISSUE_TYPES T11
    ON 
    T1.TYPE_UUID = T11.UUID
    JOIN
    PROJECTS T12
    ON 
    T1.PROJECT_UUID = T12.UUID
    JOIN
    (SELECT FV.ISSUE_UUID, FV.VALUE, F.NAME
     FROM FIELD_VALUES FV
     JOIN FIELDS F
     ON FV.FIELD_UUID = F.UUID
    )T13
    ON 
    T1.UUID = T13.ISSUE_UUID
    WHERE T1.DELETED_AT IS NULL
    GROUP BY
    T1.UUID,
    T1.NUM,
    T1.TYPE_UUID,
    TYPE_NAME,
    T1.CREATED_AT,
    T1.UPDATED_AT,
    T1.DELETED_AT,
    T1.PROJECT_UUID,
    PROJECT_NAME,
    PROJECT_SHORT_NAME
    `
}

crud.make_query = {

    read: function(table_name, params){

        let query = crud.querys[table_name]['read']

        if(!params || params.length == 0) return query.replace('$1', '')

        let where = ''
        for(let i in params){
            where = ' AND t1.' + i + "='" + params[i] + "'"
        }
        return query.replace('$1', where)
    },

    delete: function(table_name, params){

        let query = crud.querys[table_name]['delete']

        return query.replace('$1', "'" + params.uuid + "'")
    },

    create: function(table_name, params){
        console.log('tn', table_name)
    
        let query = crud.querys[table_name]['create']

        let keys = '', values = ''

        let columns = data_model.model[table_name].columns

        params.updated_at = 'NOW()'

        for(let i in params){
            if(columns[i] === undefined || i === 'created_at' ||  i === 'deleted_at') continue;

            if(keys != ''){keys += ', '; values += ', '}

            keys += i
            values += "'" + params[i] + "'"
        }

        query = query.replace('$1',  keys)
        query = query.replace('$2',  values )

        return query
    },

    update: function(table_name, params){
        let read_query = crud.querys[table_name]['read']


        let query = crud.querys[table_name]['update']

        query = query.replace('$1', "'" + params.uuid + "'")

        let set = ''

        let columns = data_model.model[table_name].columns

        params.updated_at = 'NOW()'

        for(let i in params){
            if(columns[i] === undefined || i === 'created_at' ||  i === 'deleted_at') continue;

            if(set != '') set += ', '

            set += i + "='" + params[i] + "'"
        }

        query = query.replace('$2', set)

        return query;
    },

    upsert: function(table_name, params){
        let query_create = crud.make_query.create(table_name, params)
        let query_update = crud.make_query.update(table_name, params)
        query_update = query_update.replace(table_name, '').split('WHERE')[0]

        let query = query_create + ' ON CONFLICT(uuid) DO ' + query_update + ';'

        let subquerys = ''
        
        for(let i in params){

            //console.log('ccc1', params[i], typeof params[i])

            if(!params[i] || params[i][0] === undefined || typeof params[i][0] !== 'object') continue

           // console.log(typeof params[i])
            

            for(let j in params[i]){
                let child =  params[i][j] 
                subquerys += '\r\n' + crud.make_query.upsert(child.table_name, child)
            }
        }

        return query + subquerys
    }
}
        
crud.get_query = function(method, table_name, params)
{
    //console.log(func_name, 'aa', method, 'bb', table_name)

    let query = crud.make_query[method](table_name, params)

    if(method == 'update' || method == 'create' || method == 'upsert')
    {
        let read_query = crud.make_query.read(table_name, {uuid:  params.uuid})

        query += ';\r\n' + read_query
    }

    return query
}

crud.get_uuids = function(obj)
{
    let ans = {}
    if(obj.uuid !== undefined) ans[obj.uuid] = obj.table_name
    for(let i in obj)
    {
        if(obj[i]===undefined || obj[i]===null || obj[i][0] === undefined || obj[i][0].uuid === undefined) continue
        let fks = data_model.model[obj.table_name]['fks']
        console.log('fff', fks, 'fdfdfd', obj[i][0].table_name)
        if(fks == undefined || !fks.includes(obj[i][0].table_name)) continue
        console.log('fff2', fks, 'fdfdfd', obj[i][0].table_name)
        for(let j in obj[i])
        {
            ans = tools.obj_join(ans, crud.get_uuids(obj[i][j]))
        }  
    }
    return ans
}


crud.do = async function(method, table_name, params)
{

    let query = crud.get_query(method, table_name, params)

    if(method != 'read')
    {
        let read_query = crud.make_query.read(table_name, {uuid:  params.uuid})

        let data = await sql.query(read_query)

        if(data.rows.length > 0)
        {
            let old_uuids = crud.get_uuids(data.rows[0])

            console.log(old_uuids)

            let new_uuids = crud.get_uuids(params)

            console.log(new_uuids)

            let del_query = ''
            for(let i in old_uuids)
            {
                if(new_uuids[i] != undefined) continue;
                del_query = crud.get_query('delete', old_uuids[i], {'uuid': i}) + ';' + del_query
            }

            query = del_query + query
        }   
    }

    console.log('qqqqq', query)
    let ans = await sql.query(query)

    if(ans[1] != undefined) ans = ans[ans.length-1]

    return ans
}



module.exports = crud