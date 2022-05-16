    var sql = {}

    const { Pool, Client } = require('pg')

    const pool = new Pool({
      user: 'khvilon',
      host: '127.0.0.1',
      database: 'unkaos',
      password: 'colaider',
      port: 5432,
    })


    sql.obj_length = function(obj)
    {
        return Object.keys(obj).length
    }

    sql.query = async function(query)
    {
        return await pool.query(query)
    }


module.exports = sql