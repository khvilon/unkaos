import sql from "./sql";
import { Workspace } from "./types/Workspace";
import { UserSession } from "./types/UserSession";
import { User } from "./types/User";
import { createLogger } from '../server/common/logging';
import {Row} from "postgres";

const logger = createLogger('cerberus');

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


  private async getWorkspace(workspaceName: string){
    const schemas = await sql`    
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = ${workspaceName} 
      AND schema_name NOT LIKE 'pg_%'
    `; 

    if(!schemas || !schemas[0]) return;

    let schema = schemas[0]

    this.workspaces.set( schema.schema_name, {
        name: schema.schema_name,
        sessions: new Map(),//token, user_uuid
        permissions: new Map(),//user_uuid.table_name.CRUD as ke
        users: new Map() //users by uuid
      } as Workspace)

      this.updateWorkspaceUsers(schema.schema_name);
      this.updateWorkspaceSessions(schema.schema_name);
      this.updateWorkspacePermissions(schema.schema_name);
      logger.info({
        msg: 'Loaded workspace',
        workspace: schema.schema_name
      });
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
      logger.info({
        msg: 'Loaded workspace',
        workspace: workspaceName,
        users: workspace.users.size,
        sessions: workspace.sessions.size
      });
    }
  }

  private async updateWorkspaceUsers(workspaceName: string) {
    const workspace = this.workspaces.get(workspaceName);
    if(!workspace) {
      logger.warn({
        msg: 'Workspace not found while updating users',
        workspace: workspaceName
      });
      return;
    }

    try {
      logger.debug({
        msg: 'Fetching users from database',
        workspace: workspaceName
      });

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

      logger.debug({
        msg: 'Users fetched from database',
        workspace: workspaceName,
        count: users.length,
        users: users.map((u: User) => ({ uuid: u.uuid, name: u.name }))
      });

      workspace.users = new Map(users.map((user: User)=>[user.uuid, user]));

      logger.info({
        msg: 'Workspace users updated',
        workspace: workspaceName,
        users_count: workspace.users.size
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating workspace users',
        workspace: workspaceName,
        error
      });
    }
  }

  private async updateWorkspaceSessions(workspaceName: string) {
    const workspace = this.workspaces.get(workspaceName);
    if(!workspace) {
      logger.warn({
        msg: 'Workspace not found while updating sessions',
        workspace: workspaceName
      });
      return;
    }

    try {
      logger.debug({
        msg: 'Fetching sessions from database',
        workspace: workspaceName
      });

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
      `);

      logger.debug({
        msg: 'Sessions fetched from database',
        workspace: workspaceName,
        count: sessions.length,
        sessions: sessions.map((s: UserSession) => ({ uuid: s.uuid, user_uuid: s.user_uuid }))
      });

      // В БД хранятся хеши токенов, используем их напрямую как ключи в Map
      workspace.sessions = new Map(sessions.map((session: UserSession)=>[session.token, session]));

      logger.info({
        msg: 'Workspace sessions updated',
        workspace: workspaceName,
        sessions_count: workspace.sessions.size
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating workspace sessions',
        workspace: workspaceName,
        error
      });
    }
  }

  private async updateWorkspacePermissions(workspaceName: string) {
    const workspace = this.workspaces.get(workspaceName);
    if(!workspace) {
      logger.warn({
        msg: 'Workspace not found while updating permissions',
        workspace: workspaceName
      });
      return;
    }

    try {
      logger.debug({
        msg: 'Fetching permissions from database',
        workspace: workspaceName
      });

      let permissions = (await sql`
        SELECT 
          U.uuid user_uuid,
          P.targets
        FROM 
        ${sql(workspaceName + '.users')} U
          JOIN ${sql(workspaceName + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
          JOIN ${sql(workspaceName + '.roles')} R ON R.uuid = UR.roles_uuid
          JOIN ${sql(workspaceName + '.roles_to_permissions')} RP ON RP.roles_uuid = R.uuid
          JOIN ${sql(workspaceName + '.permissions')} P ON P.uuid = RP.permissions_uuid
        WHERE
          U.active AND 
          U.deleted_at IS NULL AND 
          R.deleted_at IS NULL AND
          P.deleted_at IS NULL
      `)

      logger.debug({
        msg: 'Permissions fetched from database',
        workspace: workspaceName,
        count: permissions.length,
        permissions: permissions.map((p: any) => ({ user_uuid: p.user_uuid, targets: p.targets }))
      });

      workspace.permissions = new Map();

      for(let i in permissions){
        let targets = permissions[i].targets;
        for(let j in targets){
          let crud: string = targets[j].allow;
          for(let l = 0; l < crud.length; l++){
            let method: string = this.CRUD[crud[l]];
            let request: string = method + '_' + targets[j].table;
            let key = permissions[i].user_uuid + '.' + request;
            workspace.permissions.set(key, true);
            if(method == 'update') workspace.permissions.set(permissions[i].user_uuid + '.upsert_' + targets[j].table, true);
            logger.debug({
              msg: 'Permission key created',
              key
            });
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

      logger.debug({
        msg: 'Admins fetched from database',
        workspace: workspaceName,
        count: admins.length,
        admins: admins.map((a: any) => ({ user_uuid: a.user_uuid }))
      });

      for(let i in admins){
        workspace.permissions.set(admins[i].user_uuid, true);
        logger.debug({
          msg: 'Admin permission key created',
          userId: admins[i].user_uuid
        });
      }

      let commonPermissions = (await sql`
        SELECT 
          P.targets
        FROM 
          ${sql(workspaceName + '.permissions')} P
        WHERE
          P.deleted_at IS NULL AND P.code = 'common'
      `)

      logger.debug({
        msg: 'Common permissions fetched from database',
        workspace: workspaceName,
        count: commonPermissions.length,
        commonPermissions: commonPermissions.map((p: any) => ({ targets: p.targets }))
      });

      let targets = commonPermissions[0]?.targets
      if(!targets) return

      for(let j in targets){
        let crud: string = targets[j].allow;
        for(let l = 0; l < crud.length; l++){
          let method: string = this.CRUD[crud[l]];
          let request: string = method + '_' + targets[j].table;
          workspace.permissions.set(request, true);
          if(method == 'update') workspace.permissions.set('upsert_' + targets[j].table, true);
          logger.debug({
            msg: 'Common permission key created',
            request
          });
        }
      }

      logger.info({
        msg: 'Workspace permissions updated',
        workspace: workspaceName,
        permissions_count: workspace.permissions.size
      });
    } catch (error) {
      logger.error({
        msg: 'Error updating workspace permissions',
        workspace: workspaceName,
        error
      });
    }
  }

  private async md5(text: string){
    let md5text = (await sql`SELECT MD5(${text})`)[0].md5
    logger.debug({
      msg: 'MD5 hash generated'
    });
    return await md5text
  }
  

  // removes expired user tokens
  private removeExpiredTokens() { 
    const now = new Date()
    this.workspaces.forEach((workspace: Workspace, workspaceName: string) => {
      workspace.sessions.forEach((session: UserSession, token: string) => {
        if (session.expires_at !== undefined && session.expires_at < now) {
          workspace.sessions.delete(token);
          logger.debug({
            msg: 'Removed expired token from workspace',
            workspace: workspaceName
          });
        }
      })
    })
    setTimeout(() => { this.removeExpiredTokens() }, this.checkExpiredIntervalMs)
  }

  private async handleNotify(row: Row, { command, relation, _key, _old }: any) {
    if(!this.workspaces.get(relation.schema)){
      await this.getWorkspace(relation.schema);
    }

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
    logger.info({
      msg: 'Database subscription connected'
    });
  }

  public async checkSession(workspaceName: string, token: string, isRetry: boolean = false): Promise<User | null> {
    let workspace: Workspace | undefined = this.workspaces.get(workspaceName);
    if(!workspace){
      await this.getWorkspace(workspaceName);
      workspace = this.workspaces.get(workspaceName);
      if(!workspace) return null;
    }

    // Получаем хеш токена для поиска в БД
    const tokenHash: string = (await sql`SELECT MD5(${token})`)[0].md5;
    
    logger.debug({
      msg: 'Token hash debug',
      workspace: workspaceName,
      tokenHash,
      sessionKeys: Array.from(workspace.sessions.keys())
    });

    logger.info({
      msg: 'Session check',
      workspace: workspaceName,
      tokenValid: !!workspace.sessions.get(tokenHash)
    });
    const userSession: UserSession | undefined = workspace.sessions.get(tokenHash);
    if(!userSession){
      if(isRetry) return null;
      await this.updateWorkspaceSessions(workspaceName);
      return await this.checkSession(workspaceName, token, true);
    }
    const user: User | undefined = userSession.user_uuid ? workspace.users.get(userSession.user_uuid) : undefined;
    if(!user) return null;
    return user;
  }

  public isAdmin(workspaceName: string, user_uuid: string): boolean {
    let workspace: Workspace | undefined = this.workspaces.get(workspaceName);
    if(!workspace) return false;

    return Boolean(workspace.permissions.get(user_uuid));
  }

  public checkPermission(workspaceName: string, user_uuid: string, func: string): boolean {
    let workspace: Workspace | undefined = this.workspaces.get(workspaceName);
    if(!workspace) return false;

    let isAdmin = Boolean(workspace.permissions.get(user_uuid));
    if(isAdmin) return true;
    let isCommon = Boolean(workspace.permissions.get(func));
    if(isCommon) return true;
    return Boolean(workspace.permissions.get(user_uuid + '.' + func.replace('upsert', 'update')));
  }

}