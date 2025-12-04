import postgres from "postgres";
import { createLogger } from '../server/common/logging';

const logger = createLogger('zeus');

let dbConf: any;

try {
  const dbConfFile = require('../db_conf.json');
  dbConf = dbConfFile;
} catch (error) {
  dbConf = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
  };
}

logger.info({
  msg: 'Database configuration loaded',
  host: dbConf.host,
  port: dbConf.port,
  database: dbConf.database,
  user: dbConf.user
});

var sql:any = {}

let zeusDbConf = structuredClone(dbConf)

sql.admin = postgres(zeusDbConf) 

var workspaceSqls:any = {}

workspaceSqls['public'] = sql.admin
workspaceSqls['admin'] = sql.admin

const addWorkspaceSql = function(name:string, pass:string){
    logger.debug({
        msg: 'Adding workspace SQL connection',
        workspace: name
    });
    workspaceSqls[name] = postgres({
        user: name,
        password: pass,
        database: dbConf.database,
        host: dbConf.host,
        port: dbConf.port
    })
}

sql.init = async function(){
    logger.info('Initializing SQL connections');
    let workspaces = await sql.admin`SELECT * FROM admin.workspaces`

    for(let i in workspaces){
        addWorkspaceSql(workspaces[i].name, workspaces[i].pass)
    }
    
    logger.info({
        msg: 'SQL connections initialized',
        workspaces: Object.keys(workspaceSqls).length
    });
}

sql.query = async function(subdomain:string, query_arr:any, params_arr:any){
    logger.debug({
        msg: 'Processing SQL query',
        subdomain,
        query_count: Array.isArray(query_arr) ? query_arr.length : 1
    });

    if(workspaceSqls[subdomain] == undefined){
        let workspace = await sql.admin`SELECT * FROM admin.workspaces WHERE name = ${subdomain}`
        if(!workspace[0]) {
            logger.warn({
                msg: 'Workspace not found',
                subdomain
            });
            return null;
        }
        addWorkspaceSql(workspace[0].name, workspace[0].pass)
    }

    if(workspaceSqls[subdomain] == undefined) {
        logger.error({
            msg: 'Failed to create workspace SQL connection',
            subdomain
        });
        return null;
    }

    if(!Array.isArray(query_arr)){
        query_arr = [query_arr]
        params_arr = [params_arr]
    }

    let ans
    for(let i = 0; i < query_arr.length; i++){
        let query = query_arr[i]
        let params = params_arr[i]

        logger.debug({
            msg: 'Executing SQL query',
            query,
            params
        });

        if (typeof query != 'string'){
            logger.warn({
                msg: 'Empty query',
                query: query+'',
                params: '!'+params+'!'
            });
            continue
        }

        try {
            if(params != undefined && params != null && params.length > 0){
                for(let j in params){
                    if(params[j] == 'NOW()') params[j] = new Date()
                }
                ans = await workspaceSqls[subdomain].unsafe(query, params)
            }
            else ans = await workspaceSqls[subdomain].unsafe(query)

            logger.debug({
                msg: 'SQL query executed successfully',
                rows: ans?.length
            });
        }
        catch(e){
            logger.error({
                msg: 'SQL query error',
                error: e,
                query,
                params
            });
            ans = {error: 'Ошибка запроса в БД', trace: e, http_code: 400}
        }
    }        
    
    return {rows: ans}
}

export default sql