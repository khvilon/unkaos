import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../server/common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('zeus2:fields');

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
    type_uuid: item.type_uuid,
    is_custom: item.is_custom,
    min_value: item.min_value ? Number(item.min_value) : null,
    max_value: item.max_value ? Number(item.max_value) : null,
    presision: item.presision,
    available_values: item.available_values,
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

export function registerFieldsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const entityName = 'fields';
  const basePath = `${apiPrefix}/${entityName}`;

  // GET /api/v2/fields - Получение списка
  app.get(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { page = '1', limit = '20', sort, is_custom } = req.query;

      logger.info({ msg: 'GET fields', subdomain, page, limit });

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      // Build WHERE clause
      let whereClause = 'WHERE deleted_at IS NULL';
      if (is_custom !== undefined) {
        whereClause += ` AND is_custom = ${is_custom === 'true'}`;
      }

      // Determine sort order
      let orderClause = 'ORDER BY name ASC';
      if (sort) {
        const [field, direction] = (sort as string).split(',');
        const validFields = ['name', 'is_custom', 'created_at', 'updated_at'];
        if (validFields.includes(field)) {
          orderClause = `ORDER BY ${field} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
        }
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, type_uuid, is_custom, min_value, max_value, presision, available_values, created_at, updated_at
        FROM "${subdomain}".fields
        ${whereClause}
        ${orderClause}
        LIMIT ${limitNum} OFFSET ${skip}
      `);

      const totalResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${subdomain}".fields ${whereClause}
      `);
      const total = Number(totalResult[0]?.count || 0);

      logger.info({ msg: 'Fields found', count: items.length, total });

      res.status(200).json({
        items: items.map(formatItem),
        page: pageNum,
        limit: limitNum,
        total
      });

    } catch (error) {
      logger.error({ msg: 'Error getting fields', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: basePath, entity: entityName });

  // GET /api/v2/fields/:uuid - Получение по UUID
  app.get(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'GET field by UUID', subdomain, uuid });

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, type_uuid, is_custom, min_value, max_value, presision, available_values, created_at, updated_at
        FROM "${subdomain}".fields
        WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (items.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Поле не найдено'));
      }

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error getting field', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: `${basePath}/:uuid`, entity: entityName });

  // POST /api/v2/fields - Создание
  app.post(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid, name, type_uuid, is_custom = true, min_value, max_value, presision, available_values } = req.body;

      if (!name || !type_uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name и type_uuid обязательны'));
      }

      logger.info({ msg: 'POST field', subdomain, name, type_uuid });

      const newUuid = uuid || randomUUID();
      const now = new Date().toISOString();

      const availableValuesStr = available_values 
        ? `'${typeof available_values === 'string' ? available_values : JSON.stringify(available_values).replace(/'/g, "''")}'` 
        : 'NULL';

      await prisma.$executeRawUnsafe(`
        INSERT INTO "${subdomain}".fields (uuid, name, type_uuid, is_custom, min_value, max_value, presision, available_values, created_at, updated_at)
        VALUES ('${newUuid}', '${name}', '${type_uuid}', ${is_custom}, 
                ${min_value !== undefined ? min_value : 'NULL'}, 
                ${max_value !== undefined ? max_value : 'NULL'}, 
                ${presision !== undefined ? presision : 'NULL'}, 
                ${availableValuesStr}, 
                '${now}', '${now}')
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, type_uuid, is_custom, min_value, max_value, presision, available_values, created_at, updated_at
        FROM "${subdomain}".fields WHERE uuid = '${newUuid}'
      `);

      res.status(201).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error creating field', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: basePath, entity: entityName });

  // PUT /api/v2/fields/:uuid - Upsert (создаёт если не существует)
  app.put(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name, type_uuid, is_custom = true, min_value, max_value, presision, available_values } = req.body;

      if (!name || !type_uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Поля name и type_uuid обязательны'));
      }

      logger.info({ msg: 'PUT field (upsert)', subdomain, uuid });

      const now = new Date().toISOString();
      const availableValuesStr = available_values 
        ? `'${typeof available_values === 'string' ? available_values : JSON.stringify(available_values).replace(/'/g, "''")}'` 
        : 'NULL';

      // Check exists
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".fields WHERE uuid = '${uuid}'
      `);

      if (existing.length === 0) {
        // Create new record
        await prisma.$executeRawUnsafe(`
          INSERT INTO "${subdomain}".fields (uuid, name, type_uuid, is_custom, min_value, max_value, presision, available_values, created_at, updated_at)
          VALUES ('${uuid}', '${name}', '${type_uuid}', ${is_custom}, 
                  ${min_value !== undefined ? min_value : 'NULL'}, 
                  ${max_value !== undefined ? max_value : 'NULL'}, 
                  ${presision !== undefined ? presision : 'NULL'}, 
                  ${availableValuesStr}, 
                  '${now}', '${now}')
        `);
      } else {
        // Update existing record
        await prisma.$executeRawUnsafe(`
          UPDATE "${subdomain}".fields 
          SET name = '${name}', type_uuid = '${type_uuid}', is_custom = ${is_custom},
              min_value = ${min_value !== undefined ? min_value : 'NULL'},
              max_value = ${max_value !== undefined ? max_value : 'NULL'},
              presision = ${presision !== undefined ? presision : 'NULL'},
              available_values = ${availableValuesStr},
              updated_at = '${now}', deleted_at = NULL
          WHERE uuid = '${uuid}'
        `);
      }

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, type_uuid, is_custom, min_value, max_value, presision, available_values, created_at, updated_at
        FROM "${subdomain}".fields WHERE uuid = '${uuid}'
      `);

      res.status(existing.length === 0 ? 201 : 200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error upserting field', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'put', func: `${basePath}/:uuid`, entity: entityName });

  // PATCH /api/v2/fields/:uuid - Частичное обновление
  app.patch(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      const updates: string[] = [];
      if (req.body.name !== undefined) updates.push(`name = '${req.body.name}'`);
      if (req.body.type_uuid !== undefined) updates.push(`type_uuid = '${req.body.type_uuid}'`);
      if (req.body.is_custom !== undefined) updates.push(`is_custom = ${req.body.is_custom}`);
      if (req.body.min_value !== undefined) updates.push(`min_value = ${req.body.min_value !== null ? req.body.min_value : 'NULL'}`);
      if (req.body.max_value !== undefined) updates.push(`max_value = ${req.body.max_value !== null ? req.body.max_value : 'NULL'}`);
      if (req.body.presision !== undefined) updates.push(`presision = ${req.body.presision !== null ? req.body.presision : 'NULL'}`);
      if (req.body.available_values !== undefined) {
        const av = req.body.available_values;
        const avStr = av ? `'${typeof av === 'string' ? av : JSON.stringify(av).replace(/'/g, "''")}'` : 'NULL';
        updates.push(`available_values = ${avStr}`);
      }

      if (updates.length === 0) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Нет полей для обновления'));
      }

      logger.info({ msg: 'PATCH field', subdomain, uuid, fields: updates.length });

      // Check exists
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".fields WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Поле не найдено'));
      }

      updates.push(`updated_at = '${new Date().toISOString()}'`);

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".fields SET ${updates.join(', ')} WHERE uuid = '${uuid}'
      `);

      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid, name, type_uuid, is_custom, min_value, max_value, presision, available_values, created_at, updated_at
        FROM "${subdomain}".fields WHERE uuid = '${uuid}'
      `);

      res.status(200).json(formatItem(items[0]));

    } catch (error) {
      logger.error({ msg: 'Error patching field', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'patch', func: `${basePath}/:uuid`, entity: entityName });

  // DELETE /api/v2/fields/:uuid - Удаление (soft delete)
  app.delete(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'DELETE field', subdomain, uuid });

      // Check exists
      const existing: any[] = await prisma.$queryRawUnsafe(`
        SELECT uuid FROM "${subdomain}".fields WHERE uuid = '${uuid}' AND deleted_at IS NULL
      `);

      if (existing.length === 0) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Поле не найдено'));
      }

      await prisma.$executeRawUnsafe(`
        UPDATE "${subdomain}".fields SET deleted_at = '${new Date().toISOString()}' WHERE uuid = '${uuid}'
      `);

      res.status(204).send();

    } catch (error) {
      logger.error({ msg: 'Error deleting field', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'delete', func: `${basePath}/:uuid`, entity: entityName });

  logger.info({ msg: `Registered ${entityName} routes`, basePath });
}

