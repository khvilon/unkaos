let base_url = window.location.protocol + '//' + window.location.hostname + ':3002/'
let wsUrl = 'wss://' + window.location.hostname + ':3003/'

if(window.location.hostname == 'unkaos.oboz.local'){
  base_url = "https://unkaos.oboz.tech:3002/";
  wsUrl = "wss://unkaos.oboz.tech:3003/";
}

export default class conf {
  //static base_url = "http://localhost:3001/";
  //static base_url = "http://unkaos.online:3001/";
  //static base_url = "https://unkaos.oboz.tech:3002/";
  //static base_url = window.location.protocol + '//' + window.location.hostname + ':3002/'
  //static wsUrl = "wss://unkaos.oboz.tech:3003/";
  static base_url = base_url;
  static wsUrl = wsUrl; 
}

