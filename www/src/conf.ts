//let zeus_url: any = import.meta.env.DB_HOST; 
//let wsUrl: any = import.meta.env.WS_URL;


//if(!base_url || (base_url.length < 3)) base_url = "https://unkaos.oboz.tech:3002/";
//if(!wsUrl || (wsUrl.length < 3)) wsUrl = "wss://unkaos.oboz.tech:3003/";

let base_url = window.location.protocol + '//' + window.location.hostname + ':3002/'
let wsUrl = 'wss://' + window.location.hostname + ':3003/'

console.log('>>>>>>>>>>>base_url0', base_url, wsUrl)
//console.log('>>>>>>>>>>>base_url', base_url)

export default class conf {
  //static base_url = "http://localhost:3001/";
  //static base_url = "http://unkaos.online:3001/";
  static base_url = "https://unkaos.oboz.tech:3002/";
  static wsUrl = "wss://unkaos.oboz.tech:3003/";
  //static base_url = base_url;
  //static wsUrl = wsUrl; 
}

