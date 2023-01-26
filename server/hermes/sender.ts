
import Email from './senders/email';
import DiscordMessage from './senders/discord';
import TelegramMessage from './senders/telegram';
import UserData from './users_data';
import { Console } from 'console';


class Sender {
  private email;
  private discord;
  private telegram;
  private userData;

  constructor() {
    this.userData = new UserData()
    this.email = new Email();
    this.discord = new DiscordMessage(this.userData);
    this.telegram = new TelegramMessage(this.userData);
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
    await this.userData.init()
  }

  public send(transport: string, recipient: string, title: string, body: string, workspace: string='') {
    console.log('Try send', transport, recipient, title, workspace)

    if(!this.isUUID(recipient) && transport == 'email'){
      if(!this.isValidEmail(recipient)){
        console.log('Error - email not valid')
        return
      }
      this.email.send(recipient, title, body);
    }

    if(!workspace){
      console.log('Error - workspace missing')
      return
    }

    if(!this.isUUID(recipient)){
      console.log('Error - user uuid not valid')
      return
    }

    let user:any = this.userData.getUser(recipient)
    if(!user){
      console.log('Error - user', recipient, 'not found')
      return
    }
    
    switch (transport) {
      case 'email':
        this.email.send(user.mail, title, body);
        break;
      case 'discord':
        if(!user.discord){
          console.log('User', user.name, 'has no registered discord')
          return
        }
        if(!user.discord_id){
          console.log('User', user.name, user.discord, 'is not registered by the bot, no message received')
          return
        }
        this.discord.send(user.discord_id, title, body);
        break;
      case 'telegram':
        if(!user.telegram){
          console.log('User', user.name, 'has no registered telegram')
          return
        }
        if(!user.telegram_id){
          console.log('User', user.name, user.telegram, 'is not registered by the bot, no message received')
          return
        }
        this.telegram.send(user.telegram_id, title, body);
        break;
      default:
        console.log(`Invalid transport: ${transport}`);
    }
  }
}

export default new Sender();
