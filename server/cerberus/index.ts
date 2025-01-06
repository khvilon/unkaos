import axios from "axios";
import express from 'express';
import { createLogger } from '../server/common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('cerberus');

import Security from "./security";
import Data from "./data";
import User from "./types/User";

const conf = require('./conf.json')

export default class Rest {
  private data: Data = new Data()

  public async init() {
    await this.data.init()
    const app = express()
    app.use(express.json())
    app.use(express.raw({limit: '150mb'}));
    app.use(express.urlencoded({limit: '150mb', extended: true}));

    logger.info({
      msg: 'Cerberus service starting up...'
    });

    app.get('/get_token', async (req: any, res: any) => {
      this.handleRequest(req, res)
    })

    app.get('/check_session', async (req: any, res: any) => {
      this.handleRequest(req, res)
    })

    app.post('/upsert_password', async (req: any, res: any) => {
      this.handleRequest(req, res)
    })

    app.post('/upsert_password_rand', async (req: any, res: any) => {
      this.handleRequest(req, res)
    })

    const port = 3005;
    app.listen(port, () => {
      logger.info({
        msg: `Cerberus running on port ${port}`
      });
    })
  }

  private async handleRequest(req: any, res: any) {
    const requestId = randomUUID();
    try {
      const workspace: string = req.headers.subdomain;

      logger.info({
        msg: 'Incoming request',
        requestId,
        workspace, 
        method: req.method, 
        path: req.path,
        url: req.url,
        headers: {
          ...req.headers,
          // Не логируем чувствительные данные
          authorization: req.headers.authorization ? '[FILTERED]' : undefined,
          password: req.headers.password ? '[FILTERED]' : undefined,
          token: req.headers.token ? '[FILTERED]' : undefined
        },
        query: req.query,
        // Не логируем тело запроса, если оно содержит пароль
        body: req.body && !req.body.password ? req.body : '[FILTERED]',
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      if (workspace == undefined || workspace == '') {
        const error = 'Необходим заголовок subdomain в качестве workspace';
        logger.warn({
          msg: 'Request rejected',
          requestId,
          error
        });
        res.status(400);
        res.send({ message: error });
        return;
      }

      const request = req.url.split('/')[1];

      if (request == 'get_token') {
        await this.handleGetToken(req, workspace, res);
        return;
      }

      const token = req.headers.token;
      if (!token) {
        const error = 'Требуется токен авторизации';
        logger.warn({
          msg: 'Authentication failed',
          requestId,
          error
        });
        res.status(401);
        res.send({ message: error });
        return;
      }

      const user = await this.data.checkSession(workspace, token);
      logger.debug({
        msg: 'Session check',
        requestId,
        workspace,
        userId: user?.uuid,
        authenticated: !!user 
      });

      if (!user) {
        const error = 'Пользовательский токен не валиден';
        logger.warn({
          msg: 'Authentication failed',
          requestId,
          error
        });
        res.status(401);
        res.send({ message: error });
        return;
      }

      let isAdmin = this.data.isAdmin(workspace, user.uuid);
      let allow = isAdmin || this.data.checkPermission(workspace, user.uuid, req.headers.request_function);
      let self = (user.uuid == req.body.user?.uuid);
      if (request == 'upsert_user') allow = self || allow;
      else if (request == 'upsert_password') allow = self;

      logger.debug({
        msg: 'Permission check',
        requestId,
        userId: user.uuid,
        request,
        isAdmin,
        allow,
        self,
        requestFunction: req.headers.request_function
      });

      if (!allow) {
        const error = 'Доступ запрещен';
        logger.warn({
          msg: 'Access denied',
          requestId, 
          error,
          userId: user.uuid,
          request,
          isAdmin 
        });
        res.status(403);
        res.send({ message: error });
        return;
      }

      // Логируем успешное начало обработки запроса
      logger.info({
        msg: 'Processing request',
        requestId,
        userId: user.uuid,
        request,
        isAdmin
      });

      if (request == 'check_session') {
        user.is_admin = isAdmin;
        res.send(user);
        logger.info({
          msg: 'Request completed',
          requestId,
          status: 200
        });
      } else if (request == 'upsert_password') {
        await Security.setUserPassword(workspace, user, req.body.password);
        res.send({});
        logger.info({
          msg: 'Password updated',
          requestId,
          userId: user.uuid,
          status: 200
        });
      } else if (request == 'upsert_password_rand') {
        await this.upsertPasswordRand(workspace, user, req, res, requestId);
        logger.info({
          msg: 'Random password set',
          requestId,
          userId: user.uuid
        });
      } else {
        const error = 'Несуществующий метод';
        logger.warn({
          msg: 'Invalid request',
          requestId,
          error,
          request
        });
        res.status(501);
        res.send(error);
      }
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      logger.error({
        msg: 'Request failed',
        requestId,
        path: req.path,
        error,
        stack: e instanceof Error ? e.stack : undefined
      });
      res.status(500);
      res.send({ message: "Internal Server Error" });
    }
  }

  private async upsertPasswordRand(workspace: string, user: User, req: any, res: any, requestId: string) {
    if (!await this.checkHermesAvailable()) {
      const error = "Service Temporarily Unavailable";
      logger.warn({
        msg: 'Hermes service unavailable',
        requestId,
        error
      });
      res.status(503);
      res.send({message: error});
      return;
    }

    const password = await Security.setRandomPassword(workspace, user);

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
              <p><a href='https://${process.env.DOMAIN}/${workspace}/issues'>https://${process.env.DOMAIN}/${workspace}/issues</a></p>
              <br>
              <p>С уважением,<br/>Команда Unkaos</p>
          </body>
          </html>`,
          workspace: workspace
        }
      });

      res.status(hermes_answer.status);
      if (hermes_answer.status == 200) {
        res.send({message: 'Пароль упешно изменён'});
      } else {
        res.send({message: 'Ошибка сброса пароля'});
      }
    } 
    catch(e) {
      const error = e instanceof Error ? e.message : String(e);
      logger.error({
        msg: 'Error in upsert_password_rand',
        requestId,
        error,
        stack: e instanceof Error ? e.stack : undefined
      });
      res.status(500);
      res.send({message: "Internal Server Error"});
    }
  }

  private async handleGetToken(req: any, workspace: string, res: any) {
    let email = req.headers.email
    let pass = req.headers.password
    logger.debug({
      msg: 'Processing token request',
      workspace,
      email
    });
    let token = await Security.newToken(workspace, email, pass)
    logger.debug({
      msg: 'Token generation result',
      success: !!token
    });
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
