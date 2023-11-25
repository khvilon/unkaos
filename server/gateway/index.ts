import axios from "axios";
import cors from "cors";
import express from "express";
const app: any = express();
const port = 3001;

let conf: any;
try {
  const confFile = require('./conf.json');
  conf = confFile;
} catch (error) {
  conf = {
    zeusUrl:process.env.ZEUS_URL,
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
  console.log("Cant init app");
}

async function init() {
  const zeus_listeners = await axios.get(conf.zeusUrl + "/read_listeners");
  //console.log("Zeus listeners loaded: ")
  //console.table(zeus_listeners.data)

  for (let i = 0; i < zeus_listeners.data.length; i++) {
    const method = zeus_listeners.data[i].method;
    const func = zeus_listeners.data[i].func;

    console.log('func', func)

    app[method]("/" + func, async (req: any, res: any) => {
      //console.log(req)

      req.headers.request_function = func;
      //console.log(req.headers)

      let user_uuid = ''

      let cerberus_ans;
      try {
        cerberus_ans = await axios({
          method: "get",
          url: conf.cerberusUrl + "/check_session",
          headers: { token: req.headers.token, subdomain: req.headers.subdomain },
          validateStatus: function (status) {
            return true; // Разрешить, только если код состояния меньше 500
          },
        });
      } catch (err) {
        console.log("Check session error: "+JSON.stringify(err));
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
        res.status(401);
        res.send({ message: "Ошибка авторизации" });
        return;
      }

      if (cerberus_ans.status != 200) {
        res.status(cerberus_ans.status);
        res.send(cerberus_ans.data);
        return;
      }
      req.headers.user_uuid = cerberus_ans.data.uuid;
      user_uuid = cerberus_ans.data.uuid;
    

      const zeus_ans = await axios({
        data: req.body,
        method: method,
        url: conf.zeusUrl + req.url,
        headers: {
          subdomain: req.headers.subdomain,
          user_uuid: user_uuid
        },
      });
      res.status(zeus_ans.status);
      res.send(zeus_ans.data);
    });
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
      res.status(cerberus_ans.status);
      res.send(cerberus_ans.data);
    } catch (error: any) {
      console.log('/get_token error: '+JSON.stringify(error))
      res.status(error?.response?.status ?? 500)
      res.send({ message: error?.response?.data?.message ?? 'Internal Server Error' })
    }
  });


  let upsert_password = async function(req: any, res: any, rand: boolean = true){
    const request = req.url.split('/')[1]
    console.log(request, req.body)

    try {
      const cerberus_ans = await axios({
        method: "post",
        url: conf.cerberusUrl + "/" + request,
        headers: req.headers,
        data: req.body
      })
      res.status(cerberus_ans.status);
      res.send(cerberus_ans.data);
    } catch (error : any) {
      console.log(request + ' error: '+JSON.stringify(error))
      res.status(error?.response?.status ?? 500)
      res.send( {message: error?.response?.data?.message ?? 'Internal Server Error' })
    }
  }

  app.post("/upsert_password_rand", async (req: any, res: any) => {
    upsert_password(req, res)
  });

  app.post("/upsert_password", async (req: any, res: any) => {
    upsert_password(req, res, false)
  });

  app.get("/gpt", async (req: any, res: any) => {
    // TODO protect this method with cerberus
    const athena_ans = await axios({
      method: 'get',
      url: conf.athenaUrl + req.url,
      headers: {
        subdomain: req.headers.subdomain,
        user_uuid: '-',
      },
    });

    res.status(athena_ans.status);
    res.send(athena_ans.data);
  });

  app.listen(port, async () => {
    console.log(`Gateway running on port ${port}`);
  });
}

init();
