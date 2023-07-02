import {sql} from "./Sql";
import Sender from './Sender';

class Support {

    private readonly base_unkaos_url = 'https://unkaos.oboz.tech/issue/'
    private readonly  project_short_names : any = 
    {
        '8cb994ca-f9e8-4a47-8a6e-d56f380662ad': 'SDO',
        'ec14b6c7-ce77-47b0-ab31-6f2b879c5626': 'SDG'
    }
    private readonly  check_interval = 1000 * 30
    // TODO switch to roles
    private readonly  support_channel_user_uuids = [
        '9965cb94-17dc-46c4-ac1e-823857289e98', //khvilon
        'f33410b5-b829-4eae-9a0e-cd4629e8c712', //matyushechko
        'c2c5debe-e9ae-4667-8534-5868dc68d2a7', //yudina
        '27f1c60f-f1da-4d46-a6f5-825c6c5f52ae'  //repin
    ]

    //private readonly  support_channel_user_uuid = '23b87377-6c7a-44f8-9b56-667ab951a8aa'
    private readonly   titleFieldUuid = 'c96966ea-a591-47a9-992c-0a2f6443bc80'

    private last_num : any = {}

    private sender: Sender

    constructor(sender: Sender){
        this.sender = sender
    }

    public async init(){
        for(let project_uuid in this.project_short_names){
            this.last_num[project_uuid] = await this.get_last_num(project_uuid)
            this.check_new_issues(project_uuid, this)
        }
    }

    private write(title : string, body : string){
        if(title == '') return
        if(title == undefined) return
        

        for(let i= 0; i < this.support_channel_user_uuids.length; i++){
            this.sender.send('telegram', this.support_channel_user_uuids[i], title, body, 'oboz')
            this.sender.send('discord', this.support_channel_user_uuids[i], title, body, 'oboz')
        }
        
    }
 
    private new_issue_alert(num : string, project_uuid : string, text: string){
        this.write('Support: ' + text, this.base_unkaos_url + this.project_short_names[project_uuid]  + '-' + num)
    }

    private async get_last_num(project_uuid : string){
        let ans = await sql`SELECT MAX(num) AS num FROM issues WHERE project_uuid=${project_uuid} AND deleted_at IS NULL`
        if (ans == null || ans.length < 1) return [];
        return Number(ans[0].num)
    }

    private async get_new_project_issues(project_uuid : string, me: any){
        let ans = await sql`SELECT i.num, fv.value FROM issues i  
            LEFT JOIN field_values fv ON fv.issue_uuid=i.uuid
            AND fv.field_uuid = ${me.titleFieldUuid}
            WHERE i.num > ${me.last_num[project_uuid]} AND
            i.project_uuid=${project_uuid} AND i.deleted_at IS NULL`
        if(ans != null && ans != undefined) return ans
        return []
    }

    private async check_new_issues(project_uuid : string, me : any){
        let rows = await me.get_new_project_issues(project_uuid, me)

        for(let i in rows){
            if(Number(rows[i].num) > me.last_num[project_uuid]) me.last_num[project_uuid] = Number(rows[i].num)
            me.new_issue_alert(rows[i].num, project_uuid, rows[i].value)
        }   
        
        setTimeout( me.check_new_issues, me.check_interval, project_uuid, me)
    }
}

export default Support;