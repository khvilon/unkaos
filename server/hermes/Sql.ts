import postgres = require('postgres');
import tools from "../tools";
import dbConf from '../db_conf.json';
import {MsgIn, MsgInPart, MsgPipe} from "./Types";

let hermesDbConf = tools.obj_clone(dbConf)
hermesDbConf.publications = 'hermes_publication'

export const sql : postgres.Sql = postgres(hermesDbConf)

export class Sql {

  static workspaces: Promise<string[]> = Sql.loadWorkspaces()

  private static async loadWorkspaces() : Promise<string[]> {
    let workspaces = await sql`    
        SELECT schema_name
        FROM information_schema.schemata
        WHERE schema_name NOT IN 
        ('pg_toast', 'pg_catalog', 'information_schema', 'admin', 'public')`;
    if (workspaces == null || workspaces.length < 1) return [];
    return workspaces.map((r: any) => r.schema_name);
  }

  static async getMsgPipes(workspace: string) : Promise<MsgPipe[]> {
    return await sql`
        SELECT *
        FROM ${sql(workspace + '.msg_pipes') } mp
        WHERE 
          mp.service = 'imap_in'
          and mp.is_active = true 
          and mp.deleted_at is null
      ` as MsgPipe[]
  }

  static async getLastMsgIn(workspace: string, pipe_uuid: string) : Promise<MsgIn[]> {
    return await sql`
        SELECT *
        FROM ${sql(workspace + '.msg_in')} mi
        WHERE 
          mi.deleted_at is null
          and mi.pipe_uuid = ${pipe_uuid}::uuid
        ORDER BY
          mi.message_date desc
        LIMIT 1
      ` as MsgIn[]
  }

  static async insertMsgIn(workspace: string, record: MsgIn) {
    await sql`
      INSERT INTO ${sql(workspace+ '.msg_in')} (uuid,title,body,"from",pipe_uuid,status,message_id,message_uid,message_date,senders,cc,bcc,reply_to,"to")
      VALUES (
        ${record.uuid}::uuid,
        ${record.title},
        ${record.body},
        ${record.from},
        ${record.pipe_uuid}::uuid,
        ${record.status}::${sql(workspace)}."msg_status",
        ${record.message_id},
        ${record.message_uid},
        ${record.message_date.toISOString()},
        ${record.senders},
        ${record.cc},
        ${record.bcc},
        ${record.reply_to},
        ${record.to}
      )`
  }

  static async insertMsgInPart(workspace: string, record: MsgInPart) {
    await sql`
      INSERT INTO ${sql(workspace + '.msg_in_parts')} (uuid,msg_in_uuid,"content","type","encoding",disposition,part_id,part_num,filename)
      VALUES (
        ${record.uuid}::uuid,
        ${record.msg_in_uuid}::uuid,
        ${record.content},
        ${record.type},
        ${record.encoding},
        ${record.disposition},
        ${record.part_id},
        ${record.part_num},
        ${record.filename}
      )`
  }

}