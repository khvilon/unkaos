import store from "./stores/index";
import tools from "./tools";
import conf from "./conf";
import cache from "./cache";

const adminRoleUUID = '556972a6-0370-4f00-aca2-73a477e48999'

export default class rest {

  static workspace: string = "public"; // Default value
  
  static setWorkspace(sub: string) {
    this.workspace = sub;
  }

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

  static async get_token(email: string, pass: string): Promise<string | null> {
    rest.headers.set("subdomain", rest.workspace);
    rest.headers.set("email", email);
    rest.headers.set("password", pass);
    const options = {
      method: "get",
      headers: rest.headers,
    };
    const resp = await fetch(conf.base_url + "get_token", options);
    if (resp.status != 200) return null;
    const data = await resp.json();
    
    cache.setString("user_token", data.user_token);
    cache.setObject("profile", data.profile);
    return data;
  }


  static async register_workspace_request(workspace: String, email: String): Promise<any> {
    let options: RequestInit = {
      method: 'POST',
      headers: rest.headers,
      body: JSON.stringify({workspace: workspace, email: email})
    }
    let resp = await fetch(conf.register_url + 'upsert_workspace_requests', options);
    return await resp.json();
  }

  static async register_workspace(uuid: String): Promise<any> {
    let options: RequestInit = {
      method: 'GET',
      headers: rest.headers
    }
    let resp = await fetch(conf.register_url + 'read_workspace_requests?uuid=' + uuid, options);
    return await resp.json();
  }


  static async run_gpt(input: string, command: string): Promise<any> {
    //return null;//todo
    let user = cache.getObject("profile");

    try{

    
        //const response = await fetch('http://localhost:3010/gpt?userInput=' + this.userInput  + '&userUuid=' + user.uuid, {
        return fetch(conf.base_url + 'gpt?userInput=' + input  + '&userCommand=' + command  + '&userUuid=' + user.uuid, {
          method: 'GET',
          headers: {workspace: this.workspace}
        });
    }
    catch(err){
      return {err: err}
    }
  }

  static async run_method(method: string, body: any): Promise<any> {

    console.log('rw>>>>>>>', rest.workspace)
    const alert_id = tools.uuidv4();
    store.state["alerts"][alert_id] = {
      type: "loading",
      status: "new",
      start: new Date(),
      method: method
    };
    method = method.replace("create", "upsert").replace("update", "upsert");
    rest.headers.set("token", cache.getString("user_token"));
    rest.headers.set("subdomain", rest.workspace);
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
    let resp;
    try {
      resp = await fetch(conf.base_url + method, {
        body: options.body,
        headers: options.headers,
        method: options.method,
      });
    }
    catch(err){
      console.log('>>>rest err', err)
      store.state["alerts"][alert_id].text =  "Не удалось выполнить запрос к серверу >>";
      store.state["alerts"][alert_id].type = "error";
      return null;
    }
    if (resp.status == 401 && !window.location.href.endsWith('/login')) window.location.href = '/' + rest.workspace + '/login';
    //console.log('resp.status', resp  )
    if (resp.status != 200) {
      console.log('>>>rest err', resp)
      store.state["alerts"][alert_id].text = resp.statusText + " >>";
      store.state["alerts"][alert_id].type = "error";
      return null;
    }
    //console.log('respppppppp', resp)
    const data = await resp.json();
    if (data[1] != undefined) return data[1].rows;
    store.state["alerts"][alert_id].type = "ok";

    if(method == 'read_users'){
      let user_uuid = cache.getObject("profile").uuid;
      let user = data.rows.find((u:any)=>u.uuid==user_uuid)
      if(user) cache.setObject("profile", user);
    }

    return data.rows;
  }
}
