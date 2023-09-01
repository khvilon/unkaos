import {monRequest} from "./ws"
import ws from "./ws"

export default class wsMon {

	private static tasks: any = {}
	private static readonly waitBeforeColback = 500 //ms

	private static monTask(type:string, key:string, callback:Function) {

		let taskCallback = function(msg:string){
			console.log('WS taskCallback')
			let f = ()=>{
				callback(msg)
				console.log('WS callback', msg);
				delete wsMon.tasks[key][type]
			}
			let timerExists = wsMon.tasks[key] != undefined && wsMon.tasks[key][type] != undefined
			if(timerExists) clearTimeout(wsMon.tasks[key][type])
			if(wsMon.tasks[key] == undefined) wsMon.tasks[key] = {}
			wsMon.tasks[key][type] = setTimeout(f, wsMon.waitBeforeColback)
		}

		let req = new monRequest(type, key , taskCallback)
		ws.mon(req)
	}

	public static monitorIssue(uuid: string, callbackIssue: Function, callbackRelation: Function, 
	callbackAttachment: Function, callbackTag: Function) {
		wsMon.monTask('monitor_issue', uuid , callbackIssue)
		wsMon.monTask('monitor_issue_relations', uuid , callbackRelation)
		wsMon.monTask('monitor_issue_attachments', uuid , callbackAttachment)
		wsMon.monTask('monitor_issue_tags', uuid , callbackTag)
	}

	public static monitorIssueAttachmentsDel(attachments_uuids:string[], callbackAttachment: Function){
		for(let i = 0; i < attachments_uuids.length; i++)
				wsMon.monTask('monitor_issue_attachments', attachments_uuids[i] , callbackAttachment)
	}
}
