import {WebClient} from '@slack/web-api';
import {sql} from "../Sql";
import {createLogger} from '../../server/common/logging';

const logger = createLogger('hermes:slack');

let slackConf: any;

class SlackMessage {
  private webClient : WebClient;

  constructor() {
    this.init()
  }

  async init(){
    const ans = await sql`SELECT value FROM server.configs WHERE service = 'slack' AND name = 'token'`;
    slackConf = { token: ans[0].value };
    this.webClient = new WebClient(slackConf.token);
  }

  async send(username: string, title: string, body: string) {
    if (!this.webClient) return;

    try {
      const userList: UsersListResponse = await this.webClient.users.list();
      if (userList !== undefined && userList.ok) {
        const user: Member | undefined = userList.members?.find((user: Member) => user.name === username);
        if (user !== undefined && user.id !== undefined) {
          await this.webClient.chat.postMessage({
            channel: user.id,
            text: `${title}\n${body}`
          });
          logger.info({
            msg: 'Message sent',
            to: username
          });
        } else {
          logger.warn({
            msg: 'User not found',
            username
          });
        }
      }
    } catch (err) {
      logger.error({
        msg: 'Error sending message',
        username,
        error: err
      });
    }
  }
}

export default SlackMessage;
