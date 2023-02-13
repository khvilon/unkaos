import postgres = require('postgres');
import tools from "../tools";
import dbConf from '../db_conf.json';
import {MsgPipe} from "./Types";

let hermesDbConf = tools.obj_clone(dbConf)
hermesDbConf.publications = 'hermes_publication'

class Sql {

  workspaces: Promise<string[]> = this.loadWorkspaces()

  query() : postgres.Sql {
    return postgres(hermesDbConf)
  }

  private async loadWorkspaces() : Promise<string[]> {
    let workspaces = await this.query()`    
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN 
        ('pg_toast', 'pg_catalog', 'information_schema', 'admin', 'public')`;
    if (workspaces == null || workspaces.length < 1) return [];
    return workspaces.map((r: any) => r.schema_name);
  }

  async getMsgPipes(workspace: string) : Promise<MsgPipe[]> {
    return await this.query()`
        SELECT 
          mp.uuid,
          mp.host,
          mp.port,
          mp.login,
          mp.password,
          mp.service,
          mp.name,
          mp.is_active,
          mp.created_at,
          mp.updated_at,
          mp.deleted_at
        FROM ${this.query()(workspace + '.msg_pipes') } mp
        WHERE 
          mp.service = 'imap_in'
          and mp.is_active = true 
          and mp.deleted_at is null
      ` as MsgPipe[]
  }
}

export default new Sql()