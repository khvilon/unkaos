let base_url = window.location.protocol + '//' + window.location.hostname + ':3002/'
let wsUrl = 'wss://' + window.location.hostname + ':3003/'

if(window.location.hostname == 'unkaos.local'){
  base_url = "https://unkaos.ru:3002/";
  wsUrl = "wss://unkaos.ru:3003/";
}

export default class conf {
  static base_url = base_url;
  static wsUrl = wsUrl; 
}

