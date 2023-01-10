const port = 3004

import { WebSocketServer, WebSocket } from 'ws';
const wss = new WebSocketServer({ port: port });

import sql from "./sql";

class MonType{
    readonly type: string
    readonly key_path: string
    readonly commands: string[]
    constructor(type:string, key_path:string, commands:string[]){
		this.type = type
		this.key_path = key_path
        this.commands = commands
	}
}

//table -> type, key_path, commands
var monTypes: Map<string, MonType[]> = new Map([
    ['issues', [new MonType('monitor_issue', 'uuid', ['update'])]],
    ['field_values', [new MonType('monitor_issue', 'issue_uuid', ['update', 'insert'])]],
    ['issue_actions', [new MonType('monitor_issue', 'issue_uuid', ['update', 'insert'])]],
    ['attachments', [new MonType('monitor_issue_attachments', 'issue_uuid', ['update', 'insert']),
        new MonType('monitor_issue_attachments', 'uuid', ['delete'])]],
    ['relations', [new MonType('monitor_issue_relations', 'issue0_uuid', ['update', 'insert', 'delete']),
        new MonType('monitor_issue_relations', 'issue1_uuid', ['update', 'insert', 'delete'])]],
    ['issue_tags_selected', [new MonType('monitor_issue_tags', 'issue_uuid', ['update', 'insert', 'delete'])]]
  ])

//key, type, connection
var monTasks: Map<string, Map<string, WebSocket[]> > = new Map() 

const handleNotify = async function(row:any, { command, relation, key, old }: any){

    console.log('notify', command, relation.table, row.uuid, row)
    let mts = monTypes.get(relation.table)
    console.log(mts)
    if(!mts) return

    for (let i = 0; i < mts.length; i++) {
        let mt = mts[i]
        if(!mt.commands.includes(command)) continue

        console.log('a',mt,row)

        let mt_key = row[mt.key_path]
        console.log('aa',monTasks, mt_key)
        let tasksPool = monTasks.get(mt_key)
        console.log('aaa',tasksPool)
        if(!tasksPool) continue

        console.log('b',tasksPool, mt.type)

        let connections = tasksPool.get(mt.type)
        if(!connections) continue

        console.log('c', connections.length)

        let msg = {command: command, relation: relation, key: mt_key, type: mt.type}
        for(let j = 0; j < connections.length; j++) connections[j].send(JSON.stringify(msg))
    }
   // console.log('test_alert', row, command, relation, key, old)
   
}

const handleSubscribeConnect = function(){
    console.log('subscribe connected!')
}

sql.subscribe('*',handleNotify, handleSubscribeConnect)

wss.on('connection', function connection(connection, req) {

    connection.on('message', function message(data) {

        
        let dataObj:any
        try{ dataObj = JSON.parse(data.toString()) }
        catch(err){ console.log('msg is not a valid json'); console.log('received: %s', data); return }

        if(dataObj.type != undefined && dataObj.type.split('_')[0] == 'monitor'){
            let type:string = dataObj.type.toString()
            let key:string = dataObj.key.toString()

            //console.log(type, key)
            if(!monTasks.has(key) || monTasks.get(key) == undefined) monTasks.set(key, new Map([[type, [connection]]]))
            else if(!monTasks.get(key)?.get(type)) monTasks.get(key)?.set(type, [connection])
            else monTasks.get(key)?.get(type)?.push(connection)

            //console.log(monTasks)
        }
        else if(dataObj.action == 'PING'){
            connection.send(JSON.stringify({action:'PONG'}))
        }
        else{
            console.log('received incorrect msg: %s', data);
        }

    });

    console.log('client connected',  req.headers['sec-websocket-key']);
});

console.log(`Ossa running on port ${port}`)