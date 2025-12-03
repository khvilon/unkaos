import cors from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import { createLogger } from '../common/logging';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import axios from 'axios';

const logger = createLogger('zeus2');

// API version prefix
const API_PREFIX = '/api/v2';

// Registered API methods (will be sent to gateway)
interface Listener {
  method: string;
  func: string;
  entity: string;
}
const listeners: Listener[] = [];

// Express app setup
const app: express.Application = express();
const httpServer = require('http').createServer(app);
const port = process.env.ZEUS2_PORT || 3007;

// Prisma client
export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_DATABASE}`
    }
  },
  log: ['error', 'warn']
});

// ==================== MIDDLEWARE ====================

// CORS
app.use(cors());

// Body parsers
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// Rate Limiting - защита от DDoS и брутфорса
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 1000, // Максимум 1000 запросов на IP за 15 минут
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Превышен лимит запросов. Попробуйте позже.',
    trace_id: '',
    details: []
  },
  skip: (req) => {
    // Пропускаем rate limit для health check и внутренних запросов
    return req.path === '/health' || req.path === '/read_listeners';
  }
});
app.use(API_PREFIX, apiLimiter);

// Request ID and Trace ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  const traceId = (req.headers['x-trace-id'] as string) || randomUUID();
  
  req.headers['x-request-id'] = requestId;
  req.headers['x-trace-id'] = traceId;
  
  res.setHeader('X-Request-Id', requestId);
  res.setHeader('X-Trace-Id', traceId);
  
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      msg: 'HTTP Request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: req.headers['x-request-id'],
      subdomain: req.headers.subdomain
    });
  });
  
  next();
});

// ==================== ERROR HELPERS ====================

interface ApiError {
  code: string;
  message: string;
  trace_id: string;
  details: { field?: string; message: string }[];
}

function errorResponse(req: Request, code: string, message: string, details: { field?: string; message: string }[] = []): ApiError {
  return {
    code,
    message,
    trace_id: req.headers['x-trace-id'] as string,
    details
  };
}

// ==================== ENTITY ROUTES ====================

import { registerIssueStatusesRoutes } from './routes/issue-statuses';
import { registerWorkflowsRoutes } from './routes/workflows';
import { registerProjectsRoutes } from './routes/projects';
import { registerFieldsRoutes } from './routes/fields';
import { registerRolesRoutes } from './routes/roles';
import { registerUsersRoutes } from './routes/users';
import { registerIssueTypesRoutes } from './routes/issue-types';
import { registerIssuesRoutes } from './routes/issues';
import { registerSprintsRoutes } from './routes/sprints';
import { registerBoardsRoutes } from './routes/boards';
import { registerDashboardsRoutes } from './routes/dashboards';
import { registerIssueActionsRoutes } from './routes/issue-actions';
import { registerRelationsRoutes } from './routes/relations';
import { registerAttachmentsRoutes } from './routes/attachments';
import { registerFieldValuesRoutes } from './routes/field-values';
import { registerTimeEntriesRoutes } from './routes/time-entries';
import { registerWatchersRoutes } from './routes/watchers';
import { registerIssueTagsRoutes } from './routes/issue-tags';
import { registerFavouritesRoutes } from './routes/favourites';
import { registerDictionariesRoutes } from './routes/dictionaries';
import { registerConfigsRoutes } from './routes/configs';

// ==================== HEALTH CHECK ====================

interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  uptime: number;
  endpoints: number;
  database: {
    status: 'connected' | 'disconnected';
    latency?: number;
  };
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  timestamp: string;
}

const startTime = Date.now();

async function checkDatabaseHealth(): Promise<{ status: 'connected' | 'disconnected'; latency?: number }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'connected', latency: Date.now() - start };
  } catch (error) {
    logger.error({ msg: 'Database health check failed', error });
    return { status: 'disconnected' };
  }
}

// ==================== INITIALIZATION ====================

async function init() {
  try {
    await prisma.$connect();
    logger.info({ msg: 'Connected to database via Prisma' });

    // Register entity routes
    registerIssueStatusesRoutes(app, prisma, listeners, API_PREFIX);
    registerWorkflowsRoutes(app, prisma, listeners, API_PREFIX);
    registerProjectsRoutes(app, prisma, listeners, API_PREFIX);
    registerFieldsRoutes(app, prisma, listeners, API_PREFIX);
    registerRolesRoutes(app, prisma, listeners, API_PREFIX);
    registerUsersRoutes(app, prisma, listeners, API_PREFIX);
    registerIssueTypesRoutes(app, prisma, listeners, API_PREFIX);
    
    // Issues routes (with complex query support)
    registerIssuesRoutes(app, prisma);
    
    // Additional entity routes
    registerSprintsRoutes(app, prisma, listeners, API_PREFIX);
    registerBoardsRoutes(app, prisma, listeners, API_PREFIX);
    registerDashboardsRoutes(app, prisma, listeners, API_PREFIX);
    registerIssueActionsRoutes(app, prisma, listeners, API_PREFIX);
    registerRelationsRoutes(app, prisma, listeners, API_PREFIX);
    registerAttachmentsRoutes(app, prisma, listeners, API_PREFIX);
    registerFieldValuesRoutes(app, prisma, listeners, API_PREFIX);
    registerTimeEntriesRoutes(app, prisma, listeners, API_PREFIX);
    registerWatchersRoutes(app, prisma, listeners, API_PREFIX);
    registerIssueTagsRoutes(app, prisma, listeners, API_PREFIX);
    registerFavouritesRoutes(app, prisma, listeners, API_PREFIX);
    registerDictionariesRoutes(app, prisma, listeners, API_PREFIX);
    registerConfigsRoutes(app, prisma, listeners, API_PREFIX);
    
    // Add issues to listeners for gateway
    listeners.push({ method: 'get', func: 'read_issues', entity: 'issues' });
    listeners.push({ method: 'get', func: 'read_issue', entity: 'issue' });
    listeners.push({ method: 'post', func: 'create_issues', entity: 'issues' });
    listeners.push({ method: 'post', func: 'upsert_issues', entity: 'issues' });
    listeners.push({ method: 'post', func: 'upsert_issue', entity: 'issue' });
    listeners.push({ method: 'put', func: 'update_issues', entity: 'issues' });
    listeners.push({ method: 'put', func: 'update_issue', entity: 'issue' });
    listeners.push({ method: 'delete', func: 'delete_issues', entity: 'issues' });
    listeners.push({ method: 'delete', func: 'delete_issue', entity: 'issue' });
    listeners.push({ method: 'get', func: 'read_issues_count', entity: 'issues-count' });
    // Special issue endpoints
    listeners.push({ method: 'get', func: 'read_short_issue_info', entity: 'short_issue_info' });
    listeners.push({ method: 'get', func: 'read_short_issue_info_for_imort', entity: 'short_issue_info_for_imort' });
    listeners.push({ method: 'get', func: 'read_issue_uuid', entity: 'issue_uuid' });
    listeners.push({ method: 'get', func: 'read_old_issue_uuid', entity: 'old_issue_uuid' });

    // Endpoint to return registered listeners (for gateway compatibility)
    app.get('/read_listeners', (req: Request, res: Response) => {
      // Convert new format to gateway-compatible format
      const gatewayListeners = listeners.map(l => ({
        method: l.method,
        func: l.func,
        entity: l.entity
      }));
      res.json(gatewayListeners);
    });

    // Health check with database connectivity
    app.get('/health', async (req: Request, res: Response) => {
      const dbHealth = await checkDatabaseHealth();
      const memoryUsage = process.memoryUsage();
      
      const health: HealthStatus = {
        status: dbHealth.status === 'connected' ? 'ok' : 'degraded',
        service: 'zeus2',
        version: 'v2',
        uptime: Math.floor((Date.now() - startTime) / 1000),
        endpoints: listeners.length,
        database: dbHealth,
        memory: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024),
          rss: Math.round(memoryUsage.rss / 1024 / 1024)
        },
        timestamp: new Date().toISOString()
      };
      
      const statusCode = health.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(health);
    });

    // Liveness probe (для Kubernetes)
    app.get('/health/live', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // Readiness probe (для Kubernetes) - проверяет готовность принимать трафик
    app.get('/health/ready', async (req: Request, res: Response) => {
      const dbHealth = await checkDatabaseHealth();
      if (dbHealth.status === 'connected') {
        res.json({ status: 'ok', database: 'connected' });
      } else {
        res.status(503).json({ status: 'not_ready', database: 'disconnected' });
      }
    });

    // OpenAPI spec endpoint (placeholder)
    app.get(`${API_PREFIX}/openapi.json`, (req: Request, res: Response) => {
      res.json({
        openapi: '3.0.0',
        info: {
          title: 'Zeus2 API',
          version: '2.0.0',
          description: 'REST API v2 для Unkaos'
        },
        servers: [
          { url: API_PREFIX }
        ],
        paths: {}  // TODO: Generate from routes
      });
    });

    // Global error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error({ 
        msg: 'Unhandled error', 
        error: err.message, 
        stack: err.stack,
        path: req.path,
        method: req.method
      });
      
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    });

    // 404 handler
    app.use((req: Request, res: Response) => {
      res.status(404).json(errorResponse(req, 'NOT_FOUND', `Эндпоинт ${req.method} ${req.path} не найден`));
    });

    // Socket.IO for gateway communication
    const io = new Server(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        credentials: true
      },
      transports: ['polling', 'websocket'],
      path: '/socket.io'
    });

    io.on('connection', (socket) => {
      logger.info({ msg: 'Gateway connected', socketId: socket.id });

      socket.on('request', async (data, callback) => {
        const requestId = randomUUID();
        const traceId = randomUUID();

        try {
          // Make HTTP request to self
          const response = await axios({
            method: data.method.toLowerCase(),
            url: `http://localhost:${port}${data.url}`,
            headers: {
              ...data.headers,
              'x-request-id': requestId,
              'x-trace-id': traceId,
              'content-type': 'application/json'
            },
            data: data.body,
            validateStatus: () => true // Accept all status codes
          });

          callback({
            status: response.status,
            data: response.data,
            headers: response.headers
          });

        } catch (error: any) {
          logger.error({ msg: 'Socket request error', error: error.message, url: data.url });
          callback({ 
            status: 500, 
            data: { 
              code: 'INTERNAL_ERROR', 
              message: 'Внутренняя ошибка сервера', 
              trace_id: traceId, 
              details: [] 
            } 
          });
        }
      });

      socket.on('disconnect', () => {
        logger.info({ msg: 'Gateway disconnected', socketId: socket.id });
      });
    });

    httpServer.listen(port, () => {
      logger.info({ msg: `Zeus2 running on port ${port}`, apiPrefix: API_PREFIX });
      logger.info({ msg: 'Registered endpoints', count: listeners.length });
      listeners.forEach(l => {
        logger.debug({ msg: 'Endpoint', method: l.method.toUpperCase(), path: l.func, entity: l.entity });
      });
    });

  } catch (error) {
    logger.error({ msg: 'Failed to initialize Zeus2', error });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  logger.info({ msg: `Received ${signal}, starting graceful shutdown` });
  
  // Закрываем HTTP сервер (перестаём принимать новые соединения)
  httpServer.close(() => {
    logger.info({ msg: 'HTTP server closed' });
  });
  
  // Ждём завершения текущих запросов (максимум 30 секунд)
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Отключаемся от БД
  await prisma.$disconnect();
  logger.info({ msg: 'Database disconnected' });
  
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  logger.error({ msg: 'Uncaught exception', error: error.message, stack: error.stack });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ msg: 'Unhandled rejection', reason, promise });
});

init();

export { listeners, API_PREFIX, errorResponse };
