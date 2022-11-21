let security = {}


var sql = require('./sql')
var tools = require('./tools')

var jwt = require('jsonwebtoken');

const token_expiration_time_sec = 30 * 60 * 60 * 24 //day
const token_expiration_duration = token_expiration_time_sec  + " * interval '1 second'"

const key = 'shhhhh'

security.set_password = async function(subdomain, user_uuid, password)
{
    let query = "UPDATE users SET password = MD5('" + password + "') WHERE uuid='" + user_uuid + "';"
    //UPDATE users SET password = MD5('my_pass') WHERE login='my_login' - for manual update
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

    query = "INSERT INTO user_sessions(uuid, user_uuid, token) values('" + tools.uuidv4() + "','" + user.uuid + "',MD5('" + token + "'));"
    await sql.query(subdomain, query);
    query = "UPDATE users SET token = MD5('" + token + "'), token_created_at = NOW() WHERE uuid = '" + user.uuid + "';"
    await sql.query(subdomain, query);

    return {user_token: token, profile: user}
}


security.check_token = async function(subdomain, token)
{
   /* 
   let query = "SELECT * FROM users WHERE token = MD5('" + token + 
    "') AND token_created_at + " + token_expiration_duration + 
    " > NOW() AND deleted_at IS NULL AND active;"
    */

    let query = `SELECT u.* FROM user_sessions us JOIN users u ON us.user_uuid = u.uuid
     WHERE us.token = MD5('` + token + `') AND us.created_at + ` + token_expiration_duration + 
    ` > NOW() AND u.deleted_at IS NULL AND u.active AND us.deleted_at IS NULL;`



    let result = await sql.query(subdomain, query);

    if(result == null) return null

    if(result.rowCount != 1) return null
    
    let user = result.rows[0]

    return user    
}



module.exports = security