import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('zeus2:issue-statuses');

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
    is_start: item.is_start,
    is_end: item.is_end,
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

export function registerIssueStatusesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const entityName = 'issue-statuses';
  const basePath = `${apiPrefix}/${entityName}`;

  // GET /api/v2/issue-statuses - Получение списка
  app.get(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { page = '1', limit = '20', sort } = req.query;

      logger.info({ 
        msg: 'GET issue-statuses', 
        subdomain, 
        page, 
        limit,
        request_id: req.headers['x-request-id']
      });

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Determine sort order
      let orderClause = 'ORDER BY name ASC';
      if (sort) {
        const [field, direction] = (sort as string).split(',');
        const validFields = ['name', 'is_start', 'is_end', 'created_at', 'updated_at'];
        if (validFields.includes(field)) {
          orderClause = `ORDER BY ${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
        }
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_start, is_end, created_at, updated_at
        FROM "${subdomain}".issue_statuses
        WHERE deleted_at IS NULL
        ${orderClause}
        LIMIT ${limitNum} OFFSET ${skip}
      `);

      const totalResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${subdomain}".issue_statuses WHERE deleted_at IS NULL
      `);
      const total = Number(totalResult[0]?.count || 0);

      res.status(200).json({
        items: items.map(formatItem),
        page: pageNum,
        limit: limitNum,
        total
      });

    } catch (error) {
      logger.error({ msg: 'Error getting issue-statuses', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: basePath, entity: entityName });

  // GET /api/v2/issue-statuses/:uuid - Получение по UUID
  app.get(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'GET issue-status', subdomain, uuid });

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_start, is_end, created_at, updated_at
        FROM "${subdomain}".issue_statuses
        WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (items.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Статус не найден'));
      }

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error getting issue-status', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: `${basePath}/:uuid`, entity: entityName });

  // POST /api/v2/issue-statuses - Создание
  app.post(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { name, is_start, is_end } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле name обязательно', [{ field: 'name', message: 'Поле name обязательно' }]));
      }

      logger.info({ msg: 'POST issue-status', subdomain, name });

      // Check for duplicate name
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issue_statuses WHERE name = '${name}' AND deleted_at IS NULL
      `);

      if (existing.length > 0) {
        return res.status(409).json(errorResponse(req, 'DUPLICATE_NAME', 'Статус с таким именем уже существует'));
      }

      const newUuid = randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${subdomain}".issue_statuses (uuid, name, is_start, is_end, created_at, updated_at)
        VALUES ('${newUuid}', '${name}', ${is_start || false}, ${is_end || false}, '${now}', '${now}')
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_start, is_end, created_at, updated_at
        FROM "${subdomain}".issue_statuses WHERE uuid = '${newUuid}'
      `);

      res.status(201).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error creating issue-status', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: basePath, entity: entityName });

  // PUT /api/v2/issue-statuses/:uuid - Upsert
  app.put(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name, is_start = false, is_end = false } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поле name обязательно', [{ field: 'name', message: 'Поле name обязательно' }]));
      }

      logger.info({ msg: 'PUT issue-status (upsert)', subdomain, uuid });

      const now = new Date().toISOString();
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issue_statuses WHERE uuid = '${uuid}'
      `);

      if (existing.length === 0) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${subdomain}".issue_statuses (uuid, name, is_start, is_end, created_at, updated_at)
          VALUES ('${uuid}', '${name}', ${is_start}, ${is_end}, '${now}', '${now}')
        `);
      } else {
        await prisma.$executeRawUnsafe(`
          UPDATE "${subdomain}".issue_statuses 
          SET name = '${name}', is_start = ${is_start}, is_end = ${is_end}, updated_at = '${now}', deleted_at = NULL
          WHERE uuid = '${uuid}'
        `);
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_start, is_end, created_at, updated_at
        FROM "${subdomain}".issue_statuses WHERE uuid = '${uuid}'
      `);

      res.status(existing.length === 0 ? 201 : 200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error updating issue-status', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'put', func: `${basePath}/:uuid`, entity: entityName });

  // PATCH /api/v2/issue-statuses/:uuid - Частичное обновление
  app.patch(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      const updates: string[] = [];
      if (req.body.name !== undefined) updates.push(`name = '${req.body.name}'`);
      if (req.body.is_start !== undefined) updates.push(`is_start = ${req.body.is_start}`);
      if (req.body.is_end !== undefined) updates.push(`is_end = ${req.body.is_end}`);

      if (updates.length === 0) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Нет полей для обновления'));
      }

      logger.info({ msg: 'PATCH issue-status', subdomain, uuid, fields: updates.length });

      // Check exists
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issue_statuses WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Статус не найден'));
      }

      updates.push(`updated_at = '${new Date().toISOString()}'`);

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".issue_statuses SET ${updates.join(', ')} WHERE uuid = '${uuid}'
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, is_start, is_end, created_at, updated_at
        FROM "${subdomain}".issue_statuses WHERE uuid = '${uuid}'
      `);

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error patching issue-status', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'patch', func: `${basePath}/:uuid`, entity: entityName });

  // DELETE /api/v2/issue-statuses/:uuid - Удаление (soft delete)
  app.delete(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'DELETE issue-status', subdomain, uuid });

      // Check exists
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issue_statuses WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Статус не найден'));
      }

      // Check if status is used in workflow nodes
      const usedInWorkflow: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".workflow_nodes WHERE issue_statuses_uuid = '${uuid}' AND deleted_at IS NULL LIMIT 1
      `);

      if (usedInWorkflow.length > 0) {
        return res.status(409).json(errorResponse(req, 'STATUS_IN_USE', 'Статус используется в воркфлоу и не может быть удалён'));
      }

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".issue_statuses SET deleted_at = '${new Date().toISOString()}' WHERE uuid = '${uuid}'
      `);

      res.status(204).send();

    } catch (error) {
      logger.error({ msg: 'Error deleting issue-status', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'delete', func: `${basePath}/:uuid`, entity: entityName });

  logger.info({ msg: `Registered ${entityName} routes`, basePath });
}
