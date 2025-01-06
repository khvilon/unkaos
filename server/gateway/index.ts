import axios from "axios";
import cors from "cors";
import express from "express";
import { createLogger } from '../server/common/logging';

const logger = createLogger('gateway');
const app: any = express();
const port = 3001;

const restMethodDict: any = {
  read: "get",
  create: "post",
  update: "put",
  delete: "delete",
  upsert: "post"
};

let conf: any;
try {
  const confFile = require('./conf.json');
  conf = confFile;
} catch (error) {
  conf = {
    zeusUrl: process.env.ZEUS_URL,
    cerberusUrl: process.env.CERBERUS_URL,
    athenaUrl: process.env.ATHENA_URL
  };
}

try {
  app.use(cors());
  app.use(express.json({ limit: "150mb" }));
  app.use(express.raw({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));
} catch (err) {
  logger.error({
    msg: 'Failed to initialize app',
    error: err
  });
}

async function init() {
  const zeus_listeners = await axios.get(conf.zeusUrl + "/read_listeners");

  for (let i = 0; i < zeus_listeners.data.length; i++) {
    const method = zeus_listeners.data[i].method;
    const func = zeus_listeners.data[i].func;

    logger.debug({
      msg: 'Registering function handler',
      function: func,
      method: method
    });

    const handler = async (req: any, res: any) => {
      req.headers.request_function = func;

      let user_uuid = ''

      let cerberus_ans;
      try {
        cerberus_ans = await axios({
          method: "get",
          url: conf.cerberusUrl + "/check_session",
          headers: { token: req.headers.token, subdomain: req.headers.subdomain, request_function: req.headers.request_function },
          validateStatus: function (status) {
            return true;
          },
        });
      } catch (err) {
        logger.error({
          msg: 'Check session error',
          error: err,
          subdomain: req.headers.subdomain
        });
        if (cerberus_ans != undefined) {
          res.status(cerberus_ans.status);
          res.send(cerberus_ans.data);
        } else {
          res.status(401);
          res.send({ message: "Ошибка авторизации" });
        }
        return;
      }

      if (cerberus_ans == undefined) {
        logger.warn({
          msg: 'Authentication failed - undefined response',
          subdomain: req.headers.subdomain
        });
        res.status(401);
        res.send({ message: "Ошибка авторизации" });
        return;
      }

      if (cerberus_ans.status != 200) {
        logger.warn({
          msg: 'Authentication failed - invalid status',
          status: cerberus_ans.status,
          subdomain: req.headers.subdomain
        });
        res.status(cerberus_ans.status);
        res.send(cerberus_ans.data);
        return;
      }
      req.headers.user_uuid = cerberus_ans.data.uuid;
      user_uuid = cerberus_ans.data.uuid;

      logger.debug({
        msg: 'Authenticated request',
        function: func,
        userId: user_uuid,
        subdomain: req.headers.subdomain
      });

      const zeus_ans = await axios({
        data: req.body,
        method: method,
        url: conf.zeusUrl + req.url,
        headers: {
          subdomain: req.headers.subdomain,
          user_uuid: user_uuid,
          is_admin: cerberus_ans.data.is_admin
        },
      });

      logger.info({
        msg: 'Request processed',
        function: func,
        method: method,
        userId: user_uuid,
        subdomain: req.headers.subdomain,
        status: zeus_ans.status
      });

      res.status(zeus_ans.status);
      res.send(zeus_ans.data);
    };

    app[method]("/" + func, handler);

    // Разделяем строку на две части: операцию и имя таблицы
    const parts = func.split('_');
    const oper = parts[0];
    const tableName = parts.slice(1).join('_');
    
    if (!oper) continue;
    const restMethod = restMethodDict[oper];
    if (restMethod) {
      logger.debug({
        msg: 'Registering REST endpoint',
        operation: oper,
        table: tableName,
        method: restMethod,
        path: "/v2/" + tableName
      });
      app[restMethod]("/v2/" + tableName, handler);
    }
  }

  app.get("/get_token", async (req: any, res: any) => {
    try {
      const cerberus_ans = await axios({
        method: "get",
        url: conf.cerberusUrl + "/get_token",
        headers: {
          subdomain: req.headers.subdomain,
          email: req.headers.email,
          password: req.headers.password
        },
      });

      logger.info({
        msg: 'Token request processed',
        subdomain: req.headers.subdomain,
        email: req.headers.email,
        status: cerberus_ans.status
      });

      res.status(cerberus_ans.status);
      res.send(cerberus_ans.data);
    } catch (error: any) {
      logger.error({
        msg: 'Get token error',
        error: error,
        subdomain: req.headers.subdomain,
        email: req.headers.email
      });
      res.status(error?.response?.status ?? 500)
      res.send({ message: error?.response?.data?.message ?? 'Internal Server Error' })
    }
  });

  let upsert_password = async function (req: any, res: any, rand: boolean = true) {
    const request = req.url.split('/')[1]
    logger.debug({
      msg: 'Password update request',
      type: request,
      subdomain: req.headers.subdomain
    });

    req.headers.request_function = request;

    try {
      const cerberus_ans = await axios({
        method: "post",
        url: conf.cerberusUrl + "/" + request,
        headers: req.headers,
        data: req.body
      })

      logger.info({
        msg: 'Password update successful',
        type: request,
        subdomain: req.headers.subdomain
      });

      res.status(cerberus_ans.status);
      res.send(cerberus_ans.data);
    } catch (error: any) {
      logger.error({
        msg: 'Password update error',
        type: request,
        error: error,
        subdomain: req.headers.subdomain
      });
      res.status(error?.response?.status ?? 500)
      res.send({ message: error?.response?.data?.message ?? 'Internal Server Error' })
    }
  }

  app.post("/upsert_password_rand", async (req: any, res: any) => {
    upsert_password(req, res)
  });

  app.post("/upsert_password", async (req: any, res: any) => {
    upsert_password(req, res, false)
  });

  app.get("/gpt", async (req: any, res: any) => {
    try {
      const cerberus_ans = await axios({
        method: "get",
        url: conf.cerberusUrl + "/check_session",
        headers: { token: req.headers.token, subdomain: req.headers.subdomain, request_function: 'gpt' },
        validateStatus: function (status) {
          return true;
        },
      });

      if (!cerberus_ans || cerberus_ans.status !== 200) {
        logger.warn({
          msg: 'GPT authentication failed',
          status: cerberus_ans?.status,
          subdomain: req.headers.subdomain
        });
        res.status(cerberus_ans?.status ?? 401);
        res.send(cerberus_ans?.data ?? { message: "Ошибка авторизации" });
        return;
      }

      const athena_ans = await axios({
        method: 'get',
        url: conf.athenaUrl + req.url,
        headers: {
          workspace: req.headers.workspace,
          user_uuid: cerberus_ans.data.uuid,
        },
      });

      logger.info({
        msg: 'GPT request processed',
        userId: cerberus_ans.data.uuid,
        workspace: req.headers.workspace,
        subdomain: req.headers.subdomain,
        status: athena_ans.status
      });

      res.status(athena_ans.status);
      res.send(athena_ans.data);
    } catch (error: any) {
      logger.error({
        msg: 'GPT request error',
        error: error,
        subdomain: req.headers.subdomain,
        workspace: req.headers.workspace
      });
      res.status(error?.response?.status ?? 500);
      res.send({ message: error?.response?.data?.message ?? 'Internal Server Error' });
    }
  });

  app.listen(port, async () => {
    logger.info({
      msg: 'Gateway server started',
      port: port
    });
  });
}

init();
