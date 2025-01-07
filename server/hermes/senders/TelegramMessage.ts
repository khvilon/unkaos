import { Bot } from 'grammy';
import UserData from '../UsersData';
import { sql } from "../Sql";
import { createLogger } from '../../server/common/logging';

const logger = createLogger('hermes:telegram');

let telegramConf: any;
let bot: Bot;
const RECONNECT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default class TelegramMessage {
  private userData: UserData;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor(userData: UserData) {
    this.userData = userData;
  }

  private async startBot() {
    try {
      // Handle messages for user registration
      bot.on('message', async (ctx) => {
        if (!ctx.from) return;
        if (!ctx.from.username) return;

        const username = ctx.from.username;
        const telegramId = ctx.from.id.toString();

        await this.userData.setTelegramtId(username, telegramId);
      });

      // Start the bot
      await bot.start();
      
      logger.info({
        msg: 'Telegram bot started successfully'
      });

      // Clear reconnect timeout if bot started successfully
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = null;
      }
    } catch (error: any) {
      logger.error({
        msg: 'Error starting telegram bot',
        error: error.message
      });

      // If error is about conflict with another instance, schedule reconnect
      if (error.error_code === 409) {
        logger.info({
          msg: `Will try to reconnect in ${RECONNECT_INTERVAL/1000} seconds`
        });
        
        this.reconnectTimeout = setTimeout(() => this.init(), RECONNECT_INTERVAL);
      }
    }
  }

  async init() {
    let ans = await sql`SELECT name, value FROM server.configs WHERE service = 'telegram'`

    let ans_dict = ans.reduce((obj: any, item: any) => {
      obj[item.name] = item.value;
      return obj;
    }, {});

    if (!ans_dict.token) {
      logger.warn({
        msg: 'Telegram token not found in config'
      });
      return;
    }

    if (ans_dict.token === '') {
      logger.warn({
        msg: 'Empty telegram token in config'
      });
      return;
    }

    logger.info({
      msg: 'Initializing telegram bot'
    });

    telegramConf = { token: ans_dict.token };
    bot = new Bot(telegramConf.token);

    await this.startBot();
  }

  async send(userId: string, title: string, body: string) {
    if (!bot) return;
    
    const message = title ? `${title}\n\n${body}` : body;
    await bot.api.sendMessage(userId, message);
  }
}
