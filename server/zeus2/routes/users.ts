/**
 * Users Routes - с roles и permissions
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:users');

export function registerUsersRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  async function getUserRoles(schema: string, userUuids: string[]): Promise<Map<string, any[]>> {
    const rolesMap = new Map<string, any[]>();
    if (userUuids.length === 0) return rolesMap;

    const placeholders = userUuids.map((_, i) => `$${i + 1}::uuid`).join(',');
    const roles: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        utr.users_uuid AS user_uuid,
        r.uuid AS role_uuid, r.name AS role_name,
        COALESCE(
          json_agg(json_build_object('uuid', p.uuid, 'name', p.name, 'code', p.code)) 
          FILTER (WHERE p.uuid IS NOT NULL), '[]'
        ) AS permissions
      FROM ${escapeIdentifier(schema)}.users_to_roles utr
      JOIN ${escapeIdentifier(schema)}.roles r ON r.uuid = utr.roles_uuid
      LEFT JOIN ${escapeIdentifier(schema)}.roles_to_permissions rtp ON rtp.roles_uuid = r.uuid
      LEFT JOIN ${escapeIdentifier(schema)}.permissions p ON p.uuid = rtp.permissions_uuid
      WHERE utr.users_uuid IN (${placeholders})
      GROUP BY utr.users_uuid, r.uuid, r.name
    `, ...userUuids);

    for (const role of roles) {
      const userRoles = rolesMap.get(role.user_uuid) || [];
      userRoles.push({
        uuid: role.role_uuid,
        name: role.role_name,
        permissions: role.permissions
      });
      rolesMap.set(role.user_uuid, userRoles);
    }

    return rolesMap;
  }

  // GET /api/v2/users
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { active } = req.query;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const conditions: string[] = ['deleted_at IS NULL'];
      if (active !== undefined) {
        conditions.push(`active = ${active === 'true'}`);
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          'users' AS table_name,
          uuid, name, login, mail, active, avatar, telegram, discord,
          created_at, updated_at
        FROM ${escapeIdentifier(schema)}.users
        WHERE ${conditions.join(' AND ')}
        ORDER BY name ASC
      `);

      const userUuids = items.map((u: any) => u.uuid);
      const rolesMap = await getUserRoles(schema, userUuids);

      const result = items.map((item: any) => ({
        ...item,
        roles: rolesMap.get(item.uuid) || []
      }));

      res.json({ rows: result });
    } catch (error: any) {
      logger.error({ msg: 'Error getting users', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения пользователей'));
    }
  });

  // GET /api/v2/users/:uuid
  router.get('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          'users' AS table_name,
          uuid, name, login, mail, active, avatar, telegram, discord,
          telegram_id, discord_id, created_at, updated_at
        FROM ${escapeIdentifier(schema)}.users
        WHERE uuid = $1::uuid AND deleted_at IS NULL
      `, uuid);

      if (items.length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 'Пользователь не найден'));
      }

      const rolesMap = await getUserRoles(schema, [uuid]);
      const result = { ...items[0], roles: rolesMap.get(uuid) || [] };

      res.json({ rows: [result] });
    } catch (error: any) {
      logger.error({ msg: 'Error getting user', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения пользователя'));
    }
  });

  // POST /api/v2/users
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { name, login, mail, active, avatar, telegram, discord, roles } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'name required'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.users 
        (uuid, name, login, mail, active, avatar, telegram, discord, telegram_id, discord_id, created_at, updated_at)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      `, uuid, name, login ?? '', mail ?? '', active ?? true, avatar ?? null, telegram ?? '', discord ?? '', '', '');

      // Assign roles
      // Поддерживаем оба формата:
      //   - массив UUID строк: ['uuid1', 'uuid2']
      //   - массив объектов: [{ uuid: 'uuid1', name: '...' }, ...]
      if (roles && Array.isArray(roles)) {
        for (const role of roles) {
          const roleUuid = typeof role === 'string' ? role : role?.uuid;
          if (roleUuid && isValidUuid(roleUuid)) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.users_to_roles (users_uuid, roles_uuid)
              VALUES ($1::uuid, $2::uuid)
              ON CONFLICT DO NOTHING
            `, uuid, roleUuid);
          }
        }
      }

      // Return created user
      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          'users' AS table_name,
          uuid, name, login, mail, active, avatar, telegram, discord,
          created_at, updated_at
        FROM ${escapeIdentifier(schema)}.users
        WHERE uuid = $1::uuid
      `, uuid);

      const rolesMap = await getUserRoles(schema, [uuid]);
      const result = { ...items[0], roles: rolesMap.get(uuid) || [] };

      res.status(201).json({ rows: [result] });
    } catch (error: any) {
      logger.error({ msg: 'Error creating user', error: error.message });
      if (error.code === '23505') {
        return res.status(409).json(createErrorResponse(req, 'CONFLICT', 'Пользователь уже существует'));
      }
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания пользователя'));
    }
  });

  // PUT /api/v2/users/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { name, login, mail, active, avatar, telegram, discord, telegram_id, discord_id, roles } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        setClauses.push(`name = $${paramIndex}`);
        values.push(name);
        paramIndex++;
      }
      if (login !== undefined) {
        setClauses.push(`login = $${paramIndex}`);
        values.push(login || null);
        paramIndex++;
      }
      if (mail !== undefined) {
        setClauses.push(`mail = $${paramIndex}`);
        values.push(mail || null);
        paramIndex++;
      }
      if (active !== undefined) {
        setClauses.push(`active = $${paramIndex}`);
        values.push(active);
        paramIndex++;
      }
      if (avatar !== undefined) {
        setClauses.push(`avatar = $${paramIndex}`);
        values.push(avatar || null);
        paramIndex++;
      }
      if (telegram !== undefined) {
        setClauses.push(`telegram = $${paramIndex}`);
        values.push(telegram || '');  // NOT NULL column, use empty string
        paramIndex++;
      }
      if (discord !== undefined) {
        setClauses.push(`discord = $${paramIndex}`);
        values.push(discord || '');  // NOT NULL column, use empty string
        paramIndex++;
      }
      if (telegram_id !== undefined) {
        setClauses.push(`telegram_id = $${paramIndex}`);
        values.push(telegram_id || '');  // NOT NULL column, use empty string
        paramIndex++;
      }
      if (discord_id !== undefined) {
        setClauses.push(`discord_id = $${paramIndex}`);
        values.push(discord_id || '');  // NOT NULL column, use empty string
        paramIndex++;
      }

      values.push(uuid);
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.users
        SET ${setClauses.join(', ')}
        WHERE uuid = $${paramIndex}::uuid
      `, ...values);

      // Update roles - только если roles явно передан в запросе
      // По парадигме Full Replace: undefined = не трогаем, [] = удаляем все, [...] = заменяем
      // Поддерживаем оба формата:
      //   - массив UUID строк: ['uuid1', 'uuid2']
      //   - массив объектов: [{ uuid: 'uuid1', name: '...' }, ...]
      if (roles !== undefined && Array.isArray(roles)) {
        // Remove old roles
        await prisma.$executeRawUnsafe(`
          DELETE FROM ${escapeIdentifier(schema)}.users_to_roles WHERE users_uuid = $1::uuid
        `, uuid);
        // Add new roles
        for (const role of roles) {
          // Поддержка обоих форматов: объект {uuid: '...'} или строка 'uuid'
          const roleUuid = typeof role === 'string' ? role : role?.uuid;
          if (roleUuid && isValidUuid(roleUuid)) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.users_to_roles (users_uuid, roles_uuid)
              VALUES ($1::uuid, $2::uuid)
              ON CONFLICT DO NOTHING
            `, uuid, roleUuid);
          }
        }
      }

      // Return updated user
      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          'users' AS table_name,
          uuid, name, login, mail, active, avatar, telegram, discord,
          created_at, updated_at
        FROM ${escapeIdentifier(schema)}.users
        WHERE uuid = $1::uuid
      `, uuid);

      const rolesMap = await getUserRoles(schema, [uuid]);
      const result = { ...items[0], roles: rolesMap.get(uuid) || [] };

      res.json({ rows: [result] });
    } catch (error: any) {
      logger.error({ msg: 'Error updating user', error: error.message, stack: error.stack, code: error.code });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', `Ошибка обновления пользователя: ${error.message}`));
    }
  });

  // DELETE /api/v2/users/:uuid
  router.delete('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.users
        SET deleted_at = NOW()
        WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting user', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления пользователя'));
    }
  });

  app.use(`${apiPrefix}/users`, router);

  listeners.push({ method: 'get', func: 'read_users', entity: 'users' });
  listeners.push({ method: 'get', func: 'read_user', entity: 'user' });
  listeners.push({ method: 'post', func: 'create_users', entity: 'users' });
  listeners.push({ method: 'post', func: 'upsert_users', entity: 'users' });
  listeners.push({ method: 'post', func: 'upsert_user', entity: 'user' });
  listeners.push({ method: 'put', func: 'update_users', entity: 'users' });
  listeners.push({ method: 'delete', func: 'delete_users', entity: 'users' });

  logger.info({ msg: 'Users routes registered' });
}
