/**
 * Relations Routes - с кастомным formatted endpoint
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, createErrorResponse, isValidUuid, escapeIdentifier, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';

const logger = createLogger('zeus2:relations');

export function registerRelationsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  // Базовый CRUD
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'relations',
    singular: 'relation',
    fields: [
      'uuid', 'issue0_uuid', 'issue1_uuid', 'type_uuid',
      'created_at', 'updated_at'
    ],
    requiredFields: ['issue0_uuid', 'issue1_uuid', 'type_uuid'],
    uuidFields: ['issue0_uuid', 'issue1_uuid', 'type_uuid'],
    updatableFields: ['type_uuid'],
    relations: [
      {
        table: 'relation_types',
        alias: 'RT',
        foreignKey: 'type_uuid',
        selectFields: [
          { field: 'name', as: 'type_name' },
          { field: 'revert_name', as: 'revert_name' }
        ]
      }
    ],
    defaultOrder: 'created_at DESC',
    softDelete: true
  });

  // Кастомный endpoint для форматированных связей
  app.get(`${apiPrefix}/formated-relations`, async (req: Request, res: Response) => {
    const schema = req.headers.subdomain as string;
    const issue_uuid = req.query.issue_uuid as string;

    if (!schema) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'Subdomain required'));
    }
    if (!issue_uuid || !isValidUuid(issue_uuid)) {
      return res.status(400).json(createErrorResponse(req, 'VALIDATION_ERROR', 'issue_uuid required'));
    }

    try {
      const items = await prisma.$queryRawUnsafe(`
        SELECT * FROM (
          SELECT 
            R.UUID, R.ISSUE0_UUID AS CURRENT_UUID, R.DELETED_AT, 
            RT.NAME AS TYPE_NAME, 
            P.SHORT_NAME || '-' || I.NUM AS ID, 
            I.TITLE AS ISSUE_NAME, 
            IST.IS_END AS ISSUE_RESOLVED
          FROM ${escapeIdentifier(schema)}.RELATIONS R 
          LEFT JOIN ${escapeIdentifier(schema)}.RELATION_TYPES RT ON RT.UUID = R.TYPE_UUID 
          LEFT JOIN ${escapeIdentifier(schema)}.ISSUES I ON R.ISSUE1_UUID = I.UUID 
          LEFT JOIN ${escapeIdentifier(schema)}.ISSUE_STATUSES IST ON I.STATUS_UUID = IST.UUID 
          LEFT JOIN ${escapeIdentifier(schema)}.PROJECTS P ON P.UUID = I.PROJECT_UUID
          UNION
          SELECT 
            R.UUID, R.ISSUE1_UUID AS CURRENT_UUID, R.DELETED_AT, 
            RT.REVERT_NAME AS TYPE_NAME, 
            P.SHORT_NAME || '-' || I.NUM AS ID, 
            I.TITLE AS ISSUE_NAME, 
            IST.IS_END AS ISSUE_RESOLVED
          FROM ${escapeIdentifier(schema)}.RELATIONS R 
          LEFT JOIN ${escapeIdentifier(schema)}.RELATION_TYPES RT ON RT.UUID = R.TYPE_UUID 
          LEFT JOIN ${escapeIdentifier(schema)}.ISSUES I ON R.ISSUE0_UUID = I.UUID 
          LEFT JOIN ${escapeIdentifier(schema)}.ISSUE_STATUSES IST ON I.STATUS_UUID = IST.UUID 
          LEFT JOIN ${escapeIdentifier(schema)}.PROJECTS P ON P.UUID = I.PROJECT_UUID
        ) T1 
        WHERE DELETED_AT IS NULL AND CURRENT_UUID = ${issue_uuid}::uuid 
        LIMIT 50
      `);

      res.json({ rows: items });
    } catch (error: any) {
      logger.error({ msg: 'Error getting formatted relations', error: error.message });
      res.status(500).json(createErrorResponse(req, 'INTERNAL_ERROR', 'Ошибка получения связей'));
    }
  });

  listeners.push({ method: 'get', func: 'read_formated_relations', entity: 'formated_relations' });

  logger.info({ msg: 'Relations routes registered (with formatted endpoint)' });
}



