var dbLoger:any = {}

import sql from "./sql";

dbLoger.writeLogIncoming = function(reqUuid:string, req:any){
    sql.admin`INSERT INTO admin.logs_incoming (uuid, method, url, headers, body) 
    VALUES(${reqUuid},${req.method},${req.url},${JSON.stringify(req.headers)},${JSON.stringify(req.body)})`
}

dbLoger.writeLogDone = function(workspace:string, reqUuid:string, userUuid:string, tableName:string, method:string, targetUuid:string, params:any){
   //console.log('lll',reqUuid,userUuid,tableName,method,targetUuid,JSON.stringify(params))
   

   if(!userUuid) return
   let query = `INSERT INTO logs_done (uuid, user_uuid, table_name, method, target_uuid, parameters) VALUES ($1,$2,$3,$4,$5,$6)`
   sql.query(workspace, query, [reqUuid,userUuid,tableName,method,targetUuid,JSON.stringify(params)])


   // sql.admin`INSERT INTO ${sql(workspace + '.logs_done')} (uuid, user_uuid, table_name, method, target_uuid, parameters) 
   // VALUES(${reqUuid},${userUuid},${tableName},${method},${targetUuid},'')` 
}

export default dbLoger
