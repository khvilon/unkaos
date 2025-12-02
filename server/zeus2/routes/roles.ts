import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('zeus2:roles');

interface Listener {
  method: string;
  func: string;
  entity: string;
}

function formatItem(item: any) {
  return {
    uuid: item.uuid,
    name: item.name,
    is_custom: item.is_custom,
    created_at: item.created_at,
    updated_at: item.updated_at
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

export function registerRolesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const entityName = 'roles';
  const basePath = `${apiPrefix}/${entityName}`;

  // GET /api/v2/roles - Получение списка
  app.get(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { page = '1', limit = '20', sort, is_custom } = req.query;

      logger.info({ msg: 'GET roles', subdomain, page, limit });

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      let whereClause = 'WHERE deleted_at IS NULL';
      if (is_custom !== undefined) {
        whereClause += ` AND is_custom = ${is_custom === 'true'}`;
      }

      let orderClause = 'ORDER BY name ASC';
      if (sort) {
        const [field, direction] = (sort as string).split(',');
        const validFields = ['name', 'is_custom', 'created_at', 'updated_at'];
        if (validFields.includes(field)) {
          orderClause = `ORDER BY ${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
        }
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_custom, created_at, updated_at
        FROM "${subdomain}".roles
        ${whereClause}
        ${orderClause}
        LIMIT ${limitNum} OFFSET ${skip}
      `);

      const totalResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${subdomain}".roles ${whereClause}
      `);
      const total = Number(totalResult[0]?.count || 0);

      res.status(200).json({
        items: items.map(formatItem),
        page: pageNum,
        limit: limitNum,
        total
      });

    } catch (error) {
      logger.error({ msg: 'Error getting roles', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: basePath, entity: entityName });

  // GET /api/v2/roles/:uuid
  app.get(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'GET role by UUID', subdomain, uuid });

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_custom, created_at, updated_at
        FROM "${subdomain}".roles
        WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (items.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Роль не найдена'));
      }

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error getting role', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: `${basePath}/:uuid`, entity: entityName });

  // POST /api/v2/roles
  app.post(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { name, is_custom = true } = req.body;

      if (!name) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле name обязательно'));
      }

      logger.info({ msg: 'POST role', subdomain, name });

      const newUuid = randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${subdomain}".roles (uuid, name, is_custom, created_at, updated_at)
        VALUES ('${newUuid}', '${name}', ${is_custom}, '${now}', '${now}')
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_custom, created_at, updated_at
        FROM "${subdomain}".roles WHERE uuid = '${newUuid}'
      `);

      res.status(201).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error creating role', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: basePath, entity: entityName });

  // PUT /api/v2/roles/:uuid - Upsert
  app.put(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name, is_custom = true } = req.body;

      if (!name) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле name обязательно'));
      }

      logger.info({ msg: 'PUT role (upsert)', subdomain, uuid });

      const now = new Date().toISOString();
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".roles WHERE uuid = '${uuid}'
      `);

      if (existing.length === 0) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${subdomain}".roles (uuid, name, is_custom, created_at, updated_at)
          VALUES ('${uuid}', '${name}', ${is_custom}, '${now}', '${now}')
        `);
      } else {
        await prisma.$executeRawUnsafe(`
          UPDATE "${subdomain}".roles 
          SET name = '${name}', is_custom = ${is_custom}, updated_at = '${now}', deleted_at = NULL
          WHERE uuid = '${uuid}'
        `);
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_custom, created_at, updated_at
        FROM "${subdomain}".roles WHERE uuid = '${uuid}'
      `);

      res.status(existing.length === 0 ? 201 : 200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error upserting role', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'put', func: `${basePath}/:uuid`, entity: entityName });

  // PATCH /api/v2/roles/:uuid
  app.patch(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      const updates: string[] = [];
      if (req.body.name !== undefined) updates.push(`name = '${req.body.name}'`);
      if (req.body.is_custom !== undefined) updates.push(`is_custom = ${req.body.is_custom}`);

      if (updates.length === 0) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Нет полей для обновления'));
      }

      logger.info({ msg: 'PATCH role', subdomain, uuid });

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".roles WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Роль не найдена'));
      }

      updates.push(`updated_at = '${new Date().toISOString()}'`);

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".roles SET ${updates.join(', ')} WHERE uuid = '${uuid}'
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_custom, created_at, updated_at
        FROM "${subdomain}".roles WHERE uuid = '${uuid}'
      `);

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error patching role', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'patch', func: `${basePath}/:uuid`, entity: entityName });

  // DELETE /api/v2/roles/:uuid
  app.delete(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'DELETE role', subdomain, uuid });

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".roles WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Роль не найдена'));
      }

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".roles SET deleted_at = '${new Date().toISOString()}' WHERE uuid = '${uuid}'
      `);

      res.status(204).send();

    } catch (error) {
      logger.error({ msg: 'Error deleting role', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'delete', func: `${basePath}/:uuid`, entity: entityName });

  logger.info({ msg: `Registered ${entityName} routes`, basePath });
}

