const port = 3003
const webSocket = require('ws');
const wsServer = new webSocket.Server({port: port});

import dbConf from '../db_conf.json';
const { Client }  = require('pg');
const pgNotify = require('@becual/pg-notify');





 

 let eventHandler = function(evt : any){
     console.log(JSON.stringify(evt, null, 4));
 };

 let init = async function(){
    console.log('ttt0')
     const client = new Client(
        {
            user: dbConf.adminName,
            password: dbConf.adminPass,
            database: 'unkaos',
            host: dbConf.host,
            port: dbConf.port
        }
     );

     console.log('ttt1')
     // Choose your tables to listen
     const tables = ['issue_actions'];

     console.log('ttt2', dbConf)



        console.log('ttt22')
        // Connect client
        await client.connect();

        console.log('ttt3')

        // By default schema is public
        const sub = await pgNotify(client, {schema: 'oboz'}).subscribe(tables);

        console.log('ttt4')

        // Listen for changes
        sub.on('INSERT', eventHandler);
        sub.on('UPDATE', eventHandler);
        sub.on('DELETE', eventHandler);

        console.log('ttt')
    
 }


 init()



var clientPools : Object[] = []


let onConnect = function(wsClient: any) {
    console.log('Новый пользователь')

    clientPools.push(wsClient)
    console.log(wsServer.clients)
    
    wsClient.send('Привет')

    

    wsClient.on('message', function(message: any) {
        console.log('client ws msg', message)
    })

    wsClient.on('close', function() {
        console.log('Пользователь отключился')
        //delete ws.client_pools.(ws_client)
    })
  }








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


  console.log('ws started on port:', port)