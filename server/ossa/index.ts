const port = 3004

import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: port });

import sql from "./sql";

var issues:any = {}

const handleNotify = async function(row:any, { command, relation, key, old }: any){
   // console.log('test_alert', row, command, relation, key, old)
   console.log('notify', command, relation.table, row.uuid)
    if(command == 'update' && relation.table == 'issues'){
        let conn = issues[row.uuid]
        if (conn == undefined) return
        conn.send(JSON.stringify({type:"monitor_issue", uuid: row.uuid}))
    }
    else if(command == 'update' && relation.table == 'field_values'){
        let conn = issues[row.issue_uuid]
        if (conn == undefined) return
        conn.send(JSON.stringify({type:"monitor_issue", uuid: row.issue_uuid}))
       // data.users[relation.schema] = await getWorkspaceUsers(relation.schema)
    }
    else if(command == 'insert' && relation.table == 'issue_actions'){
        let conn = issues[row.issue_uuid]
        if (conn == undefined) return
        conn.send(JSON.stringify({type:"monitor_issue", uuid: row.issue_uuid}))
       // data.users[relation.schema] = await getWorkspaceUsers(relation.schema)
    }
}

const handleSubscribeConnect = function(){
    console.log('subscribe connected2!')
}

sql.subscribe('*',handleNotify, handleSubscribeConnect)

wss.on('connection', function connection(connection) {
    connection.on('message', function message(data) {

    let dataObj:any = {}// = JSON.stringify(data)
    try
    {
        dataObj = JSON.parse(data.toString())
    }
    catch(err)
    {
        const msg = 'err stringify data'
        console.log(msg, err)
        return
    }

    if(dataObj.type == 'monitor_issue')
    {
        console.log('mo issue', dataObj.uuid);
        issues[dataObj.uuid] = connection
    }
    else{
        console.log('received: %s', dataObj);
    }
    
  });

  console.log('client connected');

  connection.send('something');
});

console.log(`Ossa running on port ${port}`)