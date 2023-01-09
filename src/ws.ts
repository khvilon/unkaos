import tools from "./tools";
import conf from "./conf";
const checkConnectionInterval = 5000 //ms

export default class ws {

  static issues: string[] = [];

  static myWs : WebSocket = new WebSocket(conf.wsUrl);

  static monitorIssue(uuid: string, callback: Function) {
    let myWs = this.myWs
	// обработчик проинформирует в консоль когда соединение установится
	myWs.onopen = function () {
		console.log('wsws WebSocket to check changes for issue ' + uuid + ' connected');
	};


	let msg = {"type": 'monitor_issue', "uuid": uuid}
	myWs.send(JSON.stringify(msg));

	// обработчик сообщений от сервера
	this.myWs.onmessage = function (message) {
		console.log('wsws Message: %s', message.data);
	};
	
	console.log('wsws',conf.wsUrl )
	// функция для отправки команды ping на сервер
	function wsSendPing() {
		myWs.send(JSON.stringify({action: 'PING'}));

		setTimeout(wsSendPing, checkConnectionInterval)
	}
    wsSendPing()
  }
}
