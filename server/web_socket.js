let ws = {}

const port = 3003
const WebSocket = require('ws');
const ws_server = new WebSocket.Server({port: port});


ws.client_pools = []


let on_connect = function(ws_client) {
    console.log('Новый пользователь')

    ws.client_pools.push(ws_client)
    console.log(ws_server.clients)
    
    ws_client.send('Привет')

    

    ws_client.on('message', function(message) {
        console.log('client ws msg', message)
    })

    ws_client.on('close', function() {
        console.log('Пользователь отключился')
        //delete ws.client_pools.(ws_client)
    })
  }


  setInterval(() => {
    ws_server.clients.forEach((client) => {
      console.log(client.send(new Date().toTimeString()));
    });
  }, 1000);

  setInterval(() => {
    ws.client_pools.forEach((client) => {
      //client.send(new Date().toTimeString());
    });
  }, 1000);

  


  ws_server.on('connection', on_connect);


  console.log('ws started on port:', port)



module.exports = ws