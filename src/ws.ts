
import conf from "./conf"
import cache from "./cache";

//import { io } from "socket.io-client";

export class monRequest{
	readonly type:string
	readonly key:string
	readonly monMsg:string
	readonly callback:Function
	constructor(type:string, key:string, callback:Function) {
		this.type = type
		this.key = key
		this.callback = callback
		this.monMsg = JSON.stringify({"type": type, "key": key})
	}
}



export default class ws {
	private static readonly checkConnectionInterval = 5000 //ms
	private static readonly  reconnectInterval = 2000 //ms

	static s : WebSocket
	static monRequests: Map<string, monRequest> = new Map([])
	static isAlife = true
	static subdomain:string = ws.getSubdomain()

	static getSubdomain(): string {
		const uri = window.location.href;
		const uriParts = uri.split(".");
		if (uriParts.length < 3) return "public";
		if (uriParts[1] == "unkaos")
			return uriParts[0].replace("http://", "").replace("https://", "");
		return uriParts[1];
	}

	static connect() {
		//if(ws.s != undefined && ws.s.readyState !== WebSocket.CLOSED) return
		//else if(ws.s != undefined)
		console.log('WS try connect');
		ws.subdomain = ws.getSubdomain()
		if(!this.subdomain || this.subdomain == '') return
		ws.s = new WebSocket(conf.wsUrl)
		

		ws.s.onerror = (err)=>{
			console.error('WS encountered error: ', err, 'Closing socket')
			ws.s.close();	
		};

		ws.s.onclose = (e)=>{
			console.log('WS is closed. Reconnect will be attempted in ' + ws.reconnectInterval + ' ms', e.reason)
			setTimeout(ws.connect, ws.reconnectInterval)
		};

		ws.s.onopen = ()=>{
			
			console.log('WS open')
			ws.s.send(JSON.stringify({action:'AUTH', token:cache.getString("user_token"), subdomain:ws.getSubdomain()}))
			ws.isAlife = true;
			for (let [key, value] of ws.monRequests) {
				console.log('WS send mon req'); ws.s.send(value.monMsg) 
			}
		}

		ws.s.onmessage = function (message) {
			console.log('WS message: %s', message.data);

			let msg:any
			try{msg = JSON.parse(message.data)}
			catch(err){ console.log('WS message is not a valid json'); return }

			if(msg.action == 'PONG'){
				ws.isAlife = true
				return
			}
			console.log(ws.monRequests)
			let mr = ws.monRequests.get(msg.key + '#' + msg.type)
			if(mr) mr.callback(message)
		}

		console.log('wsws')
	}


	static heartbit(){
		console.log(ws.isAlife, !ws.isAlife && ws.s != undefined && ws.s.readyState !== WebSocket.CLOSED)
		if(!ws.isAlife && ws.s != undefined && ws.s.readyState !== WebSocket.CLOSED) ws.s.close()
		ws.isAlife = false;
		ws.ping()
		setTimeout(ws.heartbit, ws.checkConnectionInterval)
	}
	

	static ping() {
		if(!ws.subdomain) return
		console.log('WS try ping')
		try{
			if(ws.s != undefined && ws.s.readyState !== WebSocket.CLOSED) 
				ws.s.send(JSON.stringify({action: 'PING'}))
		}
		catch(err){console.log('WS ping faied', err)}
	}
	

	static mon(req:monRequest) {
		console.log('WS add req: ', req)
		ws.monRequests.set(req.key + '#' + req.type, req)
		if(ws.s != undefined && ws.s.readyState !== WebSocket.CLOSED) {console.log('WS send req'); ws.s.send(req.monMsg) }
	}
}

ws.connect()
ws.heartbit()
