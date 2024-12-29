import { Bot } from 'grammy';
import UserData from '../UsersData';
import {sql} from "../Sql";

let telegramConf: any;
let bot: Bot;

export default class TelegramMessage {
  private userData: UserData;

  constructor(userData: UserData) {
    this.userData = userData;
  }

  async init() {
    const conf = await sql`select value from server.configs where service = 'telegram' and name = 'token'`;
    if (!conf.length) {
      console.log('Telegram token not found in config');
      return;
    }
    
    const token = conf[0].value;
    if (!token) {
      console.log('Empty telegram token in config');
      return;
    }
    
    telegramConf = { token };
    console.log('Initializing telegram bot');

    bot = new Bot(telegramConf.token);

    // Handle messages for user registration
    bot.on('message', async (ctx) => {
      if (!ctx.from) return;
      if (!ctx.from.username) return;

      const username = ctx.from.username;
      const telegramId = ctx.from.id.toString();

      await this.userData.setTelegramtId(username, telegramId);
    });

    // Start the bot
    bot.start();
  }

  async send(userId: string, title: string, body: string) {
    if (!bot) return;
    
    const message = title ? `${title}\n\n${body}` : body;
    await bot.api.sendMessage(userId, message);
  }
}
