import tools from "../tools";
import sql from "./sql";
// @ts-ignore
import jwt from "jsonwebtoken";

export default class Security {

  private static key: string = 'shhhhh';

  static async newToken(workspace: string, email: string, pass: string) {
    let users = await this.fetchUser(workspace, email, pass)
    console.log(email, pass)
    if(!users || users.length != 1) return null
    let user_data = { uuid: users[0].uuid }
    let token = jwt.sign(user_data, this.key)
    await sql`INSERT INTO ${sql(workspace + '.user_sessions') } (uuid, user_uuid, token) 
      values( ${ tools.uuidv4() }, ${ users[0].uuid }, MD5(${ token }))`
    return {user_token: token, profile: users[0]}
  }

  private static async fetchUser(workspace: string, email: string, pass: string) : Promise<any> {
    return sql`
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

    
}

  static async checkUserIsAdmin(workspace: string, user: any) : Promise<boolean> {
    const roles = await sql`SELECT r.name FROM ${sql(workspace + '.users')} u 
      INNER JOIN ${sql(workspace + '.users_to_roles')} ur on u.uuid = ur.users_uuid
      INNER JOIN ${sql(workspace + '.roles')} r on ur.roles_uuid = r.uuid
      WHERE u.uuid = ${ user.uuid }`
    return (roles.find((role: any) => role.name == 'Администратор') !== undefined)
  }

  static async setRandomPassword(workspace : string, user : any) : Promise<string> {
    const password = this.generateRandomPassword()
    await this.setUserPassword(workspace, user, password)
    await this.invalidateUserSessions(workspace, user)
    return password
  }

  static generateRandomPassword() {
    const pass_chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const pass_len = 12;
    let password = ''
    for (let i = 0; i <= pass_len; i++) {
      let rand_num = Math.floor(Math.random() * pass_chars.length);
      password += pass_chars.substring(rand_num, rand_num + 1);
    }
    return password
  }

  static async setUserPassword(workspace: string, user: any, newPassword: string) {
    return await sql`
      UPDATE ${sql(workspace + '.users') } 
      SET password = MD5(${ newPassword }),
          updated_at = NOW()
      WHERE uuid = ${ user.uuid }
      `
  }

  static async invalidateUserSessions(workspace: string, user: any) {
    console.log(`Invalidate all sessions of user: ${user.uuid}`)
    await sql`
      UPDATE ${sql(workspace + '.user_sessions') } 
      SET deleted_at = NOW()
      WHERE user_uuid = ${ user.uuid }
        and deleted_at IS NULL
      `
  }
}
