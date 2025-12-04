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
      'uuid', 'issue_uuid', 'author_uuid', 'work_date', 'duration', 'comment',
      'created_at', 'updated_at'
    ],
    requiredFields: ['issue_uuid', 'author_uuid', 'work_date', 'duration'],
    uuidFields: ['issue_uuid', 'author_uuid'],
    updatableFields: ['work_date', 'duration', 'comment'],
    defaultOrder: 'work_date DESC',
    softDelete: true
  });
}
