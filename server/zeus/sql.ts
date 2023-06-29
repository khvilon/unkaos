
import postgres from "postgres";
import tools from "../tools";
import dbConf from '../db_conf.json';

console.log('dbConf', dbConf)

var sql:any = {}

let zeusDbConf = tools.obj_clone(dbConf)
//zeusDbConf.publications = 'zeus_publication'

sql.admin = postgres(zeusDbConf) 

var workspaceSqls:any = {}

workspaceSqls['public'] = sql.admin
workspaceSqls['admin'] = sql.admin

const addWorkspaceSql = function(name:string, pass:string){
    workspaceSqls[name] = postgres({
        user: name,
        password: pass,
        database: dbConf.database,
        host: dbConf.host,
        port: dbConf.port
    })
}

sql.init = async function(){
    let workspaces = await sql.admin`SELECT * FROM admin.workspaces`

    for(let i in workspaces){
        addWorkspaceSql(workspaces[i].name, workspaces[i].pass)
    }
}

sql.query = async function(subdomain:string, query_arr:any, params_arr:any){
    if(workspaceSqls[subdomain] == undefined) return null

    if(!Array.isArray(query_arr)){
        query_arr = [query_arr]
        params_arr = [params_arr]
    }

    let ans
    for(let i = 0; i < query_arr.length; i++){
        let query = query_arr[i]
        let params = params_arr[i]

        console.log('sql', query, params)

        if (typeof query != 'string'){
            console.log('sql empty query', query+'', '!'+params+'!')
            continue
        }

        try {
            if(params != undefined && params != null && params.length > 0){
                for(let j in params){
                    if(params[j] == 'NOW()') params[j] = new Date()//workspaceSqls[subdomain]('NOW()')
                }
                ans = await workspaceSqls[subdomain].unsafe(query, params)
            }
            else ans = await workspaceSqls[subdomain].unsafe(query)
        }
        catch(e){
            console.log('sql error', e, query, params)
            ans = {error: 'Ошибка запроса в БД', trace: e, http_code: 400}
        }
    }        
    
    return {rows: ans}
}

export default sql