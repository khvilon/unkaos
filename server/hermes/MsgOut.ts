import {sql} from "./Sql";
import Sender from "./Sender";

class MsgOut {

  private sender: Sender

  constructor(sender: Sender) {
    this.sender = sender
  }

  public async init() {
    await this.readOldMessages()
    await sql.subscribe('insert', this.handleNotify.bind(this), this.handleSubscribeConnect)
  }

  private handleSubscribeConnect(){
    console.log('subscribe msg_out connected!')
  }

  private async readOldMessages() {

    let workspaces = await this.loadWorkspaces()

    for(let w = 0; w < workspaces.length; w++){
        let ans = await sql`    
        SELECT * 
        FROM ${sql(workspaces[w] + '.msg_out') } U
        WHERE status = 0 OR status = 1 
        `;

        if (!ans) return;

        for(let i = 0; i < ans.length; i++){
            console.log(ans[i])
            this.send(ans[i], workspaces[w])
        }
    }
    
  }

  private async handleNotify(row:any, { command, relation, key, old }: any){
    if(command == 'insert' && relation.table == 'msg_out') this.send(row, relation.schema)
  }

  private async send(msgOutRow: any, workspace:string) {
    let ans = await this.sender.send(msgOutRow.transport, msgOutRow.recipient, msgOutRow.title, msgOutRow.body, workspace)
    await sql`UPDATE ${sql(workspace + '.msg_out') } SET status = ${ans.status}, status_details = ${ans.status ? '' : ans.status_details}, 
    updated_at = NOW() WHERE uuid = ${msgOutRow.uuid}`
  }

  private async loadWorkspaces() : Promise<string[]> {
    let workspaces = await sql`    
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN 
        ('pg_toast', 'pg_catalog', 'information_schema', 'admin', 'public')`;
    if (workspaces == null || workspaces.length < 1) return [];
    return workspaces.map((r: any) => r.schema_name);
  }

}

export default MsgOut