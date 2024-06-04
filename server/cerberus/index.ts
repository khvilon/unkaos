
import axios from "axios";
import express from 'express';

import Security from "./security";
import Data from "./data";
import User from "./types/User";

let conf: any;

try {
  const dbConfFile = require('./conf.json');
  conf = dbConfFile;
} catch (error) {
  conf = {
    hermesUrl: process.env.HERMES_URL
  };
}

const app = express()
const port = 3005

export default class Rest {

  data: Data = new Data();

  async init() {
    await this.data.init();
    app.use(express.json({limit: '150mb'}));
    app.use(express.raw({limit: '150mb'}));
    app.use(express.urlencoded({limit: '150mb', extended: true}));
    app.get('/get_token', async (req : any, res : any) => {
      this.handleRequest(req, res)
    })
    app.get('/check_session', async (req : any, res : any) => {
      this.handleRequest(req, res)
    })
    app.post('/upsert_password', async (req : any, res : any) => {
      this.handleRequest(req, res)
    })
    app.post('/upsert_password_rand', async (req : any, res : any) => {
      this.handleRequest(req, res)
    })
    app.listen(port, async () => {
      console.log(`Cerberus running on port ${port}`)
    })
  }

  private async handleRequest(req : any, res : any) {

    const workspace: string = req.headers.subdomain

    if (workspace == undefined || workspace == '') {
      res.status(400);
      res.send({ message: 'Необходим заголовок subdomain в качестве workspace' });
      return
    }

    const request = req.url.split('/')[1]

    if (request == 'get_token') {
      await this.handleGetToken(req, workspace, res);
      return
    } 
    
    const token = req.headers.token
    if (!token) {
      res.status(401);
      res.send({ message: 'Требуется токен авторизации' });
      return
    }

    const user = await this.data.checkSession(workspace, token)

    console.log('>>>>>>>>>>>>test', user, workspace, token)
    if (!user) {
      res.status(401);
      res.send({ message: 'Пользовательский токен не валиден' });
      return
    }

    let isAdmin = this.data.isAdmin(workspace, user.uuid);
    let allow = isAdmin || this.data.checkPermission(workspace, user.uuid, req.headers.request_function);
    let self = (user.uuid == req.body.user?.uuid);
    if(req.headers.request_function == 'upsert_user') allow = self || allow;
    else if(req.headers.request_function == 'upsert_password') allow = self

    console.log('>>>>>>>>>>>>test', user, req.headers.request_function, request, allow)

    if(!allow){
        res.status(403);
        res.send({ message: 'Forbidden' });
        return
    }

    if (request == 'check_session') {
        user.is_admin = isAdmin;
        res.send(user)
    } 
    else if (request == 'upsert_password') {
      await Security.setUserPassword(workspace, user, req.body.password)
      res.send({})
    } 
    else if (request == 'upsert_password_rand') {
      this.upsertPasswordRand(workspace, req.body.user, req, res);
    } 
    else {
      res.status(501)
      res.send("Несуществующий метод")
    }
  }

  private async upsertPasswordRand(workspace: string, user: User, req: any, res: any) {

    if (!await this.checkHermesAvailable()) {
        res.status(503)
        res.send({message: "Service Temporarily Unavailable"})
        return;
    }

    const password = await Security.setRandomPassword(workspace, user)

    try {
        const hermes_answer = await axios({
            method: "post",
            url: conf.hermesUrl + "/send",
            data: {
                transport: "email",
                recipient: req.body.user.mail,
                title: "Новый пароль Unkaos",
                body: `
                <html>
                <body>
                    <p>Здравствуйте!</p>
                    <p>Ваш новый пароль Unkaos: ${password}</p> 
                    <br>
                    <p>Задачи вашего рабочего пространства:</p>
                    <p><a href='https://${process.env.DOMAIN}/${workspace}/issues'></p>
                    <br>
                    <p>С уважением,<br/>Команда Unkaos</p>
                </body>
                </html>`,
                workspace: workspace
            }
        })


        

        res.status(hermes_answer.status);
        if (hermes_answer.status == 200) {
            res.send({message: 'Пароль упешно изменён'});
        } else {
            res.send({message: 'Ошибка сброса пароля'});
        }
    } 
    catch(e) {
        console.log('/upsert_password_rand error: ' + JSON.stringify(e))
        res.status(500)
        res.send({message: "Internal Server Error"})
    }
      
  }

  private async handleGetToken(req: any, workspace: string, res: any) {
    let email = req.headers.email
    let pass = req.headers.password
    let token = await Security.newToken(workspace, email, pass)
    if (token == null) {
      res.status(401);
      res.send({message: 'Неверное имя пользователя или пароль'});
    } 
    else {
      res.send(token)
    }
  }

  private async checkHermesAvailable() : Promise<boolean> {
    try {
      const hermes_answer = await axios.get(conf.hermesUrl + "/ping")
      return (hermes_answer?.data?.status == "OK")
    } catch (e) {
      return false
    }
  }

}


new Rest().init()
