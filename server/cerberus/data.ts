import sql from "./sql";
import Workspace from "./types/Workspace";
import UserSession from "./types/UserSession";
import User from "./types/User";
//import md5 from "md5";
import {Row} from "postgres";

export default class Data {

  workspaces: Workspace[] = [];
  tokenExpirationTimeSec: number = 30 * 60 * 60 * 24 // 30 days
  checkExpiredIntervalMs: number = 5 * 1000 // 1 minute in ms

  async init() {
    this.workspaces = await this.getWorkspaces()
    for (const workspace of this.workspaces) {
      await this.updateWorkspaceUsers(workspace.name)
      await this.updateWorkspaceSessions(workspace.name)
      console.log(`Loaded workspace: ${workspace.name}, users: ${workspace.users.length}, sessions: ${workspace.sessions.length}`)
    }
    this.removeExpiredTokens()
    await sql.subscribe('*', this.handleNotify.bind(this), this.handleSubscribeConnect) // bind to keep `this` reference
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

  async updateWorkspaceUsers(workspaceName: string) {
    this.workspaces.find(ws => ws.name === workspaceName)!.users = (await sql<User>`
      SELECT 
          U.uuid,
          U.name,
          U.login,
          U.mail,
          U.telegram
      FROM ${sql(workspaceName + '.users')} U
      WHERE U.active 
      AND U.deleted_at IS NULL
    `)
  }

  async updateWorkspaceSessions(workspaceName: string) {
    this.workspaces.find(ws => ws.name === workspaceName)!.sessions = (await sql<UserSession>`
      SELECT 
        US.uuid,
        US.user_uuid,
        US.token,
        US.created_at AS token_created_at,
        (US.created_at + ${this.tokenExpirationTimeSec} * interval '1 second') as expires_at
      FROM ${sql(workspaceName + '.user_sessions')} US
      LEFT JOIN ${sql(workspaceName + '.users')} U
        ON US.user_uuid = U.uuid
      WHERE U.active 
        AND U.deleted_at IS NULL 
        AND (US.created_at + ${this.tokenExpirationTimeSec} * interval '1 second') > NOW() 
        AND US.deleted_at IS NULL
      ORDER BY US.CREATED_AT
    `)
  }

  async md5(text: string){
    
    let md5text = (await sql`SELECT MD5( ${text})`)[0].md5
    console.log('md5', md5text)
    return await md5text
  }
  

  removeExpiredTokens() {
    // removes expired user tokens
    const now = new Date()
    this.workspaces.forEach((workspace: Workspace, workspaceIndex: number) => {
      workspace.sessions.forEach((session: UserSession, sessionIndex: number) => {
        if (session.expires_at !== undefined && session.expires_at < now) {
          this.workspaces[workspaceIndex].sessions.splice(sessionIndex, 1)
          console.log("Removed expired token: ", session.token)
        }
      })
    })
    setTimeout(() => { this.removeExpiredTokens() }, this.checkExpiredIntervalMs)
  }

  async handleNotify(row: Row, { command, relation, _key, _old }: any) {
    if (relation.table == 'user_sessions' && command == 'insert') {
      row.expires_at = new Date(Date.parse(row.created_at) + this.tokenExpirationTimeSec * 1000 )
      this.workspaces.find(ws => ws.name === relation.schema)?.sessions?.push(row as UserSession)
    } else if (relation.table == 'users') {
      // is users table is updated, update users of a workspace
      await this.updateWorkspaceUsers(relation.schema)
    } else if (relation.table == 'user_sessions') {
      // is user_sessions table is updated, update sessions of a workspace
      await this.updateWorkspaceSessions(relation.schema)
    }
  }

  handleSubscribeConnect() {
    console.log('subscribe connected!')
  }

  async checkSession(workspaceName: string, token: string): Promise<User | null> {
    //const md5Token = md5(token)
    const md5Token = await this.md5(token)
    const workspace = this.workspaces.find(workspace => workspace.name === workspaceName)
    if (!workspace) return null
    const session = workspace.sessions.find((sess) => sess?.token === md5Token)
    if (!session) return null
    const user = workspace.users.find(user => user.uuid === session?.user_uuid)
    if (!user) return null
    return user
  }

}