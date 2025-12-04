/**
 * Zeus2 Cache Integration
 * 
 * Интеграция с Redis кешем для Zeus2.
 * Использует прямое подключение к Redis.
 * Подписывается на события инвалидации от Ossa.
 */

// @ts-ignore - ioredis types will be available after npm install
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../common/logging';
import { escapeIdentifier } from './crud-factory';

const logger = createLogger('zeus2:cache');

// TTL для разных типов данных (в секундах)
const CACHE_TTL = {
  user_permissions: 3600,    // 1 час
  projects: 600,             // 10 минут
  issue_statuses: 900,       // 15 минут
  issue_types: 900,          // 15 минут
  workflows: 900,            // 15 минут
  sprints: 300,              // 5 минут
  users: 600,                // 10 минут
  roles: 900,                // 15 минут
  fields: 600,               // 10 минут
  field_types: 3600,         // 1 час
  boards: 300,               // 5 минут
  dashboards: 300,           // 5 минут
  relation_types: 3600,      // 1 час
  issue_tags: 600,           // 10 минут
};

// Канал для инвалидации кеша
const CACHE_INVALIDATE_CHANNEL = 'cache:invalidate';

// Типы кешируемых сущностей
export type CacheableEntity = keyof typeof CACHE_TTL;

// Сообщение инвалидации
interface InvalidateMessage {
  entity: string;
  workspace: string;
  uuid?: string;
  timestamp: number;
}

/**
 * Zeus2 Cache Manager
 */
