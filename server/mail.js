    var mail = {}

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

    


    mail.send = async function(to, subject, text, html)
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


module.exports = mail