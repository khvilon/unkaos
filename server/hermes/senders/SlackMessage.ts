import {UsersListResponse, WebClient} from '@slack/web-api';
import {Member} from "@slack/web-api/dist/response/UsersListResponse";

let slackConf: any;

try {
  const { slackConfig } = require('../conf');
  slackConf = slackConfig;
} catch (error) {
  slackConf = {
    token: process.env.SLACK_TOKEN
  };
}

class SlackMessage {
  private webClient : WebClient;

  constructor() {
    this.webClient = new WebClient(slackConf.token);
  }

  async send(username: string, title: string, body: string) {
    try {
      const userList: UsersListResponse = await this.webClient.users.list();
      if (userList !== undefined && userList.ok) {
        const user: Member | undefined = userList.members?.find((user: Member) => user.name === username);
        if (user !== undefined && user.id !== undefined) {
          await this.webClient.chat.postMessage({
            channel: user.id,
            text: `${title}\n${body}`
          });
          console.log(`Message sent to ${username}`);
        } else {
          console.log(`User ${username} not found`);
        }
      }
    } catch (err) {
      console.log(`Error sending message: ${err}`);
    }
  }
}

export default SlackMessage;
