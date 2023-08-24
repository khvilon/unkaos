let base_url: any = import.meta.env.BASE_URL; 
let wsUrl: any = import.meta.env.WS_URL;

//if(!base_url || (base_url.length < 3)) base_url = "https://unkaos.oboz.tech:3002/";
//if(!wsUrl || (wsUrl.length < 3)) wsUrl = "wss://unkaos.oboz.tech:3003/";

base_url = base_url.replace ('https://', window.location.href.split('.')[0])
wsUrl = wsUrl.replace ('wss://',  window.location.href.split('.')[0].replace('https://', 'wss://'))

console.log('>>>>>>>>>>>base_url', base_url)

export default class conf {
  //static base_url = "http://localhost:3001/";
  //static base_url = "http://unkaos.online:3001/";
  //static base_url = "https://unkaos.oboz.tech:3002/";
  //static wsUrl = "wss://unkaos.oboz.tech:3003/";
  static base_url = base_url;
  static wsUrl = wsUrl; 
}

