/**
 * Issue Statuses Routes - используем CRUD Factory
 */

import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, Listener } from '../utils/crud-factory';

export function registerIssueStatusesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'issue_statuses',
    singular: 'issue_status',
    fields: [
      'uuid', 'name', 'is_start', 'is_end',
      'created_at', 'updated_at'
    ],
    requiredFields: ['name'],
    uuidFields: [],
    updatableFields: ['name', 'is_start', 'is_end'],
    defaultOrder: 'name ASC',
    softDelete: true
  });
}
