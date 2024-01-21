import sql from "./sql";
import tools from "../tools";
import Workspace from "./types/Workspace";
import UserSession from "./types/UserSession";
import User from "./types/User";
//import md5 from "md5";
import {Row} from "postgres";

export default class Data {

  private workspaces: Map<string, Workspace> = new Map();
  private tokenExpirationTimeSec: number = 30 * 60 * 60 * 24 // 30 days
  private checkExpiredIntervalMs: number = 10 * 1000 // 10 minutes in ms

  private CRUD: any = {
    'C': 'create',
    'R': 'read',
    'U': 'update',
    'D': 'delete'
  }

  public async init() {
    await this.getWorkspaces();
    this.removeExpiredTokens();
    await sql.subscribe('*', this.handleNotify.bind(this), this.handleSubscribeConnect); // bind to keep `this` reference
  }

  private async getWorkspaces() {
    const schemas = await sql`    
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'admin', 'public') 
      AND schema_name NOT LIKE 'pg_%'
    `;

    this.workspaces = new Map(schemas.map((schema: any) => {
      return [schema.schema_name, {
        name: schema.schema_name,
        sessions: new Map(),//token, user_uuid
        permissions: new Map(),//user_uuid.table_name.CRUD as ke
        users: new Map() //users by uuid
      } as Workspace]
    }));


    for (let [workspaceName, workspace] of this.workspaces) {
      this.updateWorkspaceUsers(workspaceName);
      this.updateWorkspaceSessions(workspaceName);
      this.updateWorkspacePermissions(workspaceName);
      console.log(`Loaded workspace: ${workspaceName}, users: ${workspace.users.size}, sessions: ${workspace.sessions.size}`)
    }
  }

  private async updateWorkspaceUsers(workspaceName: string) {
    const workspace = this.workspaces.get(workspaceName);
    if(!workspace) return;

    let users = (await sql<User>`
      SELECT 
          U.uuid,
          U.name,
          U.login,
          U.mail,
          U.telegram,
          json_agg(R) as roles
      FROM ${sql(workspaceName + '.users')} U
      LEFT JOIN ${sql(workspaceName + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
      LEFT JOIN (SELECT uuid, name FROM ${sql(workspaceName + '.roles')}) R ON R.uuid = UR.roles_uuid
      WHERE U.active 
      AND U.deleted_at IS NULL
      GROUP BY
      U.uuid,
      U.name,
      U.login,
      U.mail,
      U.telegram
    `);

    workspace.users = new Map(users.map((user: User)=>[user.uuid, user]));
  }

  private async updateWorkspacePermissions(workspaceName: string) {
    const workspace = this.workspaces.get(workspaceName);
    if(!workspace) return;

    let permissions = (await sql`
      SELECT 
        U.uuid user_uuid,
        P.targets
      FROM 
      ${sql(workspaceName + '.users')} U
        JOIN ${sql(workspaceName + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
        JOIN ${sql(workspaceName + '.roles')} R ON R.uuid = UR.roles_uuid
        JOIN ${sql(workspaceName + '.roles_to_permissions')} RP ON RP.role_uuid = R.uuid
        JOIN ${sql(workspaceName + '.permissions')} P ON P.uuid = RP.permission_uuid
      WHERE
        U.active AND 
        U.deleted_at IS NULL AND 
        R.deleted_at IS NULL AND
        P.deleted_at IS NULL
    `)

    for(let i in permissions){
      let targets = permissions[i].targets;
      for(let j in targets){
        let crud: string = targets[j].allow;
        for(let l = 0; l < crud.length; l++){
          let method: string = this.CRUD[crud[l]];
          let request: string = method + '_' + targets[j].table;
          let key = permissions[i].user_uuid + '.' + request;
          workspace.permissions.set(key, true);
          console.log('permissions key created', key);
          if(request == 'update_users') workspace.permissions.set(permissions[i].user_uuid + '.upsert_password_rand', true)
        }
      }
    }

    let admins = (await sql`
      SELECT 
        U.uuid user_uuid
      FROM 
        ${sql(workspaceName + '.users')} U
        JOIN ${sql(workspaceName + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
      WHERE
        U.active AND 
        U.deleted_at IS NULL AND 
        UR.roles_uuid = '556972a6-0370-4f00-aca2-73a477e48999'
    `)

    for(let i in admins){
      workspace.permissions.set(admins[i].user_uuid, true);
      console.log('admin permissions key created', admins[i].user_uuid);
    }

    let commonPermissions = (await sql`
      SELECT 
        P.targets
      FROM 
        ${sql(workspaceName + '.permissions')} P
      WHERE
        P.deleted_at IS NULL AND P.code = 'common'
    `)

    let targets = commonPermissions[0]?.targets
    if(!targets) return

    for(let j in targets){
      let crud: string = targets[j].allow;
      for(let l = 0; l < crud.length; l++){
        let method: string = this.CRUD[crud[l]];
        let request: string = method + '_' + targets[j].table;
        workspace.permissions.set(request, true);
        console.log('common permissions key created', request);
      }
    }
  }

