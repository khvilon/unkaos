import dbLoger from "./db_loger";
import sql from "./sql";

import crud from "./crud";

//const cors = require('cors');
import cors from 'cors';

import express from "express";
import tools from "../tools";


const app:any = express()
const port = 3006

//var bodyParser = require('body-parser');

const dict:any =
{
    read: 'get',
    create: 'post',
    update: 'put',
    delete: 'delete',
    upsert: 'post'
}

var listeners:any[] = []

app.use(cors());
app.use(express.json({limit: '150mb'}));
app.use(express.raw({limit: '150mb'}));
app.use(express.urlencoded({limit: '150mb', extended: true}));

const handleRequest = async function(req:any, res:any) {

    // console.log("request: ", req)
    let req_uuid = tools.uuidv4()
    dbLoger.writeLogIncoming(req_uuid,  req)

    let func_name = req.url.split('/')[1].split('?')[0]
    let [method, table_name] = tools.split2(func_name, '_')
    let subdomain = req.headers.subdomain
    let params = req.query

    if(method != 'read') params = req.body

    if((method!='read' || table_name == 'favourites') && method!='delete') params.author_uuid = req.headers.user_uuid;

    if(params.values != undefined && !params.author_uuid) params.author_uuid = req.headers.user_uuid

    let ans = await crud.do(subdomain, method, table_name, params, req.headers.user_uuid, req.headers.is_admin)

    if(ans.rows == undefined){
        res.status(ans.http_code != undefined ? ans.http_code : '400');
    } 

    if(method!='read') dbLoger.writeLogDone(subdomain, req_uuid,  req.headers.user_uuid, table_name, method, params.uuid, params)
        
    //add watcher
    //if(method!='read' && table_name == 'issue'){
    //    sql.query(subdomain, `INSERT INTO watchers (user_uuid, issue_uuid) VALUES('` + req.headers.user_uuid + "','" + params.uuid + `') ON CONFLICT DO NOTHING`)
    //} 

    res.send(ans)
}

const init = async function() {
    await sql.init()
    await crud.load()
 
    app.post('/upsert_watcher', async (req:any, res:any) => {   
        let subdomain = req.headers.subdomain
        let issue_uuid = req.body.issue_uuid
        let ans = await sql.query(subdomain, `INSERT INTO watchers (user_uuid, issue_uuid) VALUES('` + req.headers.user_uuid + `','` + issue_uuid + `') ON CONFLICT DO NOTHING`)
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

    app.listen(port, async () => {
        console.log(`Zeus running on port ${port}`)
    })

}
    
init()