const { Client, GatewayIntentBits, Partials } = require('discord.js');
import UserData from '../UsersData';
import {sql} from "../Sql";

const conf_retry_period = 10 * 1000

let discordConf: any;

class DiscordMessage {
    private client: any;

    constructor(userData: UserData) {
      this.init(userData);
    }

    async init(userData: UserData) {    
      const ans = await sql`SELECT value FROM server.configs WHERE service = 'discord' AND name = 'token'`;
      discordConf = { token: ans[0].value };

      if(!discordConf.token) return;
       
      this.client = new Client({intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.MessageContent],
        partials: [Partials.Channel]});
    
        let me = this;

        this.client.on('messageCreate', async (message:any) => {

          if(message.author.bot) return;
          console.log('mmm', message.channel.type)
          if (message.channel.type !== 1) return;
         // console.log('mmm', message)
            if (!message.author.username) return;
            
            const username = message.author.username;
            const discordId = message.author.id;
            let added = await userData.setDiscordId(username, discordId);
            let ans = 'Your Discord ID has been added to the list.';
            if (!added) ans = 'User with your Discord username was not found in Unkaos database or does not require ID update.';
            message.reply(username + ', ' + ans);
        });

        try{
          let botUp = this.client.login(discordConf.token);
          if(botUp) console.log('discord bot up');
          else {
            console.log('unable discord bot up');
            this.client = null;
          } 
        }
        catch(err)
        {
          console.log('discord bot failed login', err);
        }
        
    }

    async send(userId: string, title: string, body: string) {
        if(!this.client){
          console.log('cant send discord - not configured');
          return;
        }
        try {
            let user =  await this.client.users.fetch(userId);
            if (!user) {
                console.log(`Error sending discord msg, user not found`); 
                return {status:-1, status_details: 'Discord u not found'}
            }
            await user.send(`**${title}**\n${body}`);
            console.log(`Message sent to discord user`);
            return {status:2}
        } 
        catch (err) {
            let errMsg = `Error sending discord msg ${err}`
            console.log(errMsg) 
            return {status:-1, status_details: errMsg}
        }
    }
}

export default DiscordMessage;


