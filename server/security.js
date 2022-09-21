let security = {}


var sql = require('./sql')

var jwt = require('jsonwebtoken');

const token_expiration_time_sec = 60 * 60 * 24 //day
const token_expiration_duration = token_expiration_time_sec  + " * interval '1 second'"

const key = 'shhhhh'

security.set_password = async function(subdomain, user_uuid, password)
{
    let query = "UPDATE users SET password = MD5('" + password + "') WHERE uuid='" + user_uuid + "';"
    await sql.query(subdomain, query);
}

security.get_token = async function(subdomain, email, pass)
{
    let query = "SELECT * FROM users WHERE mail='" + email + "' AND password = MD5('" + pass + "') AND deleted_at IS NULL AND active;"
    let result = await sql.query(subdomain, query);

    if(result.rowCount != 1) return null

    let user = result.rows[0]

    console.log(user)

    let user_data = { uuid: user.uuid }
    let token = jwt.sign(user_data, key)

    query = "UPDATE users SET token = MD5('" + token + "'), token_created_at = NOW() WHERE uuid = '" + user.uuid + "';"
    await sql.query(subdomain, query);

    return {user_token: token, profile: user}
}


security.check_token = async function(subdomain, token)
{
    let query = "SELECT * FROM users WHERE token = MD5('" + token + 
    "') AND token_created_at + " + token_expiration_duration + 
    " > NOW() AND deleted_at IS NULL AND active;"

    let result = await sql.query(subdomain, query);

    if(result == null) return null

    if(result.rowCount != 1) return null
    
    let user = result.rows[0]

    return user    
}



module.exports = security