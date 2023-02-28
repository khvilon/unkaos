import axios from "axios";
import conf from "./conf.json";
import cors from "cors";
import express from "express";
const app: any = express();
const port = 3001;

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

  for (let i = 0; i < zeus_listeners.data.length; i++) {
    const method = zeus_listeners.data[i].method;
    const func = zeus_listeners.data[i].func;

    app[method]("/" + func, async (req: any, res: any) => {
      //console.log(req)

      req.headers.request_function = func;
      //console.log(req.headers)

      let cerberus_ans;
      try {
        cerberus_ans = await axios({
          method: "get",
          url: conf.cerberusUrl + "/check_session",
          headers: req.headers,
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

      //console.log('cerberus_ans.data', cerberus_ans.data)

      req.headers.user_uuid = cerberus_ans.data.uuid;

      // req.headers.user_name = cerberus_ans.data.name

      const zeus_ans = await axios({
        data: req.body,
        method: method,
        url: conf.zeusUrl + req.url,
        headers: {
          subdomain: req.headers.subdomain,
          user_uuid: cerberus_ans.data.uuid,
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
        headers: req.headers,
      });
      res.status(cerberus_ans.status);
      res.send(cerberus_ans.data);
    } catch (error: any) {
      console.log('/get_token error: '+JSON.stringify(error))
      res.status(error?.response?.status | 500)
      res.send( {message: error?.response?.data?.message ?? 'Internal Server Error' })
    }
  });

  app.post("/upsert_password_rand", async (req: any, res: any) => {

    console.log('upsert_password_rand', req.body)
    try {
      const cerberus_ans = await axios({
        method: "post",
        url: conf.cerberusUrl + "/upsert_password_rand",
        headers: req.headers,
        data: req.body
      })
      res.status(cerberus_ans.status);
      res.send(cerberus_ans.data);
    } catch (error : any) {
      console.log('/upsert_password_rand error: '+JSON.stringify(error))
      res.status(error?.response?.status | 500)
      res.send( {message: error?.response?.data?.message ?? 'Internal Server Error' })
    }
  });

  app.listen(port, async () => {
    console.log(`Gateway running on port ${port}`);
  });
}

init();
