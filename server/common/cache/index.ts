/**
 * Unkaos Cache Library
 * 
 * Централизованная библиотека кеширования на базе Redis.
 * Используется всеми сервисами для единообразной работы с кешем.
 * 
 * Что кешируем:
 * - Права пользователей (roles, projects permissions)
 * - Справочники (statuses, types, projects, sprints, workflows)
 * - Пользователи (для быстрого lookup)
 * 
 * Что НЕ кешируем:
 * - Issues (слишком динамичные)
 * - Comments / Issue actions (растут бесконечно)
 * - Time entries (растут бесконечно)
 * - Attachments (бинарные данные)
 * - Field values (привязаны к issues)
 */

// @ts-ignore - ioredis types will be available after npm install
import Redis from 'ioredis';
import { createLogger } from '../logging';

const logger = createLogger('cache');

// Типы кешируемых данных
export type CacheableEntity = 
  | 'user_permissions'   // Права пользователя
  | 'projects'           // Список проектов
  | 'issue_statuses'     // Статусы задач
  | 'issue_types'        // Типы задач
  | 'workflows'          // Workflow и их ноды
  | 'sprints'            // Спринты
  | 'users'              // Пользователи
  | 'roles'              // Роли
  | 'fields'             // Кастомные поля
  | 'field_types'        // Типы полей
  | 'boards'             // Доски
  | 'dashboards'         // Дашборды
  | 'relation_types'     // Типы связей
  | 'issue_tags';        // Теги задач

// TTL для разных типов данных (в секундах)
export const CACHE_TTL: Record<CacheableEntity, number> = {
  user_permissions: 3600,    // 1 час - права меняются редко
  projects: 600,             // 10 минут
  issue_statuses: 900,       // 15 минут
  issue_types: 900,          // 15 минут
  workflows: 900,            // 15 минут
  sprints: 300,              // 5 минут - спринты активнее меняются
  users: 600,                // 10 минут
  roles: 900,                // 15 минут
  fields: 600,               // 10 минут
  field_types: 3600,         // 1 час - почти не меняются
  boards: 300,               // 5 минут
  dashboards: 300,           // 5 минут
  relation_types: 3600,      // 1 час - почти не меняются
  issue_tags: 600,           // 10 минут
};

// Канал для инвалидации кеша через Pub/Sub
export const CACHE_INVALIDATE_CHANNEL = 'cache:invalidate';

// Структура сообщения инвалидации
export interface CacheInvalidateMessage {
  entity: CacheableEntity | string;
  workspace: string;
  uuid?: string;           // Если указан - инвалидировать конкретный элемент
  pattern?: string;        // Если указан - инвалидировать по паттерну
  timestamp: number;
}

/**
 * Класс для работы с кешем Redis
 */
export class UnkaosCache {
  private redis: Redis;
  private subscriber: Redis | null = null;
  private isConnected: boolean = false;
  private invalidateHandlers: Map<string, (msg: CacheInvalidateMessage) => void> = new Map();

