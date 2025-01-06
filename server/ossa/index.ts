const port = 3004

import { WebSocketServer, WebSocket } from 'ws';
import { createLogger } from '../server/common/logging';

const logger = createLogger('ossa');
const wss = new WebSocketServer({ port: port });

import sql from "./sql";
import cache from "./cache";

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
    logger.debug({
        msg: 'Received notification',
        command,
        table: relation.table,
        uuid: row.uuid
    });

    let mts = monTypes.get(relation.table)
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
        for(let j = 0; j < connections.length; j++) {
            connections[j].send(JSON.stringify(msg))
            logger.debug({
                msg: 'Sent notification to client',
                type: mt.type,
                command,
                key: mt_key
            });
        }
    }

    handleWatchers(relation.table, command, row.uuid)
}

let c = new cache();
c.init();

const handleSubscribeConnect = function(){ 
    logger.info({
        msg: 'Database subscription connected'
    });
}

sql.subscribe('*',handleNotify, handleSubscribeConnect)

var sessions:any={}

wss.on('connection', async function connection(connection, req) {
    const clientId = req.headers['sec-websocket-key'];
    logger.info({
        msg: 'Client connected',
        clientId
    });

    connection.on('message', async function message(data) {
        logger.debug({
            msg: 'Received message from client',
            clientId,
            data: data.toString()
        });
        
        let dataObj:any
        try{ 
            dataObj = JSON.parse(data.toString()) 
        }
        catch(err){ 
            logger.error({
                msg: 'Invalid JSON message received',
                clientId,
                error: err,
                data: data.toString()
            });
            return 
        }

        if(dataObj.type != undefined && dataObj.type.split('_')[0] == 'monitor'){
            let type:string = dataObj.type.toString()
            let key:string = dataObj.key.toString()

            if(!monTasks.has(key) || monTasks.get(key) == undefined) {
                monTasks.set(key, new Map([[type, [connection]]]));
            }
            else if(!monTasks.get(key)?.get(type)) {
                monTasks.get(key)?.set(type, [connection]);
            }
            else {
                monTasks.get(key)?.get(type)?.push(connection);
            }

            logger.debug({
                msg: 'Monitor task registered',
                clientId,
                type,
                key
            });
        }
        else if(dataObj.action == 'PING'){
            connection.send(JSON.stringify({action:'PONG'}))
            logger.debug({
                msg: 'Ping-pong',
                clientId
            });
        }
        else{
            logger.warn({
                msg: 'Received incorrect message',
                clientId,
                data: data.toString()
            });
        }
    });

    connection.on('close', () => {
        logger.info({
            msg: 'Client disconnected',
            clientId
        });
    });
});

logger.info({
    msg: 'Ossa server started',
    port
});