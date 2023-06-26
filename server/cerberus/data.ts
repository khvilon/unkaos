import sql from "./sql";
import Workspace from "./types/Workspace";
import Session from "./types/Session";
import User from "./types/User";
// @ts-ignore
import md5 from "md5";
import {Row} from "postgres";

export default class Data {

  workspaces: Workspace[] = [];
  tokenExpirationTimeSec: number = 30 * 60 * 60 * 24 // 30 days
  checkExpiredIntervalMs: number = 5 * 1000 // 1 minute in ms

  async init() {
    this.workspaces = await this.getWorkspaces()
    for (const workspace of this.workspaces) {
      await this.fillWorkspaceUsers(workspace.name)
      await this.fillWorkspaceSessions(workspace.name)
      console.log(`Loaded workspace: ${workspace.name}, users: ${workspace.users.length}, sessions: ${workspace.sessions.length}`)
    }
    this.checkExpired()
    await sql.subscribe('*', this.handleNotify.bind(this), this.handleSubscribeConnect) // bind to keep context
  }

  async getWorkspaces() : Promise<Workspace[]> {
    const schemas = await sql`    
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'admin', 'public') 
      AND schema_name NOT LIKE 'pg_%'
    `
    return schemas.map((schema: any) => {
      return {
        name: schema.schema_name,
        users: [],
        sessions: []
      } as Workspace
    })
  }

  async fillWorkspaceUsers(workspaceName: string) {
    this.workspaces.find(ws => ws.name === workspaceName)!.users = (await sql`
      SELECT 
          U.uuid,
          U.name,
          U.login,
          U.mail,
          U.telegram
      FROM ${sql(workspaceName + '.users')} U
      WHERE U.active AND U.deleted_at IS NULL
    `).map((user: any) => {
      return {
        uuid: user.uuid,
        name: user.name,
        login: user.login,
        mail: user.mail,
        telegram: user.telegram
      } as User
    })
  }

  async fillWorkspaceSessions(workspaceName: string) {
    this.workspaces.find(ws => ws.name === workspaceName)!.sessions = (await sql`
      SELECT 
        US.user_uuid,
        US.token,
        US.created_at AS token_created_at,
        US.created_at + ${this.tokenExpirationTimeSec} * interval '1 second' as expires_at
      FROM ${sql(workspaceName + '.user_sessions')} US
      LEFT JOIN ${sql(workspaceName + '.users')} U
      ON US.user_uuid = U.uuid
      WHERE U.active 
      AND U.deleted_at IS NULL 
      AND US.created_at + ${this.tokenExpirationTimeSec} * interval '1 second' > NOW() 
    `).map((result: any) => {
      return {
        user_uuid: result.user_uuid,
        token: result.token,
        token_created_at: result.token_created_at.toUTCString(),
        expires_at: result.expires_at.toUTCString()
      } as Session
    })
  }

  checkExpired() {
    // removes expired user tokens
    const now = new Date()
    this.workspaces.forEach((workspace: Workspace, workspaceIndex: number) => {
      workspace.sessions.forEach((session: Session, sessionIndex: number) => {
        if (session.expires_at !== undefined && session.expires_at < now) {
          this.workspaces[workspaceIndex].sessions = this.workspaces[workspaceIndex].sessions.splice(sessionIndex, 1)
          console.log("Removed expired token of session: ", session)
        }
      })
    })
    setTimeout(() => { this.checkExpired() }, this.checkExpiredIntervalMs)
  }

  async handleNotify(row: Row, { command, relation, _key, _old }: any) {
    if (relation.table == 'user_sessions' && command == 'insert') {
      row.expires_at = new Date(Date.parse(row.created_at) + this.tokenExpirationTimeSec * 1000 )
      this.workspaces.find(ws => ws.name === relation.schema)?.sessions?.push(row as Session)
    } else if (relation.table == 'users') {
      // is users table is updated, update users of a workspace
      await this.fillWorkspaceUsers(relation.schema)
    } else if (relation.table == 'user_sessions') {
      // is user_sessions table is updated, update sessions of a workspace
      await this.fillWorkspaceSessions(relation.schema)
    }
  }

  handleSubscribeConnect() {
    console.log('subscribe connected!')
  }

  checkSession(workspaceName: string, token: string): User | null {
    const md5Token = md5(token)
    const workspace = this.workspaces.find(workspace => workspace.name === workspaceName)
    if (!workspace) return null
    const session = workspace.sessions.find((sess) => sess?.token === md5Token)
    if (!session) return null
    const user = workspace.users.find(user => user.uuid === session?.user_uuid)
    if (!user) return null
    return user
  }

}