const { Client, GatewayIntentBits, Partials } = require('discord.js');
import UserData from '../UsersData';
import {sql} from "../Sql";
import { createLogger } from '../../server/common/logging';

const logger = createLogger('hermes:discord');

const conf_retry_period = 10 * 1000

let discordConf: any;

class DiscordMessage {
    private client: any;

    constructor(userData: UserData) {
      this.init(userData);
    }

    async init(userData: UserData) {    
      const ans = await sql`SELECT name, value FROM server.configs WHERE service = 'discord'`;
      let ans_dict = ans.reduce((obj: any, item: any) => {
        obj[item.name] = item.value;
        return obj;
      }, {});

      if (!ans_dict.token) {
        logger.warn({
          msg: 'Discord token not found in configs'
        });
        return;
      }
      
      if (ans_dict.token === '') {
        logger.warn({
          msg: 'Discord token is empty'
        });
        return;
      }
       
      discordConf = { token: ans_dict.token };

      this.client = new Client({intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent],
        partials: [Partials.Channel]});
    
        let me = this;

        this.client.on('messageCreate', async (message:any) => {

          if(message.author.bot) return;
          if (!message.guild) return;
          
          const username = message.author.username;
          const discordId = message.author.id;
          
          await userData.setDiscordId(username, discordId);
        });

        try{
          await this.client.login(discordConf.token);
          const botUp = await this.client.isReady();
          if (botUp) {
            logger.info({
              msg: 'Discord bot up'
            });
          } else {
            logger.error({
              msg: 'Unable to start discord bot'
            });
          } 
        }
        catch(err)
        {
          logger.error({
            msg: 'Discord bot failed login',
            error: err
          });
        }
        
    }

    async send(userId: string, title: string, body: string) {
        if(!this.client){
          logger.warn({
            msg: 'Cannot send discord message - not configured'
          });
          return;
        }
        try {
            let user =  await this.client.users.fetch(userId);
            if (!user) {
                logger.warn({
                  msg: 'Discord user not found',
                  userId
                });
                return {status:-1, status_details: 'Discord user not found'};
            }
            const message = title ? `**${title}**\n\n${body}` : body;
            await user.send(message);
            logger.info({
              msg: 'Message sent to discord user',
              userId
            });
            return {status:2}
        } 
        catch (err) {
            logger.error({
              msg: 'Error sending discord message',
              userId,
              error: err
            });
            return {status:-1, status_details: 'Error sending discord message'};
        }
    }
}

export default DiscordMessage;
