export default class conf {
  //static base_url = "http://localhost:3001/";
  //static base_url = "http://unkaos.online:3001/";
  //static base_url = "https://unkaos.oboz.tech:3002/";
  //static wsUrl = "wss://unkaos.oboz.tech:3003/";
  static base_url = process.env.BASE_URL || "https://unkaos.oboz.tech:3002/"
  static wsUrl = process.env.WS_URL ||  "wss://unkaos.oboz.tech:3003/"

 
}
