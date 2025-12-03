/**
 * Time Entries Routes - используем CRUD Factory
 */

import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, Listener } from '../utils/crud-factory';

export function registerTimeEntriesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'time_entries',
    singular: 'time_entry',
    fields: [
      'uuid', 'issue_uuid', 'user_uuid', 'spent_time', 'description',
      'created_at', 'updated_at'
    ],
    requiredFields: ['issue_uuid', 'user_uuid', 'spent_time'],
    uuidFields: ['issue_uuid', 'user_uuid'],
    updatableFields: ['spent_time', 'description'],
    defaultOrder: 'created_at DESC',
    softDelete: true
  });
}
