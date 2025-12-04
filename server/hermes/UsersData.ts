import {sql} from "./Sql";
import {User} from "./Types";
import { createLogger } from '../server/common/logging';

const logger = createLogger('hermes:users');

class UsersData {

  private workspaces:string[] = [];
  private users:any = {};

  private async loadWorkspaceUsers(workspace: string) : Promise<User[]> {
    logger.debug({
      msg: 'Loading users for workspace',
      workspace
    });

    const users = await sql`
        SELECT 
            U.uuid,
            U.name,
            U.login,
            U.mail,
            U.telegram,
            U.discord,
            U.telegram_id,
            U.discord_id
        FROM ${sql(workspace + '.users') } U
        WHERE U.active AND U.deleted_at IS NULL
        `;
    let workspaceUsers: any = {};

    for (let i = 0; i < users.length; i++) {
      workspaceUsers[users[i].uuid] = users[i];
    }

    logger.debug({
      msg: 'Users loaded for workspace',
      workspace,
      count: users.length
    });

    return workspaceUsers as User[];
  }

  public async init() {
    logger.info({
      msg: 'Initializing users data'
    });

    this.workspaces = await this.loadWorkspaces();
    let users: any = {};

    for (let i = 0; i < this.workspaces.length; i++) {
      users[this.workspaces[i]] = await this.loadWorkspaceUsers(this.workspaces[i]);
    }

    this.users = users;
    logger.info({
      msg: 'Users data loaded',
      workspaces: Object.keys(users).length
    });

    await sql.subscribe('*', this.handleNotify.bind(this), this.handleSubscribeConnect);
  }

  public getUser(uuid:string, workspace:string){
    if(!this.users[workspace]) {
      logger.debug({
        msg: 'Workspace not found',
        workspace
      });
      return null;
    }
    if(!this.users[workspace][uuid]) {
      logger.debug({
        msg: 'User not found in workspace',
        workspace,
        uuid
      });
      return null;
    }
    return this.users[workspace][uuid];
  }

  public async setTelegramtId(username:string, id:string){
    logger.info({
      msg: 'Setting Telegram ID',
      username,
      telegram_id: id
    });

    let found = false;
    for (let i = 0; i < this.workspaces.length; i++) {
      let ans = await sql`
        UPDATE ${sql(this.workspaces[i] + '.users') } 
        SET telegram_id = ${id}
        WHERE telegram_id = '' AND telegram = ${username} AND active AND deleted_at IS NULL
        RETURNING uuid`;
      if(ans.length > 0) {
        found = true;
        logger.debug({
          msg: 'Telegram ID updated',
          workspace: this.workspaces[i],
          username,
          telegram_id: id
        });
      }
    }

    logger.info({
      msg: found ? 'Telegram ID set successfully' : 'No matching user found for Telegram',
      username,
      telegram_id: id
    });

    return found;
  }

  public async setDiscordId(username:string, id:string){
    logger.info({
      msg: 'Setting Discord ID',
      username,
      discord_id: id
    });

    let found = false;
    for (let i = 0; i < this.workspaces.length; i++) {
      let ans = await sql`
        UPDATE ${sql(this.workspaces[i] + '.users') } 
        SET discord_id = ${id}
        WHERE discord_id = '' AND discord = ${username} AND active AND deleted_at IS NULL
        RETURNING uuid`;
      if(ans.length > 0) {
        found = true;
        logger.debug({
          msg: 'Discord ID updated',
          workspace: this.workspaces[i],
          username,
          discord_id: id
        });
      }
    }

    logger.info({
      msg: found ? 'Discord ID set successfully' : 'No matching user found for Discord',
      username,
      discord_id: id
    });

    return found;
  }

  private async handleNotify(row:any, { command, relation, key, old }: any){
    if(relation.table != 'users') return;
    
    if(!this.users[relation.schema]) {
      logger.debug({
        msg: 'Workspace not found, reloading workspaces',
        workspace: relation.schema
      });
      this.workspaces = await this.loadWorkspaces();
    }

    logger.debug({
      msg: 'Updating user data',
      workspace: relation.schema,
      command
    });

    this.users[relation.schema] = await this.loadWorkspaceUsers(relation.schema);
  }

  private handleSubscribeConnect(){
    logger.info({
      msg: 'Database subscription connected for users'
    });
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

export default UsersData;