import Memcached from 'memcached';
import sql from "./sql";

export default class Cache {
  private memcached: any = new Memcached('memcached:11211');
  private cacheLifetime: number =  365 * 24 * 60 * 60; // year in seconds

  public async init() {
    await this.loadCacheFromDB();

    await sql.subscribe('*', this.handleNotify.bind(this), this.handleSubscribeConnect); // bind to keep `this` reference

    try {
        const result = await this.setAsync('common:loaded', 'true');
        console.log('Set operation result:', result);
    } catch (err) {
        console.error('Error setting value in Memcached:', err);
    }
  }

  // Wrap the set operation in a function that returns a Promise
  private async setAsync(key: string, value: string): Promise<any> {
    let me = this;
    return new Promise((resolve, reject) => {
        console.log('>>>>>>>mem0', me.cacheLifetime, me)
      me.memcached.set(key, value, me.cacheLifetime, (err: any, result: any) => {
        console.log('>>>>>>>mem1', result, err)
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  private async loadCacheFromDB() {
    const schemas = await sql`    
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'admin', 'public') 
      AND schema_name NOT LIKE 'pg_%'
    `;

    for (let workspace of schemas.map((row: any)=>row.schema_name)) {
      await this.updateWorkspaceUsers(workspace);
    }
  }

  private async updateWorkspaceUsers(workspaceName: string) {
    let users = await sql`
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
    `;

    for(let user of users){
        try {
            const result = await this.setAsync('workspace:' +workspaceName  + ':' + user.uuid + ':roles', user.roles);
            console.log('Set operation result:', result);
        } catch (err) {
            console.error('Error setting value in Memcached:', err);
        }
    }

    let usersProjects = await sql`
    SELECT
        U.uuid as user_uuid,
        json_agg(PP) as projects
    FROM ${sql(workspaceName + '.users')} U
    LEFT JOIN ${sql(workspaceName + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
    LEFT JOIN (SELECT uuid, name FROM ${sql(workspaceName + '.roles')} WHERE deleted_at IS NULL) R ON R.uuid = UR.roles_uuid
    LEFT JOIN (SELECT roles_uuid, projects_uuid, allow FROM ${sql(workspaceName + '.projects_permissions')} WHERE deleted_at IS NULL) PP ON PP.roles_uuid = R.uuid
    WHERE U.active 
    AND U.deleted_at IS NULL
    GROUP BY U.uuid
    `

    for(let userProjects of usersProjects){
        try {
            let key = 'workspace:' +workspaceName  + ':user:' + userProjects.user_uuid + ':projects';
            console.log('key', key)
            const result = await this.setAsync(key, userProjects.projects);
            console.log('Set operation result:', result);
        } catch (err) {
            console.error('Error setting value in Memcached:', err);
        }
    }
  }

  private async handleNotify(row: any, { command, relation, _key, _old }: any) {
     if (relation.table == 'users' || relation.table == 'users_to_roles' || 
     relation.table == 'roles' || relation.table == 'projects_permissions') {
      await this.updateWorkspaceUsers(relation.schema)
    }
  }

  private handleSubscribeConnect() {
    console.log('subscribe connected!')
  }


}