import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('zeus2:issue-types');

interface Listener {
  method: string;
  func: string;
  entity: string;
}

function formatItem(item: any) {
  return {
    uuid: item.uuid,
    name: item.name,
    workflow_uuid: item.workflow_uuid,
    created_at: item.created_at,
    updated_at: item.updated_at
  };
}

function formatItemWithWorkflow(item: any) {
  return {
    uuid: item.uuid,
    name: item.name,
    workflow_uuid: item.workflow_uuid,
    workflow_name: item.workflow_name,
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

export function registerIssueTypesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const entityName = 'issue-types';
  const basePath = `${apiPrefix}/${entityName}`;

  // GET /api/v2/issue-types - Получение списка
  app.get(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { page = '1', limit = '20', sort, include_workflow } = req.query;

      logger.info({ msg: 'GET issue-types', subdomain, page, limit });

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      let orderClause = 'ORDER BY it.name ASC';
      if (sort) {
        const [field, direction] = (sort as string).split(',');
        const validFields = ['name', 'created_at', 'updated_at'];
        if (validFields.includes(field)) {
          orderClause = `ORDER BY it.${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
        }
      }

      let selectClause = 'it.uuid, it.name, it.workflow_uuid, it.created_at, it.updated_at';
      let joinClause = '';
      
      if (include_workflow === 'true') {
        selectClause += ', w.name as workflow_name';
        joinClause = `LEFT JOIN "${subdomain}".workflows w ON w.uuid = it.workflow_uuid`;
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT ${selectClause}
        FROM "${subdomain}".issue_types it
        ${joinClause}
        WHERE it.deleted_at IS NULL
        ${orderClause}
        LIMIT ${limitNum} OFFSET ${skip}
      `);

      const totalResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${subdomain}".issue_types WHERE deleted_at IS NULL
      `);
      const total = Number(totalResult[0]?.count || 0);

      const formatter = include_workflow === 'true' ? formatItemWithWorkflow : formatItem;

      res.status(200).json({
        items: items.map(formatter),
        page: pageNum,
        limit: limitNum,
        total
      });

    } catch (error) {
      logger.error({ msg: 'Error getting issue-types', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: basePath, entity: entityName });

  // GET /api/v2/issue-types/:uuid
  app.get(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'GET issue-type by UUID', subdomain, uuid });

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT it.uuid, it.name, it.workflow_uuid, it.created_at, it.updated_at, w.name as workflow_name
        FROM "${subdomain}".issue_types it
        LEFT JOIN "${subdomain}".workflows w ON w.uuid = it.workflow_uuid
        WHERE it.uuid = '${uuid}' AND it.deleted_at IS NULL
      `);

      if (items.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Тип задачи не найден'));
      }

      // Get associated fields
      const fields: any[] = await prisma.$queryRawUnsafe(`
        SELECT f.uuid, f.name, f.type_uuid, f.is_custom
        FROM "${subdomain}".issue_types_to_fields itf
        JOIN "${subdomain}".fields f ON f.uuid = itf.fields_uuid
        WHERE itf.issue_types_uuid = '${uuid}' AND f.deleted_at IS NULL
      `);

      res.status(200).json({
        ...formatItemWithWorkflow(items[0]),
        fields: fields.map(f => ({
          uuid: f.uuid,
          name: f.name,
          type_uuid: f.type_uuid,
          is_custom: f.is_custom
        }))
      });

    } catch (error) {
      logger.error({ msg: 'Error getting issue-type', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: `${basePath}/:uuid`, entity: entityName });

  // POST /api/v2/issue-types
  app.post(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { name, workflow_uuid, fields } = req.body;

      if (!name || !workflow_uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name и workflow_uuid обязательны'));
      }

      logger.info({ msg: 'POST issue-type', subdomain, name, workflow_uuid });

      const newUuid = randomUUID();
      const now = new Date().toISOString();

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${subdomain}".issue_types (uuid, name, workflow_uuid, created_at, updated_at)
        VALUES ('${newUuid}', '${name}', '${workflow_uuid}', '${now}', '${now}')
      `);

      // Add field associations if provided
      if (fields && Array.isArray(fields) && fields.length > 0) {
        const values = fields.map((f: any) => `('${newUuid}', '${f.uuid || f}')`).join(', ');
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${subdomain}".issue_types_to_fields (issue_types_uuid, fields_uuid) VALUES ${values}
        `);
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, workflow_uuid, created_at, updated_at
        FROM "${subdomain}".issue_types WHERE uuid = '${newUuid}'
      `);

      res.status(201).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error creating issue-type', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: basePath, entity: entityName });

  // PUT /api/v2/issue-types/:uuid - Upsert
  app.put(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name, workflow_uuid, fields } = req.body;

      if (!name || !workflow_uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name и workflow_uuid обязательны'));
      }

      logger.info({ msg: 'PUT issue-type (upsert)', subdomain, uuid });

      const now = new Date().toISOString();
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issue_types WHERE uuid = '${uuid}'
      `);

      if (existing.length === 0) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${subdomain}".issue_types (uuid, name, workflow_uuid, created_at, updated_at)
          VALUES ('${uuid}', '${name}', '${workflow_uuid}', '${now}', '${now}')
        `);
      } else {
        await prisma.$executeRawUnsafe(`
          UPDATE "${subdomain}".issue_types 
          SET name = '${name}', workflow_uuid = '${workflow_uuid}', updated_at = '${now}', deleted_at = NULL
          WHERE uuid = '${uuid}'
        `);
      }

      // Update field associations if provided
      if (fields !== undefined) {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${subdomain}".issue_types_to_fields WHERE issue_types_uuid = '${uuid}'
        `);
        
        if (Array.isArray(fields) && fields.length > 0) {
          const values = fields.map((f: any) => `('${uuid}', '${f.uuid || f}')`).join(', ');
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${subdomain}".issue_types_to_fields (issue_types_uuid, fields_uuid) VALUES ${values}
          `);
        }
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, workflow_uuid, created_at, updated_at
        FROM "${subdomain}".issue_types WHERE uuid = '${uuid}'
      `);

      res.status(existing.length === 0 ? 201 : 200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error upserting issue-type', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'put', func: `${basePath}/:uuid`, entity: entityName });

  // PATCH /api/v2/issue-types/:uuid
  app.patch(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      const updates: string[] = [];
      if (req.body.name !== undefined) updates.push(`name = '${req.body.name}'`);
      if (req.body.workflow_uuid !== undefined) updates.push(`workflow_uuid = '${req.body.workflow_uuid}'`);

      logger.info({ msg: 'PATCH issue-type', subdomain, uuid });

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issue_types WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Тип задачи не найден'));
      }

      if (updates.length > 0) {
        updates.push(`updated_at = '${new Date().toISOString()}'`);
        await prisma.$executeRawUnsafe(`
          UPDATE "${subdomain}".issue_types SET ${updates.join(', ')} WHERE uuid = '${uuid}'
        `);
      }

      // Update field associations if provided
      if (req.body.fields !== undefined) {
        await prisma.$executeRawUnsafe(`
          DELETE FROM "${subdomain}".issue_types_to_fields WHERE issue_types_uuid = '${uuid}'
        `);
        
        if (Array.isArray(req.body.fields) && req.body.fields.length > 0) {
          const values = req.body.fields.map((f: any) => `('${uuid}', '${f.uuid || f}')`).join(', ');
          await prisma.$executeRawUnsafe(`
            INSERT INTO "${subdomain}".issue_types_to_fields (issue_types_uuid, fields_uuid) VALUES ${values}
          `);
        }
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, workflow_uuid, created_at, updated_at
        FROM "${subdomain}".issue_types WHERE uuid = '${uuid}'
      `);

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error patching issue-type', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'patch', func: `${basePath}/:uuid`, entity: entityName });

  // DELETE /api/v2/issue-types/:uuid
  app.delete(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'DELETE issue-type', subdomain, uuid });

      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issue_types WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Тип задачи не найден'));
      }

      // Check if type is used in issues
      const usedInIssues: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".issues WHERE type_uuid = '${uuid}' AND deleted_at IS NULL LIMIT 1
      `);

      if (usedInIssues.length > 0) {
        return res.status(409).json(errorResponse(req, 'TYPE_IN_USE', 'Тип задачи используется в задачах и не может быть удалён'));
      }

      // Remove field associations
      await prisma.$executeRawUnsafe(`
        DELETE FROM "${subdomain}".issue_types_to_fields WHERE issue_types_uuid = '${uuid}'
      `);

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".issue_types SET deleted_at = '${new Date().toISOString()}' WHERE uuid = '${uuid}'
      `);

      res.status(204).send();

    } catch (error) {
      logger.error({ msg: 'Error deleting issue-type', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'delete', func: `${basePath}/:uuid`, entity: entityName });

  logger.info({ msg: `Registered ${entityName} routes`, basePath });
}

