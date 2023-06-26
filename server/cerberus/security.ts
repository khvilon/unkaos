import tools from "../tools";
import sql from "./sql";

const jwt = require('jsonwebtoken');
const key = 'shhhhh'

export default class Security {

  static async newToken(workspace : String, email : String, pass : String) {
    let users = await this.fetchUser(workspace, email, pass)
    console.log(email, pass)
    if(!users || users.length != 1) return null
    let user_data = { uuid: users[0].uuid }
    let token = jwt.sign(user_data, key)
    let ans = await sql`INSERT INTO  ${sql(workspace + '.user_sessions') } (uuid, user_uuid, token) 
        values( ${ tools.uuidv4() }, ${ users[0].uuid }, MD5(${ token }))`
    return {user_token: token, profile: users[0]}
  }

  private static async fetchUser(workspace: String, email: String, pass: String) {
    return sql`
      SELECT * FROM  ${sql(workspace + '.users')}  
      WHERE mail=${email} 
      AND password = MD5(${pass}) 
      AND deleted_at IS NULL AND active
    `;
  }

  static async setPassword(workspace : String, user : any, newPassword : String) {
    sql`UPDATE  ${sql(workspace + '.users') } SET password = MD5(${ newPassword }) WHERE uuid=${ user.uuid }`
  }

  static async checkUserIsAdmin(workspace: string, user: any) : Promise<boolean> {
    const roles = await sql`SELECT r.name FROM ${sql(workspace + '.users')} u 
        INNER JOIN ${sql(workspace + '.users_to_roles')} ur on u.uuid = ur.users_uuid
        INNER JOIN ${sql(workspace + '.roles')} r on ur.roles_uuid = r.uuid
        WHERE u.uuid=${ user.uuid }`
    return (roles.find((role: any) => role.name == 'Администратор') !== undefined)
  }

  static async setRandomPassword(workspace : String, user : any) : Promise<string> {
    const password = this.generateRandomPassword()
    await this.setPassword(workspace, user, password)
    return password
  }

  static generateRandomPassword () {
    const pass_chars = "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const pass_len = 12;
    let password = ''
    for (var i = 0; i <= pass_len; i++) {
      let rand_num = Math.floor(Math.random() * pass_chars.length);
      password += pass_chars.substring(rand_num, rand_num +1);
    }
    return password
  }
}
