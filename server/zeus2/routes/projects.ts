/**
 * Projects Routes - используем CRUD Factory
 */

import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, Listener } from '../utils/crud-factory';

export function registerProjectsRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'projects',
    singular: 'project',
    fields: [
      'uuid', 'name', 'short_name', 'owner_uuid', 'description', 'avatar',
      'created_at', 'updated_at'
    ],
    requiredFields: ['name', 'short_name'],
    uuidFields: ['owner_uuid'],
    updatableFields: ['name', 'short_name', 'owner_uuid', 'description', 'avatar'],
    relations: [
      {
        table: 'users',
        alias: 'U',
        foreignKey: 'owner_uuid',
        selectFields: [{ field: 'name', as: 'owner_name' }]
      }
    ],
    defaultOrder: 'name ASC',
    softDelete: true
  });
}
