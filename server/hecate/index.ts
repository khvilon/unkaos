import axios from "axios";
import cors from "cors";
import express from "express";
import { io, Socket } from "socket.io-client";
import { createLogger } from '../common/logging';
import { randomUUID } from 'crypto';
import { createZeus2Client, Zeus2GrpcClient, getZeus2Client } from './grpc-client';

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
    zeus2GrpcUrl: process.env.ZEUS2_GRPC_URL || 'localhost:50051',
    cerberusUrl: process.env.CERBERUS_URL,
    athenaUrl: process.env.ATHENA_URL,
    useGrpc: process.env.USE_GRPC === 'true' || true  // Enable gRPC by default
  };
}

logger.info({
  msg: 'Initializing Gateway',
  cerberusUrl: conf.cerberusUrl,
  zeusUrl: conf.zeusUrl,
  zeus2Url: conf.zeus2Url,
  zeus2GrpcUrl: conf.zeus2GrpcUrl,
  useGrpc: conf.useGrpc
});

// Cerberus Socket (for authentication)
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

// Zeus v1 Socket (optional - may be disabled)
let zeusSocket: Socket | null = null;

if (conf.zeusUrl) {
  zeusSocket = io(conf.zeusUrl, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    transports: ['polling', 'websocket'],
    path: '/socket.io',
    autoConnect: true,
    forceNew: true
  });

  zeusSocket.on('connect', () => {
    logger.info({ msg: 'Connected to Zeus v1', socketId: zeusSocket?.id });
  });

  zeusSocket.on('disconnect', () => {
    logger.warn({ msg: 'Disconnected from Zeus v1' });
  });

  zeusSocket.on('connect_error', (error) => {
    logger.error({ msg: 'Zeus v1 connection error', error: error.message });
  });
} else {
  logger.info({ msg: 'Zeus v1 is disabled - all requests will go to Zeus2' });
}

// Zeus2 gRPC Client (primary) or Socket.IO (fallback)
let zeus2GrpcClient: Zeus2GrpcClient | null = null;
let zeus2Socket: Socket | null = null;
let zeus2Entities: Set<string> = new Set();

// Mapping: entity name -> REST API base path
const zeus2EntityMapping: Map<string, string> = new Map();

