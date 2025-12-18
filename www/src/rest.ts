import store from "./stores/index";
import tools from "./tools";
import conf from "./conf";
import cache from "./cache";

/**
 * REST API Client for Zeus2
 * 
 * Supports both legacy API format (read_*, upsert_*, delete_*) 
 * and new REST v2 format (/api/v2/*)
 */
export default class rest {

  static workspace: string = "public";
  
  // API version: 'v1' uses Gateway, 'v2' uses Zeus2 directly
  static apiVersion: 'v1' | 'v2' = 'v1';
  
  static setWorkspace(sub: string) {
    this.workspace = sub;
  }

  // Legacy action to HTTP method mapping
  static dict: Map<string, string> = new Map([
    ["read", "GET"],
    ["update", "PUT"],
    ["create", "POST"],
    ["delete", "DELETE"],
    ["upsert", "POST"],
  ]);

  static headers: Headers = new Headers({
    "content-type": "application/json"
  });

  /**
   * Convert snake_case entity to kebab-case for REST paths
   * e.g., issue_statuses -> issue-statuses
   */
  static toKebabCase(entity: string): string {
    return entity.replace(/_/g, '-');
  }

  /**
   * Build REST v2 URL from legacy method name
   * read_workflows -> GET /api/v2/workflows
   * upsert_issue_statuses -> POST /api/v2/issue-statuses
   */
  static buildRestUrl(method: string, body?: any, query?: Record<string, any>): {
    httpMethod: string;
    url: string;
  } {
    const parts = method.split('_');
    const action = parts[0];
    const entityParts = parts.slice(1);
    const entity = this.toKebabCase(entityParts.join('_'));
    
    let httpMethod = this.dict.get(action) || 'GET';
    let url = `${conf.base_url}api/v2/${entity}`;
    
    // Handle UUID in path for single-item operations
    if (action === 'read' && body?.uuid) {
      url += `/${body.uuid}`;
    } else if (action === 'update' && body?.uuid) {
      url += `/${body.uuid}`;
    } else if (action === 'delete' && body?.uuid) {
      url += `/${body.uuid}`;
    } else if (action === 'upsert') {
      if (body?.is_new === true || !body?.uuid) {
        httpMethod = 'POST';
      } else {
        httpMethod = 'PUT';
        if (body?.uuid) {
          url += `/${body.uuid}`;
        }
      }
    }
    
    // Add query parameters for read operations
    if (action === 'read' && query) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    
    return { httpMethod, url };
  }

  /**
   * Make a REST v2 API call
   */
  static async callV2(
    method: string, 
    body?: any, 
    query?: Record<string, any>
  ): Promise<any> {
    const alert_id = tools.uuidv4();
    store.state["alerts"][alert_id] = {
      type: "loading",
      status: "new",
      start: new Date(),
      method: method
    };

    // Важно: в REST v2 у нас есть явные POST (create_*) и PUT (update_*) хэндлеры.
    // Нормализация create/update -> upsert ломает кейсы, когда uuid генерируется на клиенте
    // (например, дашборды/гаджеты/избранное): запрос ошибочно уходит в PUT вместо POST.
    
    const { httpMethod, url } = this.buildRestUrl(method, body, query);
    
    // Set headers
    const headers = new Headers({
      "content-type": "application/json",
      "subdomain": this.workspace,
      "token": cache.getString("user_token") || ""
    });

    const options: RequestInit = {
      method: httpMethod,
      headers: headers
    };

    // Add body for non-GET requests
    if (httpMethod !== 'GET' && body) {
      // Handle issues with values
      if (method.includes('issue') && body.values) {
        for (const i in body.values) {
          if (body.values[i].uuid == null) {
            body.values[i].uuid = tools.uuidv4();
          }
        }
      }
      options.body = JSON.stringify(body);
    }

    console.log(`[REST v2] ${httpMethod} ${url}`, { body, query });

    let resp: Response;
    try {
      resp = await fetch(url, options);
    } catch (err) {
      console.error('[REST v2] Network error:', err);
      store.state["alerts"][alert_id].text = "Не удалось выполнить запрос к серверу";
      store.state["alerts"][alert_id].type = "error";
      return null;
    }

    // Handle 401 Unauthorized
    if (resp.status === 401 && !window.location.href.endsWith('/login')) {
      cache.setString('location_before_login', window.location.href);
      window.location.href = '/' + this.workspace + '/login';
      return null;
    }

    // Handle errors
    if (resp.status < 200 || resp.status >= 300) {
      let errorMessage = resp.statusText;
      try {
        const errorData = await resp.json();
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.details?.length > 0) {
          errorMessage += ': ' + errorData.details.map((d: any) => d.message).join(', ');
        }
        console.error('[REST v2] Error response:', errorData);
      } catch {
        // Response is not JSON
      }
      store.state["alerts"][alert_id].text = errorMessage;
      store.state["alerts"][alert_id].type = "error";
      return null;
    }

    // Handle 204 No Content
    if (resp.status === 204) {
      store.state["alerts"][alert_id].type = "ok";
      return [];
    }

    // Parse response
    const data = await resp.json();
    store.state["alerts"][alert_id].type = "ok";

    // Handle both 'rows' and 'items' response formats
    const items = data.rows || data.items || [];

    // Update cached profile if reading users
    if (method === 'read_users' && items.length > 0) {
      const user_uuid = cache.getObject("profile")?.uuid;
      const user = items.find((u: any) => u.uuid === user_uuid);
      if (user) cache.setObject("profile", user);
    }

