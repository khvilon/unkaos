/**
 * Dashboards Routes - со вложенными gadgets
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:dashboards');

export function registerDashboardsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  async function getDashboardWithGadgets(schema: string, uuid?: string): Promise<any[]> {
    const whereClause = uuid 
      ? `WHERE d.uuid = '${uuid}' AND d.deleted_at IS NULL`
      : `WHERE d.deleted_at IS NULL`;

    return prisma.$queryRawUnsafe(`
      SELECT 
        'dashboards' AS table_name,
        d.uuid, d.name, d.author_uuid, d.created_at, d.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'table_name', 'gadgets',
              'uuid', g.uuid,
              'dashboard_uuid', g.dashboard_uuid,
              'name', g.name,
              'config', g.config,
              'x0', g.x0,
              'y0', g.y0,
              'width', g.width,
              'height', g.height,
              'type_uuid', g.type_uuid,
              'type_name', gt.name,
              'type_code', gt.code,
              'type', json_build_array(
                json_build_object('uuid', gt.uuid, 'name', gt.name, 'code', gt.code)
              )
            )
          ) FILTER (WHERE g.uuid IS NOT NULL), '[]'
        ) AS gadgets,
        json_agg(DISTINCT jsonb_build_object('uuid', u.uuid, 'name', u.name)) FILTER (WHERE u.uuid IS NOT NULL) AS author
      FROM ${escapeIdentifier(schema)}.dashboards d
      LEFT JOIN ${escapeIdentifier(schema)}.users u ON u.uuid = d.author_uuid
      LEFT JOIN ${escapeIdentifier(schema)}.gadgets g ON g.dashboard_uuid = d.uuid AND g.deleted_at IS NULL
      LEFT JOIN ${escapeIdentifier(schema)}.gadget_types gt ON gt.uuid = g.type_uuid
      ${whereClause}
      GROUP BY d.uuid, d.name, d.author_uuid, d.created_at, d.updated_at
      ORDER BY d.created_at DESC
    `);
  }

  // GET /api/v2/dashboards
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const items = await getDashboardWithGadgets(schema);
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting dashboards', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения дашбордов'));
    }
  });

  // GET /api/v2/dashboards/:uuid
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
      const items = await getDashboardWithGadgets(schema, uuid);
      if (items.length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 'Дашборд не найден'));
      }
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting dashboard', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения дашборда'));
    }
  });

  // POST /api/v2/dashboards
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { name, author_uuid, gadgets } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'name required'));
    }

    try {
      // Создаём дашборд
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.dashboards 
        (uuid, name, author_uuid, created_at, updated_at)
        VALUES ($1::uuid, $2, $3::uuid, NOW(), NOW())
      `, uuid, name, author_uuid ?? null);

      // Создаём гаджеты
      if (gadgets && Array.isArray(gadgets)) {
        for (const gadget of gadgets) {
          const gadgetUuid = gadget.uuid && isValidUuid(gadget.uuid) ? gadget.uuid : uuidv4();
          await prisma.$executeRawUnsafe(`
            INSERT INTO ${escapeIdentifier(schema)}.gadgets 
            (uuid, dashboard_uuid, name, config, x0, y0, width, height, type_uuid, created_at, updated_at)
            VALUES (
              $1::uuid, $2::uuid, $3, $4,
              $5, $6, $7, $8,
              $9::uuid, NOW(), NOW()
            )
          `, gadgetUuid, uuid, gadget.name ?? null, gadget.config ?? null,
            gadget.x0 ?? 0, gadget.y0 ?? 0, gadget.width ?? 1, gadget.height ?? 1,
            gadget.type_uuid);
        }
      }

      const items = await getDashboardWithGadgets(schema, uuid);
      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating dashboard', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания дашборда'));
    }
  });

  // PUT /api/v2/dashboards/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { name, gadgets } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      // Обновляем дашборд
      if (name !== undefined) {
        await prisma.$executeRawUnsafe(`
          UPDATE ${escapeIdentifier(schema)}.dashboards 
          SET name = $1, updated_at = NOW()
          WHERE uuid = $2::uuid
        `, name, uuid);
      }

      // Обновляем гаджеты
      if (gadgets && Array.isArray(gadgets)) {
        // Получаем существующие гаджеты
        const existingGadgets: any[] = await prisma.$queryRawUnsafe(`
          SELECT uuid FROM ${escapeIdentifier(schema)}.gadgets 
          WHERE dashboard_uuid = $1::uuid AND deleted_at IS NULL
        `, uuid);
        const existingUuids = new Set(existingGadgets.map((g: any) => g.uuid));
        const newUuids = new Set(gadgets.map((g: any) => g.uuid).filter(Boolean));

        // Удаляем гаджеты которых нет в новом списке
        for (const existing of existingGadgets) {
          if (!newUuids.has(existing.uuid)) {
            await prisma.$executeRawUnsafe(`
              UPDATE ${escapeIdentifier(schema)}.gadgets 
              SET deleted_at = NOW() WHERE uuid = $1::uuid
            `, existing.uuid);
          }
        }

        // Создаём/обновляем гаджеты
        for (const gadget of gadgets) {
          const gadgetUuid = gadget.uuid && isValidUuid(gadget.uuid) ? gadget.uuid : uuidv4();
          
          if (existingUuids.has(gadgetUuid)) {
            await prisma.$executeRawUnsafe(`
              UPDATE ${escapeIdentifier(schema)}.gadgets 
              SET name = $1, config = $2,
                  x0 = $3, y0 = $4,
                  width = $5, height = $6,
                  type_uuid = $7::uuid, updated_at = NOW()
              WHERE uuid = $8::uuid
            `, gadget.name ?? null, gadget.config ?? null,
              gadget.x0 ?? 0, gadget.y0 ?? 0,
              gadget.width ?? 1, gadget.height ?? 1,
              gadget.type_uuid, gadgetUuid);
          } else {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.gadgets 
              (uuid, dashboard_uuid, name, config, x0, y0, width, height, type_uuid, created_at, updated_at)
              VALUES (
                $1::uuid, $2::uuid, $3, $4,
                $5, $6, $7, $8,
                $9::uuid, NOW(), NOW()
              )
            `, gadgetUuid, uuid, gadget.name ?? null, gadget.config ?? null,
              gadget.x0 ?? 0, gadget.y0 ?? 0, gadget.width ?? 1, gadget.height ?? 1,
              gadget.type_uuid);
          }
        }
      }

      const items = await getDashboardWithGadgets(schema, uuid);
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating dashboard', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления дашборда'));
    }
  });

  // DELETE /api/v2/dashboards/:uuid
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
      // Удаляем гаджеты
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.gadgets 
        SET deleted_at = NOW() WHERE dashboard_uuid = $1::uuid
      `, uuid);
      // Удаляем дашборд
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.dashboards 
        SET deleted_at = NOW() WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting dashboard', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления дашборда'));
    }
  });

  app.use(`${apiPrefix}/dashboards`, router);

  listeners.push({ method: 'get', func: 'read_dashboards', entity: 'dashboards' });
  listeners.push({ method: 'get', func: 'read_dashboard', entity: 'dashboard' });
  listeners.push({ method: 'post', func: 'create_dashboards', entity: 'dashboards' });
  listeners.push({ method: 'post', func: 'upsert_dashboards', entity: 'dashboards' });
  listeners.push({ method: 'post', func: 'upsert_dashboard', entity: 'dashboard' });
  listeners.push({ method: 'put', func: 'update_dashboards', entity: 'dashboards' });
  listeners.push({ method: 'delete', func: 'delete_dashboards', entity: 'dashboards' });

  logger.info({ msg: 'Dashboards routes registered' });
}