export class Zeus2Cache {
  private redis: Redis;
  private subscriber: Redis;
  private prisma: PrismaClient;
  private isConnected: boolean = false;
  private localCache: Map<string, { data: any; expires: number }> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error({ msg: 'Redis connection failed after 10 retries' });
          return null;
        }
        return Math.min(times * 200, 2000);
      }
    });

    this.subscriber = new Redis(redisUrl);

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info({ msg: 'Zeus2 Redis connected' });
    });

    this.redis.on('error', (err) => {
      this.isConnected = false;
      logger.error({ msg: 'Zeus2 Redis error', error: err.message });
    });

    // Подписываемся на инвалидацию
    this.subscribeToInvalidation();
  }

  /**
   * Подписка на события инвалидации от Ossa
   */
  private subscribeToInvalidation() {
    this.subscriber.subscribe(CACHE_INVALIDATE_CHANNEL, (err) => {
      if (err) {
        logger.error({ msg: 'Failed to subscribe to cache invalidation', error: err.message });
      } else {
        logger.info({ msg: 'Subscribed to cache invalidation channel' });
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === CACHE_INVALIDATE_CHANNEL) {
        try {
          const msg: InvalidateMessage = JSON.parse(message);
          this.handleInvalidation(msg);
        } catch (err) {
          logger.error({ msg: 'Invalid invalidation message', message });
        }
      }
    });
  }

  /**
   * Обработка события инвалидации
   */
  private handleInvalidation(msg: InvalidateMessage) {
    logger.debug({ msg: 'Received cache invalidation', ...msg });

    // Очищаем локальный кеш для этого workspace/entity
    const prefix = `${msg.workspace}:${msg.entity}`;
    for (const key of this.localCache.keys()) {
      if (key.startsWith(prefix) || msg.entity === '*') {
        this.localCache.delete(key);
      }
    }
  }

  /**
   * Генерация ключа кеша
   */
  private buildKey(workspace: string, entity: string, uuid?: string): string {
    if (uuid) {
      return `cache:${workspace}:${entity}:${uuid}`;
    }
    return `cache:${workspace}:${entity}`;
  }

  /**
   * Получить из локального кеша (L1)
   */
  private getFromLocalCache<T>(key: string): T | null {
    const cached = this.localCache.get(key);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
    if (cached) {
      this.localCache.delete(key);
    }
    return null;
  }

  /**
   * Сохранить в локальный кеш (L1)
   */
  private setLocalCache<T>(key: string, data: T, ttlSeconds: number): void {
    // Ограничиваем TTL локального кеша до 60 секунд
    const localTtl = Math.min(ttlSeconds, 60) * 1000;
    this.localCache.set(key, {
      data,
      expires: Date.now() + localTtl,
    });
  }

  // ==================== Права пользователей ====================

  /**
   * Получить права пользователя (из кеша или БД)
   */
  async getUserPermissions(workspace: string, userUuid: string): Promise<{
    roles: Array<{ uuid: string; name: string }>;
    projects_r: string[];
    projects_w: string[];
  } | null> {
    const localKey = `${workspace}:perms:${userUuid}`;
    
    // L1: Локальный кеш
    const localCached = this.getFromLocalCache<any>(localKey);
    if (localCached) {
      return localCached;
    }

    // L2: Redis
    const key = `perms:${workspace}:${userUuid}`;
    try {
      const data = await this.redis.hgetall(key);
      if (data && data.roles) {
        const result = {
          roles: JSON.parse(data.roles || '[]'),
          projects_r: JSON.parse(data.projects_r || '[]'),
          projects_w: JSON.parse(data.projects_w || '[]'),
        };
        this.setLocalCache(localKey, result, 60);
        return result;
      }
    } catch (err) {
      logger.error({ msg: 'Redis get user permissions error', error: err });
    }

    // Cache miss - Ossa должен был загрузить при старте
    // Возвращаем null, чтобы Zeus2 загрузил из БД если нужно
    logger.warn({ msg: 'User permissions not in cache', workspace, userUuid });
    return null;
  }

  // ==================== Справочники ====================

  /**
   * Получить справочник (из кеша или БД)
   */
  async getDictionary<T>(
    workspace: string, 
    entity: CacheableEntity,
    loader: () => Promise<T[]>
  ): Promise<T[]> {
    const localKey = `${workspace}:${entity}`;
    const redisKey = this.buildKey(workspace, entity);
    const ttl = CACHE_TTL[entity] || 300;

    // L1: Локальный кеш
    const localCached = this.getFromLocalCache<T[]>(localKey);
    if (localCached) {
      logger.debug({ msg: 'Dictionary from L1 cache', workspace, entity });
      return localCached;
    }

    // L2: Redis
    if (this.isConnected) {
      try {
        const cached = await this.redis.get(redisKey);
        if (cached) {
          const data = JSON.parse(cached) as T[];
          this.setLocalCache(localKey, data, ttl);
          logger.debug({ msg: 'Dictionary from Redis cache', workspace, entity });
          return data;
        }
      } catch (err) {
        logger.error({ msg: 'Redis get dictionary error', entity, error: err });
      }
    }

    // L3: База данных
    logger.debug({ msg: 'Dictionary from DB', workspace, entity });
    const data = await loader();

    // Сохраняем в кеши
    if (this.isConnected) {
      try {
        await this.redis.setex(redisKey, ttl, JSON.stringify(data));
      } catch (err) {
        logger.error({ msg: 'Redis set dictionary error', entity, error: err });
      }
    }
    this.setLocalCache(localKey, data, ttl);

    return data;
  }

  /**
   * Получить элемент справочника по UUID
   */
  async getDictionaryItem<T>(
    workspace: string,
    entity: CacheableEntity,
    uuid: string,
    loader: () => Promise<T | null>
  ): Promise<T | null> {
    const localKey = `${workspace}:${entity}:${uuid}`;
    const redisKey = this.buildKey(workspace, entity, uuid);
    const ttl = CACHE_TTL[entity] || 300;

    // L1: Локальный кеш
    const localCached = this.getFromLocalCache<T>(localKey);
    if (localCached) {
      return localCached;
    }

    // L2: Redis
    if (this.isConnected) {
      try {
        const cached = await this.redis.get(redisKey);
        if (cached) {
          const data = JSON.parse(cached) as T;
          this.setLocalCache(localKey, data, ttl);
          return data;
        }
      } catch (err) {
        logger.error({ msg: 'Redis get item error', entity, uuid, error: err });
      }
    }

    // L3: База данных
    const data = await loader();

    if (data) {
      // Сохраняем в кеши
      if (this.isConnected) {
        try {
          await this.redis.setex(redisKey, ttl, JSON.stringify(data));
        } catch (err) {
          logger.error({ msg: 'Redis set item error', entity, uuid, error: err });
        }
      }
      this.setLocalCache(localKey, data, ttl);
    }

    return data;
  }

  // ==================== Готовые загрузчики справочников ====================

  /**
   * Получить проекты workspace
   */
  async getProjects(workspace: string): Promise<any[]> {
    return this.getDictionary(workspace, 'projects', async () => {
      const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT uuid, name, short_name, created_at, updated_at
        FROM ${escapeIdentifier(workspace)}.projects
        WHERE deleted_at IS NULL
        ORDER BY name
      `);
      return result;
    });
  }

  /**
   * Получить статусы задач
   */
  async getIssueStatuses(workspace: string): Promise<any[]> {
    return this.getDictionary(workspace, 'issue_statuses', async () => {
      const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_start, is_end, created_at
        FROM ${escapeIdentifier(workspace)}.issue_statuses
        WHERE deleted_at IS NULL
        ORDER BY name
      `);
      return result;
    });
  }

  /**
   * Получить типы задач
   */
  async getIssueTypes(workspace: string): Promise<any[]> {
    return this.getDictionary(workspace, 'issue_types', async () => {
      const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT uuid, name, workflow_uuid, created_at
        FROM ${escapeIdentifier(workspace)}.issue_types
        WHERE deleted_at IS NULL
        ORDER BY name
      `);
      return result;
    });
  }

  /**
   * Получить спринты
   */
  async getSprints(workspace: string): Promise<any[]> {
    return this.getDictionary(workspace, 'sprints', async () => {
      const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT uuid, name, project_uuid, start_date, end_date, is_active, created_at
        FROM ${escapeIdentifier(workspace)}.sprints
        WHERE deleted_at IS NULL
        ORDER BY start_date DESC
      `);
      return result;
    });
  }

  /**
   * Получить пользователей
   */
  async getUsers(workspace: string): Promise<any[]> {
    return this.getDictionary(workspace, 'users', async () => {
      const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT uuid, name, login, mail, active, created_at
        FROM ${escapeIdentifier(workspace)}.users
        WHERE deleted_at IS NULL AND active = true
        ORDER BY name
      `);
      return result;
    });
  }

  /**
   * Получить кастомные поля
   */
  async getFields(workspace: string): Promise<any[]> {
    return this.getDictionary(workspace, 'fields', async () => {
      const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT F.uuid, F.name, F.is_custom, FT.code as type_code
        FROM ${escapeIdentifier(workspace)}.fields F
        JOIN ${escapeIdentifier(workspace)}.field_types FT ON F.type_uuid = FT.uuid
        WHERE F.deleted_at IS NULL
        ORDER BY F.name
      `);
      return result;
    });
  }

  /**
   * Получить workflow с нодами
   */
  async getWorkflows(workspace: string): Promise<any[]> {
    return this.getDictionary(workspace, 'workflows', async () => {
      const result: any[] = await this.prisma.$queryRawUnsafe(`
        SELECT 
          W.uuid, 
          W.name,
          COALESCE(
            json_agg(
              json_build_object(
                'uuid', WN.uuid,
                'issue_statuses_uuid', WN.issue_statuses_uuid,
                'status_name', IST.name
              )
            ) FILTER (WHERE WN.uuid IS NOT NULL),
            '[]'
          ) as nodes
        FROM ${escapeIdentifier(workspace)}.workflows W
        LEFT JOIN ${escapeIdentifier(workspace)}.workflow_nodes WN ON WN.workflows_uuid = W.uuid
        LEFT JOIN ${escapeIdentifier(workspace)}.issue_statuses IST ON IST.uuid = WN.issue_statuses_uuid
        WHERE W.deleted_at IS NULL
        GROUP BY W.uuid, W.name
        ORDER BY W.name
      `);
      return result;
    });
  }

  // ==================== Утилиты ====================

  /**
   * Очистить локальный кеш
   */
  clearLocalCache(): void {
    this.localCache.clear();
    logger.debug({ msg: 'Local cache cleared' });
  }

  /**
   * Получить статистику
   */
  async getStats(): Promise<{
    connected: boolean;
    localCacheSize: number;
    redisKeys: number;
  }> {
    let redisKeys = 0;
    if (this.isConnected) {
      try {
        redisKeys = await this.redis.dbsize();
      } catch (err) {
        logger.error({ msg: 'Get redis stats error', error: err });
      }
    }

    return {
      connected: this.isConnected,
      localCacheSize: this.localCache.size,
      redisKeys,
    };
  }

  /**
   * Закрыть соединения
   */
  async close(): Promise<void> {
    await this.subscriber.unsubscribe(CACHE_INVALIDATE_CHANNEL);
    await this.subscriber.quit();
    await this.redis.quit();
    this.localCache.clear();
    logger.info({ msg: 'Zeus2 cache connections closed' });
  }
}

// Singleton instance
let cacheInstance: Zeus2Cache | null = null;

/**
 * Инициализировать кеш (вызывается при старте Zeus2)
 */
export function initCache(prisma: PrismaClient): Zeus2Cache {
  if (!cacheInstance) {
    cacheInstance = new Zeus2Cache(prisma);
  }
  return cacheInstance;
}

/**
 * Получить экземпляр кеша
 */
export function getCache(): Zeus2Cache | null {
  return cacheInstance;
}

export default { initCache, getCache };

