/**
 * Boards Routes - используем CRUD Factory
 */

import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, Listener } from '../utils/crud-factory';

export function registerBoardsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'boards',
    singular: 'board',
    fields: [
      'uuid', 'name', 'query', 'estimate_uuid', 'swimlanes_field_uuid',
      'swimlanes_by_root', 'no_swimlanes', 'use_sprint_filter', 'config',
      'author_uuid', 'created_at', 'updated_at'
    ],
    requiredFields: ['name'],
    uuidFields: ['estimate_uuid', 'swimlanes_field_uuid', 'author_uuid'],
    updatableFields: [
      'name', 'query', 'estimate_uuid', 'swimlanes_field_uuid',
      'swimlanes_by_root', 'no_swimlanes', 'use_sprint_filter', 'config'
    ],
    relations: [
      {
        table: 'users',
        alias: 'U',
        foreignKey: 'author_uuid',
        selectFields: [{ field: 'name', as: 'author_name' }]
      }
    ],
    defaultOrder: 'created_at DESC',
    softDelete: true
  });
}



