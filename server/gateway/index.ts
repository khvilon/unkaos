import axios from "axios";
import cors from "cors";
import express from "express";
import { io, Socket } from "socket.io-client";
import { createLogger } from '../server/common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('gateway');
const app: any = express();
const port = 3001;

// Mapping from old API format to REST methods
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
    zeus2Url: process.env.ZEUS2_URL,
    cerberusUrl: process.env.CERBERUS_URL,
    athenaUrl: process.env.ATHENA_URL
  };
}

logger.info({
  msg: 'Initializing Gateway',
  cerberusUrl: conf.cerberusUrl,
  zeusUrl: conf.zeusUrl,
  zeus2Url: conf.zeus2Url
});

// Cerberus Socket
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
  logger.info({ msg: 'Connected to Cerberus', socketId: socket.id });
});

socket.on('disconnect', () => {
  logger.warn({ msg: 'Disconnected from Cerberus' });
});

socket.on('connect_error', (error) => {
  logger.error({ msg: 'Cerberus connection error', error: error.message });
});

// Zeus v1 Socket
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
  logger.info({ msg: 'Connected to Zeus v1', socketId: zeusSocket.id });
});

zeusSocket.on('disconnect', () => {
  logger.warn({ msg: 'Disconnected from Zeus v1' });
});

zeusSocket.on('connect_error', (error) => {
  logger.error({ msg: 'Zeus v1 connection error', error: error.message });
});

// Zeus2 Socket
let zeus2Socket: Socket | null = null;
let zeus2Entities: Set<string> = new Set();

// Mapping: entity name -> REST API base path
const zeus2EntityMapping: Map<string, string> = new Map();

if (conf.zeus2Url) {
  zeus2Socket = io(conf.zeus2Url, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    autoConnect: true,
    forceNew: true
  });

  zeus2Socket.on('connect', () => {
    logger.info({ msg: 'Connected to Zeus2 v2', socketId: zeus2Socket?.id });
  });

  zeus2Socket.on('disconnect', () => {
    logger.warn({ msg: 'Disconnected from Zeus2 v2' });
  });

  zeus2Socket.on('connect_error', (error) => {
    logger.error({ msg: 'Zeus2 v2 connection error', error: error.message });
  });
}

app.use(cors());
app.use(express.json({ limit: "150mb" }));
app.use(express.raw({ limit: "150mb" }));
app.use(express.urlencoded({ limit: "150mb", extended: true }));

// Auth endpoint
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
    logger.error({ msg: 'Get token error', error });
    res.status(500).send({ message: 'Internal Server Error' });
  }
});

/**
 * Converts old-style API call to REST format for Zeus2
 * 
 * Old format: read_workflows, upsert_workflows, delete_workflows
 * New format: GET /api/v2/workflows, PUT /api/v2/workflows/:uuid, DELETE /api/v2/workflows/:uuid
 */
function convertToRestRequest(func: string, method: string, body: any, query: any): {
  restMethod: string;
  restPath: string;
  restBody: any;
} {
  const parts = func.split('_');
  const action = parts[0]; // read, create, update, delete, upsert
  const entityParts = parts.slice(1);
  
  // Convert snake_case to kebab-case for entity name
  // e.g., issue_statuses -> issue-statuses
  const entity = entityParts.join('-').replace(/_/g, '-');
  
  let restMethod = 'get';
  let restPath = `/api/v2/${entity}`;
  let restBody = body;

  switch (action) {
    case 'read':
      restMethod = 'get';
      if (body?.uuid || query?.uuid) {
        restPath = `/api/v2/${entity}/${body?.uuid || query?.uuid}`;
      }
      break;
    
    case 'create':
      restMethod = 'post';
      break;
    
    case 'update':
      restMethod = 'put';
      if (body?.uuid) {
        restPath = `/api/v2/${entity}/${body.uuid}`;
      }
      break;
    
    case 'upsert':
      // Upsert -> Check is_new flag or use PUT/POST accordingly
      if (body?.is_new === true || !body?.uuid) {
        // New record = create via POST
        restMethod = 'post';
        // Don't include uuid in path for POST
      } else {
        // Existing record = update via PUT
        restMethod = 'put';
        if (body?.uuid) {
          restPath = `/api/v2/${entity}/${body.uuid}`;
        }
      }
      break;
    
    case 'delete':
      restMethod = 'delete';
      if (body?.uuid) {
        restPath = `/api/v2/${entity}/${body.uuid}`;
      }
      break;
  }

  return { restMethod, restPath, restBody };
}

/**
 * Converts Zeus2 REST response to old Zeus v1 format
 */
