import { WebClient } from '@slack/web-api';
import { slackConfig } from '../conf';

class SlackMessage {
  private webClient;

  constructor() {
    this.webClient = new WebClient(slackConfig.token);
  }

  async send(username: string, title: string, body: string) {
    try {
      const userList = await this.webClient.users_list();
      if (userList.ok) {
        const user = userList.members.find(user => user.name === username);
        if(user){
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
