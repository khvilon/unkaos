/**
 * Roles Routes - с permissions и projects_permissions
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:roles');

export function registerRolesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  async function getRolesWithPermissions(schema: string, uuid?: string): Promise<any[]> {
    const whereClause = uuid 
      ? `WHERE r.uuid = $1::uuid AND r.deleted_at IS NULL`
      : `WHERE r.deleted_at IS NULL`;

    // Получаем роли
    const query = `
      SELECT 
        'roles' AS table_name,
        r.uuid, r.name, r.created_at, r.updated_at,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'uuid', p.uuid,
              'name', p.name,
              'code', p.code
            )
          )
          FROM ${escapeIdentifier(schema)}.roles_to_permissions rtp
          JOIN ${escapeIdentifier(schema)}.permissions p ON p.uuid = rtp.permissions_uuid
          WHERE rtp.roles_uuid = r.uuid
          ), '[]'
        ) AS permissions,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'uuid', pp.uuid,
              'roles_uuid', pp.roles_uuid,
              'projects_uuid', pp.projects_uuid,
              'allow', pp.allow,
              'table_name', 'projects_permissions'
            )
          )
          FROM ${escapeIdentifier(schema)}.projects_permissions pp
          WHERE pp.roles_uuid = r.uuid
          ), '[]'
        ) AS projects_permissions
      FROM ${escapeIdentifier(schema)}.roles r
      ${whereClause}
      ORDER BY r.name ASC
    `;

    return uuid 
      ? await prisma.$queryRawUnsafe(query, uuid)
      : await prisma.$queryRawUnsafe(query.replace('$1::uuid', "'dummy'"));
  }

  // GET /api/v2/roles
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const items = await getRolesWithPermissions(schema);
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting roles', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения ролей'));
    }
  });

  // GET /api/v2/roles/:uuid
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
      const items: any[] = await getRolesWithPermissions(schema, uuid);
      if (items.length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 'Роль не найдена'));
      }
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting role', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения роли'));
    }
  });

  // POST /api/v2/roles
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { name, permissions, projects_permissions } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'name required'));
    }

    try {
      // Создаём роль
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.roles (uuid, name, created_at, updated_at)
        VALUES ($1::uuid, $2, NOW(), NOW())
      `, uuid, name);

      // Добавляем permissions
      // Поддерживаем оба формата: массив UUID строк или массив объектов {uuid: '...'}
      if (permissions && Array.isArray(permissions)) {
        for (const perm of permissions) {
          const permUuid = typeof perm === 'string' ? perm : perm?.uuid;
          if (permUuid && isValidUuid(permUuid)) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.roles_to_permissions (roles_uuid, permissions_uuid)
              VALUES ($1::uuid, $2::uuid)
              ON CONFLICT DO NOTHING
            `, uuid, permUuid);
          }
        }
      }

      // Добавляем projects_permissions
      if (projects_permissions && Array.isArray(projects_permissions)) {
        for (const pp of projects_permissions) {
          if (pp.projects_uuid && isValidUuid(pp.projects_uuid)) {
            const ppUuid = pp.uuid && isValidUuid(pp.uuid) ? pp.uuid : uuidv4();
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.projects_permissions (uuid, roles_uuid, projects_uuid, allow)
              VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
              ON CONFLICT DO NOTHING
            `, ppUuid, uuid, pp.projects_uuid, pp.allow || 'R');
          }
        }
      }

      const items = await getRolesWithPermissions(schema, uuid);
      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating role', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания роли'));
    }
  });

  // PUT /api/v2/roles/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { name, permissions, projects_permissions } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      // Обновляем роль
      if (name !== undefined) {
        await prisma.$executeRawUnsafe(`
          UPDATE ${escapeIdentifier(schema)}.roles
          SET name = $1, updated_at = NOW()
          WHERE uuid = $2::uuid
        `, name, uuid);
      }

      // Обновляем permissions если переданы
      // По парадигме Full Replace: undefined = не трогаем, [] = удаляем все, [...] = заменяем
      // Поддерживаем оба формата: массив UUID строк или массив объектов {uuid: '...'}
      if (permissions !== undefined && Array.isArray(permissions)) {
        // Удаляем старые
        await prisma.$executeRawUnsafe(`
          DELETE FROM ${escapeIdentifier(schema)}.roles_to_permissions
          WHERE roles_uuid = $1::uuid
        `, uuid);

        // Добавляем новые
        for (const perm of permissions) {
          const permUuid = typeof perm === 'string' ? perm : perm?.uuid;
          if (permUuid && isValidUuid(permUuid)) {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.roles_to_permissions (roles_uuid, permissions_uuid)
              VALUES ($1::uuid, $2::uuid)
              ON CONFLICT DO NOTHING
            `, uuid, permUuid);
          }
        }
      }

      // Обновляем projects_permissions если переданы
      // По парадигме Full Replace: undefined = не трогаем, [] = удаляем все, [...] = заменяем
      if (projects_permissions !== undefined && Array.isArray(projects_permissions)) {
        // Удаляем старые
        await prisma.$executeRawUnsafe(`
          DELETE FROM ${escapeIdentifier(schema)}.projects_permissions
          WHERE roles_uuid = $1::uuid
        `, uuid);

        // Добавляем новые
        for (const pp of projects_permissions) {
          if (pp.projects_uuid && isValidUuid(pp.projects_uuid)) {
            const ppUuid = pp.uuid && isValidUuid(pp.uuid) ? pp.uuid : uuidv4();
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.projects_permissions (uuid, roles_uuid, projects_uuid, allow)
              VALUES ($1::uuid, $2::uuid, $3::uuid, $4)
              ON CONFLICT DO NOTHING
            `, ppUuid, uuid, pp.projects_uuid, pp.allow || 'R');
          }
        }
      }

      const items = await getRolesWithPermissions(schema, uuid);
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating role', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления роли'));
    }
  });

  // DELETE /api/v2/roles/:uuid
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
        UPDATE ${escapeIdentifier(schema)}.roles
        SET deleted_at = NOW()
        WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting role', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления роли'));
    }
  });

  app.use(`${apiPrefix}/roles`, router);

  listeners.push({ method: 'get', func: 'read_roles', entity: 'roles' });
  listeners.push({ method: 'get', func: 'read_role', entity: 'role' });
  listeners.push({ method: 'post', func: 'create_roles', entity: 'roles' });
  listeners.push({ method: 'post', func: 'upsert_roles', entity: 'roles' });
  listeners.push({ method: 'put', func: 'update_roles', entity: 'roles' });
  listeners.push({ method: 'delete', func: 'delete_roles', entity: 'roles' });

  logger.info({ msg: 'Roles routes registered' });
}
