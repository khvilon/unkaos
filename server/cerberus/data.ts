var data : any = {}

import sql from "./sql";

const tokenExpirationTimeSec = 30 * 60 * 60 * 24 //30 days
const checkExpiredInterval = 60 * 1000 //1 minute, ms

data.workspaces = []
data.sessions = {}
data.users = {}

const getWorkspaces = async function(){
    let ans = await sql`    
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN 
        ('pg_toast', 'pg_catalog', 'information_schema', 'admin', 'public')`

    if(ans == null || ans.length < 1) return []

    let workspaces = ans.map((r: any)=>r.schema_name)

    return workspaces
}

const getWorkspaceUsers = async function (workspace:string) {
    const ans = await sql`
        SELECT 
            U.uuid,
            U.name,
            U.login,
            U.mail,
            U.telegram
        FROM ${sql(workspace + '.users') } U
        WHERE U.active AND U.deleted_at IS NULL
        `

    let workspaceUsers:any = {}

    for(let i = 0; i < ans.length; i++){
        workspaceUsers[ans[i].uuid] = ans[i]
    }

    return workspaceUsers
}

const getWorkspaceSessions = async function (workspace:string) {
    const ans = await sql`
            SELECT 
                US.user_uuid,
                US.token,
                US.created_at AS token_created_at
            FROM ${sql(workspace + '.user_sessions') } US
            LEFT JOIN ${sql(workspace + '.users') } U
            ON US.user_uuid = U.uuid
            WHERE U.active AND U.deleted_at IS NULL AND 
            US.created_at + ${ tokenExpirationTimeSec } * interval '1 second' > NOW() 
            `

    let workspaceSessions:any = {}

    for(let i = 0; i < ans.length; i++){
        ans[i].expires_at = new Date(Date.parse(ans[i].token_created_at) + tokenExpirationTimeSec*1000 ) 
        workspaceSessions[ans[i].token] = ans[i]
    }

    return workspaceSessions
}

const init = async function() {
    let workspaces = await getWorkspaces()

    let users : any = {}

    for(let i = 0; i < workspaces.length; i++){
        users[workspaces[i]] = await getWorkspaceUsers(workspaces[i])
    } 

    data.users = users
    
    let sessions : any = {}

    for(let i = 0; i < workspaces.length; i++){
        sessions[workspaces[i]] = await getWorkspaceSessions(workspaces[i])
    } 

    data.sessions = sessions
}
init()

const checkExpired = function(){
    let now = new Date()

    for(let workspace in data.sessions){
        for(let token in data.sessions[workspace]){
            if(data.sessions[workspace][token].expires_at < now) data.sessions[workspace][token] = undefined
        }
    }

    setTimeout(checkExpired, checkExpiredInterval)
}
checkExpired()


const handleNotify = async function(row:any, { command, relation, key, old }: any){
   // console.log('test_alert', row, command, relation, key, old)
    if(relation.table == 'user_sessions' && command == 'insert'){
        row.expires_at = new Date(Date.parse(row.created_at) + tokenExpirationTimeSec*1000 ) 
        data.sessions[relation.schema][row.token] = row
    }
    else if(relation.table == 'users'){
        data.users[relation.schema] = await getWorkspaceUsers(relation.schema)
    }
    else if(relation.table == 'user_sessions'){
        data.user_sessions[relation.schema] = await getWorkspaceSessions(relation.schema)
    }
}

const handleSubscribeConnect = function(){
    console.log('subscribe connected!')
}

sql.subscribe('*', handleNotify, handleSubscribeConnect)

export default data