function convertFromRestResponse(restResponse: any): any {
  // If response has 'items' array (collection), wrap in rows
  if (restResponse.items) {
    return {
      rows: restResponse.items.map((item: any) => ({
        table_name: extractTableName(item),
        ...item
      }))
    };
  }
  
  // Single object response
  if (restResponse.uuid) {
    return {
      rows: [{
        table_name: extractTableName(restResponse),
        ...restResponse
      }]
    };
  }
  
  // Error or other response
  return restResponse;
}

function extractTableName(obj: any): string {
  // Try to determine table name from object structure
  if (obj.workflow_nodes !== undefined) return 'workflows';
  if (obj.is_start !== undefined || obj.is_end !== undefined) return 'issue_statuses';
  return 'unknown';
}

/**
 * Check if entity is handled by Zeus2
 * Converts: read_issue_statuses -> issue-statuses
 *           read_workflows -> workflows
 */
function isZeus2Entity(func: string): boolean {
  const parts = func.split('_');
  const entityParts = parts.slice(1);
  // Join with dash and also replace any remaining underscores
  const entity = entityParts.join('-').replace(/_/g, '-');
  const result = zeus2Entities.has(entity);
  
  if (result) {
    logger.debug({ msg: 'Entity matched Zeus2', func, entity });
  }
  
  return result;
}

async function loadZeus2Entities(retries = 5, delay = 2000): Promise<void> {
  if (!conf.zeus2Url) return;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const zeus2_listeners = await axios.get(conf.zeus2Url + "/read_listeners", { timeout: 5000 });
      
      // Extract unique entities from listeners
      for (const listener of zeus2_listeners.data) {
        if (listener.entity) {
          zeus2Entities.add(listener.entity);
          zeus2EntityMapping.set(listener.entity, listener.func);
        }
      }
      
      logger.info({
        msg: 'Loaded Zeus2 entities',
        entities: Array.from(zeus2Entities),
        attempt
      });
      return;
    } catch (error) {
      logger.warn({ 
        msg: `Failed to load Zeus2 entities (attempt ${attempt}/${retries})`, 
        error: (error as any).code || (error as any).message 
      });
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  logger.warn({ msg: 'Zeus2 not available after retries, using Zeus v1 only' });
}

