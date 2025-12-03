/**
 * Attachments Routes - используем CRUD Factory
 */

import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, Listener } from '../utils/crud-factory';

export function registerAttachmentsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'attachments',
    singular: 'attachment',
    fields: [
      'uuid', 'issue_uuid', 'name', 'extention', 'type', 'data',
      'created_at', 'updated_at'
    ],
    requiredFields: ['issue_uuid', 'name'],
    uuidFields: ['issue_uuid'],
    updatableFields: ['name'],
    defaultOrder: 'created_at DESC',
    softDelete: false,  // Вложения удаляются физически - используется daleted_at (опечатка в БД)
    deletedAtColumn: 'daleted_at'  // Опечатка в схеме БД
  });
}



