let crud = {}

let data_model = require('./data_model')
var tools = require('./tools')
var sql = require('./sql')

const edited_type_uuid = '1ff12964-4f5c-4be9-8fe3-f3d9a7225300'
const transition_type_uuid = '4d7d3265-806b-492a-b6c1-636e1fa653a9'
const author_field_uuid = '733f669a-9584-4469-a41b-544e25b8d91a'
const name_field_uuid = 'c96966ea-a591-47a9-992c-0a2f6443bc80'


const select_limit = 200

const atob = require('atob');

const uuid_length = edited_type_uuid.length


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
    T11.WORKFLOW_UUID,
    T1.CREATED_AT,
    T1.UPDATED_AT,
    T1.DELETED_AT,
    T1.PROJECT_UUID,
    T12.NAME AS PROJECT_NAME,
    T12.SHORT_NAME AS PROJECT_SHORT_NAME,
    CASE WHEN COUNT(T14) = 0 THEN '[]' ELSE JSONB_AGG(DISTINCT T14) END AS VALUES,
    CASE WHEN COUNT(T15) = 0 THEN '[]' ELSE JSONB_AGG(DISTINCT T15) END AS ACTIONS,
    STATUS_UUID,
    T17.NAME AS STATUS_NAME,
    CASE WHEN COUNT(T18) = 0 THEN '[]' ELSE JSONB_AGG(DISTINCT T18) END AS ATTACHMENTS,
    T1.SPRINT_UUID,
    T20.NAME AS SPRINT_NAME
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
    JOIN ISSUE_STATUSES T17
    ON T1.STATUS_UUID = T17.UUID
	LEFT JOIN LATERAL
	(SELECT 
        'field_values' AS TABLE_NAME,
        FV.UUID AS UUID,
	 	YT.UUID AS ISSUE_TYPE_UUID,
	 	F.NAME AS LABEL,
	 	FT.CODE AS TYPE,
	 	FV.VALUE,
	 	T1.UUID AS ISSUE_UUID,
        F.UUID AS FIELD_UUID
	 FROM ISSUE_TYPES YT
	 JOIN ISSUE_TYPES_TO_FIELDS ITF
	 ON ITF.ISSUE_TYPES_UUID = YT.UUID
	 JOIN FIELDS F
	 ON ITF.FIELDS_UUID = F.UUID
	 JOIN FIELD_TYPES FT
	 ON FT.UUID = F.TYPE_UUID
	 LEFT JOIN FIELD_VALUES FV
	 ON FV.FIELD_UUID = F.UUID  AND T1.UUID = FV.ISSUE_UUID
	) T14
	ON T1.TYPE_UUID = T14.ISSUE_TYPE_UUID
    LEFT JOIN 
    (SELECT
        A.UUID,
        A.ISSUE_UUID,
        U.NAME AS AUTHOR,
        A.VALUE,
        AT.NAME,
        A.CREATED_AT
    FROM ISSUE_ACTIONS A
    JOIN ISSUE_ACTIONS_TYPES AT
    ON A.TYPE_UUID = AT.UUID
    JOIN USERS U
    ON A.AUTHOR_UUID = U.UUID
    ) T15
    ON T1.UUID = T15.ISSUE_UUID
    LEFT JOIN
    (SELECT 
        'attachments' AS TABLE_NAME,
        UUID,
        NAME,
        EXTENTION,
        ISSUE_UUID
    FROM ATTACHMENTS) T18
    ON T1.UUID = T18.ISSUE_UUID
    LEFT JOIN LATERAL
    ((SELECT
        ISSUE0_UUID,
        ISSUE1_UUID,
        'relations' AS TABLE_NAME,
        FALSE AS is_reverted
        FROM RELATIONS WHERE ISSUE0_UUID = T1.UUID)
    UNION
    (SELECT
        ISSUE1_UUID AS ISSUE0_UUID,
        ISSUE0_UUID AS ISSUE1_UUID,
        'relations' AS TABLE_NAME,
        TRUE AS is_reverted
        FROM RELATIONS WHERE ISSUE1_UUID = T1.UUID)
    ) T19
    ON T1.UUID = T19.ISSUE0_UUID
    LEFT JOIN SPRINTS T20
    ON T20.UUID = T1.SPRINT_UUID
    WHERE T1.DELETED_AT IS NULL $1
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
    PROJECT_SHORT_NAME,
    T1.STATUS_UUID,
    T17.NAME,
    T20.NAME,
    T11.WORKFLOW_UUID 
    LIMIT 
    ` + select_limit

    crud.querys['issue'] = {}
    crud.querys['issue']['read'] = crud.querys['issues']['read']
    crud.querys['issue']['upsert'] = crud.querys['issues']['upsert']
    crud.querys['issue']['create'] = crud.querys['issues']['create']
    crud.querys['issue']['update'] = crud.querys['issues']['update']
    crud.querys['issue']['delete'] = crud.querys['issues']['delete']

    crud.querys['issue_actions']['read'] = `SELECT * FROM issue_actions t1 WHERE deleted_at IS NULL $1`

    crud.querys['attachments']['read'] = `SELECT * FROM attachments T1 WHERE TRUE $1`
    crud.querys['attachments']['delete'] = `DELETE FROM attachments WHERE uuid = $1`

    crud.querys['board'] = {}
    crud.querys['board']['read'] = crud.querys['boards']['read']
    crud.querys['board']['upsert'] = crud.querys['boards']['upsert']
    crud.querys['board']['create'] = crud.querys['boards']['create']
    crud.querys['board']['update'] = crud.querys['boards']['update']
    crud.querys['board']['delete'] = crud.querys['boards']['delete']

    crud.querys['short_issue_info'] = {}
    crud.querys['short_issue_info']['read'] = `SELECT 
    I.UUID, P.SHORT_NAME || '-' || I.NUM || ' ' || FV.value AS name
    FROM ISSUES I
    JOIN PROJECTS P
    ON P.UUID = I.PROJECT_UUID 
    JOIN FIELD_VALUES FV
    ON FV.FIELD_UUID = '` + name_field_uuid + `' AND FV.ISSUE_UUID = I.UUID
    WHERE I.DELETED_AT IS NULL 
    AND P.SHORT_NAME || '-' || I.NUM || ' ' || FV.value LIKE '%$2%'
    LIMIT 20`

    crud.querys['formated_relations'] = {}
    crud.querys['formated_relations']['read'] = `
    SELECT * FROM (
        SELECT 
        R.UUID, 
        R.ISSUE0_UUID CURRENT_UUID,
        R.DELETED_AT,
        RT.NAME TYPE_NAME,
        P.SHORT_NAME || '-' || I.NUM  ID,
        FV.value ISSUE_NAME
        FROM RELATIONS R
        LEFT JOIN RELATION_TYPES RT
        ON RT.UUID = R.TYPE_UUID
        LEFT JOIN ISSUES I 
        ON R.ISSUE1_UUID = I.UUID
        LEFT JOIN PROJECTS P
        ON P.UUID = I.PROJECT_UUID 
        LEFT JOIN FIELD_VALUES FV
        ON FV.FIELD_UUID = '` + name_field_uuid + `' AND FV.ISSUE_UUID = I.UUID
        UNION
        SELECT 
        R.UUID, 
        R.ISSUE1_UUID CURRENT_UUID,
        R.DELETED_AT,
        RT.REVERT_NAME TYPE_NAME,
        P.SHORT_NAME || '-' || I.NUM  ID,
        FV.value ISSUE_NAME
        FROM RELATIONS R
        LEFT JOIN RELATION_TYPES RT
        ON RT.UUID = R.TYPE_UUID
        LEFT JOIN ISSUES I 
        ON R.ISSUE0_UUID = I.UUID
        LEFT JOIN PROJECTS P
        ON P.UUID = I.PROJECT_UUID 
        LEFT JOIN FIELD_VALUES FV
        ON FV.FIELD_UUID = '` + name_field_uuid + `' AND FV.ISSUE_UUID = I.UUID
    ) T1 WHERE DELETED_AT IS NULL $1
    LIMIT 50`    
    
}

crud.make_query = {

    read: function(table_name, params){

        if(table_name == undefined) return '';
        let query = crud.querys[table_name]['read']

        if(table_name == 'issues' && params['query']!= undefined && params['query']!= '')
        {
            let user_query = decodeURIComponent(atob( (params['query'])))

            //console.log('user_query', user_query)

            let uuids_query = `WITH uuids AS (
                SELECT DISTINCT issue_uuid 
                FROM field_values FV
                JOIN fields F
                ON FV.field_uuid = F.uuid
                JOIN issues I
                ON FV.issue_uuid = I.uuid
                WHERE `

                //"fields#733f669a-9584-4469-a41b-544e25b8d91a#='Х'andfields#247e7f58-5c9b-4a31-9c27-5d1d4c84669f#='ШС'"

                while(user_query.indexOf('fields#') > -1)
                {
                    let start = user_query.indexOf('fields#')
                    user_query = user_query.replaceFrom('fields#', "(F.uuid = '", start )
                    user_query = user_query.replaceFrom('#', "' AND FV.value" , start )
                    user_query = user_query.replaceFrom('#', ")" , start )
                }
                while(user_query.indexOf('attr#') > -1)
                {
                    let start = user_query.indexOf('attr#')
                    user_query = user_query.replaceFrom('attr#', "I." , start )
                    user_query = user_query.replaceFrom('#', "" , start )
                    user_query = user_query.replaceFrom('#', "" , start )
                }


                query = uuids_query + user_query + ')' + query.replace('$1', 'AND T1.uuid in (SELECT issue_uuid FROM uuids) $1')

               // console.log('qq w f', query)
               

               /* 
                (F.name = 'Название' AND FV.value  'aaa')
                OR
                (F.name = 'Описание' AND FV.value = 'b3')
                )*/

                delete params['query']
        }

        if(!params || params.length == 0) return query.replace('$1', '')

        console.log(params)

        let where = ''
        for(let i in params){
            if(i == 'offset')
            {
                query += ' OFFSET ' + params[i]
                continue
            }
            else if (i == 'like')
            {
                query = query.replace('$2', params[i])
            }
            where += 'AND t1.' + i + "='" + params[i] + "'"
        }
        return query.replaceAll('$1', where)
    },

    delete: function(table_name, params){

        let query = crud.querys[table_name]['delete']

        return query.replace('$1', "'" + params.uuid + "'")
    },

    create: function(table_name, params){
        console.log('tn', table_name)

        if(table_name == undefined) return '';
    
        let query = crud.querys[table_name]['create']

        let keys = '', values = ''

        let columns = data_model.model[table_name].columns

        params.updated_at = 'NOW()'

        for(let i in params){
            if(columns[i] === undefined || i === 'created_at' ||  i === 'deleted_at' ||
             i === 'password' || i === 'token' || i === 'token_created_at') continue;

             if(data_model.model[table_name].columns[i] == undefined) continue

            if(keys != ''){keys += ', '; values += ', '}

            keys += i
            let val = params[i]
            if(val != null) val = val.toString().replaceAll("'", "\'")
            values += "'" + val + "'"
        }

        query = query.replace('$1',  keys)
        query = query.replace('$2',  values )

        return query
    },

    update: function(table_name, params){
        if(table_name == undefined) return '';
        let read_query = crud.querys[table_name]['read']


        let query = crud.querys[table_name]['update']

        query = query.replace('$1', "'" + params.uuid + "'")

        let set = ''

        let columns = data_model.model[table_name].columns

        params.updated_at = 'NOW()'

        for(let i in params){
            if(params[i] == author_field_uuid) return 'NOTHING'
        }
        

        for(let i in params){
            if(columns[i] === undefined || i === 'created_at' ||  i === 'deleted_at' ||
             i === 'password' || i === 'token' || i === 'token_created_at') continue;

             //console.log(data_model.model[table_name])
             if(data_model.model[table_name].columns[i] == undefined) continue

            if(set != '') set += ', '

            let val = params[i]
            if(val != null) val = val.toString().replaceAll("'", "\'")
            set += i + "='" + val + "'"
        }

        query = query.replace('$2', set)

        return query;
    },

    upsert: function(table_name, params){
        if(table_name == undefined) return '';
        let query_create = crud.make_query.create(table_name, params)
        let query_update = crud.make_query.update(table_name, params)
        query_update = query_update.replace(table_name, '').split('WHERE')[0]

        let query = query_create + ' ON CONFLICT(uuid) DO ' + query_update + ';'

        if(table_name == 'issues' && params.num == undefined)
        {
            query += "UPDATE issues SET num = (SELECT COALESCE(MAX(num), 0) + 1 FROM oboz.issues WHERE project_uuid = '" + 
            params.project_uuid + "') WHERE uuid = '" + params.uuid + "';";

            query += `UPDATE issues SET status_uuid = (
            SELECT IST.uuid 
            FROM issue_types IT
            JOIN workflow_nodes WN
            ON WN.workflows_uuid = IT.workflow_uuid
            JOIN issue_statuses IST
            ON IST.uuid = WN.issue_statuses_uuid AND IST.is_start = TRUE
            WHERE IT.uuid = '` + params.type_uuid + `'
            LIMIT 1
            ) WHERE uuid = '` + params.uuid + "';";
        }

        
        let subquerys = ''
        
        for(let i in params){

           // console.log('ccc1', params[i], typeof params[i])


            if(!params[i] || params[i][0] === undefined || typeof params[i][0] !== 'object') 
            {
                for(let j in params[i]){
                    let child =  params[i][j] 
                    if(data_model.has_fk(table_name, j)) console.log('chiiiild', child)//subquerys += '\r\n' + 'INSERT INTO ' table_name + '_to_'
                }
                continue
            }

           // console.log(typeof params[i])
            for(let j in params[i]){
                let child =  params[i][j] 

               
                subquerys += '\r\n' + crud.make_query.upsert(child.table_name, child)
            }
        }



      //  console.log('tntntntnttntnt', table_name)



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

        let fk = data_model.model[obj.table_name]['fk']
        if(fk!==undefined)
        {
            console.log('fk', obj.table_name, fk)

            for(let k in fk)
            {
                for (let j in obj[fk[k]])
                {
                    if(obj[fk[k]][j].uuid == undefined) ans[obj[fk[k]][j]] = fk[k]
                    else ans[obj[fk[k]][j].uuid] = fk[k]
                }
            }
            
        }

        let fks = data_model.model[obj.table_name]['fks']
        console.log(obj.table_name, 'fff', fks, 'fdfdfd', obj[i][0].table_name, obj[i][0])

        if(fks == undefined || !fks.includes(obj[i][0].table_name)) continue
        console.log('fff2', fks, 'fdfdfd', obj[i][0].table_name)

        for(let j in obj[i])
        {

            ans = tools.obj_join(ans, crud.get_uuids(obj[i][j]))
        }  
    }

    console.log('aaaaaaaaaans uuids', ans)
    return ans
}