async function init() {
  // Load Zeus2 entities with retry
  await loadZeus2Entities();

  // Load Zeus v1 listeners
  const zeus_listeners = await axios.get(conf.zeusUrl + "/read_listeners");

  for (let i = 0; i < zeus_listeners.data.length; i++) {
    const method = zeus_listeners.data[i].method;
    const func = zeus_listeners.data[i].func;
    
    logger.debug({
      msg: 'Registering handler',
      function: func,
      method: method
    });

    const handler = async (req: any, res: any) => {
      req.headers.request_function = func;
      const requestId = randomUUID();
      const traceId = randomUUID();

      logger.info({
        msg: 'Incoming request',
        function: func,
        subdomain: req.headers.subdomain,
        method: req.method
      });

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
            // Determine which backend to use (check at request time, not registration time)
            const useZeus2 = isZeus2Entity(func);
            
            if (useZeus2 && zeus2Socket) {
              // Convert to REST format and send to Zeus2
              const { restMethod, restPath, restBody } = convertToRestRequest(
                func, 
                method, 
                req.body, 
                req.query
              );

              logger.info({
                msg: 'Routing to Zeus2',
                function: func,
                restMethod,
                restPath,
                subdomain: req.headers.subdomain
              });

              zeus2Socket.emit('request', {
                method: restMethod,
                url: restPath,
                headers: {
                  subdomain: req.headers.subdomain,
                  user_uuid: response.data.uuid,
                  is_admin: response.data.is_admin,
                  'x-request-id': requestId,
                  'x-trace-id': traceId
                },
                body: restBody
              }, (zeus2_ans: any) => {
                logger.debug({
                  msg: 'Zeus2 response',
                  status: zeus2_ans.status,
                  path: restPath
                });
                
                // Convert response back to old format for compatibility
                const convertedResponse = convertFromRestResponse(zeus2_ans.data);
                
                res.status(zeus2_ans.status);
                res.send(convertedResponse);
              });

            } else {
              // Use Zeus v1
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
                  msg: 'Zeus v1 response',
                  status: zeus_ans.status,
                  url: req.url
                });
                res.status(zeus_ans.status);
                res.send(zeus_ans.data);
              });
            }

          } catch (error) {
            logger.error({ msg: 'Backend request error', error });
            res.status(500).send({ message: 'Internal Server Error' });
          }
        });
      } catch (error) {
        logger.error({ msg: 'Check session error', error });
        res.status(500).send({ message: 'Internal Server Error' });
      }
    };

    // Register handler
    if (method === 'get') app.get("/" + func, handler);
    else if (method === 'post') app.post("/" + func, handler);
    else if (method === 'put') app.put("/" + func, handler);
    else if (method === 'delete') app.delete("/" + func, handler);
  }
  
  // Register Zeus2-only entity handlers
  // These are entities that exist in Zeus2 but not in Zeus v1
  const registeredFuncs = new Set(zeus_listeners.data.map((l: any) => l.func));
  const zeus2OnlyMethods = ['read', 'create', 'update', 'upsert', 'delete'];
  
  for (const entity of zeus2Entities) {
    for (const action of zeus2OnlyMethods) {
      // Convert kebab-case entity to snake_case for func name
      const entitySnake = entity.replace(/-/g, '_');
      const func = `${action}_${entitySnake}`;
      
      // Skip if already registered from Zeus v1
      if (registeredFuncs.has(func)) continue;
      
      const method = action === 'read' ? 'get' : 'post';
      
      logger.debug({
        msg: 'Registering Zeus2-only handler',
        function: func,
        method: method,
        entity: entity
      });
      
      const handler = async (req: any, res: any) => {
        req.headers.request_function = func;
        const requestId = randomUUID();
        const traceId = randomUUID();
        
        logger.info({
          msg: 'Incoming Zeus2-only request',
          function: func,
          method: req.method,
          url: req.url,
          subdomain: req.headers.subdomain
        });
        
        try {
          socket.emit('check_session', {
            token: req.headers.token,
            subdomain: req.headers.subdomain,
            request_function: func
          }, async (response: any) => {
            if (response.status !== 200) {
              res.status(response.status);
              res.send(response.data);
              return;
            }
            
            try {
              // Convert to REST format and send to Zeus2
              const { restMethod, restPath, restBody } = convertToRestRequest(
                func,
                method,
                req.body,
                req.query
              );
              
              logger.info({
                msg: 'Routing Zeus2-only to Zeus2',
                function: func,
                restMethod,
                restPath,
                subdomain: req.headers.subdomain
              });
              
              if (!zeus2Socket) {
                logger.error({ msg: 'Zeus2 socket not available' });
                res.status(503).send({ message: 'Zeus2 service unavailable' });
                return;
              }
              
              zeus2Socket.emit('request', {
                method: restMethod,
                url: restPath,
                headers: {
                  subdomain: req.headers.subdomain,
                  user_uuid: response.data.uuid,
                  is_admin: response.data.is_admin,
                  'x-request-id': requestId,
                  'x-trace-id': traceId
                },
                body: restBody,
                query: req.query
              }, (zeus2_ans: any) => {
                logger.debug({
                  msg: 'Zeus2-only response',
                  status: zeus2_ans.status,
                  url: restPath
                });
                
                // Convert response back to old format for compatibility
                const convertedResponse = convertFromRestResponse(zeus2_ans.data);
                
                res.status(zeus2_ans.status);
                res.send(convertedResponse);
              });
              
            } catch (error) {
              logger.error({ msg: 'Zeus2-only backend request error', error });
              res.status(500).send({ message: 'Internal Server Error' });
            }
          });
        } catch (error) {
          logger.error({ msg: 'Zeus2-only check session error', error });
          res.status(500).send({ message: 'Internal Server Error' });
        }
      };
      
      // Register handler
      if (method === 'get') app.get("/" + func, handler);
      else app.post("/" + func, handler);
      
      registeredFuncs.add(func);
    }
  }
  
  logger.info({
    msg: 'Gateway initialization complete',
    zeus1Methods: zeus_listeners.data.length,
    zeus2Entities: Array.from(zeus2Entities),
    totalRegistered: registeredFuncs.size
  });
}

// Password handlers
let upsert_password = async function (req: any, res: any, rand: boolean = true) {
  const request = req.url.split('/')[1];
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
    logger.error({ msg: 'Password update error', error });
    res.status(500).send({ message: 'Internal Server Error' });
  }
}

app.post("/upsert_password", async (req: any, res: any) => {
  await upsert_password(req, res, false);
});

app.post("/upsert_password_rand", async (req: any, res: any) => {
  await upsert_password(req, res, true);
});

// Health check
app.get("/health", (req: any, res: any) => {
  res.json({
    status: 'ok',
    service: 'gateway',
    zeus2_entities: Array.from(zeus2Entities)
  });
});

app.listen(port, () => {
  logger.info({ msg: `Gateway running on port ${port}` });
});

init();
