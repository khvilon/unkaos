/*
import { Client, Session } from "whatsapp-web.js";

let whatsappConf: any;

try {
  const { whatsappConfig } = require('../conf');
  whatsappConf = whatsappConfig;
} catch (error) {
  whatsappConf = {
    phoneNumber: process.env.WHATSAPP_PHONE,
    qrCode: process.env.WHATSAPP_CODE,
  };
}

class WhatsappMessage {
  private client;
  private session;

  constructor() {
    this.session = new Session();
    this.client = new Client({ session: this.session });
    this.session.setAuthCredentials({
      phoneNumber: whatsappConf.phoneNumber,
      qrCode: whatsappConf.qrCode,
    });
  }

  async send(username: string, title: string, body: string) {
    try {
      await this.client.initialize();
      const user = await this.client.getContact(username);
      if (user) {
        await this.client.sendMessage(user.id._serialized, `${title}\n${body}`);
        console.log(`Message sent to ${username}`);
      } else {
        console.log(`User ${username} not found`);
      }
    } catch (err) {
      console.log(`Error sending message: ${err}`);
    }
  }
}

export default WhatsappMessage;
*/
