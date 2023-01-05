
const port = 3003;
const webSocket = require('ws');
const wsServer = new webSocket.Server({ port: port });
const db_conf_json_1 = require("../db_conf.json");

const { Pool, Client } = require('pg')
const pgNotify = require('@becual/pg-notify');

let eventHandler = function (evt) {
    console.log(JSON.stringify(evt, null, 4));
};

let init = async function () {
    
        console.log('ttt0');
        const client = new Client({
            user: db_conf_json_1.adminName,
            password: db_conf_json_1.adminPass,
            database: 'unkaos',
            host: db_conf_json_1.host,
            port: db_conf_json_1.port
        })
        console.log('ttt1');
        // Choose your tables to listen
        const tables = ['issue_actions'];
        console.log('ttt2', db_conf_json_1);
        console.log('ttt22');


        var conf = require('../conf')


        const host = conf.host
        const database = 'unkaos'
        const port = conf.port
     
        const admin_name = conf.admin_name
        const admin_pass = conf.admin_pass
        
     
     
         var pools = {
         }
     
         const client2 = new Client({
             user: admin_name,
             password: admin_pass,
             database: database,
             host: host,
             port: port
         })

         console.log('ttt222', conf);

         await client2.connect();

         const res = await client.query('SELECT NOW()')

         console.log('ttt2222');

        // Connect client
        await client.connect();
        console.log('ttt3');
        // By default schema is public
        const sub = await pgNotify(client, { schema: 'oboz' }).subscribe(tables);

        console.log(sub)
        console.log('ttt4');
        // Listen for changes
        sub.on('INSERT', eventHandler);
        sub.on('UPDATE', eventHandler);
        sub.on('DELETE', eventHandler);
        console.log('ttt');
  
};
init();
var clientPools = [];
let onConnect = function (wsClient) {
    console.log('Новый пользователь');
    clientPools.push(wsClient);
    console.log(wsServer.clients);
    wsClient.send('Привет');
    wsClient.on('message', function (message) {
        console.log('client ws msg', message);
    });
    wsClient.on('close', function () {
        console.log('Пользователь отключился');
        //delete ws.client_pools.(ws_client)
    });
};
/*
  setInterval(() => {
    wsServer.clients.forEach((client : any) => {
      console.log(client.send(new Date().toTimeString()));
    });
  }, 1000);

  setInterval(() => {
    clientPools.forEach((client) => {
      //client.send(new Date().toTimeString());
    });
  }, 1000);
*/
wsServer.on('connection', onConnect);
console.log('ws started on port:', port);
