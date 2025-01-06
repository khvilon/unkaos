import {sql} from "./Sql";
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '../server/common/logging';

const logger = createLogger('hermes:watchers');

let conf: any;

try {
  const { config } = require('./conf');
  conf = config;
  logger.debug({
    msg: 'Loaded configuration from file',
    base_url: conf.base_url
  });
} catch (error) {
  conf = {
    base_url: process.env.BASE_URL
  };
  logger.debug({
    msg: 'Using default configuration',
    base_url: conf.base_url
  });
}

class Watchers {

  constructor() {
  }

  private async handleNotify(row:any, { command, relation, key, old }: any){
    if(command != 'insert' || relation.table != 'logs_done') {
      logger.debug({
        msg: 'Skipping notification',
        command,
        table: relation.table
      });
      return;
    }
    
    if(row.table_name == 'issue' && row.table_name == 'issue_actions') {
      logger.debug({
        msg: 'Skipping issue notification',
        table_name: row.table_name
      });
      return;
    }

    logger.debug({
      msg: 'Processing notification',
      workspace: relation.schema,
      table_name: row.table_name,
      target_uuid: row.target_uuid
    });

    let issue_url = conf.base_url + 'issue/';
    let title, body, issue_uuid;
    
    if(row.table_name == 'issue'){
      issue_uuid = row.target_uuid;
      body = '';
    } else {
      let actions = await sql`SELECT issue_uuid, value FROM ${sql(relation.schema + '.issue_actions') } 
        WHERE uuid = ${row.target_uuid}`;
      if(!actions || actions.length != 1) {
        logger.debug({
          msg: 'No matching action found',
          target_uuid: row.target_uuid
        });
        return;
      }
      issue_uuid = actions[0].issue_uuid;
      const maxValueLen = 80;
      body = 'Комментарий: ' + actions[0].value.toString().substring(0, maxValueLen);
      if (body.length == maxValueLen) body+='...';
      body+='\r\n';
    }

    let watchers = await sql`SELECT user_uuid FROM ${sql(relation.schema + '.watchers') } WHERE issue_uuid = ${issue_uuid}`;
    if(!watchers || watchers.length < 1) {
      logger.debug({
        msg: 'No watchers found',
        issue_uuid
      });
      return;
    }

    logger.debug({
      msg: 'Found watchers',
      issue_uuid,
      count: watchers.length
    });

    let infos = await sql`SELECT 
      p.short_name || '-' || i.num AS num,
      title
      FROM ${sql(relation.schema + '.issues') } i 
      LEFT JOIN ${sql(relation.schema + '.projects') } p 
      ON p.uuid = i.project_uuid
      WHERE i.uuid = ${issue_uuid}`;

    if(!infos || infos.length != 1) {
      logger.debug({
        msg: 'Issue info not found',
        issue_uuid
      });
      return;
    }

    issue_url += infos[0].num;
    if(row.table_name == 'issue_actions') issue_url += '#action' + row.target_uuid;
    title = 'Задача ' + infos[0].num + (row.table_name == 'issue' ? ' изменена ' : ' прокомментирована ');

    body = 'Название: ' + infos[0].title + '\r\n' + body + issue_url;
    
    let authors = await sql`SELECT name
    FROM ${sql(relation.schema + '.users') } u 
    WHERE u.uuid = ${row.user_uuid}`;
    if(!authors || authors.length != 1) {
      logger.debug({
        msg: 'Author not found',
        user_uuid: row.user_uuid
      });
      return;
    }

    title += authors[0].name;

    logger.debug({
      msg: 'Sending notifications',
      issue_uuid,
      title,
      watchers_count: watchers.length
    });

    for(let i = 0; i < watchers.length; i++){
      if(watchers[i].user_uuid == row.user_uuid) {
        logger.debug({
          msg: 'Skipping notification for author',
          user_uuid: row.user_uuid
        });
        continue;
      }

      let notification_uuid = uuidv4();
      logger.debug({
        msg: 'Creating notification',
        notification_uuid,
        user_uuid: watchers[i].user_uuid,
        issue_uuid
      });

      let ins = await sql`INSERT INTO 
      ${sql(relation.schema + '.msg_out') }
      (uuid, transport, recipient, title, body)
      VALUES (
        ${notification_uuid}, 
        '', 
        ${watchers[i].user_uuid}, 
        ${title}, 
        ${body})`;
    }
  }

  private handleSubscribeConnect(){
    logger.info({
      msg: 'Database subscription connected for watchers'
    });
  }

  public async init() {
    logger.info({
      msg: 'Initializing watchers'
    });
    await sql.subscribe('insert', this.handleNotify.bind(this), () => this.handleSubscribeConnect());
    logger.info({
      msg: 'Watchers initialized'
    });
  }    
}

export default Watchers;