crud.do = async function(subdomain, method, table_name, params)
{
    if(table_name == 'issue') table_name = 'issues'
    else if(table_name == 'board') table_name = 'boards'
    else if(table_name == 'dashboard') table_name = 'dashboards'
    let query = crud.get_query(method, table_name, params)

    console.log('paraaaaaaaaaaaaaaaaaaaaaams', params)
    

    if(method != 'read')
    {
        let read_query = crud.make_query.read(table_name, {uuid:  params.uuid})

        console.log('rqrqrqrqrq0', read_query)

        let data = await sql.query(subdomain, read_query)

        console.log('rqrqrqrqrq', read_query, data)

        if(data.rows.length > 0)
        {
            if(table_name == 'issues' && data.rows[0].status_uuid != params.status_uuid)
            {
                let status_text = data.rows[0].status_name + '->' + params.status_name

                let action_options = {
                    value: status_text,
                    issue_uuid: params.uuid,
                    author_uuid: params.author_uuid,
                    type_uuid: transition_type_uuid,
                    uuid: tools.uuidv4()
                }
    
                query += ';\r\n' + crud.make_query.create('issue_actions', action_options) + ';'
                
            }
            else if (table_name == 'issues')
            {
                let action_options = {
                    value: "",
                    issue_uuid: params.uuid,
                    author_uuid: params.author_uuid,
                    type_uuid: edited_type_uuid,
                    uuid: tools.uuidv4()
                }

                query += ';\r\n' + crud.make_query.create('issue_actions', action_options) + ';'
            }

            let old_uuids = crud.get_uuids(data.rows[0])

            console.log('old_uuids', old_uuids)

            let new_uuids = crud.get_uuids(params)

            console.log('new_uuids', new_uuids)

            let del_query = ''
            for(let i in old_uuids)
            {
                if(new_uuids[i] != undefined) continue;
                console.log('del', old_uuids[i], JSON.stringify(i))
                if(data_model.has_fk(table_name, old_uuids[i])) del_query += 'delete from ' + table_name + '_to_' + old_uuids[i] + ' where ' + old_uuids[i] + "_uuid = '" + i + "';"
                else del_query += crud.get_query('delete', old_uuids[i], {'uuid': i}) + ';' + del_query

                console.log('del2', del_query)
            }

            for(let i in new_uuids)
            {
                if(old_uuids[i] != undefined) continue;
                if(!data_model.has_fk(table_name, new_uuids[i])) continue;
                del_query += 'insert into ' + table_name + '_to_' + new_uuids[i] + '(' + new_uuids[i] + "_uuid, " + table_name + "_uuid) VALUES('"+ i + "', '" + params.uuid +  "');"


                console.log('addddd', del_query)
            }



            query = del_query + query
        }   
    }


    console.log('before while')
    while(query.indexOf("'null'") > -1) query = query.replace("'null'", 'NULL')
    while(query.indexOf('null') > -1) query = query.replace('null', 'NULL')
    
    //console.log('qqqqq', subdomain, query)
    let ans = await sql.query(subdomain, query)

    if(ans != null && ans[1] != undefined) ans = ans[ans.length-1]

    return ans
}



module.exports = crud