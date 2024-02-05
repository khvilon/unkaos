const port = 3004

import { WebSocketServer, WebSocket } from 'ws';
const wss = new WebSocketServer({ port: port });

import axios from 'axios';
import conf from './conf.json';

import sql from "./sql";

import Memcached from 'memcached';
const memcached = new Memcached('memcached:11211');

const key: string = "sampleKey";
const value: string = "Hello, Memcached!";
const lifetime: number = 300; // 5 minutes in seconds

// Wrap the set operation in a function that returns a Promise
function setAsync(key: string, value: string, lifetime: number): Promise<any> {
  return new Promise((resolve, reject) => {
    memcached.set(key, value, lifetime, (err: any, result: any) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

// Use async function to await the Promise
async function test(): Promise<void> {
  try {
    const result = await setAsync(key, value, lifetime);
    console.log('Set operation result:', result);
  } catch (err) {
    console.error('Error setting value in Memcached:', err);
  }
}
test();


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

const handleWatchers = async function(table:string, command:string, row_uuid:string){

}

const handleNotify = async function(row:any, { command, relation, key, old }: any){

    console.log('notify', command, relation.table, row.uuid, row)

    let mts = monTypes.get(relation.table)
    console.log(mts)
    if(!mts) return

    for (let i = 0; i < mts.length; i++) {
        let mt = mts[i]
        if(!mt.commands.includes(command)) continue

        let mt_key = row[mt.key_path]
        let tasksPool = monTasks.get(mt_key)
        if(!tasksPool) continue

        let connections = tasksPool.get(mt.type)
        if(!connections) continue

        let msg = {command: command, relation: relation, key: mt_key, type: mt.type}
        for(let j = 0; j < connections.length; j++) connections[j].send(JSON.stringify(msg))
    }

    handleWatchers(relation.table, command, row.uuid)

   // console.log('test_alert', row, command, relation, key, old)
   
}

const handleSubscribeConnect = function(){ console.log('subscribe connected!') }
sql.subscribe('*',handleNotify, handleSubscribeConnect)

var sessions:any={}

wss.on('connection', async function connection(connection, req) {

    connection.on('message', async function message(data) {

        console.log('received: %s', data)
        
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
        else if(false && dataObj.action == 'AUTH'){
/*
            if(!dataObj.token || !dataObj.subdomain){
                connection.close()
                console.log('Socket closing - need token and subdomain');
                return
            }

            let headers = {token: dataObj.token, subdomain: dataObj.subdomain}

            let cerberus_ans = await axios({
                method: 'get',
                url: conf.cerberusUrl + '/check_session' ,
                headers: headers
            });

            if(cerberus_ans.status != 200 || !req.headers['sec-websocket-key']){
                connection.close()
                console.log('Token auth failed');
                return
            }

            console.log('User', cerberus_ans.data, 'auth OK')
            let sessionId:string = req.headers['sec-websocket-key']
            sessions[sessionId] = cerberus_ans.data*/
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