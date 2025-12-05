/**
 * gRPC Client for Zeus2 communication
 * 
 * High-performance replacement for Socket.IO
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { createLogger } from '../common/logging';

const logger = createLogger('gateway:grpc');

const PROTO_PATH = path.join(__dirname, 'proto/zeus2.proto');

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const proto = grpc.loadPackageDefinition(packageDefinition) as any;

export interface Zeus2RequestOptions {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
}

export interface Zeus2Response {
  status: number;
  data: any;
  headers: Record<string, string>;
}

export interface Listener {
  method: string;
  func: string;
  entity: string;
}

export class Zeus2GrpcClient {
  private client: any;
  private connected: boolean = false;
  private address: string;

  constructor(address: string) {
    this.address = address;
    this.connect();
  }

  private connect(): void {
    logger.info({ msg: 'Connecting to Zeus2 gRPC', address: this.address });
    
    this.client = new proto.zeus2.Zeus2Service(
      this.address,
      grpc.credentials.createInsecure(),
      {
        // Connection pooling and keepalive
        'grpc.keepalive_time_ms': 10000,
        'grpc.keepalive_timeout_ms': 5000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_pings_without_data': 0,
        'grpc.http2.min_time_between_pings_ms': 10000,
        // Load balancing for multiple pods
        'grpc.service_config': JSON.stringify({
          loadBalancingConfig: [{ round_robin: {} }],
          methodConfig: [{
            name: [{ service: 'zeus2.Zeus2Service' }],
            timeout: '30s',
            retryPolicy: {
              maxAttempts: 3,
              initialBackoff: '0.1s',
              maxBackoff: '1s',
              backoffMultiplier: 2,
              retryableStatusCodes: ['UNAVAILABLE', 'DEADLINE_EXCEEDED']
            }
          }]
        })
      }
    );

    // Wait for connection
    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 10);
    
    this.client.waitForReady(deadline, (err: Error | undefined) => {
      if (err) {
        logger.error({ msg: 'Failed to connect to Zeus2 gRPC', error: err.message });
        this.connected = false;
        // Retry connection
        setTimeout(() => this.connect(), 5000);
      } else {
        logger.info({ msg: 'Connected to Zeus2 gRPC', address: this.address });
        this.connected = true;
      }
    });
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Send request to Zeus2
   */
  async request(options: Zeus2RequestOptions): Promise<Zeus2Response> {
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 30);

      const requestBody = options.body 
        ? Buffer.from(JSON.stringify(options.body))
        : Buffer.alloc(0);

      this.client.Request(
        {
          method: options.method,
          url: options.url,
          headers: options.headers,
          body: requestBody
        },
        { deadline },
        (err: any, response: any) => {
          if (err) {
            logger.error({
              msg: 'gRPC request error',
              error: err.message,
              code: err.code,
              url: options.url
            });
            
            // Map gRPC error to HTTP-like response
            resolve({
              status: this.grpcToHttpStatus(err.code),
              data: {
                code: 'GRPC_ERROR',
                message: err.message,
                details: []
              },
              headers: {}
            });
            return;
          }

          try {
            const data = response.data && response.data.length > 0
              ? JSON.parse(response.data.toString())
              : {};

            resolve({
              status: response.status,
              data,
              headers: response.headers || {}
            });
          } catch (parseError) {
            logger.error({
              msg: 'Failed to parse gRPC response',
              error: (parseError as Error).message
            });
            resolve({
              status: 500,
              data: { code: 'PARSE_ERROR', message: 'Failed to parse response' },
              headers: {}
            });
          }
        }
      );
    });
  }

  /**
   * Get listeners from Zeus2
   */
  async getListeners(): Promise<Listener[]> {
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 10);

      this.client.GetListeners(
        {},
        { deadline },
        (err: any, response: any) => {
          if (err) {
            logger.error({ msg: 'Failed to get listeners', error: err.message });
            reject(err);
            return;
          }

          resolve(response.listeners || []);
        }
      );
    });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    return new Promise((resolve, reject) => {
      const deadline = new Date();
      deadline.setSeconds(deadline.getSeconds() + 5);

      this.client.HealthCheck(
        {},
        { deadline },
        (err: any, response: any) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(response);
        }
      );
    });
  }

  /**
   * Map gRPC status code to HTTP status
   */
  private grpcToHttpStatus(grpcCode: number): number {
    switch (grpcCode) {
      case grpc.status.OK: return 200;
      case grpc.status.INVALID_ARGUMENT: return 400;
      case grpc.status.NOT_FOUND: return 404;
      case grpc.status.PERMISSION_DENIED: return 403;
      case grpc.status.UNAUTHENTICATED: return 401;
      case grpc.status.UNAVAILABLE: return 503;
      case grpc.status.DEADLINE_EXCEEDED: return 504;
      case grpc.status.RESOURCE_EXHAUSTED: return 429;
      default: return 500;
    }
  }

  /**
   * Close connection
   */
  close(): void {
    if (this.client) {
      this.client.close();
      this.connected = false;
      logger.info({ msg: 'gRPC client closed' });
    }
  }
}

// Singleton instance
let zeus2Client: Zeus2GrpcClient | null = null;

export function createZeus2Client(address: string): Zeus2GrpcClient {
  if (!zeus2Client) {
    zeus2Client = new Zeus2GrpcClient(address);
  }
  return zeus2Client;
}

export function getZeus2Client(): Zeus2GrpcClient | null {
  return zeus2Client;
}

