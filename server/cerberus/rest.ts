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
      await this.handleRequest(req, res)
    })
    app.get('/check_session', async (req : any, res : any) => {
      await this.handleRequest(req, res)
    })
    app.post('/upsert_password', async (req : any, res : any) => {
      await this.handleRequest(req, res)
    })
    app.post('/upsert_password_rand', async (req : any, res : any) => {
      await this.handleRequest(req, res)
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
    if (!user) {
      res.status(401);
      res.send({ message: 'Пользовательский токен не валиден' });
      return
    }

    if (request == 'check_session') {
        res.send(user)
    } 
    else if (request == 'upsert_password') {
      const params = req.body
      if (user.uuid != params.user.uuid) {
        res.status(403);
        res.send({ message: 'Нельзя изменять пароль других пользователей' });
        return
      }
      let ans = await Security.setUserPassword(workspace, params.user, params.password)
      res.send(ans)
    } 
    else if (request == 'upsert_password_rand') {
      let ans = await this.upsertPasswordRand(workspace, user, req, res);
      res.send(ans)
    } 
    else {
      res.status(501)
      res.send("Несуществующий метод")
    }
  }

  private async upsertPasswordRand(workspace: string, user: User, req: any, res: any) {
    if (await Security.checkUserIsAdmin(workspace, user)) {
      if (await this.checkHermesAvailable()) {
        const password = await Security.setRandomPassword(workspace, req.body.user)
        try {
          const hermes_answer = await axios({
            method: "post",
            url: conf.hermesUrl + "/send",
            data: {
              transport: "email",
              recipient: req.body.user.mail,
              title: "Новый пароль Unkaos",
              body: "Ваш новый пароль Unkaos: " + password,
              workspace: workspace
            }
          })
          res.status(hermes_answer.status);
          if (hermes_answer.status == 200) {
            res.send({message: 'Пароль упешно изменён'});
          } else {
            res.send({message: 'Ошибка сброса пароля'});
          }
        } catch(e) {
          console.log('/upsert_password_rand error: ' + JSON.stringify(e))
          res.status(500)
          res.send({message: "Internal Server Error"})
        }
      } else {
        res.status(503)
        res.send({message: "Service Temporarily Unavailable"})
      }
    } else {
      res.status(403);
      res.send({message: 'Данное действие доступно только администратору'});
    }
  }

  private async handleGetToken(req: any, workspace: string, res: any) {
    let email = req.headers.email
    let pass = req.headers.password
    let token = await Security.newToken(workspace, email, pass)
    if (token == null) {
      res.status(401);
      res.send({message: 'Неверное имя пользователя или пароль'});
    } else {
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