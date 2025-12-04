/**
 * Workflows Routes - со вложенными workflow_nodes и transitions
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';
import { v4 as uuidv4 } from 'uuid';

const logger = createLogger('zeus2:workflows');

export function registerWorkflowsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const router = Router();

  async function getWorkflowWithNodes(schema: string, uuid?: string) {
    const whereClause = uuid 
      ? `WHERE w.uuid = $1::uuid AND w.deleted_at IS NULL`
      : `WHERE w.deleted_at IS NULL`;

    // Получаем workflows с nodes
    // Формат issue_statuses как массив для совместимости с фронтендом
    const query = `
      SELECT 
        'workflows' AS table_name,
        w.uuid, w.name, w.created_at, w.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'uuid', wn.uuid,
              'workflow_uuid', wn.workflows_uuid,
              'issue_statuses_uuid', wn.issue_statuses_uuid,
              'issue_statuses', json_build_array(
                json_build_object(
                  'uuid', ist.uuid,
                  'name', ist.name,
                  'is_start', ist.is_start,
                  'is_end', ist.is_end
                )
              ),
              'x', wn.x,
              'y', wn.y
            )
          ) FILTER (WHERE wn.uuid IS NOT NULL), '[]'
        ) AS workflow_nodes
      FROM ${escapeIdentifier(schema)}.workflows w
      LEFT JOIN ${escapeIdentifier(schema)}.workflow_nodes wn ON wn.workflows_uuid = w.uuid AND wn.deleted_at IS NULL
      LEFT JOIN ${escapeIdentifier(schema)}.issue_statuses ist ON ist.uuid = wn.issue_statuses_uuid
      ${whereClause}
      GROUP BY w.uuid, w.name, w.created_at, w.updated_at
      ORDER BY w.name ASC
    `;

    const workflows: any[] = uuid 
      ? await prisma.$queryRawUnsafe(query, uuid)
      : await prisma.$queryRawUnsafe(query.replace('$1::uuid', "'dummy'"));

    // Получаем transitions для каждого workflow
    for (const workflow of workflows) {
      const transitions = await prisma.$queryRawUnsafe(`
        SELECT 
          t.uuid, t.status_from_uuid, t.status_to_uuid, t.name, t.workflows_uuid
        FROM ${escapeIdentifier(schema)}.transitions t
        WHERE t.workflows_uuid = $1::uuid AND t.deleted_at IS NULL
      `, workflow.uuid);
      workflow.transitions = transitions;
    }

    return workflows;
  }

  // GET /api/v2/workflows
  router.get('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }

    try {
      const items = await getWorkflowWithNodes(schema);
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting workflows', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения воркфлоу'));
    }
  });

  // GET /api/v2/workflows/:uuid
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
      const items: any[] = await getWorkflowWithNodes(schema, uuid);
      if (items.length === 0) {
        return res.status(404).json(createErrorResponse(req, 'NOT_FOUND', 'Воркфлоу не найден'));
      }
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting workflow', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения воркфлоу'));
    }
  });

  // POST /api/v2/workflows
  router.post('/', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { name, workflow_nodes, transitions } = req.body;
    const uuid = req.body.uuid && isValidUuid(req.body.uuid) ? req.body.uuid : uuidv4();

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!name) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'name required'));
    }

    try {
      // Create workflow
      await prisma.$executeRawUnsafe(`
        INSERT INTO ${escapeIdentifier(schema)}.workflows 
        (uuid, name, created_at, updated_at)
        VALUES ($1::uuid, $2, NOW(), NOW())
      `, uuid, name);

      // Create nodes
      if (workflow_nodes && Array.isArray(workflow_nodes)) {
        for (const node of workflow_nodes) {
          const nodeUuid = node.uuid && isValidUuid(node.uuid) ? node.uuid : uuidv4();
          const statusUuid = node.status_uuid || node.issue_statuses_uuid;
          await prisma.$executeRawUnsafe(`
            INSERT INTO ${escapeIdentifier(schema)}.workflow_nodes 
            (uuid, workflows_uuid, issue_statuses_uuid, x, y, created_at, updated_at)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW(), NOW())
          `, nodeUuid, uuid, statusUuid, node.x ?? 0, node.y ?? 0);
        }
      }

      // Create transitions
      if (transitions && Array.isArray(transitions)) {
        for (const trans of transitions) {
          const transUuid = trans.uuid && isValidUuid(trans.uuid) ? trans.uuid : uuidv4();
          await prisma.$executeRawUnsafe(`
            INSERT INTO ${escapeIdentifier(schema)}.transitions 
            (uuid, workflows_uuid, status_from_uuid, status_to_uuid, name, created_at, updated_at)
            VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, NOW(), NOW())
          `, transUuid, uuid, trans.status_from_uuid, trans.status_to_uuid, trans.name ?? '');
        }
      }

      const items = await getWorkflowWithNodes(schema, uuid);
      res.status(201).json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error creating workflow', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка создания воркфлоу'));
    }
  });

  // PUT /api/v2/workflows/:uuid
  router.put('/:uuid', async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const { uuid } = req.params;
    const { name, workflow_nodes, transitions } = req.body;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!isValidUuid(uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Invalid UUID'));
    }

    try {
      // Update workflow name
      if (name !== undefined) {
        await prisma.$executeRawUnsafe(`
          UPDATE ${escapeIdentifier(schema)}.workflows 
          SET name = $1, updated_at = NOW()
          WHERE uuid = $2::uuid
        `, name, uuid);
      }

      // Update nodes if provided
      // По парадигме Full Replace: undefined = не трогаем, [] = удаляем все, [...] = полная замена
      if (workflow_nodes !== undefined && Array.isArray(workflow_nodes)) {
        // Get existing nodes
        const existingNodes: any[] = await prisma.$queryRawUnsafe(`
          SELECT uuid FROM ${escapeIdentifier(schema)}.workflow_nodes 
          WHERE workflows_uuid = $1::uuid AND deleted_at IS NULL
        `, uuid);
        const existingNodeUuids = new Set(existingNodes.map((n: any) => n.uuid));
        const newNodeUuids = new Set(workflow_nodes.map((n: any) => n.uuid).filter(Boolean));

        // Delete nodes not in new list
        for (const existing of existingNodes) {
          if (!newNodeUuids.has(existing.uuid)) {
            await prisma.$executeRawUnsafe(`
              UPDATE ${escapeIdentifier(schema)}.workflow_nodes 
              SET deleted_at = NOW() WHERE uuid = $1::uuid
            `, existing.uuid);
          }
        }

        // Create/update nodes
        for (const node of workflow_nodes) {
          const nodeUuid = node.uuid && isValidUuid(node.uuid) ? node.uuid : uuidv4();
          const statusUuid = node.status_uuid || node.issue_statuses_uuid;
          
          if (existingNodeUuids.has(nodeUuid)) {
            await prisma.$executeRawUnsafe(`
              UPDATE ${escapeIdentifier(schema)}.workflow_nodes 
              SET issue_statuses_uuid = $1::uuid, x = $2, y = $3, updated_at = NOW()
              WHERE uuid = $4::uuid
            `, statusUuid, node.x ?? 0, node.y ?? 0, nodeUuid);
          } else {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.workflow_nodes 
              (uuid, workflows_uuid, issue_statuses_uuid, x, y, created_at, updated_at)
              VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW(), NOW())
            `, nodeUuid, uuid, statusUuid, node.x ?? 0, node.y ?? 0);
          }
        }
      }

      // Update transitions if provided
      // По парадигме Full Replace: undefined = не трогаем, [] = удаляем все, [...] = полная замена
      if (transitions !== undefined && Array.isArray(transitions)) {
        // Get existing transitions
        const existingTrans: any[] = await prisma.$queryRawUnsafe(`
          SELECT uuid FROM ${escapeIdentifier(schema)}.transitions 
          WHERE workflows_uuid = $1::uuid AND deleted_at IS NULL
        `, uuid);
        const existingTransUuids = new Set(existingTrans.map((t: any) => t.uuid));
        const newTransUuids = new Set(transitions.map((t: any) => t.uuid).filter(Boolean));

        // Delete transitions not in new list
        for (const existing of existingTrans) {
          if (!newTransUuids.has(existing.uuid)) {
            await prisma.$executeRawUnsafe(`
              UPDATE ${escapeIdentifier(schema)}.transitions 
              SET deleted_at = NOW() WHERE uuid = $1::uuid
            `, existing.uuid);
          }
        }

        // Create/update transitions
        for (const trans of transitions) {
          const transUuid = trans.uuid && isValidUuid(trans.uuid) ? trans.uuid : uuidv4();
          
          if (existingTransUuids.has(transUuid)) {
            // Restore deleted transition and update
            await prisma.$executeRawUnsafe(`
              UPDATE ${escapeIdentifier(schema)}.transitions 
              SET status_from_uuid = $1::uuid, status_to_uuid = $2::uuid, name = $3, updated_at = NOW(), deleted_at = NULL
              WHERE uuid = $4::uuid
            `, trans.status_from_uuid, trans.status_to_uuid, trans.name ?? '', transUuid);
          } else {
            await prisma.$executeRawUnsafe(`
              INSERT INTO ${escapeIdentifier(schema)}.transitions 
              (uuid, workflows_uuid, status_from_uuid, status_to_uuid, name, created_at, updated_at)
              VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, NOW(), NOW())
              ON CONFLICT (uuid) DO UPDATE SET 
                status_from_uuid = $3::uuid, status_to_uuid = $4::uuid, name = $5, updated_at = NOW(), deleted_at = NULL
            `, transUuid, uuid, trans.status_from_uuid, trans.status_to_uuid, trans.name ?? '');
          }
        }
      }

      const items = await getWorkflowWithNodes(schema, uuid);
      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error updating workflow', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка обновления воркфлоу'));
    }
  });

  // DELETE /api/v2/workflows/:uuid
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
      // Delete transitions
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.transitions 
        SET deleted_at = NOW() WHERE workflows_uuid = $1::uuid
      `, uuid);
      // Delete nodes
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.workflow_nodes 
        SET deleted_at = NOW() WHERE workflows_uuid = $1::uuid
      `, uuid);
      // Delete workflow
      await prisma.$executeRawUnsafe(`
        UPDATE ${escapeIdentifier(schema)}.workflows 
        SET deleted_at = NOW() WHERE uuid = $1::uuid
      `, uuid);
      res.status(204).send();
    } catch (error: any) {
      logger.error({ msg: 'Error deleting workflow', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка удаления воркфлоу'));
    }
  });

  app.use(`${apiPrefix}/workflows`, router);

  listeners.push({ method: 'get', func: 'read_workflows', entity: 'workflows' });
  listeners.push({ method: 'get', func: 'read_workflow', entity: 'workflow' });
  listeners.push({ method: 'post', func: 'create_workflows', entity: 'workflows' });
  listeners.push({ method: 'post', func: 'upsert_workflows', entity: 'workflows' });
  listeners.push({ method: 'post', func: 'upsert_workflow', entity: 'workflow' });
  listeners.push({ method: 'put', func: 'update_workflows', entity: 'workflows' });
  listeners.push({ method: 'delete', func: 'delete_workflows', entity: 'workflows' });

  logger.info({ msg: 'Workflows routes registered' });
}
