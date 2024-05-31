import {sql} from "./Sql";
import tools from "../tools";

let conf: any;

try {
  const { config } = require('./conf');
  conf = config;
} catch (error) {
  conf = {
    base_url: process.env.BASE_URL
  };
}

class Watchers {

  constructor() {
  }


  private async handleNotify(row:any, { command, relation, key, old }: any){

    if(command != 'insert' || relation.table != 'logs_done') return
    if(row.table_name == 'issue' && row.table_name == 'issue_actions') return

    
    

    let issue_url = conf.base_url + 'issue/'
    let title, body, issue_uuid
    if(row.table_name == 'issue'){
      issue_uuid = row.target_uuid
      body = ''
    } 
    else{
      let actions = await sql`SELECT issue_uuid, value FROM ${sql(relation.schema + '.issue_actions') } 
        WHERE uuid = ${row.target_uuid}`
      if(!actions || actions.length != 1) return
      issue_uuid = actions[0].issue_uuid
      const maxValueLen = 80
      body = 'Комментарий: ' + actions[0].value.toString().substring(0, maxValueLen)
      if (body.length == maxValueLen) body+='...'
      body+='\r\n'
    }

    let watchers = await sql`SELECT user_uuid FROM ${sql(relation.schema + '.watchers') } WHERE issue_uuid = ${issue_uuid}`
    if(!watchers || watchers.length < 1) return


    let infos = await sql`SELECT 
      p.short_name || '-' || i.num AS num,
      title
      FROM ${sql(relation.schema + '.issues') } i 
      LEFT JOIN ${sql(relation.schema + '.projects') } p 
      ON p.uuid = i.project_uuid
      WHERE i.uuid = ${issue_uuid}`

    
    if(!infos || infos.length != 1) return
    issue_url += infos[0].num
    if(row.table_name == 'issue_actions') issue_url += '#action' + row.target_uuid
    title = 'Задача ' + infos[0].num + (row.table_name == 'issue' ? ' изменена ' : ' прокомментирована ')

    body = 'Название: ' + infos[0].title + '\r\n' + body + issue_url
    
    let authors = await sql`SELECT name
    FROM ${sql(relation.schema + '.users') } u 
    WHERE u.uuid = ${row.user_uuid}`
    if(!authors || authors.length != 1) return

    title += authors[0].name

    for(let i = 0; i < watchers.length; i++){
      if(watchers[i].user_uuid == row.user_uuid) continue

      let ins = await sql`INSERT INTO 
      ${sql(relation.schema + '.msg_out') }
      (uuid, transport, recipient, title, body)
      VALUES (
        ${tools.uuidv4()}, 
        '', 
        ${watchers[i].user_uuid}, 
         ${title}, 
        ${body})`;
    }

    //let project = await sql`SELECT user_uuid FROM ${sql(relation.schema + '.watchers') } WHERE issue_uuid = ${issue_uuid}`


    /*
    let title = ''
    if(row.table_name == 'issue'){
      title = 'Изменения по задаче ' + row 
    }*/

  }


  private handleSubscribeConnect(){
    console.log('subscribe watchers connected!')
}

  public async init() {
    await sql.subscribe('insert', this.handleNotify.bind(this), () => this.handleSubscribeConnect())
  }    

}

export default Watchers