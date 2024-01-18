import nodemailer from 'nodemailer';
import {sql} from "../Sql";

let emailConf: any;

class MailSender {
  private transport: any;

  constructor() {
    this.init()
  }

  async init(){
    let ans = await sql`SELECT name, value FROM server.configs WHERE service = 'email'`
            
    let ans_dict = ans.reduce((obj: any, item: any) => {
      obj[item.name] = item.value;
      return obj;
    }, {});

    emailConf = {
      transport: {
        service: ans_dict.service,
        auth: {
            user: ans_dict.user,
            pass: ans_dict.pass,
        }
      },
      from: ans_dict.from,
    };

    if(!ans_dict.service || !ans_dict.user || !ans_dict.pass) return;

    this.transport = nodemailer.createTransport(emailConf.transport);
  }

  async send(address: string, title: string, body: string) {
    if(!this.transport) {
      console.log('email service not configured');
      return;
    }

    // Определяем, содержит ли тело сообщения HTML-теги
    const isHtml = /<\/?[a-z][\s\S]*>/i.test(body);
  
    const message = {
      from: emailConf.from,
      to: address,
      subject: title,
      text: isHtml ? "Для просмотра сообщения используйте почтовый клиент, поддерживающий HTML." : body,
      html: isHtml ? body : null
    };
  
    try {
      await this.transport.sendMail(message);
      console.log(`Email sent to ${address}`);
      return {status:2}
    } catch (err) {
      let errMsg = `Error sending email: ${err}`
      console.log(errMsg);
      return {status:-1, status_details: errMsg}
    }
  }
}

export default MailSender;





/*var mail:any = {}

const { info } = require('console')
    const nodemailer = require('nodemailer')

    mail.user = 'n@khvilon.ru'
    mail.pass = 'gezzcrrexqdhmmbz'

    mail.user = 'info@unkaos.ru'
    mail.pass = 'info.unkaos.pass'
    mail.pass = 'uixfypcrqoquclbr'

    

    mail.transporter = nodemailer.createTransport({
        service: "yandex",
        auth: {
            user: mail.user,
            pass: mail.pass
        }
    })

    mail.send = async function(to:string, subject:string, text:string, html:string)
    { 
        let result = await mail.transporter.sendMail({
            from: '"Unkaos" <' + mail.user + '>',
            to: to,
            subject: subject,
            text: text,
            html: html,
          })
          
          console.log('result mail', result)
    }

module.exports = mail*/
