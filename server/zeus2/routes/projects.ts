import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('zeus2:projects');

interface Listener {
  method: string;
  func: string;
  entity: string;
}

// Response formatters
function formatItem(item: any) {
  return {
    uuid: item.uuid,
    name: item.name,
    short_name: item.short_name,
    owner_uuid: item.owner_uuid,
    description: item.description,
    avatar: item.avatar,
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

export function registerProjectsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const entityName = 'projects';
  const basePath = `${apiPrefix}/${entityName}`;

  // GET /api/v2/projects - Получение списка
  app.get(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { page = '1', limit = '20', sort } = req.query;

      logger.info({ msg: 'GET projects', subdomain, page, limit });

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Determine sort order
      let orderClause = 'ORDER BY name ASC';
      if (sort) {
        const [field, direction] = (sort as string).split(',');
        const validFields = ['name', 'short_name', 'created_at', 'updated_at'];
        if (validFields.includes(field)) {
          orderClause = `ORDER BY ${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
        }
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, short_name, owner_uuid, description, avatar, created_at, updated_at
        FROM "${subdomain}".projects
        WHERE deleted_at IS NULL
        ${orderClause}
        LIMIT ${limitNum} OFFSET ${skip}
      `);

      const totalResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${subdomain}".projects WHERE deleted_at IS NULL
      `);
      const total = Number(totalResult[0]?.count || 0);

      logger.info({ msg: 'Projects found', count: items.length, total });

      res.status(200).json({
        items: items.map(formatItem),
        page: pageNum,
        limit: limitNum,
        total
      });

    } catch (error) {
      logger.error({ msg: 'Error getting projects', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: basePath, entity: entityName });

  // GET /api/v2/projects/:uuid - Получение по UUID
  app.get(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'GET project by UUID', subdomain, uuid });

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, short_name, owner_uuid, description, avatar, created_at, updated_at
        FROM "${subdomain}".projects
        WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (items.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Проект не найден'));
      }

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error getting project', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: `${basePath}/:uuid`, entity: entityName });

  // POST /api/v2/projects - Создание
  app.post(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { name, short_name, owner_uuid, description, avatar } = req.body;

      if (!name || !short_name || !owner_uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name, short_name и owner_uuid обязательны'));
      }

      logger.info({ msg: 'POST project', subdomain, name, short_name });

      const newUuid = randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${subdomain}".projects (uuid, name, short_name, owner_uuid, description, avatar, created_at, updated_at)
        VALUES ('${newUuid}', '${name}', '${short_name}', '${owner_uuid}', ${description ? `'${description}'` : 'NULL'}, ${avatar ? `'${avatar}'` : 'NULL'}, '${now}', '${now}')
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, short_name, owner_uuid, description, avatar, created_at, updated_at
        FROM "${subdomain}".projects WHERE uuid = '${newUuid}'
      `);

      res.status(201).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error creating project', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: basePath, entity: entityName });

  // PUT /api/v2/projects/:uuid - Upsert
  app.put(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name, short_name, owner_uuid, description, avatar } = req.body;

      if (!name || !short_name || !owner_uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name, short_name и owner_uuid обязательны'));
      }

      logger.info({ msg: 'PUT project (upsert)', subdomain, uuid });

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".projects WHERE uuid = '${uuid}'
      `);

      const now = new Date().toISOString();

      if (existing.length === 0) {
        // Create
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${subdomain}".projects (uuid, name, short_name, owner_uuid, description, avatar, created_at, updated_at)
          VALUES ('${uuid}', '${name}', '${short_name}', '${owner_uuid}', ${description ? `'${description}'` : 'NULL'}, ${avatar ? `'${avatar}'` : 'NULL'}, '${now}', '${now}')
        `);
      } else {
        // Update
        await prisma.$executeRawUnsafe(`
          UPDATE "${subdomain}".projects 
          SET name = '${name}', short_name = '${short_name}', owner_uuid = '${owner_uuid}',
              description = ${description ? `'${description}'` : 'NULL'},
              avatar = ${avatar ? `'${avatar}'` : 'NULL'},
              updated_at = '${now}', deleted_at = NULL
          WHERE uuid = '${uuid}'
        `);
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, short_name, owner_uuid, description, avatar, created_at, updated_at
        FROM "${subdomain}".projects WHERE uuid = '${uuid}'
      `);

      res.status(existing.length === 0 ? 201 : 200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error upserting project', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'put', func: `${basePath}/:uuid`, entity: entityName });

  // PATCH /api/v2/projects/:uuid - Частичное обновление
  app.patch(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      const updates: string[] = [];
      if (req.body.name !== undefined) updates.push(`name = '${req.body.name}'`);
      if (req.body.short_name !== undefined) updates.push(`short_name = '${req.body.short_name}'`);
      if (req.body.owner_uuid !== undefined) updates.push(`owner_uuid = '${req.body.owner_uuid}'`);
      if (req.body.description !== undefined) updates.push(`description = ${req.body.description ? `'${req.body.description}'` : 'NULL'}`);
      if (req.body.avatar !== undefined) updates.push(`avatar = ${req.body.avatar ? `'${req.body.avatar}'` : 'NULL'}`);

      if (updates.length === 0) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Нет полей для обновления'));
      }

      logger.info({ msg: 'PATCH project', subdomain, uuid, fields: updates.length });

      // Check exists
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".projects WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Проект не найден'));
      }

      updates.push(`updated_at = '${new Date().toISOString()}'`);

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".projects SET ${updates.join(', ')} WHERE uuid = '${uuid}'
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, short_name, owner_uuid, description, avatar, created_at, updated_at
        FROM "${subdomain}".projects WHERE uuid = '${uuid}'
      `);

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error patching project', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'patch', func: `${basePath}/:uuid`, entity: entityName });

  // DELETE /api/v2/projects/:uuid - Удаление (soft delete)
  app.delete(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'DELETE project', subdomain, uuid });

      // Check exists
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".projects WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Проект не найден'));
      }

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".projects SET deleted_at = '${new Date().toISOString()}' WHERE uuid = '${uuid}'
      `);

      res.status(204).send();

    } catch (error) {
      logger.error({ msg: 'Error deleting project', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'delete', func: `${basePath}/:uuid`, entity: entityName });

  logger.info({ msg: `Registered ${entityName} routes`, basePath });
}

