let register_url = window.location.protocol + '//' + window.location.hostname + ':6001/'
let base_url = window.location.protocol + '//' + window.location.hostname + ':3002/'
let wsUrl = 'wss://' + window.location.hostname + ':3003/'

if(window.location.hostname == 'unkaos.local'){
  register_url = "https://unkaos.tech:6001/";
  base_url = "https://unkaos.tech:3002/";
  wsUrl = "wss://unkaos.tech:3003/";
}

export default class conf {
  static register_url = register_url;
  static base_url = base_url;
  static wsUrl = wsUrl; 
}

