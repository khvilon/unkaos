import Memcached from 'memcached';
import sql from "./sql";
import { createLogger } from '../server/common/logging';

const logger = createLogger('ossa:cache');

export default class Cache {
  private memcached: any = new Memcached('memcached:11211');
  private cacheLifetime: number =  2592000;//365 * 24 * 60 * 60; // year in seconds

  public async init() {
    await this.loadCacheFromDB();
    await sql.subscribe('*', this.handleNotify.bind(this), this.handleSubscribeConnect); // bind to keep `this` reference

    try {
        const result = await this.setAsync('common:loaded', 'true');
        logger.debug({
            msg: 'Cache initialization complete',
            result
        });
    } catch (err) {
        logger.error({
            msg: 'Failed to set value in Memcached',
            error: err,
            key: 'common:loaded'
        });
    }
  }

  // Wrap the set operation in a function that returns a Promise
  private async setAsync(key: string, value: string): Promise<any> {
    let me = this;
    return new Promise((resolve, reject) => {
      me.memcached.set(key, value, me.cacheLifetime, (err: any, result: any) => {
        if (err) {
            logger.error({
                msg: 'Memcached set error',
                error: err,
                key
            });
            reject(err);
        }
        else {
            logger.debug({
                msg: 'Memcached set success',
                key
            });
            resolve(result);
        }
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

    logger.info({
        msg: 'Loading cache from database',
        workspaces: schemas.length
    });

    for (let workspace of schemas.map((row: any)=>row.schema_name)) {
      await this.updateWorkspaceUsers(workspace);
    }
  }

  private async updateWorkspaceUsers(workspaceName: string) {
    logger.debug({
        msg: 'Updating workspace users cache',
        workspace: workspaceName
    });

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
            const key = 'workspace:' + workspaceName + ':user:' + user.uuid + ':roles';
            const result = await this.setAsync(key, user.roles);
            logger.debug({
                msg: 'Updated user roles cache',
                workspace: workspaceName,
                userId: user.uuid
            });
        } catch (err) {
            logger.error({
                msg: 'Failed to update user roles cache',
                workspace: workspaceName,
                userId: user.uuid,
                error: err
            });
        }
    }

    let usersProjects = await sql`
    SELECT
        U.uuid as user_uuid,
        json_agg(PPR.projects_uuid) as projects_r,
        json_agg(PPW.projects_uuid) as projects_w
    FROM ${sql(workspaceName + '.users')} U
    LEFT JOIN ${sql(workspaceName + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
    LEFT JOIN (SELECT uuid, name FROM ${sql(workspaceName + '.roles')} WHERE deleted_at IS NULL) R ON R.uuid = UR.roles_uuid
    LEFT JOIN (SELECT roles_uuid, projects_uuid FROM ${sql(workspaceName + '.projects_permissions')} WHERE deleted_at IS NULL) PPR ON PPR.roles_uuid = R.uuid
    LEFT JOIN (SELECT roles_uuid, projects_uuid, allow FROM ${sql(workspaceName + '.projects_permissions')} WHERE deleted_at IS NULL AND allow = 'CRUD') PPW ON PPW.roles_uuid = R.uuid
    WHERE U.active 
    AND U.deleted_at IS NULL
    GROUP BY U.uuid
    `

    for(let userProjects of usersProjects){
        try {
            let key = 'w:' + workspaceName + ':user:' + userProjects.user_uuid + ':projects';
            let val_r = JSON.stringify(userProjects.projects_r);
            let val_w = JSON.stringify(userProjects.projects_w);

            const result_r = await this.setAsync(key + '_r', val_r);
            const result_w = await this.setAsync(key + '_w', val_w);
            
            logger.debug({
                msg: 'Updated user projects cache',
                workspace: workspaceName,
                userId: userProjects.user_uuid
            });
        } catch (err) {
            logger.error({
                msg: 'Failed to update user projects cache',
                workspace: workspaceName,
                userId: userProjects.user_uuid,
                error: err
            });
        }
    }
  }

  private async handleNotify(row: any, { command, relation, _key, _old }: any) {
    if (relation.table == 'users' || relation.table == 'users_to_roles' || 
        relation.table == 'roles' || relation.table == 'projects_permissions') {
        logger.info({
            msg: 'Cache update triggered',
            table: relation.table,
            workspace: relation.schema,
            command
        });
        await this.updateWorkspaceUsers(relation.schema);
    }
  }

  private handleSubscribeConnect() {
    logger.info({
        msg: 'Cache database subscription connected'
    });
  }
}