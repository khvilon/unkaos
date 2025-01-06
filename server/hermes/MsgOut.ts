import {sql} from "./Sql";
import Sender from "./Sender";
import { createLogger } from '../server/common/logging';

const logger = createLogger('hermes:msgout');

class MsgOut {

  private sender: Sender

  constructor(sender: Sender) {
    this.sender = sender
  }

  public async init() {
    logger.info({
      msg: 'Initializing message output handler'
    });

    await this.readOldMessages();
    await sql.subscribe('insert', this.handleNotify.bind(this), this.handleSubscribeConnect);

    logger.info({
      msg: 'Message output handler initialized'
    });
  }

  private handleSubscribeConnect(){
    logger.info({
      msg: 'Database subscription connected'
    });
  }

  private async readOldMessages() {
    let workspaces = await this.loadWorkspaces();

    logger.info({
      msg: 'Reading old messages',
      workspaces: workspaces.length
    });

    for(let w = 0; w < workspaces.length; w++){
      let ans = await sql`    
        SELECT * 
        FROM ${sql(workspaces[w] + '.msg_out') } U
        WHERE status = 0 OR status = 1 
      `;

      if (!ans) return;

      logger.debug({
        msg: 'Processing old messages',
        workspace: workspaces[w],
        count: ans.length
      });

      for(let i = 0; i < ans.length; i++){
        logger.debug({
          msg: 'Processing old message',
          workspace: workspaces[w],
          messageId: ans[i].uuid
        });
        await this.send(ans[i], workspaces[w]);
      }
    }
  }

  private async handleNotify(row:any, { command, relation, key, old }: any){
    if(command == 'insert' && relation.table == 'msg_out') {
      logger.debug({
        msg: 'New message notification received',
        workspace: relation.schema,
        messageId: row.uuid
      });
      await this.send(row, relation.schema);
    }
  }

  private async send(msgOutRow: any, workspace:string) {
    logger.debug({
      msg: 'Sending message',
      workspace,
      messageId: msgOutRow.uuid,
      transport: msgOutRow.transport,
      recipient: msgOutRow.recipient
    });

    let ans = await this.sender.send(msgOutRow.transport, msgOutRow.recipient, msgOutRow.title, msgOutRow.body, workspace);
    
    const status = ans.status === 0;
    logger.debug({
      msg: status ? 'Message sent successfully' : 'Failed to send message',
      workspace,
      messageId: msgOutRow.uuid,
      status: ans.status,
      details: ans.status_details
    });

    await sql`UPDATE ${sql(workspace + '.msg_out') } 
      SET status = ${ans.status}, 
          status_details = ${ans.status ? '' : ans.status_details}, 
          updated_at = NOW() 
      WHERE uuid = ${msgOutRow.uuid}`;
  }

  private async loadWorkspaces() : Promise<string[]> {
    logger.debug({
      msg: 'Loading workspaces'
    });

    let workspaces = await sql`    
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN 
      ('pg_toast', 'pg_catalog', 'information_schema', 'admin', 'public')`;

    if (workspaces == null || workspaces.length < 1) {
      logger.debug({
        msg: 'No workspaces found'
      });
      return [];
    }

    const workspacesList = workspaces.map((r: any) => r.schema_name);
    logger.debug({
      msg: 'Workspaces loaded',
      count: workspacesList.length
    });

    return workspacesList;
  }
}

export default MsgOut;