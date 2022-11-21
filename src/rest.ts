import store from "./stores/index";
import tools from "./tools";
import conf from "./conf";

export default class rest {

  static dict: Map<string, string> = new Map([
    ["read", "get"],
    ["update", "put"],
    ["create", "post"],
    ["delete", "delete"],
    ["upsert", "post"],
  ]);

  static headers: Headers = new Headers({
    "content-type": "application/json",
  });

  static get_subdomain(): string {
    const uri = window.location.href;
    const uri_parts = uri.split(".");
    if (uri_parts.length < 3) return "public";
    if (uri_parts[1] == "unkaos")
      return uri_parts[0].replace("http://", "").replace("https://", "");
    // console.log('ddd', this.$store.state['domain']
    return uri_parts[1];
  }

  static async get_token(email: string, pass: string): Promise<string | null> {
    rest.headers.set("subdomain", rest.get_subdomain());
    rest.headers.set("email", email);
    rest.headers.set("password", pass);
    const options = {
      method: "get",
      headers: rest.headers,
    };
    const resp = await fetch(conf.base_url + "get_token", options);
    if (resp.status != 200) return null;
    const data = await resp.json();
    //rest.headers.token = data.user_token
    localStorage.user_token = data.user_token;
    localStorage.profile = JSON.stringify(data.profile);
    return data;
  }

  static async run_method(method: string, body: any): Promise<any> {
    const alert_id = tools.uuidv4(); //new Date()
    store.state["alerts"][alert_id] = {
      type: "loading",
      status: "new",
      start: new Date(),
    };
    method = method.replace("create", "upsert").replace("update", "upsert");
    rest.headers.set("token", localStorage.user_token);
    rest.headers.set("subdomain", rest.get_subdomain());
    //console.log('hhhh', rest.headers)
    const method_array = tools.split2(method, "_");
    const options = {
      method: rest.dict.get(method_array[0]),
      headers: rest.headers,
      body: undefined,
    };
    if (body != undefined) {
      if (method_array[0] == "read") {
        method += "?";
        for (const i in body) {
          method += i + "=" + body[i] + "&";
        }
      } else {
        if (
          (method_array[1] == "issues" || method_array[1] == "issue") &&
          body.values != undefined
        ) {
          console.log("Run_method: check null values", body);
          for (const i in body.values) {
            if (body.values[i].uuid == null)
              body.values[i].uuid = tools.uuidv4();
          }
        }
        options.body = JSON.stringify(body);
      }
    }
    const resp = await fetch(conf.base_url + method, {
      body: options.body,
      headers: options.headers,
      method: options.method,
    });
    if (resp.status == 401) window.location.href = "/login";
    //console.log('resp.status', resp  )
    if (resp.status != 200) {
      store.state["alerts"][alert_id].text = resp.statusText + " >>";
      store.state["alerts"][alert_id].type = "error";
      return null;
    }
    //console.log('respppppppp', resp)
    const data = await resp.json();
    if (data[1] != undefined) return data[1].rows;
    store.state["alerts"][alert_id].type = "ok";
    return data.rows;
  }
}
