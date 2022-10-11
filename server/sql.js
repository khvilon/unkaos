    var sql = {}

    const { Pool, Client } = require('pg')
    const { password } = require('pg/lib/defaults')

   
    


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

    sql.query = async function(subdomain, query)
    {
        
        if(pools[subdomain] == undefined) return null
        console.log('q', query)
        let ans
        try{
            ans = await pools[subdomain].query(query)
        }
        catch(e)
        {
            console.log('sql error', e)
            ans = {error: 'Ошибка запроса в БД', http_code: 400}
        }
        
        return ans
    }


module.exports = sql