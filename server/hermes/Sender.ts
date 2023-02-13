
import MailSender from './senders/MailSender';
import DiscordMessage from './senders/DiscordMessage';
import TelegramMessage from './senders/TelegramMessage';
import UserData from './UsersData';
import { Console } from 'console';


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

  public async send(transport: string, recipient: string, title: string, body: string, workspace: string=''):Promise<any> {
    console.log('Try send', transport, recipient, title, workspace)

    if(!transport)
    {
      this.send('telegram',recipient, title, body, workspace)
      this.send('discord',recipient, title, body, workspace)
      return await this.send('email',recipient, title, body, workspace)
    }

    if(!this.isUUID(recipient) && transport == 'email'){
      if(!this.isValidEmail(recipient)){
        let errMsg = 'Error - email not valid'
        console.log(errMsg) 
        return {status:-1, status_details: errMsg}
      }
      return await this.email.send(recipient, title, body); 
    }

    if(!workspace){
      let errMsg = 'Error - workspace missing'
      console.log(errMsg) 
      return {status:-1, status_details: errMsg}
    }

    if(!this.isUUID(recipient)){
      let errMsg = 'Error - user uuid not valid'
      console.log(errMsg) 
      return {status:-1, status_details: errMsg}
    }

    let user:any = this.userData.getUser(recipient)
    if(!user){
      let errMsg = `Error - user ${recipient} not found`
      console.log(errMsg) 
      return {status:-1, status_details: errMsg}
    }
    
    switch (transport) {
      case 'email':
        return await this.email.send(user.mail, title, body);
      case 'discord':
        if(!user.discord){
          let errMsg = `Error - user ${user.name} has no registered discord`
          console.log(errMsg) 
          return {status:-1, status_details: errMsg}
        }
        if(!user.discord_id){
          let errMsg = `Error - user ${user.name} ${user.discord} is not registered by the discord bot, no message received`
          console.log(errMsg) 
          return {status:-1, status_details: errMsg}
        }
        return await this.discord.send(user.discord_id, title, body);
      case 'telegram':
        if(!user.telegram){
          let errMsg = `Error - user ${user.name} has no registered telegram`
          console.log(errMsg) 
          return {status:-1, status_details: errMsg}
        }
        if(!user.telegram_id){
          let errMsg = `Error - user ${user.name} ${user.telegram} is not registered by the telegram bot, no message received`
          console.log(errMsg) 
          return {status:-1, status_details: errMsg}
        }
        return await this.telegram.send(user.telegram_id, title, body);
      default:
        let errMsg = `Invalid transport: ${transport}`
        console.log(errMsg);
        return {status:-1, status_details: errMsg}
    }
  }
}

export default Sender;