  private async updateWorkspaceSessions(workspaceName: string) {
    const workspace = this.workspaces.get(workspaceName);
    if(!workspace) return;

    const sessions = (await sql<UserSession>`
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

    workspace.sessions = new Map(sessions.map((session: UserSession)=>[session.token, session]))
  }

  private async md5(text: string){
    let md5text = (await sql`SELECT MD5( ${text})`)[0].md5
    console.log('md5', md5text)
    return await md5text
  }
  

  // removes expired user tokens
  private removeExpiredTokens() { 
    const now = new Date()
    this.workspaces.forEach((workspace: Workspace, workspaceName: string) => {
      workspace.sessions.forEach((session: UserSession, token: string) => {
        if (session.expires_at !== undefined && session.expires_at < now) {
          workspace.sessions.delete(token);
          console.log('Removed expired token: ', token, 'from', workspaceName);
        }
      })
    })
    setTimeout(() => { this.removeExpiredTokens() }, this.checkExpiredIntervalMs)
  }

  private async handleNotify(row: Row, { command, relation, _key, _old }: any) {
    if (relation.table == 'user_sessions' && command == 'insert') {
      let session: UserSession = {
        uuid: row.uuid,
        user_uuid: row.user_uuid,
        token: row.token,
        token_created_at: row.created_at,
        expires_at: new Date(Date.parse(row.created_at) + this.tokenExpirationTimeSec * 1000 )
      }
      this.workspaces.get(relation.schema)?.sessions?.set(session.token, session)
    } else if (relation.table == 'users') {
      // if users table is updated, update users of a workspace
      await this.updateWorkspaceUsers(relation.schema)
    } else if (relation.table == 'user_sessions') {
      // if user_sessions table is updated, update sessions of a workspace
      await this.updateWorkspaceSessions(relation.schema)
    } else if(relation.table == 'permissions' || 
        relation.table == 'roles' || 
        relation.table == 'roles_to_permissions' || 
        relation.table == 'users_to_roles'){
      await this.updateWorkspacePermissions(relation.schema)
    }
  }

  private handleSubscribeConnect() {
    console.log('subscribe connected!')
  }

  public async checkSession(workspaceName: string, token: string): Promise<User | null> {
    //const md5Token = md5(token)
    const md5Token: string = await this.md5(token)
    let workspace: Workspace | undefined = this.workspaces.get(workspaceName);
    if(!workspace){
      await this.getWorkspaces();
      workspace = this.workspaces.get(workspaceName);
      if(!workspace) return null;
    }
    const userSession: UserSession | undefined = workspace.sessions.get(md5Token);
    if(!userSession) return null;
    const user: User | undefined = workspace.users.get(userSession.user_uuid);
    if(!user) return null;
    return user;
  }

  public checkPermission(workspaceName: string, user_uuid: string, func: string): boolean {

    console.log('www')
    let workspace: Workspace | undefined = this.workspaces.get(workspaceName);
    if(!workspace) return false;

    console.log('www1', user_uuid,func, workspace.permissions)
    let isAdmin = Boolean(workspace.permissions.get(user_uuid));
    if(isAdmin) return true;
    let isCommon = Boolean(workspace.permissions.get(func));
    if(isCommon) return true;
    return Boolean(workspace.permissions.get(user_uuid + '.' + func.replace('upsert', 'update')));
  }

}