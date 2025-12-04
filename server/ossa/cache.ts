/**
 * Ossa Cache Manager
 * 
 * Управляет кешированием данных в Redis.
 * Слушает PostgreSQL NOTIFY и инвалидирует кеш при изменениях.
 * Публикует события инвалидации через Redis Pub/Sub.
 */

// @ts-ignore - ioredis types will be available after npm install
import Redis from 'ioredis';
import sql from "./sql";
import { createLogger } from '../common/logging';

const logger = createLogger('ossa:cache');

// Type for Redis retry strategy
type RetryStrategy = (times: number) => number | null;

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

// Канал для инвалидации кеша через Pub/Sub
const CACHE_INVALIDATE_CHANNEL = 'cache:invalidate';

// Таблицы, изменения которых НЕ триггерят инвалидацию кеша
// (динамические данные, которые не кешируются)
const IGNORED_TABLES = new Set([
  'issues',
  'issue_actions',
  'field_values',
  'time_entries',
  'attachments',
  'relations',
  'issue_tags_selected',
  'watchers',
  'old_issues_num',
]);

// Маппинг таблиц БД на типы кешируемых сущностей
const TABLE_TO_ENTITY: Record<string, string> = {
  'users': 'users',
  'users_to_roles': 'user_permissions',
  'roles': 'roles',
  'projects_permissions': 'user_permissions',
  'projects': 'projects',
  'issue_statuses': 'issue_statuses',
  'issue_types': 'issue_types',
  'issue_types_to_fields': 'issue_types',
  'workflows': 'workflows',
  'workflow_nodes': 'workflows',
  'transitions': 'workflows',
  'sprints': 'sprints',
  'fields': 'fields',
  'field_types': 'field_types',
  'boards': 'boards',
  'boards_to_projects': 'boards',
  'dashboards': 'dashboards',
  'gadgets': 'dashboards',
  'relation_types': 'relation_types',
  'issue_tags': 'issue_tags',
};

