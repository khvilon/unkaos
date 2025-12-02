/**
 * Workflows REST API
 * 
 * Endpoints:
 *   GET    /api/v2/workflows          - Получение списка воркфлоу
 *   GET    /api/v2/workflows/:uuid    - Получение воркфлоу по UUID (с nodes и transitions)
 *   POST   /api/v2/workflows          - Создание воркфлоу
 *   PUT    /api/v2/workflows/:uuid    - Полное обновление воркфлоу (включая nodes и transitions)
 *   PATCH  /api/v2/workflows/:uuid    - Частичное обновление воркфлоу
 *   DELETE /api/v2/workflows/:uuid    - Удаление воркфлоу (soft delete)
 * 
 * Nested resources:
 *   GET    /api/v2/workflows/:uuid/nodes       - Получение нод воркфлоу
 *   POST   /api/v2/workflows/:uuid/nodes       - Добавление ноды
 *   DELETE /api/v2/workflows/:uuid/nodes/:node_uuid - Удаление ноды
 * 
 *   GET    /api/v2/workflows/:uuid/transitions - Получение переходов
 *   POST   /api/v2/workflows/:uuid/transitions - Добавление перехода
 *   DELETE /api/v2/workflows/:uuid/transitions/:transition_uuid - Удаление перехода
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createLogger } from '../../common/logging';
import { randomUUID } from 'crypto';

const logger = createLogger('zeus2:workflows');

interface Listener {
  method: string;
  func: string;
  entity: string;
}

// Response formatters
function formatWorkflow(wf: any, includeRelations = true) {
  const result: any = {
    uuid: wf.uuid,
    name: wf.name,
    created_at: wf.created_at,
    updated_at: wf.updated_at
  };

  if (includeRelations && wf.workflow_nodes) {
    result.workflow_nodes = wf.workflow_nodes.map((node: any) => ({
      uuid: node.uuid,
      x: node.x,
      y: node.y,
      issue_statuses_uuid: node.issue_statuses_uuid,
      issue_status: node.issue_statuses ? {
        uuid: node.issue_statuses.uuid,
        name: node.issue_statuses.name,
        is_start: node.issue_statuses.is_start,
        is_end: node.issue_statuses.is_end
      } : null
    }));
  }

  if (includeRelations && wf.transitions) {
    result.transitions = wf.transitions.map((tr: any) => ({
      uuid: tr.uuid,
      from_uuid: tr.from_uuid,
      to_uuid: tr.to_uuid
    }));
  }

  return result;
}

function formatWorkflowListItem(wf: any) {
  return {
    uuid: wf.uuid,
    name: wf.name,
    created_at: wf.created_at,
    updated_at: wf.updated_at,
    nodes_count: wf._count?.workflow_nodes || 0,
    transitions_count: wf._count?.transitions || 0
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

export function registerWorkflowsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  const entityName = 'workflows';
  const basePath = `${apiPrefix}/${entityName}`;

  // GET /api/v2/workflows - Получение списка
  app.get(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { page = '1', limit = '20', sort } = req.query;

      logger.info({ msg: 'GET workflows', subdomain, page, limit });

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
      const skip = (pageNum - 1) * limitNum;

      let orderBy: any = { name: 'asc' };
      if (sort) {
        const [field, direction] = (sort as string).split(',');
        orderBy = { [field]: direction === 'desc' ? 'desc' : 'asc' };
      }

      // Use raw SQL with search_path for multi-tenancy
      // Prisma ORM doesn't respect SET search_path, so we use raw queries with explicit schema
      const items: any[] = await prisma.$queryRawUnsafe(`
        SELECT 
          w.uuid, w.name, w.created_at, w.updated_at,
          (SELECT COUNT(*) FROM "${subdomain}".workflow_nodes wn WHERE wn.workflows_uuid = w.uuid AND wn.deleted_at IS NULL) as nodes_count,
          (SELECT COUNT(*) FROM "${subdomain}".transitions t WHERE t.workflows_uuid = w.uuid AND t.deleted_at IS NULL) as transitions_count
        FROM "${subdomain}".workflows w
        WHERE w.deleted_at IS NULL
        ORDER BY w.name ASC
        LIMIT ${limitNum} OFFSET ${skip}
      `);

      const totalResult: any[] = await prisma.$queryRawUnsafe(`
        SELECT COUNT(*) as count FROM "${subdomain}".workflows WHERE deleted_at IS NULL
      `);
      const total = Number(totalResult[0]?.count || 0);

      logger.info({ msg: 'Workflows found', count: items.length, total });

      logger.info({ msg: 'Workflows found', count: items.length, total });

      res.status(200).json({
        items: items.map(item => ({
          uuid: item.uuid,
          name: item.name,
          created_at: item.created_at,
          updated_at: item.updated_at,
          nodes_count: Number(item.nodes_count || 0),
          transitions_count: Number(item.transitions_count || 0)
        })),
        page: pageNum,
        limit: limitNum,
        total
      });

    } catch (error) {
      logger.error({ msg: 'Error getting workflows', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: basePath, entity: entityName });

  // GET /api/v2/workflows/:uuid - Получение по UUID с relations
  app.get(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'GET workflow', subdomain, uuid });

      await prisma.$executeRawUnsafe(`SET search_path TO "${subdomain}", public`);

      const item = await prisma.workflows.findFirst({
        where: { uuid, deleted_at: null },
        include: {
          workflow_nodes: {
            where: { deleted_at: null },
            include: { issue_statuses: true }
          },
          transitions: {
            where: { deleted_at: null }
          }
        }
      });

      if (!item) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Воркфлоу не найден'));
      }

      res.status(200).json(formatWorkflow(item));

    } catch (error) {
      logger.error({ msg: 'Error getting workflow', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'get', func: `${basePath}/:uuid`, entity: entityName });

  // POST /api/v2/workflows - Создание
  app.post(basePath, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const authorUuid = req.headers.user_uuid as string;
      const { name, workflow_nodes, transitions } = req.body;

      // Validation
      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации', [
          { field: 'name', message: 'Поле name обязательно' }
        ]));
      }

      logger.info({ msg: 'POST workflow', subdomain, name });

      await prisma.$executeRawUnsafe(`SET search_path TO "${subdomain}", public`);

      const workflowUuid = randomUUID();

      const result = await prisma.$transaction(async (tx) => {
        // Create workflow
        const workflow = await tx.workflows.create({
          data: {
            uuid: workflowUuid,
            name
          }
        });

        // Create nodes if provided
        if (workflow_nodes && Array.isArray(workflow_nodes)) {
          for (const node of workflow_nodes) {
            await tx.workflow_nodes.create({
              data: {
                uuid: node.uuid || randomUUID(),
                x: Math.round(node.x || 0),
                y: Math.round(node.y || 0),
                workflows_uuid: workflowUuid,
                issue_statuses_uuid: node.issue_statuses_uuid
              }
            });
          }
        }

        // Create transitions if provided
        if (transitions && Array.isArray(transitions)) {
          for (const tr of transitions) {
            await tx.transitions.create({
              data: {
                uuid: tr.uuid || randomUUID(),
                workflows_uuid: workflowUuid,
                from_uuid: tr.from_uuid,
                to_uuid: tr.to_uuid
              }
            });
          }
        }

        // Return with relations
        return await tx.workflows.findUnique({
          where: { uuid: workflowUuid },
          include: {
            workflow_nodes: {
              where: { deleted_at: null },
              include: { issue_statuses: true }
            },
            transitions: {
              where: { deleted_at: null }
            }
          }
        });
      });

      res.status(201).json(formatWorkflow(result));

    } catch (error) {
      logger.error({ msg: 'Error creating workflow', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: basePath, entity: entityName });

  // PUT /api/v2/workflows/:uuid - Полное обновление
  app.put(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name, workflow_nodes, transitions } = req.body;

      if (!name || typeof name !== 'string') {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации', [
          { field: 'name', message: 'Поле name обязательно' }
        ]));
      }

      logger.info({ 
        msg: 'PUT workflow', 
        subdomain, 
        uuid,
        nodes_count: workflow_nodes?.length,
        transitions_count: transitions?.length
      });

      await prisma.$executeRawUnsafe(`SET search_path TO "${subdomain}", public`);

      // Check exists
      const existing = await prisma.workflows.findFirst({
        where: { uuid, deleted_at: null }
      });

      if (!existing) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Воркфлоу не найден'));
      }

      const result = await prisma.$transaction(async (tx) => {
        // Update workflow
        await tx.workflows.update({
          where: { uuid },
          data: { name, updated_at: new Date() }
        });

        // Get existing nodes and transitions
        const existingNodes = await tx.workflow_nodes.findMany({
          where: { workflows_uuid: uuid, deleted_at: null }
        });
        const existingTransitions = await tx.transitions.findMany({
          where: { workflows_uuid: uuid, deleted_at: null }
        });

        // Process nodes
        const newNodeUuids = new Set((workflow_nodes || []).map((n: any) => n.uuid));
        
        // Soft delete removed nodes
        for (const node of existingNodes) {
          if (!newNodeUuids.has(node.uuid)) {
            await tx.workflow_nodes.update({
              where: { uuid: node.uuid },
              data: { deleted_at: new Date() }
            });
          }
        }

        // Upsert nodes
        for (const node of workflow_nodes || []) {
          await tx.workflow_nodes.upsert({
            where: { uuid: node.uuid || randomUUID() },
            update: {
              x: Math.round(node.x),
              y: Math.round(node.y),
              issue_statuses_uuid: node.issue_statuses_uuid,
              updated_at: new Date(),
              deleted_at: null
            },
            create: {
              uuid: node.uuid || randomUUID(),
              x: Math.round(node.x),
              y: Math.round(node.y),
              workflows_uuid: uuid,
              issue_statuses_uuid: node.issue_statuses_uuid
            }
          });
        }

        // Process transitions
        const newTransitionUuids = new Set((transitions || []).map((t: any) => t.uuid));
        
        // Soft delete removed transitions
        for (const tr of existingTransitions) {
          if (!newTransitionUuids.has(tr.uuid)) {
            await tx.transitions.update({
              where: { uuid: tr.uuid },
              data: { deleted_at: new Date() }
            });
          }
        }

        // Upsert transitions
        for (const tr of transitions || []) {
          await tx.transitions.upsert({
            where: { uuid: tr.uuid || randomUUID() },
            update: {
              from_uuid: tr.from_uuid,
              to_uuid: tr.to_uuid,
              updated_at: new Date(),
              deleted_at: null
            },
            create: {
              uuid: tr.uuid || randomUUID(),
              workflows_uuid: uuid,
              from_uuid: tr.from_uuid,
              to_uuid: tr.to_uuid
            }
          });
        }

        return await tx.workflows.findUnique({
          where: { uuid },
          include: {
            workflow_nodes: {
              where: { deleted_at: null },
              include: { issue_statuses: true }
            },
            transitions: {
              where: { deleted_at: null }
            }
          }
        });
      });

      res.status(200).json(formatWorkflow(result));

    } catch (error) {
      logger.error({ msg: 'Error updating workflow', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'put', func: `${basePath}/:uuid`, entity: entityName });

  // PATCH /api/v2/workflows/:uuid - Частичное обновление (только name)
  app.patch(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;
      const { name } = req.body;

      if (name === undefined) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Нет полей для обновления'));
      }

      logger.info({ msg: 'PATCH workflow', subdomain, uuid });

      await prisma.$executeRawUnsafe(`SET search_path TO "${subdomain}", public`);

      const existing = await prisma.workflows.findFirst({
        where: { uuid, deleted_at: null }
      });

      if (!existing) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Воркфлоу не найден'));
      }

      const item = await prisma.workflows.update({
        where: { uuid },
        data: { name, updated_at: new Date() },
        include: {
          workflow_nodes: {
            where: { deleted_at: null },
            include: { issue_statuses: true }
          },
          transitions: {
            where: { deleted_at: null }
          }
        }
      });

      res.status(200).json(formatWorkflow(item));

    } catch (error) {
      logger.error({ msg: 'Error patching workflow', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'patch', func: `${basePath}/:uuid`, entity: entityName });

  // DELETE /api/v2/workflows/:uuid - Удаление
  app.delete(`${basePath}/:uuid`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid } = req.params;

      logger.info({ msg: 'DELETE workflow', subdomain, uuid });

      await prisma.$executeRawUnsafe(`SET search_path TO "${subdomain}", public`);

      const existing = await prisma.workflows.findFirst({
        where: { uuid, deleted_at: null }
      });

      if (!existing) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Воркфлоу не найден'));
      }

      // Check if workflow is used by issue types
      const usedByIssueType = await prisma.issue_types.findFirst({
        where: { workflow_uuid: uuid, deleted_at: null }
      });

      if (usedByIssueType) {
        return res.status(409).json(errorResponse(req, 'WORKFLOW_IN_USE', 'Воркфлоу используется типом задачи и не может быть удалён'));
      }

      await prisma.$transaction(async (tx) => {
        const now = new Date();
        await tx.transitions.updateMany({
          where: { workflows_uuid: uuid },
          data: { deleted_at: now }
        });
        await tx.workflow_nodes.updateMany({
          where: { workflows_uuid: uuid },
          data: { deleted_at: now }
        });
        await tx.workflows.update({
          where: { uuid },
          data: { deleted_at: now }
        });
      });

      res.status(204).send();

    } catch (error) {
      logger.error({ msg: 'Error deleting workflow', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'delete', func: `${basePath}/:uuid`, entity: entityName });

  // ==================== NESTED RESOURCES ====================

  // POST /api/v2/workflows/:uuid/nodes - Добавление ноды
  app.post(`${basePath}/:uuid/nodes`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid: workflowUuid } = req.params;
      const { x, y, issue_statuses_uuid } = req.body;

      if (!issue_statuses_uuid) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации', [
          { field: 'issue_statuses_uuid', message: 'Поле issue_statuses_uuid обязательно' }
        ]));
      }

      await prisma.$executeRawUnsafe(`SET search_path TO "${subdomain}", public`);

      // Check workflow exists
      const workflow = await prisma.workflows.findFirst({
        where: { uuid: workflowUuid, deleted_at: null }
      });

      if (!workflow) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Воркфлоу не найден'));
      }

      const node = await prisma.workflow_nodes.create({
        data: {
          uuid: randomUUID(),
          x: Math.round(x || 100),
          y: Math.round(y || 100),
          workflows_uuid: workflowUuid,
          issue_statuses_uuid
        },
        include: { issue_statuses: true }
      });

      res.status(201).json({
        uuid: node.uuid,
        x: node.x,
        y: node.y,
        issue_statuses_uuid: node.issue_statuses_uuid,
        issue_status: node.issue_statuses ? {
          uuid: node.issue_statuses.uuid,
          name: node.issue_statuses.name
        } : null
      });

    } catch (error) {
      logger.error({ msg: 'Error adding workflow node', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: `${basePath}/:uuid/nodes`, entity: entityName });

  // POST /api/v2/workflows/:uuid/transitions - Добавление перехода
  app.post(`${basePath}/:uuid/transitions`, async (req: Request, res: Response) => {
    try {
      const subdomain = req.headers.subdomain as string;
      const { uuid: workflowUuid } = req.params;
      const { from_uuid, to_uuid } = req.body;

      const validationErrors: any[] = [];
      if (!from_uuid) validationErrors.push({ field: 'from_uuid', message: 'Поле from_uuid обязательно' });
      if (!to_uuid) validationErrors.push({ field: 'to_uuid', message: 'Поле to_uuid обязательно' });

      if (validationErrors.length > 0) {
        return res.status(400).json(errorResponse(req, 'VALIDATION_ERROR', 'Ошибка валидации', validationErrors));
      }

      await prisma.$executeRawUnsafe(`SET search_path TO "${subdomain}", public`);

      const workflow = await prisma.workflows.findFirst({
        where: { uuid: workflowUuid, deleted_at: null }
      });

      if (!workflow) {
        return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Воркфлоу не найден'));
      }

      const transition = await prisma.transitions.create({
        data: {
          uuid: randomUUID(),
          workflows_uuid: workflowUuid,
          from_uuid,
          to_uuid
        }
      });

      res.status(201).json({
        uuid: transition.uuid,
        from_uuid: transition.from_uuid,
        to_uuid: transition.to_uuid
      });

    } catch (error) {
      logger.error({ msg: 'Error adding workflow transition', error });
      res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Внутренняя ошибка сервера'));
    }
  });
  listeners.push({ method: 'post', func: `${basePath}/:uuid/transitions`, entity: entityName });

  logger.info({ msg: `Registered ${entityName} routes`, basePath });
}
