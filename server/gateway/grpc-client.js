"use strict";
/**
 * gRPC Client for Zeus2 communication
 *
 * High-performance replacement for Socket.IO
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Zeus2GrpcClient = void 0;
exports.createZeus2Client = createZeus2Client;
exports.getZeus2Client = getZeus2Client;
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const path = __importStar(require("path"));
const logging_1 = require("../common/logging");
const logger = (0, logging_1.createLogger)('gateway:grpc');
const PROTO_PATH = path.join(__dirname, 'proto/zeus2.proto');
// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const proto = grpc.loadPackageDefinition(packageDefinition);
class Zeus2GrpcClient {
    constructor(address) {
        this.connected = false;
        this.address = address;
        this.connect();
    }
    connect() {
        logger.info({ msg: 'Connecting to Zeus2 gRPC', address: this.address });
        this.client = new proto.zeus2.Zeus2Service(this.address, grpc.credentials.createInsecure(), {
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
        });
        // Wait for connection
        const deadline = new Date();
        deadline.setSeconds(deadline.getSeconds() + 10);
        this.client.waitForReady(deadline, (err) => {
            if (err) {
                logger.error({ msg: 'Failed to connect to Zeus2 gRPC', error: err.message });
                this.connected = false;
                // Retry connection
                setTimeout(() => this.connect(), 5000);
            }
            else {
                logger.info({ msg: 'Connected to Zeus2 gRPC', address: this.address });
                this.connected = true;
            }
        });
    }
    isConnected() {
        return this.connected;
    }
    /**
     * Send request to Zeus2
     */
    request(options) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const deadline = new Date();
                deadline.setSeconds(deadline.getSeconds() + 30);
                const requestBody = options.body
                    ? Buffer.from(JSON.stringify(options.body))
                    : Buffer.alloc(0);
                this.client.Request({
                    method: options.method,
                    url: options.url,
                    headers: options.headers,
                    body: requestBody
                }, { deadline }, (err, response) => {
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
                    }
                    catch (parseError) {
                        logger.error({
                            msg: 'Failed to parse gRPC response',
                            error: parseError.message
                        });
                        resolve({
                            status: 500,
                            data: { code: 'PARSE_ERROR', message: 'Failed to parse response' },
                            headers: {}
                        });
                    }
                });
            });
        });
    }
    /**
     * Get listeners from Zeus2
     */
    getListeners() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const deadline = new Date();
                deadline.setSeconds(deadline.getSeconds() + 10);
                this.client.GetListeners({}, { deadline }, (err, response) => {
                    if (err) {
                        logger.error({ msg: 'Failed to get listeners', error: err.message });
                        reject(err);
                        return;
                    }
                    resolve(response.listeners || []);
                });
            });
        });
    }
    /**
     * Health check
     */
    healthCheck() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const deadline = new Date();
                deadline.setSeconds(deadline.getSeconds() + 5);
                this.client.HealthCheck({}, { deadline }, (err, response) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(response);
                });
            });
        });
    }
    /**
     * Map gRPC status code to HTTP status
     */
    grpcToHttpStatus(grpcCode) {
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
    close() {
        if (this.client) {
            this.client.close();
            this.connected = false;
            logger.info({ msg: 'gRPC client closed' });
        }
    }
}
exports.Zeus2GrpcClient = Zeus2GrpcClient;
// Singleton instance
let zeus2Client = null;
function createZeus2Client(address) {
    if (!zeus2Client) {
        zeus2Client = new Zeus2GrpcClient(address);
    }
    return zeus2Client;
}
function getZeus2Client() {
    return zeus2Client;
}
