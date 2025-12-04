/**
 * Sprints Routes - используем CRUD Factory
 */

import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, Listener } from '../utils/crud-factory';

export function registerSprintsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'sprints',
    singular: 'sprint',
    fields: [
      'uuid', 'name', 'start_date', 'end_date', 'color',
      'archived_at', 'resolved_at', 'created_at', 'updated_at'
    ],
    requiredFields: ['name'],
    uuidFields: [],
    updatableFields: ['name', 'start_date', 'end_date', 'color', 'archived_at', 'resolved_at'],
    defaultOrder: 'start_date DESC NULLS LAST',
    softDelete: true
  });
}



