import MailSender from './senders/MailSender';
import DiscordMessage from './senders/DiscordMessage';
import TelegramMessage from './senders/TelegramMessage';
import UserData from './UsersData';
import {sql} from "./Sql";
import { createLogger } from '../server/common/logging';

const logger = createLogger('hermes:sender');

class Sender {
  private email;
  private discord;
  private telegram;
  private userData;

  constructor() {
    this.userData = new UserData()
    this.email = new MailSender();
    this.discord = new DiscordMessage(this.userData);
    this.telegram = new TelegramMessage(this.userData);

    sql.subscribe('*', this.updateSender.bind(this), this.handleSubscribeConnect.bind(this))
  }

  private handleSubscribeConnect(){
    logger.info({
      msg: 'Database subscription connected'
    });
  }

  private async updateSender(row:any, { command, relation, key, old }: any){
    if(relation.table != 'configs' || relation.schema != 'server') return;

    logger.info({
      msg: 'Updating sender configuration',
      service: row.service,
      command
    });

    if(row.service == 'email') {
      this.email = new MailSender();
      logger.info({
        msg: 'Email sender reinitialized'
      });
    }
    if(row.service == 'discord') {
      this.discord = new DiscordMessage(this.userData);
      logger.info({
        msg: 'Discord sender reinitialized'
      });
    }
    if(row.service == 'telegram') {
      this.telegram = new TelegramMessage(this.userData);
      logger.info({
        msg: 'Telegram sender reinitialized'
      });
    }
  }

  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return emailRegex.test(email);
  }

  public async init(){
    logger.info({
      msg: 'Initializing sender components'
    });

    await this.userData.init();
    await this.email.init();
    await this.discord.init(this.userData);
    await this.telegram.init();

    logger.info({
      msg: 'Sender components initialized successfully'
    });
  }

  public async send(transport: string, recipient: string, title: string, body: string, workspace: string=''):Promise<any> {
    logger.debug({
      msg: 'Attempting to send message',
      transport,
      recipient,
      title,
      workspace
    });

    if(!transport) {
      logger.debug({
        msg: 'No transport specified, sending to all available transports'
      });
      this.send('telegram', recipient, title, body, workspace);
      this.send('discord', recipient, title, body, workspace);
      return await this.send('email', recipient, title, body, workspace);
    }

    if(!this.isUUID(recipient) && transport == 'email'){
      if(!this.isValidEmail(recipient)){
        const errMsg = 'Invalid email address';
        logger.error({
          msg: errMsg,
          email: recipient
        });
        return {status:-1, status_details: errMsg};
      }
      logger.debug({
        msg: 'Sending direct email',
        recipient
      });
      return await this.email.send(recipient, title, body); 
    }

    if(!workspace){
      const errMsg = 'Workspace missing';
      logger.error({
        msg: errMsg,
        transport,
        recipient
      });
      return {status:-1, status_details: errMsg};
    }

    if(!this.isUUID(recipient)){
      const errMsg = 'Invalid user UUID';
      logger.error({
        msg: errMsg,
        transport,
        recipient
      });
      return {status:-1, status_details: errMsg};
    }

    let user:any = this.userData.getUser(recipient, workspace);
    if(!user){
      const errMsg = `User not found`;
      logger.error({
        msg: errMsg,
        transport,
        recipient,
        workspace
      });
      return {status:-1, status_details: errMsg};
    }
    
    switch (transport) {
      case 'email':
        logger.debug({
          msg: 'Sending email',
          user: user.name,
          email: user.mail
        });
        return await this.email.send(user.mail, title, body);

      case 'discord':
        if(!user.discord){
          const errMsg = 'User has no registered Discord account';
          logger.error({
            msg: errMsg,
            user: user.name
          });
          return {status:-1, status_details: errMsg};
        }
        if(!user.discord_id){
          const errMsg = 'User not registered with Discord bot';
          logger.error({
            msg: errMsg,
            user: user.name,
            discord: user.discord
          });
          return {status:-1, status_details: errMsg};
        }
        logger.debug({
          msg: 'Sending Discord message',
          user: user.name,
          discord: user.discord
        });
        return await this.discord.send(user.discord_id, title, body);

      case 'telegram':
        if(!user.telegram){
          const errMsg = 'User has no registered Telegram account';
          logger.error({
            msg: errMsg,
            user: user.name
          });
          return {status:-1, status_details: errMsg};
        }
        if(!user.telegram_id){
          const errMsg = 'User not registered with Telegram bot';
          logger.error({
            msg: errMsg,
            user: user.name,
            telegram: user.telegram
          });
          return {status:-1, status_details: errMsg};
        }
        logger.debug({
          msg: 'Sending Telegram message',
          user: user.name,
          telegram: user.telegram
        });
        return await this.telegram.send(user.telegram_id, title, body);

      default:
        const errMsg = `Invalid transport`;
        logger.error({
          msg: errMsg,
          transport
        });
        return {status:-1, status_details: errMsg};
    }
  }
}

export default Sender;
