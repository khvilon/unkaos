/**
 * gRPC Server for Zeus2
 * 
 * Provides high-performance communication with Gateway
 * Replaces Socket.IO for inter-service communication
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import axios from 'axios';
import { createLogger } from '../../common/logging';

const logger = createLogger('zeus2:grpc');

const PROTO_PATH = path.join(__dirname, '../proto/zeus2.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition) as any;

// Service state
let httpPort: number = 3007;
let listeners: any[] = [];
const startTime = Date.now();

/**
 * Generic request handler - mirrors Socket.IO behavior
 * Routes requests to internal HTTP endpoints
 */
async function handleRequest(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
): Promise<void> {
  const request = call.request;
  const requestId = request.headers?.['x-request-id'] || '';
  const traceId = request.headers?.['x-trace-id'] || '';
  
  logger.info({
    msg: 'gRPC Request',
    method: request.method,
    url: request.url,
    subdomain: request.headers?.subdomain,
    requestId
  });

  try {
    // Parse body if present
    let body: any = undefined;
    if (request.body && request.body.length > 0) {
      try {
        body = JSON.parse(request.body.toString());
      } catch (e) {
        // Body is not JSON, use as-is
        body = request.body.toString();
      }
    }

    // Make HTTP request to self (internal routing)
    const response = await axios({
      method: request.method.toLowerCase(),
      url: `http://localhost:${httpPort}${request.url}`,
      headers: {
        ...request.headers,
        'content-type': 'application/json',
        'x-request-id': requestId,
        'x-trace-id': traceId
      },
      data: body,
      validateStatus: () => true, // Accept all status codes
      timeout: 30000
    });

    logger.debug({
      msg: 'gRPC Response',
      status: response.status,
      url: request.url,
      requestId
    });

    callback(null, {
      status: response.status,
      data: Buffer.from(JSON.stringify(response.data)),
      headers: {
        'content-type': 'application/json',
        'x-request-id': requestId,
        'x-trace-id': traceId
      }
    });

  } catch (error: any) {
    logger.error({
      msg: 'gRPC Request error',
      error: error.message,
      url: request.url,
      requestId
    });

    callback(null, {
      status: 500,
      data: Buffer.from(JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'Внутренняя ошибка сервера',
        trace_id: traceId,
        details: []
      })),
      headers: {}
    });
  }
}

/**
 * Health check handler
 */
async function handleHealthCheck(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
): Promise<void> {
  const memoryUsage = process.memoryUsage();
  
  // Check database connectivity
  let dbStatus = 'disconnected';
  let dbLatency = 0;
  
  try {
    const start = Date.now();
    await axios.get(`http://localhost:${httpPort}/health`, { timeout: 5000 });
    dbStatus = 'connected';
    dbLatency = Date.now() - start;
  } catch (e) {
    dbStatus = 'disconnected';
  }

  callback(null, {
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'zeus2',
    version: 'v2',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    endpoints: listeners.length,
    database: {
      status: dbStatus,
      latency: dbLatency
    },
    memory: {
      heap_used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heap_total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * Get listeners handler - for Gateway initialization
 */
async function handleGetListeners(
  call: grpc.ServerUnaryCall<any, any>,
  callback: grpc.sendUnaryData<any>
): Promise<void> {
  callback(null, {
    listeners: listeners.map(l => ({
      method: l.method,
      func: l.func,
      entity: l.entity
    }))
  });
}

/**
 * Start gRPC server
 */
export async function startGrpcServer(
  port: number = 50051,
  restPort: number = 3007,
  registeredListeners: any[] = []
): Promise<grpc.Server> {
  httpPort = restPort;
  listeners = registeredListeners;

  const server = new grpc.Server({
    'grpc.max_receive_message_length': 50 * 1024 * 1024, // 50MB
    'grpc.max_send_message_length': 50 * 1024 * 1024,
    'grpc.keepalive_time_ms': 10000,
    'grpc.keepalive_timeout_ms': 5000,
    'grpc.keepalive_permit_without_calls': 1
  });

  // Register service
  server.addService(proto.zeus2.Zeus2Service.service, {
    Request: handleRequest,
    HealthCheck: handleHealthCheck,
    GetListeners: handleGetListeners
  });

  return new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          logger.error({ msg: 'gRPC server failed to start', error: err.message });
          reject(err);
          return;
        }

        logger.info({ msg: 'gRPC server started', port: boundPort });
        resolve(server);
      }
    );
  });
}

/**
 * Stop gRPC server gracefully
 */
export function stopGrpcServer(server: grpc.Server): Promise<void> {
  return new Promise((resolve) => {
    server.tryShutdown(() => {
      logger.info({ msg: 'gRPC server stopped' });
      resolve();
    });
  });
}

