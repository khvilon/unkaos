import TelegramBot from 'node-telegram-bot-api';
import UserData from '../UsersData';
import {sql} from "../Sql";

let telegramConf: any;

//var id = 228803942
class TelegramMessage {
  private bot: any;

  constructor(userData: UserData) {
    this.init(userData);
  }

  async init(userData: UserData) {
    const ans = await sql`SELECT value FROM admin.config WHERE service = 'telegram' AND name = 'token'`;
    telegramConf = { token: ans[0].value };

    this.bot = new TelegramBot(telegramConf.token, { polling: true });
    let me = this

    this.bot.onText(/.*?/, async (msg: any, match: any) => {
      if(!msg.from) return
      if(!msg.from.username) return

      const username = msg.from.username//.toLowerCase();
      const telegramId = msg.from.id.toString();
      let added = await userData.setTelegramtId(username, telegramId)
      let ans = 'ваш телеграм добавлен в список'
      if(!added) ans = 'пользователь с вашим телеграм именем не найден в базе Unkaos или не требует обновления ID'
      me.bot.sendMessage(telegramId, username + ', ' + ans);
    });

    console.log('telegram bot up')
  }

  async send(userId: string, title: string, body: string) {

    console.log('userId', userId)
    try{ 
      await this.bot.sendMessage(userId, `${title}\n${body}`) 
      console.log(`Message sent to telegram user ${userId}`) 
      return {status: 2}
    } 
    catch(err){ 
      let errMsg = `Error sending telegram msg ${err}`
      console.log(errMsg) 
      return {status:-1, status_details: errMsg}
    }
  }
}

export default TelegramMessage;
