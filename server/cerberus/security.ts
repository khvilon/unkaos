import sql from "./sql";
// @ts-ignore
import jwt from "jsonwebtoken";
import { randomUUID } from 'crypto';
import { createLogger } from '../server/common/logging';

const logger = createLogger('cerberus');

export default class Security {

  private static key: string = 'shhhhh';

  private static async fetchUser(workspace: string, email: string, pass: string) : Promise<any> {
    logger.debug({
      msg: 'Executing SQL query for user authentication',
      workspace,
      email
    });

    // Сначала проверим хеш пароля
    const passHash = (await sql`SELECT MD5(${pass}) as hash`)[0].hash;
    logger.debug({
      msg: 'Password hash',
      workspace,
      email,
      passHash
    });

    const result = await sql`
    SELECT 
    U.uuid,
    U.name,
    U.login,
    U.mail,
    U.active,
    U.avatar,
    U.created_at,
    U.updated_at,
    COALESCE(json_agg(R) FILTER (WHERE R.uuid IS NOT NULL), '[]') as roles
    FROM ${sql(workspace + '.users')} U
    LEFT JOIN ${sql(workspace + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
    LEFT JOIN (SELECT uuid, name FROM ${sql(workspace + '.roles')}) R ON R.uuid = UR.roles_uuid
    WHERE mail = ${email} 
    AND password = MD5(${pass}) 
    AND deleted_at IS NULL 
    AND active
    GROUP BY
    U.uuid,
    U.name,
    U.login,
    U.mail,
    U.active,
    U.avatar,
    U.created_at,
    U.updated_at
    `;

    logger.debug({
      msg: 'User fetch result',
      workspace,
      email,
      found: !!result[0]
    });

    return result[0];
  }

  public static async newToken(workspace: string, email: string, pass: string) {
    try {
      let user = await this.fetchUser(workspace, email, pass)
      if(!user) return null

      let user_data = { uuid: user.uuid }
      let token = jwt.sign(user_data, this.key)
      
      // Получаем хеш токена для логирования
      const tokenHash = (await sql`SELECT MD5(${token})`)[0].md5;
      
      logger.debug({
        msg: 'New token debug',
        workspace,
        tokenHash
      });

      await sql`INSERT INTO ${sql(workspace + '.user_sessions') } (uuid, user_uuid, token) 
        values( ${ randomUUID() }, ${ user.uuid }, MD5(${ token }))`

      const result = {user_token: token, profile: user};
      logger.debug({
        msg: 'Token created',
        workspace,
        result: { ...result, user_token: '***' }  // Не логируем сам токен
      });
      return result;
    } catch (error) {
      logger.error({
        msg: 'Error creating token',
        workspace,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;  // Пробрасываем ошибку дальше для обработки в socket-server
    }
  }

  public static async setRandomPassword(workspace : string, user : any) : Promise<string> {
    const password = this.generateRandomPassword()
    await this.setUserPassword(workspace, user, password)
    await this.invalidateUserSessions(workspace, user)
    return password
  }

  private static generateRandomPassword() {
    const pass_chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const pass_len = 12;
    let password = ''
    for (let i = 0; i <= pass_len; i++) {
      let rand_num = Math.floor(Math.random() * pass_chars.length);
      password += pass_chars.substring(rand_num, rand_num + 1);
    }
    return password
  }

  public static async setUserPassword(workspace: string, user: any, newPassword: string) {
    logger.debug({
      msg: 'Setting new password',
      workspace,
      userUuid: user.uuid
    });

    // Получим хеш нового пароля
    const newPassHash = (await sql`SELECT MD5(${newPassword}) as hash`)[0].hash;
    logger.debug({
      msg: 'New password hash',
      workspace,
      userUuid: user.uuid,
      newPassHash
    });

    const result = await sql`
      UPDATE ${sql(workspace + '.users') } 
      SET password = ${newPassHash},
          updated_at = NOW()
      WHERE uuid = ${ user.uuid }
      RETURNING uuid, updated_at
      `;

    logger.debug({
      msg: 'Password update result',
      workspace,
      userUuid: user.uuid,
      updated: !!result[0],
      updatedAt: result[0]?.updated_at
    });

    return result[0];
  }

  private static async invalidateUserSessions(workspace: string, user: any) {
    logger.debug({
      msg: 'Invalidating all user sessions',
      userId: user.uuid
    });
    await sql`
      UPDATE ${sql(workspace + '.user_sessions') } 
      SET deleted_at = NOW()
      WHERE user_uuid = ${ user.uuid }
        and deleted_at IS NULL
      `
  }
}