  constructor(redisUrl?: string) {
    const url = redisUrl || process.env.REDIS_URL || 'redis://localhost:6379';
    
    this.redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 10) {
          logger.error({ msg: 'Redis connection failed after 10 retries' });
          return null;
        }
        return Math.min(times * 200, 2000);
      },
      reconnectOnError: (err) => {
        logger.warn({ msg: 'Redis reconnecting on error', error: err.message });
        return true;
      }
    });

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info({ msg: 'Redis connected', url: url.replace(/\/\/.*@/, '//***@') });
    });

    this.redis.on('error', (err) => {
      this.isConnected = false;
      logger.error({ msg: 'Redis error', error: err.message });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn({ msg: 'Redis connection closed' });
    });
  }

  /**
   * Проверка подключения
   */
  isReady(): boolean {
    return this.isConnected;
  }

  /**
   * Генерация ключа кеша
   */
  private buildKey(workspace: string, entity: CacheableEntity | string, uuid?: string): string {
    if (uuid) {
      return `cache:${workspace}:${entity}:${uuid}`;
    }
    return `cache:${workspace}:${entity}`;
  }

  /**
   * Получить данные из кеша
   */
  async get<T>(workspace: string, entity: CacheableEntity, uuid?: string): Promise<T | null> {
    if (!this.isConnected) return null;

    const key = this.buildKey(workspace, entity, uuid);
    try {
      const data = await this.redis.get(key);
      if (data) {
        logger.debug({ msg: 'Cache hit', key });
        return JSON.parse(data) as T;
      }
      logger.debug({ msg: 'Cache miss', key });
      return null;
    } catch (err) {
      logger.error({ msg: 'Cache get error', key, error: err });
      return null;
    }
  }

  /**
   * Сохранить данные в кеш
   */
  async set<T>(workspace: string, entity: CacheableEntity, data: T, uuid?: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const key = this.buildKey(workspace, entity, uuid);
    const ttl = CACHE_TTL[entity] || 300;

    try {
      await this.redis.setex(key, ttl, JSON.stringify(data));
      logger.debug({ msg: 'Cache set', key, ttl });
      return true;
    } catch (err) {
      logger.error({ msg: 'Cache set error', key, error: err });
      return false;
    }
  }

  /**
   * Удалить конкретный ключ
   */
  async delete(workspace: string, entity: CacheableEntity | string, uuid?: string): Promise<boolean> {
    if (!this.isConnected) return false;

    const key = this.buildKey(workspace, entity, uuid);
    try {
      await this.redis.del(key);
      logger.debug({ msg: 'Cache delete', key });
      return true;
    } catch (err) {
      logger.error({ msg: 'Cache delete error', key, error: err });
      return false;
    }
  }

  /**
   * Инвалидировать все ключи сущности в workspace
   */
  async invalidateEntity(workspace: string, entity: CacheableEntity | string): Promise<number> {
    if (!this.isConnected) return 0;

    const pattern = `cache:${workspace}:${entity}:*`;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info({ msg: 'Cache invalidated', pattern, count: keys.length });
      }
      
      // Также удаляем ключ списка (без uuid)
      const listKey = this.buildKey(workspace, entity);
      await this.redis.del(listKey);
      
      return keys.length + 1;
    } catch (err) {
      logger.error({ msg: 'Cache invalidate error', pattern, error: err });
      return 0;
    }
  }

  /**
   * Инвалидировать весь кеш workspace
   */
  async invalidateWorkspace(workspace: string): Promise<number> {
    if (!this.isConnected) return 0;

    const pattern = `cache:${workspace}:*`;
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info({ msg: 'Workspace cache invalidated', workspace, count: keys.length });
      }
      return keys.length;
    } catch (err) {
      logger.error({ msg: 'Workspace invalidate error', workspace, error: err });
      return 0;
    }
  }

  // ==================== Права пользователей ====================

  /**
   * Получить права пользователя
   */
  async getUserPermissions(workspace: string, userUuid: string): Promise<{
    roles: any[];
    projects_r: string[];
    projects_w: string[];
  } | null> {
    const key = `perms:${workspace}:${userUuid}`;
    try {
      const data = await this.redis.hgetall(key);
      if (!data || !data.roles) {
        return null;
      }
      return {
        roles: JSON.parse(data.roles || '[]'),
        projects_r: JSON.parse(data.projects_r || '[]'),
        projects_w: JSON.parse(data.projects_w || '[]'),
      };
    } catch (err) {
      logger.error({ msg: 'Get user permissions error', key, error: err });
      return null;
    }
  }

  /**
   * Сохранить права пользователя
   */
  async setUserPermissions(workspace: string, userUuid: string, permissions: {
    roles: any[];
    projects_r: string[];
    projects_w: string[];
  }): Promise<boolean> {
    const key = `perms:${workspace}:${userUuid}`;
    const ttl = CACHE_TTL.user_permissions;

    try {
      await this.redis.hset(key, {
        roles: JSON.stringify(permissions.roles),
        projects_r: JSON.stringify(permissions.projects_r),
        projects_w: JSON.stringify(permissions.projects_w),
      });
      await this.redis.expire(key, ttl);
      logger.debug({ msg: 'User permissions cached', workspace, userUuid });
      return true;
    } catch (err) {
      logger.error({ msg: 'Set user permissions error', key, error: err });
      return false;
    }
  }

  /**
   * Удалить права пользователя из кеша
   */
  async deleteUserPermissions(workspace: string, userUuid: string): Promise<boolean> {
    const key = `perms:${workspace}:${userUuid}`;
    try {
      await this.redis.del(key);
      logger.debug({ msg: 'User permissions invalidated', workspace, userUuid });
      return true;
    } catch (err) {
      logger.error({ msg: 'Delete user permissions error', key, error: err });
      return false;
    }
  }

  // ==================== Pub/Sub для инвалидации ====================

  /**
   * Опубликовать сообщение об инвалидации
   */
  async publishInvalidate(message: Omit<CacheInvalidateMessage, 'timestamp'>): Promise<void> {
    if (!this.isConnected) return;

    const fullMessage: CacheInvalidateMessage = {
      ...message,
      timestamp: Date.now(),
    };

    try {
      await this.redis.publish(CACHE_INVALIDATE_CHANNEL, JSON.stringify(fullMessage));
      logger.debug({ msg: 'Invalidate published', channel: CACHE_INVALIDATE_CHANNEL, message: fullMessage });
    } catch (err) {
      logger.error({ msg: 'Publish invalidate error', error: err });
    }
  }

  /**
   * Подписаться на события инвалидации
   */
  async subscribeToInvalidation(handler: (msg: CacheInvalidateMessage) => void): Promise<void> {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Создаём отдельное подключение для подписки
    this.subscriber = new Redis(url);
    
    this.subscriber.subscribe(CACHE_INVALIDATE_CHANNEL, (err) => {
      if (err) {
        logger.error({ msg: 'Subscribe error', error: err.message });
      } else {
        logger.info({ msg: 'Subscribed to cache invalidation channel' });
      }
    });

    this.subscriber.on('message', (channel, message) => {
      if (channel === CACHE_INVALIDATE_CHANNEL) {
        try {
          const msg = JSON.parse(message) as CacheInvalidateMessage;
          handler(msg);
        } catch (err) {
          logger.error({ msg: 'Invalid invalidation message', message, error: err });
        }
      }
    });
  }

  /**
   * Отписаться от событий инвалидации
   */
  async unsubscribeFromInvalidation(): Promise<void> {
    if (this.subscriber) {
      await this.subscriber.unsubscribe(CACHE_INVALIDATE_CHANNEL);
      await this.subscriber.quit();
      this.subscriber = null;
    }
  }

  // ==================== Утилиты ====================

  /**
   * Получить статистику кеша
   */
  async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
  }> {
    if (!this.isConnected) {
      return { connected: false, keys: 0, memory: '0' };
    }

    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const keys = await this.redis.dbsize();

      return {
        connected: true,
        keys,
        memory: memoryMatch ? memoryMatch[1].trim() : 'unknown',
      };
    } catch (err) {
      logger.error({ msg: 'Get stats error', error: err });
      return { connected: false, keys: 0, memory: '0' };
    }
  }

  /**
   * Закрыть соединение
   */
  async close(): Promise<void> {
    await this.unsubscribeFromInvalidation();
    await this.redis.quit();
    this.isConnected = false;
    logger.info({ msg: 'Redis connection closed' });
  }
}

// Singleton instance
let cacheInstance: UnkaosCache | null = null;

/**
 * Получить singleton экземпляр кеша
 */
export function getCache(): UnkaosCache {
  if (!cacheInstance) {
    cacheInstance = new UnkaosCache();
  }
  return cacheInstance;
}

/**
 * Создать новый экземпляр кеша (для тестов или специальных случаев)
 */
export function createCache(redisUrl?: string): UnkaosCache {
  return new UnkaosCache(redisUrl);
}

export default getCache;

