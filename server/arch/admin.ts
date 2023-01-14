let admin:any = {}

let sql = require('./sql')
var tools = require('./tools')
   
admin.querys = 
{
    add_user:`
    create user $1 with encrypted password 'mypass';
    GRANT INSERT, SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA $1 TO $1;
    GRANT USAGE ON SCHEMA "$1" to "$1";
    ALTER ROLE $1 SET search_path = $1;
    `
    
}

admin.add_user = async function()
{
   
}



module.exports = admin