// Initialize Zeus2 connection
if (conf.useGrpc && conf.zeus2GrpcUrl) {
  logger.info({ msg: 'Using gRPC for Zeus2 communication', address: conf.zeus2GrpcUrl });
  zeus2GrpcClient = createZeus2Client(conf.zeus2GrpcUrl);
} else if (conf.zeus2Url) {
  // Fallback to Socket.IO
  logger.info({ msg: 'Using Socket.IO for Zeus2 communication (fallback)' });
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
    logger.info({ msg: 'Connected to Zeus2 v2 (Socket.IO)', socketId: zeus2Socket?.id });
  });

  zeus2Socket.on('disconnect', () => {
    logger.warn({ msg: 'Disconnected from Zeus2 v2 (Socket.IO)' });
  });

  zeus2Socket.on('connect_error', (error) => {
    logger.error({ msg: 'Zeus2 v2 connection error (Socket.IO)', error: error.message });
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
 */
function convertToRestRequest(func: string, method: string, body: any, query: any): {
  restMethod: string;
  restPath: string;
  restBody: any;
} {
  const parts = func.split('_');
  const action = parts[0];
  const entityParts = parts.slice(1);
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
      const queryParams: string[] = [];
      const allParams = { ...body, ...query };
      for (const [key, value] of Object.entries(allParams)) {
        if (value !== undefined && value !== null && key !== 'uuid') {
          queryParams.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
      }
      if (queryParams.length > 0) {
        restPath += `?${queryParams.join('&')}`;
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
      if (body?.is_new === true || !body?.uuid) {
        restMethod = 'post';
      } else {
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
  if (restResponse.items) {
    return {
      rows: restResponse.items.map((item: any) => ({
        table_name: extractTableName(item),
        ...item
      }))
    };
  }
  
  if (restResponse.uuid) {
    return {
      rows: [{
        table_name: extractTableName(restResponse),
        ...restResponse
      }]
    };
  }
  
  return restResponse;
}

function extractTableName(obj: any): string {
  if (obj.workflow_nodes !== undefined) return 'workflows';
  if (obj.is_start !== undefined || obj.is_end !== undefined) return 'issue_statuses';
  return 'unknown';
}

function isZeus2Entity(func: string): boolean {
  const parts = func.split('_');
  const entityParts = parts.slice(1);
  const entity = entityParts.join('-').replace(/_/g, '-');
  const result = zeus2Entities.has(entity);
  
  if (result) {
    logger.debug({ msg: 'Entity matched Zeus2', func, entity });
  }
  
  return result;
}

/**
 * Send request to Zeus2 via gRPC or Socket.IO
 */
async function sendToZeus2(
  restMethod: string,
  restPath: string,
  headers: Record<string, string>,
  body: any
): Promise<any> {
  // Try gRPC first
  if (zeus2GrpcClient && zeus2GrpcClient.isConnected()) {
    logger.debug({ msg: 'Sending via gRPC', method: restMethod, path: restPath });
    
    const response = await zeus2GrpcClient.request({
      method: restMethod,
      url: restPath,
      headers,
      body
    });
    
    return response;
  }
  
  // Fallback to Socket.IO
  if (zeus2Socket) {
    logger.debug({ msg: 'Sending via Socket.IO (fallback)', method: restMethod, path: restPath });
    
    return new Promise((resolve) => {
      zeus2Socket!.emit('request', {
        method: restMethod,
        url: restPath,
        headers,
        body
      }, (response: any) => {
        resolve(response);
      });
    });
  }
  
  throw new Error('No Zeus2 connection available');
}

async function loadZeus2Entities(retries = 5, delay = 2000): Promise<void> {
  if (!conf.zeus2Url && !conf.zeus2GrpcUrl) return;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let listeners: any[] = [];
      
      // Try gRPC first
      if (zeus2GrpcClient) {
        try {
          listeners = await zeus2GrpcClient.getListeners();
          logger.info({ msg: 'Loaded Zeus2 entities via gRPC', count: listeners.length });
        } catch (grpcErr) {
          logger.warn({ msg: 'gRPC getListeners failed, trying HTTP', error: (grpcErr as Error).message });
        }
      }
      
      // Fallback to HTTP if gRPC failed or not available
      if (listeners.length === 0 && conf.zeus2Url) {
        const zeus2_listeners = await axios.get(conf.zeus2Url + "/read_listeners", { timeout: 5000 });
        listeners = zeus2_listeners.data;
      }
      
      // Extract unique entities from listeners
      for (const listener of listeners) {
        if (listener.entity) {
          zeus2Entities.add(listener.entity);
          zeus2EntityMapping.set(listener.entity, listener.func);
        }
      }
      
      logger.info({
        msg: 'Loaded Zeus2 entities',
        entities: Array.from(zeus2Entities),
        attempt,
        via: zeus2GrpcClient ? 'gRPC' : 'HTTP'
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

  // Load Zeus v1 listeners (only if Zeus v1 is configured)
  let zeus_listeners: any = { data: [] };
  if (conf.zeusUrl) {
    try {
      zeus_listeners = await axios.get(conf.zeusUrl + "/read_listeners");
    } catch (error: any) {
      logger.warn({ msg: 'Zeus v1 not available', error: error.message });
    }
  } else {
    logger.info({ msg: 'Zeus v1 is disabled, using Zeus2 only' });
  }

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
            const useZeus2 = isZeus2Entity(func);
            
            if (useZeus2 && (zeus2GrpcClient || zeus2Socket)) {
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
                subdomain: req.headers.subdomain,
                via: zeus2GrpcClient?.isConnected() ? 'gRPC' : 'Socket.IO'
              });

              try {
                const zeus2_ans = await sendToZeus2(
                  restMethod,
                  restPath,
                  {
                    subdomain: req.headers.subdomain,
                    user_uuid: response.data.uuid,
                    is_admin: String(response.data.is_admin),
                    'x-request-id': requestId,
                    'x-trace-id': traceId
                  },
                  restBody
                );

                logger.debug({
                  msg: 'Zeus2 response',
                  status: zeus2_ans.status,
                  path: restPath
                });
                
                const convertedResponse = convertFromRestResponse(zeus2_ans.data);
                res.status(zeus2_ans.status);
                res.send(convertedResponse);
              } catch (zeus2Error: any) {
                logger.error({ msg: 'Zeus2 request failed', error: zeus2Error.message });
                res.status(503).json({ message: 'Zeus2 service unavailable' });
              }

            } else if (zeusSocket) {
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
            } else {
              logger.error({ msg: 'No backend available for entity', func });
              res.status(503).json({
                code: 'SERVICE_UNAVAILABLE',
                message: 'Сервис временно недоступен',
                details: [{ entity: func }]
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

    if (method === 'get') app.get("/" + func, handler);
    else if (method === 'post') app.post("/" + func, handler);
    else if (method === 'put') app.put("/" + func, handler);
    else if (method === 'delete') app.delete("/" + func, handler);
  }
  
  // Register Zeus2-only entity handlers
  const registeredFuncs = new Set(zeus_listeners.data.map((l: any) => l.func));
  const zeus2OnlyMethods = ['read', 'create', 'update', 'upsert', 'delete'];
  
  for (const entity of zeus2Entities) {
    for (const action of zeus2OnlyMethods) {
      const entitySnake = entity.replace(/-/g, '_');
      const func = `${action}_${entitySnake}`;
      
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
                subdomain: req.headers.subdomain,
                via: zeus2GrpcClient?.isConnected() ? 'gRPC' : 'Socket.IO'
              });
              
              try {
                const zeus2_ans = await sendToZeus2(
                  restMethod,
                  restPath,
                  {
                    subdomain: req.headers.subdomain,
                    user_uuid: response.data.uuid,
                    is_admin: String(response.data.is_admin),
                    'x-request-id': requestId,
                    'x-trace-id': traceId
                  },
                  restBody
                );

                logger.debug({
                  msg: 'Zeus2-only response',
                  status: zeus2_ans.status,
                  url: restPath
                });
                
                const convertedResponse = convertFromRestResponse(zeus2_ans.data);
                res.status(zeus2_ans.status);
                res.send(convertedResponse);
              } catch (zeus2Error: any) {
                logger.error({ msg: 'Zeus2-only request failed', error: zeus2Error.message });
                res.status(503).json({ message: 'Zeus2 service unavailable' });
              }
              
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
      
      if (method === 'get') app.get("/" + func, handler);
      else app.post("/" + func, handler);
      
      registeredFuncs.add(func);
    }
  }
  
  logger.info({
    msg: 'Gateway initialization complete',
    zeus1Methods: zeus_listeners.data.length,
    zeus2Entities: Array.from(zeus2Entities),
    totalRegistered: registeredFuncs.size,
    zeus2Connection: zeus2GrpcClient?.isConnected() ? 'gRPC' : (zeus2Socket ? 'Socket.IO' : 'none')
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
app.get("/health", async (req: any, res: any) => {
  let zeus2Health = null;
  
  if (zeus2GrpcClient) {
    try {
      zeus2Health = await zeus2GrpcClient.healthCheck();
    } catch (e) {
      zeus2Health = { status: 'error', error: (e as Error).message };
    }
  }
  
  res.json({
    status: 'ok',
    service: 'gateway',
    zeus2_entities: Array.from(zeus2Entities),
    zeus2_connection: zeus2GrpcClient?.isConnected() ? 'gRPC' : (zeus2Socket ? 'Socket.IO' : 'none'),
    zeus2_health: zeus2Health
  });
});

/**
 * REST API v2 password endpoint - routes to Cerberus
 */
app.post("/api/v2/password", async (req: any, res: any) => {
  logger.info({
    msg: 'REST API v2 password request',
    subdomain: req.headers.subdomain
  });

  socket.emit('upsert_password', {
    subdomain: req.headers.subdomain,
    token: req.headers.token,
    password: req.body.password,
    user: req.body.user
  }, (response: any) => {
    res.status(response.status);
    res.send(response.data);
  });
});

/**
 * REST API v2 proxy handler
 */
app.all("/api/v2/*", async (req: any, res: any) => {
  const requestId = randomUUID();
  const traceId = req.headers['x-trace-id'] || requestId;
  
  logger.info({
    msg: 'REST API v2 request',
    method: req.method,
    path: req.path,
    subdomain: req.headers.subdomain
  });

  socket.emit('check_session', {
    token: req.headers.token,
    subdomain: req.headers.subdomain,
    request_function: 'api_v2'
  }, async (authResponse: any) => {
    if (authResponse.status !== 200) {
      logger.warn({
        msg: 'REST API v2 auth failed',
        status: authResponse.status,
        path: req.path
      });
      res.status(authResponse.status);
      res.send(authResponse.data);
      return;
    }

    if (!zeus2GrpcClient && !zeus2Socket) {
      logger.error({ msg: 'Zeus2 not connected' });
      res.status(503).json({ message: 'Zeus2 service unavailable' });
      return;
    }

    try {
      const zeus2Response = await sendToZeus2(
        req.method.toLowerCase(),
        req.path + (req._parsedUrl?.search || ''),
        {
          subdomain: req.headers.subdomain,
          user_uuid: authResponse.data.uuid,
          is_admin: String(authResponse.data.is_admin),
          'x-request-id': requestId,
          'x-trace-id': traceId
        },
        req.body
      );

      logger.debug({
        msg: 'REST API v2 response',
        status: zeus2Response.status,
        path: req.path
      });
      
      res.status(zeus2Response.status);
      res.send(zeus2Response.data);
    } catch (error: any) {
      logger.error({ msg: 'REST API v2 Zeus2 error', error: error.message });
      res.status(500).json({ message: 'Internal Server Error' });
    }
  });
});

app.listen(port, () => {
  logger.info({ msg: `Gateway running on port ${port}` });
});

init();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info({ msg: 'Shutting down Gateway' });
  const client = getZeus2Client();
  if (client) client.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info({ msg: 'Shutting down Gateway' });
  const client = getZeus2Client();
  if (client) client.close();
  process.exit(0);
});