    return items;
  }

  // ==================== AUTH ====================

  static async get_token(email: string, pass: string): Promise<string | null> {
    rest.headers.set("subdomain", rest.workspace);
    rest.headers.set("email", email);
    rest.headers.set("password", pass);
    const options = {
      method: "get",
      headers: rest.headers,
    };
    console.log('Sending request to:', conf.base_url + "get_token", 'with options:', options);
    const resp = await fetch(conf.base_url + "get_token", options);
    console.log('Response status:', resp.status);
    if (resp.status < 200 || resp.status >= 300) {
      console.log('Error response:', await resp.text());
      return null;
    }
    const responseText = await resp.text();
    console.log('Response text:', responseText);
    const data = JSON.parse(responseText);
    
    cache.setString("user_token", data.user_token);
    cache.setObject("profile", data.profile);
    return data;
  }

  // ==================== REGISTRATION ====================

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

  static async readme(lang: string): Promise<any> {
    let options: RequestInit = {
      method: 'GET',
      headers: rest.headers
    }
    let resp = await fetch(conf.register_url + 'readme?lang=' + lang, options);
    return await resp.json();
  }

  static async version(): Promise<any> {
    let options: RequestInit = {
      method: 'GET',
      headers: rest.headers
    }
    let resp = await fetch(conf.register_url + 'version?dt=' + new Date(), options);
    return await resp.json();
  }

  // ==================== GPT ====================

  static async run_gpt(input: string, command: string, signal: any): Promise<any> {
    let user = cache.getObject("profile");

    let options: any = {
      method: 'GET',
      headers: {workspace: this.workspace}
    }
    if (signal) options.signal = signal;

    let userUuid = user ? user.uuid : '';

    try {
      return fetch(conf.base_url + 'gpt?userInput=' + input + '&userCommand=' + command + '&userUuid=' + userUuid, options);
    } catch (err) {
      return {err: err}
    }
  }

  // ==================== MAIN METHOD ====================

  /**
   * Main API method - routes to v1 (Gateway) or v2 (Zeus2) based on apiVersion
   */
  static async run_method(method: string, body: any): Promise<any> {
    // Special methods that go through Gateway/Cerberus, not Zeus2
    // Check both original and transformed names (update -> upsert)
    const gatewayMethods = ['update_password', 'update_password_rand', 'upsert_password', 'upsert_password_rand'];
    const isGatewayMethod = gatewayMethods.includes(method);
    
    // Use new v2 API (unless it's a gateway-only method)
    if (this.apiVersion === 'v2' && !isGatewayMethod) {
      // Extract query params from body for read operations
      const parts = method.split('_');
      const action = parts[0];
      
      if (action === 'read' && body && !body.uuid) {
        // Body contains query params, not entity data
        return this.callV2(method, undefined, body);
      }
      return this.callV2(method, body);
    }

    // Legacy v1 API via Gateway
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
    const method_array = tools.split2(method, "_");
    const options = {
      method: rest.dict.get(method_array[0]),
      headers: rest.headers,
      body: undefined as string | undefined,
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
        if (method_array[1] == "workflows") {
          console.log("REST: sending workflows request", {
            method: method_array[0],
            workflow_nodes_count: body?.workflow_nodes?.length || 0,
            transitions_count: body?.transitions?.length || 0,
            body_keys: Object.keys(body || {})
          });
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
    } catch (err) {
      console.log('>>>rest err', err)
      store.state["alerts"][alert_id].text = "Не удалось выполнить запрос к серверу >>";
      store.state["alerts"][alert_id].type = "error";
      return null;
    }
    if (resp.status == 401 && !window.location.href.endsWith('/login')) {
      cache.setString('location_before_login', window.location.href);
      window.location.href = '/' + rest.workspace + '/login';
    }
    if (resp.status < 200 || resp.status >= 300) {
      console.log('>>>rest err', resp)
      store.state["alerts"][alert_id].text = resp.statusText + " >>";
      store.state["alerts"][alert_id].type = "error";
      return null;
    }
    
    if (resp.status === 204) {
      store.state["alerts"][alert_id].type = "ok";
      return [];
    }
    
    const data = await resp.json();
    if (data[1] != undefined) return data[1].rows;
    store.state["alerts"][alert_id].type = "ok";

    if (method == 'read_users') {
      let user_uuid = cache.getObject("profile").uuid;
      let user = data.rows.find((u: any) => u.uuid == user_uuid)
      if (user) cache.setObject("profile", user);
    }

    return data.rows;
  }

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Read entities
   */
  static async read(entity: string, query?: Record<string, any>): Promise<any[]> {
    return this.callV2(`read_${entity}`, undefined, query);
  }

  /**
   * Read single entity by UUID
   */
  static async readOne(entity: string, uuid: string): Promise<any> {
    const rows = await this.callV2(`read_${entity}`, { uuid });
    return rows?.[0] || null;
  }

  /**
   * Create entity
   */
  static async create(entity: string, data: any): Promise<any> {
    return this.callV2(`upsert_${entity}`, { ...data, is_new: true });
  }

  /**
   * Update entity
   */
  static async update(entity: string, uuid: string, data: any): Promise<any> {
    return this.callV2(`upsert_${entity}`, { ...data, uuid, is_new: false });
  }

  /**
   * Delete entity
   */
  static async delete(entity: string, uuid: string): Promise<any> {
    return this.callV2(`delete_${entity}`, { uuid });
  }
}
