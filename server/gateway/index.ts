import axios from "axios";
import cors from "cors";
import express from "express";
import { io } from "socket.io-client";
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

// Инициализация Socket.IO клиента с правильным URL
logger.info({
  msg: 'Initializing Socket.IO client',
  url: conf.cerberusUrl
});

const socket = io(conf.cerberusUrl, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: ['polling', 'websocket'],
  path: '/socket.io',
  autoConnect: true,
  forceNew: true
});

socket.on('connect', () => {
  logger.info({
    msg: 'Connected to Cerberus via Socket.IO',
    socketId: socket.id
  });
});

socket.on('disconnect', () => {
  logger.warn({
    msg: 'Disconnected from Cerberus'
  });
});

socket.on('connect_error', (error) => {
  logger.error({
    msg: 'Socket.IO connection error',
    error: error.message,
    description: error
  });
});

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

app.get("/get_token", async (req: any, res: any) => {
  try {
    socket.emit('get_token', {
      subdomain: req.headers.subdomain,
      email: req.headers.email,
      password: req.headers.password
    }, (response: any) => {
      res.status(response.status);
      res.send(response.data);
    });
  } catch (error: any) {
    logger.error({
      msg: 'Get token error',
      error: error,
      subdomain: req.headers.subdomain,
      email: req.headers.email
    });
    res.status(500);
    res.send({ message: 'Internal Server Error' });
  }
});

// Добавляем Socket.IO клиент для Zeus
const zeusSocket = io(conf.zeusUrl, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  transports: ['polling', 'websocket'],
  path: '/socket.io',
  autoConnect: true,
  forceNew: true
});

zeusSocket.on('connect', () => {
  logger.info({
    msg: 'Connected to Zeus',
    socketId: zeusSocket.id
  });
});

zeusSocket.on('disconnect', () => {
  logger.warn({
    msg: 'Disconnected from Zeus'
  });
});

zeusSocket.on('connect_error', (error) => {
  logger.error({
    msg: 'Zeus connection error',
    error: error.message,
    description: error
  });
});

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

      try {
        socket.emit('check_session', {
          token: req.headers.token,
          subdomain: req.headers.subdomain,
          request_function: req.headers.request_function
        }, async (response: any) => {
          if (response.status !== 200) {
            res.status(response.status);
            res.send(response.data);
            return;
          }

          try {
            zeusSocket.emit('request', {
              method: method,
              url: req.url,
              headers: {
                subdomain: req.headers.subdomain,
                user_uuid: response.data.uuid,
                is_admin: response.data.is_admin
              },
              body: req.body
            }, (zeus_ans: any) => {
              logger.debug({
                msg: 'Zeus response received',
                status: zeus_ans.status,
                url: req.url
              });
              res.status(zeus_ans.status);
              res.send(zeus_ans.data);
            });
          } catch (error) {
            logger.error({
              msg: 'Zeus request error',
              error: error,
              subdomain: req.headers.subdomain
            });
            res.status(500);
            res.send({ message: 'Internal Server Error' });
          }
        });
      } catch (error) {
        logger.error({
          msg: 'Check session error',
          error: error,
          subdomain: req.headers.subdomain
        });
        res.status(500);
        res.send({ message: 'Internal Server Error' });
      }
    };

    if (method === 'get') {
      app.get("/" + func, handler);
    } else if (method === 'post') {
      app.post("/" + func, handler);
    } else if (method === 'put') {
      app.put("/" + func, handler);
    } else if (method === 'delete') {
      app.delete("/" + func, handler);
    }
  }
}

async function handleRequest(req: any, res: any, user: any) {
  try {
    const athena_ans = await axios({
      method: restMethodDict[req.headers.request_function.split("_")[0]],
      url: conf.athenaUrl + "/" + req.headers.request_function,
      headers: { ...req.headers, user: JSON.stringify(user) },
      data: req.body,
      validateStatus: function (status) {
        return true;
      },
    });

    res.status(athena_ans.status);
    res.send(athena_ans.data);
  } catch (err) {
    logger.error({
      msg: 'Request to Athena failed',
      error: err,
      function: req.headers.request_function
    });
    res.status(500);
    res.send({ message: "Internal Server Error" });
  }
}

let upsert_password = async function (req: any, res: any, rand: boolean = true) {
  const request = req.url.split('/')[1];
  logger.debug({
    msg: 'Password update request',
    type: request,
    subdomain: req.headers.subdomain
  });

  try {
    socket.emit(request, {
      subdomain: req.headers.subdomain,
      token: req.headers.token,
      password: req.body.password,
      user: req.body.user
    }, (response: any) => {
      res.status(response.status);
      res.send(response.data);
    });
  } catch (error: any) {
    logger.error({
      msg: 'Password update error',
      type: request,
      error: error,
      subdomain: req.headers.subdomain
    });
    res.status(500);
    res.send({ message: 'Internal Server Error' });
  }
}

app.listen(port, () => {
  logger.info({
    msg: `Gateway running on port ${port}`
  });
});

init();
