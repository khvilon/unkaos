import sql from "./sql";
import { createLogger } from '../server/common/logging';

const logger = createLogger('zeus');

var dbLoger:any = {}

dbLoger.writeLogIncoming = function(reqUuid:string, req:any){
    logger.debug({
        msg: 'Writing incoming request log',
        req_uuid: reqUuid,
        method: req.method,
        url: req.url
    });

    sql.query('admin',
    `INSERT INTO admin.logs_incoming (uuid, method, url, headers, body) VALUES($1,$2,$3,$4,$5)`,
     [reqUuid, req.method, req.url, JSON.stringify(req.headers), JSON.stringify(req.body)])
}

dbLoger.writeLogDone = function(workspace:string, reqUuid:string, userUuid:string, tableName:string, method:string, targetUuid:string, params:any){
    if(!userUuid) {
        logger.warn({
            msg: 'Skipping log due to missing user UUID',
            req_uuid: reqUuid,
            workspace,
            table: tableName,
            method
        });
        return;
    }

    logger.debug({
        msg: 'Writing completed request log',
        workspace,
        req_uuid: reqUuid,
        user_uuid: userUuid,
        table: tableName,
        method,
        target_uuid: targetUuid
    });

    let query = `INSERT INTO logs_done (uuid, user_uuid, table_name, method, target_uuid, parameters) VALUES ($1,$2,$3,$4,$5,$6)`
    sql.query(workspace, query, [reqUuid,userUuid,tableName,method,targetUuid,JSON.stringify(params)])
}

export default dbLoger
