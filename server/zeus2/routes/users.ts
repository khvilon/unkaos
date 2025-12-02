import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('zeus2:users');

interface Listener {
  method: string;
  func: string;
  entity: string;
}

function formatItem(item: any, roles: any[] = []) {
  return {
    uuid: item.uuid,
    name: item.name,
    login: item.login,
    mail: item.mail,
    active: item.active,
    avatar: item.avatar,
    telegram: item.telegram,
    discord: item.discord,
    roles: roles,
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

function formatItemFull(item: any, roles: any[] = []) {
  return {
    ...formatItem(item, roles),
    telegram_id: item.telegram_id,
    discord_id: item.discord_id
  };
}

function errorResponse(req: Request, code: string, message: string, details: any[] = []) {
  return {
    code,
    message,
    trace_id: req.headers['x-trace-id'] as string,
    details
  };
}

export function registerUsersRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const entityName = 'users';
  const basePath = `${apiPrefix}/${entityName}`;

  // GET /api/v2/users - Получение списка
  app.get(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { page = '1', limit = '20', sort, active } = req.query;

      logger.info({ msg: 'GET users', subdomain, page, limit });

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      let whereClause = 'WHERE deleted_at IS NULL';
      if (active !== undefined) {
        whereClause += ` AND active = ${active === 'true'}`;
      }

      let orderClause = 'ORDER BY name ASC';
      if (sort) {
        const [field, direction] = (sort as string).split(',');
        const validFields = ['name', 'login', 'mail', 'active', 'created_at', 'updated_at'];
        if (validFields.includes(field)) {
          orderClause = `ORDER BY ${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
        }
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, login, mail, active, avatar, telegram, discord, created_at, updated_at
        FROM "${subdomain}".users
        ${whereClause}
        ${orderClause}
        LIMIT ${limitNum} OFFSET ${skip}
      `);

      const totalResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${subdomain}".users ${whereClause}
      `);
      const total = Number(totalResult[0]?.count || 0);

      // Fetch roles for all users with permissions
      const userUuids = items.map(u => `'${u.uuid}'`).join(',');
      let userRolesMap: Map<string, any[]> = new Map();
      
      if (items.length > 0) {
        const userRoles: any[] = await prisma.$queryRawUnsafe(`
          SELECT utr.users_uuid, r.uuid, r.name, r.is_custom
          FROM "${subdomain}".users_to_roles utr
          JOIN "${subdomain}".roles r ON r.uuid = utr.roles_uuid
          WHERE utr.users_uuid IN (${userUuids}) AND r.deleted_at IS NULL
        `);

        // Get all role UUIDs to fetch permissions
        const roleUuids = [...new Set(userRoles.map(ur => ur.uuid))];
        let rolePermissionsMap: Map<string, any[]> = new Map();

        if (roleUuids.length > 0) {
          const rolePermissions: any[] = await prisma.$queryRawUnsafe(`
            SELECT rtp.roles_uuid, p.uuid, p.code, p.name, p.targets
            FROM "${subdomain}".roles_to_permissions rtp
            JOIN "${subdomain}".permissions p ON p.uuid = rtp.permissions_uuid
            WHERE rtp.roles_uuid IN (${roleUuids.map(u => `'${u}'`).join(',')}) AND p.deleted_at IS NULL
          `);

          for (const rp of rolePermissions) {
            if (!rolePermissionsMap.has(rp.roles_uuid)) {
              rolePermissionsMap.set(rp.roles_uuid, []);
            }
            rolePermissionsMap.get(rp.roles_uuid)!.push({
              uuid: rp.uuid,
              code: rp.code,
              name: rp.name,
              targets: rp.targets
            });
          }
        }
        
        for (const ur of userRoles) {
          if (!userRolesMap.has(ur.users_uuid)) {
            userRolesMap.set(ur.users_uuid, []);
          }
          userRolesMap.get(ur.users_uuid)!.push({
            uuid: ur.uuid,
            name: ur.name,
            is_custom: ur.is_custom,
            permissions: rolePermissionsMap.get(ur.uuid) || []
          });
        }
      }

      res.status(200).json({
        items: items.map(item => formatItem(item, userRolesMap.get(item.uuid) || [])),
        page: pageNum,
        limit: limitNum,
        total
      });

    } catch (error) {
      logger.error({ msg: 'Error getting users', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: basePath, entity: entityName });

  // GET /api/v2/users/:uuid
  app.get(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'GET user by UUID', subdomain, uuid });

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, login, mail, active, avatar, telegram, discord, telegram_id, discord_id, created_at, updated_at
        FROM "${subdomain}".users
        WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (items.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Пользователь не найден'));
      }

      // Fetch roles for user with permissions
      const userRoles: any[] = await prisma.$queryRawUnsafe(`
        SELECT r.uuid, r.name, r.is_custom
        FROM "${subdomain}".users_to_roles utr
        JOIN "${subdomain}".roles r ON r.uuid = utr.roles_uuid
        WHERE utr.users_uuid = '${uuid}' AND r.deleted_at IS NULL
      `);

      // Fetch permissions for each role
      const rolesWithPermissions = await Promise.all(userRoles.map(async (role) => {
        const permissions: any[] = await prisma.$queryRawUnsafe(`
          SELECT p.uuid, p.code, p.name, p.targets
          FROM "${subdomain}".roles_to_permissions rtp
          JOIN "${subdomain}".permissions p ON p.uuid = rtp.permissions_uuid
          WHERE rtp.roles_uuid = '${role.uuid}' AND p.deleted_at IS NULL
        `);
        return {
          ...role,
          permissions
        };
      }));

      res.status(200).json(formatItemFull(items[0], rolesWithPermissions));

    } catch (error) {
      logger.error({ msg: 'Error getting user', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: `${basePath}/:uuid`, entity: entityName });

  // POST /api/v2/users
  app.post(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid, name, login, mail, password, active = true, avatar, telegram, discord } = req.body;

      if (!name || !login || !mail) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name, login и mail обязательны'));
      }

      logger.info({ msg: 'POST user', subdomain, name, login });

      // Check for duplicate login or mail (excluding current uuid if provided)
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".users 
        WHERE (login = '${login}' OR mail = '${mail}') 
        AND deleted_at IS NULL
        ${uuid ? `AND uuid != '${uuid}'` : ''}
      `);

      if (existing.length > 0) {
        return res.status(409).json(errorResponse(req, 'DUPLICATE', 'Пользователь с таким login или mail уже существует'));
      }

      const newUuid = uuid || randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${subdomain}".users (uuid, name, login, mail, password, active, avatar, telegram, discord, created_at, updated_at)
        VALUES ('${newUuid}', '${name}', '${login}', '${mail}', '${password || 'changeme'}', ${active}, 
                ${avatar ? `'${avatar}'` : 'NULL'}, '${telegram || ''}', '${discord || ''}', '${now}', '${now}')
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, login, mail, active, avatar, telegram, discord, created_at, updated_at
        FROM "${subdomain}".users WHERE uuid = '${newUuid}'
      `);

      res.status(201).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error creating user', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: basePath, entity: entityName });

  // PUT /api/v2/users/:uuid - Upsert (создаёт если не существует)
  app.put(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name, login, mail, password, active = true, avatar, telegram, discord } = req.body;

      if (!name || !login || !mail) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name, login и mail обязательны'));
      }

      logger.info({ msg: 'PUT user (upsert)', subdomain, uuid });

      const now = new Date().toISOString();

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".users WHERE uuid = '${uuid}'
      `);

      if (existing.length === 0) {
        // Create new record
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${subdomain}".users (uuid, name, login, mail, password, active, avatar, telegram, discord, created_at, updated_at)
          VALUES ('${uuid}', '${name}', '${login}', '${mail}', '${password || 'changeme'}', ${active}, 
                  ${avatar ? `'${avatar}'` : 'NULL'}, '${telegram || ''}', '${discord || ''}', '${now}', '${now}')
        `);
      } else {
        // Update existing record
        await prisma.$executeRawUnsafe(`
          UPDATE "${subdomain}".users 
          SET name = '${name}', login = '${login}', mail = '${mail}', active = ${active},
              avatar = ${avatar ? `'${avatar}'` : 'NULL'}, telegram = '${telegram || ''}', discord = '${discord || ''}',
              updated_at = '${now}', deleted_at = NULL
          WHERE uuid = '${uuid}'
        `);
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, login, mail, active, avatar, telegram, discord, created_at, updated_at
        FROM "${subdomain}".users WHERE uuid = '${uuid}'
      `);

      res.status(existing.length === 0 ? 201 : 200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error upserting user', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'put', func: `${basePath}/:uuid`, entity: entityName });

  // PATCH /api/v2/users/:uuid
  app.patch(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      const updates: string[] = [];
      if (req.body.name !== undefined) updates.push(`name = '${req.body.name}'`);
      if (req.body.login !== undefined) updates.push(`login = '${req.body.login}'`);
      if (req.body.mail !== undefined) updates.push(`mail = '${req.body.mail}'`);
      if (req.body.active !== undefined) updates.push(`active = ${req.body.active}`);
      if (req.body.avatar !== undefined) updates.push(`avatar = ${req.body.avatar ? `'${req.body.avatar}'` : 'NULL'}`);
      if (req.body.telegram !== undefined) updates.push(`telegram = '${req.body.telegram}'`);
      if (req.body.discord !== undefined) updates.push(`discord = '${req.body.discord}'`);
      if (req.body.telegram_id !== undefined) updates.push(`telegram_id = '${req.body.telegram_id}'`);
      if (req.body.discord_id !== undefined) updates.push(`discord_id = '${req.body.discord_id}'`);

      if (updates.length === 0) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Нет полей для обновления'));
      }

      logger.info({ msg: 'PATCH user', subdomain, uuid });

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".users WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Пользователь не найден'));
      }

      updates.push(`updated_at = '${new Date().toISOString()}'`);

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".users SET ${updates.join(', ')} WHERE uuid = '${uuid}'
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, login, mail, active, avatar, telegram, discord, created_at, updated_at
        FROM "${subdomain}".users WHERE uuid = '${uuid}'
      `);

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error patching user', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'patch', func: `${basePath}/:uuid`, entity: entityName });

  // DELETE /api/v2/users/:uuid
  app.delete(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'DELETE user', subdomain, uuid });

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".users WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Пользователь не найден'));
      }

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".users SET deleted_at = '${new Date().toISOString()}' WHERE uuid = '${uuid}'
      `);

      res.status(204).send();

    } catch (error) {
      logger.error({ msg: 'Error deleting user', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'delete', func: `${basePath}/:uuid`, entity: entityName });

  logger.info({ msg: `Registered ${entityName} routes`, basePath });
}

