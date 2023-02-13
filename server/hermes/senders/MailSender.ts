
import { emailConfig } from '../conf';
import nodemailer from 'nodemailer';

class MailSender {
  private transport;

  constructor() {
    this.transport = nodemailer.createTransport(emailConfig.transport);
  }

  async send(address: string, title: string, body: string) {
    const message = {
      from: emailConfig.from,
      to: address,
      subject: title,
      text: body
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