export default class Cache {
  private redis: Redis;
  private publisher: Redis;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Основное подключение для чтения/записи
    const retryStrategy: RetryStrategy = (times: number): number | null => {
      if (times > 10) {
        logger.error({ msg: 'Redis connection failed after 10 retries' });
        return null;
      }
      return Math.min(times * 200, 2000);
    };

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy
    });

    // Отдельное подключение для публикации (рекомендация ioredis)
    this.publisher = new Redis(redisUrl);

    this.redis.on('connect', () => {
      this.isConnected = true;
      logger.info({ msg: 'Redis connected', url: redisUrl.replace(/\/\/.*@/, '//***@') });
    });

    this.redis.on('error', (err: Error) => {
      this.isConnected = false;
      logger.error({ msg: 'Redis error', error: err.message });
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      logger.warn({ msg: 'Redis connection closed' });
    });
  }

  /**
   * Инициализация кеша
   */
  public async init() {
    logger.info({ msg: 'Initializing cache manager' });

    // Ждём подключения к Redis
    await this.waitForConnection();

    // Загружаем права пользователей из БД
    await this.loadAllUserPermissions();

    // Подписываемся на изменения в PostgreSQL
    await sql.subscribe('*', this.handleNotify.bind(this), this.handleSubscribeConnect.bind(this));

    // Помечаем что кеш инициализирован
    await this.redis.set('ossa:initialized', new Date().toISOString());

    logger.info({ msg: 'Cache initialization complete' });
  }

  /**
   * Ожидание подключения к Redis
   */
  private async waitForConnection(timeout: number = 10000): Promise<void> {
    const start = Date.now();
    while (!this.isConnected && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!this.isConnected) {
      throw new Error('Redis connection timeout');
    }
  }

  // ==================== Права пользователей ====================

  /**
   * Загрузка прав всех пользователей из БД
   */
  private async loadAllUserPermissions() {
    const schemas = await sql`    
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'admin', 'public') 
      AND schema_name NOT LIKE 'pg_%'
    `;

    logger.info({
      msg: 'Loading user permissions from database',
      workspaces: schemas.length
    });

    for (const row of schemas) {
      const workspace = row.schema_name;
      await this.loadWorkspaceUserPermissions(workspace);
    }
  }

  /**
   * Загрузка прав пользователей для одного workspace
   */
  private async loadWorkspaceUserPermissions(workspace: string) {
    logger.debug({ msg: 'Loading workspace user permissions', workspace });

    try {
      // Загружаем роли пользователей
      const users = await sql`
        SELECT 
            U.uuid,
            U.name,
            U.login,
            U.mail,
            json_agg(json_build_object('uuid', R.uuid, 'name', R.name)) FILTER (WHERE R.uuid IS NOT NULL) as roles
        FROM ${sql(workspace + '.users')} U
        LEFT JOIN ${sql(workspace + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
        LEFT JOIN ${sql(workspace + '.roles')} R ON R.uuid = UR.roles_uuid AND R.deleted_at IS NULL
        WHERE U.active 
        AND U.deleted_at IS NULL
        GROUP BY U.uuid, U.name, U.login, U.mail
      `;

      // Загружаем права на проекты
      const usersProjects = await sql`
        SELECT
            U.uuid as user_uuid,
            COALESCE(
              json_agg(DISTINCT PPR.projects_uuid) FILTER (WHERE PPR.projects_uuid IS NOT NULL), 
              '[]'
            ) as projects_r,
            COALESCE(
              json_agg(DISTINCT PPW.projects_uuid) FILTER (WHERE PPW.projects_uuid IS NOT NULL), 
              '[]'
            ) as projects_w
        FROM ${sql(workspace + '.users')} U
        LEFT JOIN ${sql(workspace + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
        LEFT JOIN ${sql(workspace + '.roles')} R ON R.uuid = UR.roles_uuid AND R.deleted_at IS NULL
        LEFT JOIN ${sql(workspace + '.projects_permissions')} PPR 
          ON PPR.roles_uuid = R.uuid AND PPR.deleted_at IS NULL
        LEFT JOIN ${sql(workspace + '.projects_permissions')} PPW 
          ON PPW.roles_uuid = R.uuid AND PPW.deleted_at IS NULL AND PPW.allow = 'CRUD'
        WHERE U.active AND U.deleted_at IS NULL
        GROUP BY U.uuid
      `;

      // Создаём маппинг uuid -> projects
      const projectsMap = new Map<string, { r: string[], w: string[] }>();
      for (const up of usersProjects) {
        projectsMap.set(up.user_uuid, {
          r: up.projects_r || [],
          w: up.projects_w || []
        });
      }

      // Сохраняем в Redis с использованием pipeline для производительности
      const pipeline = this.redis.pipeline();

      for (const user of users) {
        const projects = projectsMap.get(user.uuid) || { r: [], w: [] };
        const key = `perms:${workspace}:${user.uuid}`;

        pipeline.hset(key, {
          roles: JSON.stringify(user.roles || []),
          projects_r: JSON.stringify(projects.r),
          projects_w: JSON.stringify(projects.w),
        });
        pipeline.expire(key, CACHE_TTL.user_permissions);
      }

      await pipeline.exec();

      logger.info({
        msg: 'Workspace user permissions loaded',
        workspace,
        users: users.length
      });
    } catch (err) {
      logger.error({
        msg: 'Failed to load workspace user permissions',
        workspace,
        error: err
      });
    }
  }

  /**
   * Обновление прав конкретного пользователя
   */
  private async updateUserPermissions(workspace: string, userUuid: string) {
    logger.debug({ msg: 'Updating user permissions', workspace, userUuid });

    try {
      // Получаем роли пользователя
      const [user] = await sql`
        SELECT 
            U.uuid,
            json_agg(json_build_object('uuid', R.uuid, 'name', R.name)) FILTER (WHERE R.uuid IS NOT NULL) as roles
        FROM ${sql(workspace + '.users')} U
        LEFT JOIN ${sql(workspace + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
        LEFT JOIN ${sql(workspace + '.roles')} R ON R.uuid = UR.roles_uuid AND R.deleted_at IS NULL
        WHERE U.uuid = ${userUuid}
        AND U.active 
        AND U.deleted_at IS NULL
        GROUP BY U.uuid
      `;

      if (!user) {
        // Пользователь удалён или неактивен - удаляем из кеша
        await this.redis.del(`perms:${workspace}:${userUuid}`);
        return;
      }

      // Получаем права на проекты
      const [projects] = await sql`
        SELECT
            COALESCE(
              json_agg(DISTINCT PPR.projects_uuid) FILTER (WHERE PPR.projects_uuid IS NOT NULL), 
              '[]'
            ) as projects_r,
            COALESCE(
              json_agg(DISTINCT PPW.projects_uuid) FILTER (WHERE PPW.projects_uuid IS NOT NULL), 
              '[]'
            ) as projects_w
        FROM ${sql(workspace + '.users')} U
        LEFT JOIN ${sql(workspace + '.users_to_roles')} UR ON UR.users_uuid = U.uuid
        LEFT JOIN ${sql(workspace + '.roles')} R ON R.uuid = UR.roles_uuid AND R.deleted_at IS NULL
        LEFT JOIN ${sql(workspace + '.projects_permissions')} PPR 
          ON PPR.roles_uuid = R.uuid AND PPR.deleted_at IS NULL
        LEFT JOIN ${sql(workspace + '.projects_permissions')} PPW 
          ON PPW.roles_uuid = R.uuid AND PPW.deleted_at IS NULL AND PPW.allow = 'CRUD'
        WHERE U.uuid = ${userUuid}
        AND U.active AND U.deleted_at IS NULL
      `;

      const key = `perms:${workspace}:${userUuid}`;
      await this.redis.hset(key, {
        roles: JSON.stringify(user.roles || []),
        projects_r: JSON.stringify(projects?.projects_r || []),
        projects_w: JSON.stringify(projects?.projects_w || []),
      });
      await this.redis.expire(key, CACHE_TTL.user_permissions);

      logger.debug({ msg: 'User permissions updated', workspace, userUuid });
    } catch (err) {
      logger.error({
        msg: 'Failed to update user permissions',
        workspace,
        userUuid,
        error: err
      });
    }
  }

  // ==================== Справочники ====================

  /**
   * Инвалидация кеша сущности
   */
  private async invalidateEntity(workspace: string, entity: string, uuid?: string) {
    if (uuid) {
      // Удаляем конкретный элемент
      await this.redis.del(`cache:${workspace}:${entity}:${uuid}`);
    }
    // Удаляем список сущностей
    await this.redis.del(`cache:${workspace}:${entity}`);
    
    // Удаляем все связанные ключи по паттерну
    const pattern = `cache:${workspace}:${entity}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    logger.debug({ msg: 'Entity cache invalidated', workspace, entity, uuid, keysDeleted: keys.length });
  }

  // ==================== PostgreSQL NOTIFY Handler ====================

  /**
   * Обработка уведомлений от PostgreSQL
   */
  private async handleNotify(row: any, { command, relation, key, old }: any) {
    const table = relation.table;
    const workspace = relation.schema;

    // Игнорируем таблицы с динамическими данными
    if (IGNORED_TABLES.has(table)) {
      return;
    }

    const entity = TABLE_TO_ENTITY[table];
    if (!entity) {
      logger.debug({ msg: 'Unknown table, skipping cache invalidation', table, workspace });
      return;
    }

    logger.info({
      msg: 'Cache invalidation triggered',
      table,
      workspace,
      command,
      entity
    });

    // Специальная обработка для прав пользователей
    if (entity === 'user_permissions') {
      await this.handlePermissionsChange(workspace, table, row, old);
    } else if (table === 'users') {
      // При изменении пользователя обновляем его права
      const userUuid = row?.uuid || old?.uuid;
      if (userUuid) {
        await this.updateUserPermissions(workspace, userUuid);
      }
    } else {
      // Для остальных сущностей - просто инвалидируем кеш
      const uuid = row?.uuid || old?.uuid;
      await this.invalidateEntity(workspace, entity, uuid);
    }

    // Публикуем событие инвалидации для других сервисов
    await this.publishInvalidation(workspace, entity, row?.uuid || old?.uuid);
  }

  /**
   * Обработка изменений в правах доступа
   */
  private async handlePermissionsChange(workspace: string, table: string, row: any, old: any) {
    if (table === 'users_to_roles') {
      // Изменение связи пользователь-роль
      const userUuid = row?.users_uuid || old?.users_uuid;
      if (userUuid) {
        await this.updateUserPermissions(workspace, userUuid);
      }
    } else if (table === 'projects_permissions' || table === 'roles') {
      // При изменении прав проекта или роли - обновляем всех пользователей с этой ролью
      const roleUuid = row?.roles_uuid || row?.uuid || old?.roles_uuid || old?.uuid;
      if (roleUuid) {
        await this.updateUsersWithRole(workspace, roleUuid);
      }
    }
  }

  /**
   * Обновление прав всех пользователей с определённой ролью
   */
  private async updateUsersWithRole(workspace: string, roleUuid: string) {
    try {
      const users = await sql`
        SELECT users_uuid 
        FROM ${sql(workspace + '.users_to_roles')} 
        WHERE roles_uuid = ${roleUuid}
      `;

      logger.info({
        msg: 'Updating permissions for users with role',
        workspace,
        roleUuid,
        usersCount: users.length
      });

      for (const user of users) {
        await this.updateUserPermissions(workspace, user.users_uuid);
      }
    } catch (err) {
      logger.error({
        msg: 'Failed to update users with role',
        workspace,
        roleUuid,
        error: err
      });
    }
  }

  /**
   * Публикация события инвалидации через Redis Pub/Sub
   */
  private async publishInvalidation(workspace: string, entity: string, uuid?: string) {
    const message = {
      entity,
      workspace,
      uuid,
      timestamp: Date.now(),
    };

    try {
      await this.publisher.publish(CACHE_INVALIDATE_CHANNEL, JSON.stringify(message));
      logger.debug({ msg: 'Invalidation published', channel: CACHE_INVALIDATE_CHANNEL, message });
    } catch (err) {
      logger.error({ msg: 'Failed to publish invalidation', error: err });
    }
  }

  /**
   * Callback при подключении к PostgreSQL subscription
   */
  private handleSubscribeConnect() {
    logger.info({ msg: 'PostgreSQL subscription connected' });
  }

  // ==================== Публичные методы ====================

  /**
   * Получить статистику кеша
   */
  public async getStats(): Promise<{
    connected: boolean;
    keys: number;
    memory: string;
    workspaces: string[];
  }> {
    if (!this.isConnected) {
      return { connected: false, keys: 0, memory: '0', workspaces: [] };
    }

    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const keys = await this.redis.dbsize();

      // Получаем список workspace из ключей permissions
      const permsKeys: string[] = await this.redis.keys('perms:*');
      const workspaceSet = new Set<string>();
      permsKeys.forEach((k: string) => {
        const ws = k.split(':')[1];
        if (ws) workspaceSet.add(ws);
      });
      const workspaces: string[] = Array.from(workspaceSet);

      return {
        connected: true,
        keys,
        memory: memoryMatch ? memoryMatch[1].trim() : 'unknown',
        workspaces,
      };
    } catch (err) {
      logger.error({ msg: 'Get stats error', error: err });
      return { connected: false, keys: 0, memory: '0', workspaces: [] };
    }
  }

  /**
   * Принудительная перезагрузка кеша workspace
   */
  public async reloadWorkspace(workspace: string) {
    logger.info({ msg: 'Force reloading workspace cache', workspace });

    // Удаляем все ключи workspace
    const patterns = [`cache:${workspace}:*`, `perms:${workspace}:*`];
    for (const pattern of patterns) {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    }

    // Перезагружаем права пользователей
    await this.loadWorkspaceUserPermissions(workspace);

    // Публикуем событие полной инвалидации
    await this.publishInvalidation(workspace, '*');
  }

  /**
   * Закрытие соединений
   */
  public async close() {
    await this.redis.quit();
    await this.publisher.quit();
    this.isConnected = false;
    logger.info({ msg: 'Cache connections closed' });
  }
}
