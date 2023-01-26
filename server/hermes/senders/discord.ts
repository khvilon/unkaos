import { discordConfig } from '../conf';
const { Client, GatewayIntentBits } = require('discord.js');
import UserData from '../users_data';

class DiscordMessage {
    private client;

    constructor(userData: UserData) {
      this.client = new Client({intents: [GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessages]});
      this.client.login(discordConfig.token);
        let me = this;

        this.client.on('message', async (message:any) => {

          console.log('mmm', message)
            if (!message.author.username) return;

            const username = message.author.username;
            const discordId = message.author.id;
            let added = await userData.setDiscordId(username, discordId);
            let ans = 'Your Discord ID has been added to the list.';
            if (!added) ans = 'User with your Discord username was not found in Unkaos database or does not require ID update.';
            message.reply(username + ', ' + ans);
        });

        this.client.login(discordConfig.token);
        console.log('discord bot up');
    }

    async send(userId: string, title: string, body: string) {
        try {
            let user = this.client.users.cache.get(userId);
            if (!user) return console.log(`Error sending discord msg, user not found`);
            user.send(`${title}\n${body}`);
        } catch (err) {
            console.log(`Error sending discord msg`, err);
        }
    }
}

export default DiscordMessage;


