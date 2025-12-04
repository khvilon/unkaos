import dbLoger from "./db_loger";
import sql from "./sql";
import crud from "./crud";
import cors from 'cors';
import express from "express";
import { randomUUID } from 'crypto';
import { createLogger } from '../server/common/logging';
import { Server } from 'socket.io';

const logger = createLogger('zeus');

//const cors = require('cors');

const dict:any =
{
    read: 'get',
    create: 'post',
    update: 'put',
    delete: 'delete',
    upsert: 'post'
}

var listeners:any[] = []

const app:any = express()
const httpServer = require('http').createServer(app);
const port = 3006

//var bodyParser = require('body-parser');

app.use(cors());
app.use(express.json({limit: '150mb'}));
app.use(express.raw({limit: '150mb'}));
app.use(express.urlencoded({limit: '150mb', extended: true}));

const handleRequest = async function(req:any, res:any) {

    let req_uuid = randomUUID()
    logger.info({
        msg: 'Received request',
        req_uuid,
        url: req.url,
        method: req.method,
        headers: req.headers,
        subdomain: req.headers.subdomain,
        user_uuid: req.headers.user_uuid
    });
    dbLoger.writeLogIncoming(req_uuid,  req)

    let func_name = req.url.split('/')[1].split('?')[0]
    logger.debug({
        msg: 'Processing request',
        req_uuid,
        func_name,
        url: req.url
    });

    const parts = func_name.split('_');
    const method = parts[0];
    const table_name = parts.slice(1).join('_');

    let subdomain = req.headers.subdomain
    let params = req.query

    if(method != 'read') params = req.body

    if((method!='read' || table_name == 'favourites') && method!='delete') params.author_uuid = req.headers.user_uuid;

    if(params.values != undefined && !params.author_uuid) params.author_uuid = req.headers.user_uuid

    logger.info({
        msg: 'Executing request',
        req_uuid,
        method,
        table_name,
        subdomain,
        params,
        is_admin: req.headers.is_admin
    });

    let ans = await crud.do(subdomain, method, table_name, params, req.headers.user_uuid, req.headers.is_admin)

    if(ans.rows == undefined){
        logger.warn({
            msg: 'Request failed',
            req_uuid,
            error: ans.error,
            http_code: ans.http_code || 400
        });
        res.status(ans.http_code != undefined ? ans.http_code : '400');
    } else {
        logger.info({
            msg: 'Request successful',
            req_uuid,
            rows_affected: Array.isArray(ans.rows) ? ans.rows.length : 1
        });
    }

    if(method!='read') dbLoger.writeLogDone(subdomain, req_uuid, req.headers.user_uuid, table_name, method, params.uuid, params)

    logger.debug({
        msg: 'Request processed',
        req_uuid,
        status: ans.rows ? 'success' : 'error',
        http_code: ans.http_code
    });

    res.send(ans)
}

const init = async function() {
    await sql.init()
    await crud.load()
 
    app.post('/upsert_watcher', async (req:any, res:any) => {   
        let subdomain = req.headers.subdomain
        let issue_uuid = req.body.issue_uuid
        let ans = await sql.query(subdomain, `INSERT INTO watchers (user_uuid, issue_uuid) VALUES('` + req.headers.user_uuid + `','` + issue_uuid + `') ON CONFLICT DO NOTHING`)//, [req.headers.user_uuid, issue_uuid])
        res.send(ans)
    })
    listeners.push({"method": 'post',"func":'upsert_watcher'})

    app.delete('/delete_watcher', async (req:any, res:any) => {   
        let subdomain = req.headers.subdomain
        let issue_uuid = req.body.issue_uuid
        let ans = await sql.query(subdomain, `DELETE FROM watchers WHERE user_uuid = '` + req.headers.user_uuid + `' AND issue_uuid = '` + issue_uuid + `'`)
        res.send(ans)
    })
    listeners.push({"method": 'delete',"func":'delete_watcher'})

    app.get('/read_watcher', async (req:any, res:any) => {   
        let subdomain = req.headers.subdomain
        let issue_uuid = req.query.issue_uuid
        let ans = await sql.query(subdomain, `SELECT * FROM watchers WHERE user_uuid = '` + req.headers.user_uuid + `' AND issue_uuid = '` + issue_uuid + `'`)
        res.send(ans)
    })
    listeners.push({"method": 'get',"func":'read_watcher'})

    app.get('/read_listeners', async (req:any, res:any) => {   
        res.send(listeners)
    }) 

    for(let table in crud.querys){
        for(let method in crud.querys[table]){
            let func_name = method + '_' + table
            listeners.push({"method": dict[method],"func":func_name})
            
            app[dict[method]]('/' + func_name, handleRequest)
        }
    }

    // Создаем Socket.IO сервер
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true
        },
        transports: ['polling', 'websocket'],
        path: '/socket.io'
    });

    // Обработка Socket.IO подключений
    io.on('connection', (socket) => {
        logger.info({
            msg: 'New gateway connection',
            socketId: socket.id
        });

        socket.on('request', async (data, callback) => {
            // Создаем объект req как в express
            const req: any = {
                url: data.url,
                method: data.method,
                headers: data.headers,
                query: {},
                body: data.body
            };

            // Создаем объект res как в express
            const res: any = {
                status: function(code: number) {
                    this.statusCode = code;
                    return this;
                },
                send: function(data: any) {
                    callback({
                        status: this.statusCode || 200,
                        data: data
                    });
                }
            };

            // Используем существующий handleRequest
            await handleRequest(req, res);
        });

        socket.on('disconnect', () => {
            logger.info({
                msg: 'Gateway disconnected',
                socketId: socket.id
            });
        });
    });

    httpServer.listen(port, () => {
        logger.info({
            msg: `Zeus running on port ${port}`
        });
    });
}
    
init()