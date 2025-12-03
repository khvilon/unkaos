/**
 * Dictionary/Reference Tables Routes - справочники
 */

import { PrismaClient } from '@prisma/client';
import { createCrudRoutes, Listener } from '../utils/crud-factory';
import { createLogger } from '../../common/logging';

const logger = createLogger('zeus2:dictionaries');

export function registerDictionariesRoutes(
  app: any,
  prisma: PrismaClient,
  listeners: Listener[],
  apiPrefix: string
) {
  // ==================== PERMISSIONS ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'permissions',
    singular: 'permission',
    fields: ['uuid', 'name', 'code', 'created_at', 'updated_at'],
    requiredFields: ['name'],
    updatableFields: ['name', 'code'],
    defaultOrder: 'name ASC',
    softDelete: false  // Таблица не имеет deleted_at
  });

  // ==================== FIELD_TYPES ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'field_types',
    singular: 'field_type',
    fields: ['uuid', 'name', 'code', 'created_at', 'updated_at'],
    requiredFields: ['name', 'code'],
    updatableFields: ['name', 'code'],
    defaultOrder: 'name ASC',
    softDelete: true
  });

  // ==================== RELATION_TYPES ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'relation_types',
    singular: 'relation_type',
    fields: ['uuid', 'name', 'revert_name', 'created_at', 'updated_at'],
    requiredFields: ['name'],
    updatableFields: ['name', 'revert_name'],
    defaultOrder: 'name ASC',
    softDelete: true
  });

  // ==================== ISSUE_ACTIONS_TYPES ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'issue_actions_types',
    singular: 'issue_actions_type',
    fields: ['uuid', 'name'],  // Таблица не имеет created_at, updated_at
    requiredFields: ['name'],
    updatableFields: ['name'],
    defaultOrder: 'name ASC',
    softDelete: false  // Таблица не имеет deleted_at
  });

  // ==================== GADGET_TYPES ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'gadget_types',
    singular: 'gadget_type',
    fields: ['uuid', 'name', 'code', 'created_at', 'updated_at'],
    requiredFields: ['name', 'code'],
    updatableFields: ['name', 'code'],
    defaultOrder: 'name ASC',
    softDelete: true
  });

  // ==================== BOARDS_COLUMNS ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'boards_columns',
    singular: 'boards_column',
    fields: ['uuid', 'boards_uuid', 'status_uuid', 'num', 'created_at', 'updated_at'],
    requiredFields: ['boards_uuid', 'status_uuid'],
    uuidFields: ['boards_uuid', 'status_uuid'],
    updatableFields: ['status_uuid', 'num'],
    defaultOrder: 'num ASC',
    softDelete: true
  });

  // ==================== FAVOURITES_TYPES ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'favourites_types',
    singular: 'favourites_type',
    fields: ['uuid', 'name', 'created_at', 'updated_at'],
    requiredFields: ['name'],
    updatableFields: ['name'],
    defaultOrder: 'name ASC',
    softDelete: true
  });

  // ==================== GADGETS ====================
  createCrudRoutes(app, prisma, listeners, apiPrefix, {
    entity: 'gadgets',
    singular: 'gadget',
    fields: ['uuid', 'dashboard_uuid', 'name', 'type_uuid', 'config', 'x0', 'y0', 'width', 'height', 'created_at', 'updated_at'],
    requiredFields: ['dashboard_uuid', 'type_uuid'],
    uuidFields: ['dashboard_uuid', 'type_uuid'],
    updatableFields: ['name', 'type_uuid', 'config', 'x0', 'y0', 'width', 'height'],
    relations: [
      {
        table: 'gadget_types',
        alias: 'GT',
        foreignKey: 'type_uuid',
        selectFields: [{ field: 'name', as: 'type_name' }, { field: 'code', as: 'type_code' }]
      }
    ],
    defaultOrder: 'y0 ASC, x0 ASC',
    softDelete: true
  });

  logger.info({ msg: 'Dictionaries routes registered' });
}



