    var sql = {}

    const { Pool, Client } = require('pg')
    const { password } = require('pg/lib/defaults')

    var conf = require('./conf')

   

    const host = conf.host
   const database = 'unkaos'
   const port = 5432

   const admin_name = conf.admin_name
   const admin_pass = conf.admin_pass
   


    var pools = {
    }

    const admin_pool = new Pool({
        user: admin_name,
        password: admin_pass,
        database: database,
        host: host,
        port: port
    })

    pools['public'] = admin_pool
    pools['admin'] = admin_pool

    const add_user = function(name, pass)
    {
        pools[name] = new Pool({
            user: name,
            password: pass,
            database: database,
            host: host,
            port: port
        })
    }

    sql.init = async function()
    {
        let query = 'SELECT * FROM admin.workspaces'

        let workspaces = (await sql.query('admin', query)).rows

        for(let i in workspaces)
        {
            add_user(workspaces[i].name, workspaces[i].pass)
        }
    }

    sql.query = async function(subdomain, query_arr, params_arr)
    {
        if(pools[subdomain] == undefined) return null

        if(!Array.isArray(query_arr))
        {
            query_arr = [query_arr]
            params_arr = [params_arr]
        }
        

        let ans
        for(let i = 0; i < query_arr.length; i++)
        {
            let query = query_arr[i]
            let params = params_arr[i]

            console.log('sql', query, params)

            if (typeof query != 'string')
            {
                console.log('sql empty query', query+'', '!'+params+'!')
                continue
            }

            try{
                if(params != undefined && params != null && params.length > 0)
                    ans = await pools[subdomain].query(query, params)
                else ans = await pools[subdomain].query(query)
            }
            catch(e)
            {
                console.log('sql error', e, query, params)
                ans = {error: 'Ошибка запроса в БД', http_code: 400}
            }
        }        
        
        return ans
    }


module.exports = sql