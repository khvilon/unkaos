CREATE FUNCTION server.add_col_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE 'ALTER TABLE server.field_values_rows ADD COLUMN "' ||  NEW.uuid ||  '" text';
	EXECUTE 'CREATE INDEX ON server.field_values_rows ("' || NEW.uuid || '")';
    RETURN NEW;
END;
$$;

CREATE FUNCTION server.delete_col_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE 'ALTER TABLE server.field_values_rows DROP COLUMN "' || OLD.uuid ||  '" CASCADE';
    RETURN OLD;
END;
$$;

CREATE FUNCTION server.insert_into_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO server.field_values_rows (uuid)
  VALUES (NEW.uuid);
  RETURN NEW;
END;
$$;

CREATE FUNCTION server.update_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE format('UPDATE server.field_values_rows SET "%s" = %L WHERE uuid = %L', NEW.field_uuid, NEW.value, NEW.issue_uuid);
    RETURN NULL;
END;
$$;


CREATE INDEX ON server.field_values_rows USING btree (uuid);
CREATE INDEX ON server.attachments USING btree (issue_uuid);
CREATE INDEX ON server.field_values USING btree (field_uuid);
CREATE INDEX ON server.field_values USING btree (issue_uuid);
CREATE INDEX ON server.field_values USING btree (uuid);
CREATE INDEX ON server.field_values USING hash (value);
CREATE INDEX ON server.issue_actions USING btree (author_uuid);
CREATE INDEX ON server.issue_actions USING btree (issue_uuid);
CREATE INDEX ON server.issue_actions USING btree (type_uuid);
CREATE INDEX ON server.issue_actions USING btree (uuid);
CREATE INDEX ON server.issue_tags USING btree (name);
CREATE INDEX ON server.issue_tags_selected USING btree (deleted_at);
CREATE INDEX ON server.issue_tags_selected USING btree (issue_uuid);
CREATE INDEX ON server.issue_tags_selected USING btree (issue_tags_uuid);
CREATE INDEX ON server.issue_tags USING btree (uuid);
CREATE INDEX ON server.issues USING btree (created_at);
CREATE INDEX ON server.issues USING btree (((deleted_at IS NULL)));
CREATE INDEX ON server.issues USING btree (num);
CREATE INDEX ON server.issues USING btree (project_uuid);
CREATE INDEX ON server.issues USING btree (sprint_uuid);
CREATE INDEX ON server.issues USING btree (status_uuid);
CREATE INDEX ON server.issues USING btree (type_uuid);
CREATE INDEX ON server.issues USING btree (updated_at);
CREATE INDEX ON server.issues USING btree (uuid);
CREATE INDEX ON server.relations USING btree (issue0_uuid);
CREATE INDEX ON server.relations USING btree (issue1_uuid);
CREATE INDEX ON server.relations USING btree (type_uuid);
CREATE INDEX ON server.relations USING btree (uuid);
CREATE INDEX ON server.users USING btree (uuid);
CREATE INDEX ON server.issue_tags_selected USING btree (issue_uuid);
CREATE INDEX ON server.issue_tags_selected USING btree (issue_tags_uuid);

CREATE TRIGGER server_delete_col_field_values_rows AFTER UPDATE ON server.fields FOR EACH ROW WHEN (((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL))) EXECUTE FUNCTION server.delete_col_field_values_rows();
CREATE TRIGGER server_insert_into_field_values_rows AFTER INSERT ON server.issues FOR EACH ROW EXECUTE FUNCTION server.insert_into_field_values_rows();
CREATE TRIGGER server_inserted AFTER INSERT ON server.fields FOR EACH ROW EXECUTE FUNCTION server.add_col_field_values_rows();
CREATE TRIGGER server_update_field_values_rows AFTER INSERT OR UPDATE ON server.field_values FOR EACH ROW EXECUTE FUNCTION server.update_field_values_rows();


ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.user_sessions;
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.users;
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.roles;
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.roles_to_permissions;
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.users_to_roles;
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.permissions;

ALTER PUBLICATION hermes_publication ADD TABLE ONLY server.watchers;
ALTER PUBLICATION hermes_publication ADD TABLE ONLY server.msg_out;
ALTER PUBLICATION hermes_publication ADD TABLE ONLY server.users;
ALTER PUBLICATION hermes_publication ADD TABLE ONLY server.configs;

ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.attachments;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.field_values;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.fields;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.issue_actions;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.issue_tags_selected;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.issues;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.relations;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.users;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.roles;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.users_to_roles;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.projects_permissions;

INSERT INTO server.configs(uuid, service, name, value) VALUES 
('074a8ea8-95f4-49e6-9a60-4c84a7380100', 'email', 'service', ''),
('eee93825-be47-4c6c-a69a-028b6b26243c', 'email', 'user', ''),
('14d4d184-7f58-4064-9461-795aa13210de', 'email', 'pass', ''),
('84d6511e-c78e-436b-9051-5cec4379ac19', 'email', 'from', 'Unkaos'),
('d4606eb0-62ac-474e-ab26-b840c145e1fa', 'discord', 'token', ''),
('dc06c54f-319f-478d-99fa-9066ffd584ca', 'telegram', 'token', ''),
('d91958eb-b3b9-465f-a680-62a830b8a358', 'slack', 'token', ''),
('a8224636-7603-48dd-a2c4-1e38eaf9599c', 'openai', 'key', ''),
('7a75fc39-5319-48d7-8fb3-85e2cf53edb9', 'autoupdate', 'allow', 'true'),
('c6f6e1fb-8433-41b9-9b79-8eea42945152', 'autoupdate', 'from', '23'),
('bfb2df42-317d-4323-8109-cc7b1f30ddb0', 'autoupdate', 'to', '5'),
('cb15b3a7-503c-4026-a2bc-bd104cb6dedf', 'workspace_use', 'sprints', 'false'),
('85dfea7a-fc6f-440f-b414-fe63cd652318', 'workspace_use', 'time_tracking', 'false');

INSERT INTO server.favourites_types (uuid, name) VALUES 
('ac367512-c614-4f2a-b7d3-816018f71ad8', 'Сохраненный запрос'),
('46d00448-4d13-471e-b996-070c0650c113', 'Дашборд'),
('1b6832db-7d94-4423-80f2-10ed989af9f8', 'Доска');

INSERT INTO server.field_types (uuid, name, code) VALUES 
('ba3c701d-ccdf-4af6-8ec1-d72fbb4fdc75', 'Время', 'Time'),
('c001b93c-3676-4e1d-b52a-4e2008c62c45', 'Дата и время', 'Timestamp'),
('a842d209-0111-4b8a-8ba6-cba191c1f4a1', 'Булево', 'Boolean'),
('93d432ce-d64e-4b1d-a358-87fd5de9e3e4', 'Дата', 'Date'),
('891b02c9-a559-44da-8840-6e93bf2d8d22', 'Строка', 'String'),
('9d8ddcc7-a4e8-4ea8-b3d0-e7c9686abc6f', 'Текст', 'Text'),
('c0c4036c-3dd2-4264-ba2e-ec7180a4d35c', 'Числовое', 'Numeric'),
('d57da84f-ed1b-4596-9fb9-9d4c500af63d', 'Пользователь', 'User'),
('457da84d-2d1d-3595-6fba-4d4d674af63f', 'Значение из списка', 'Select');

INSERT INTO server.fields (uuid, name, type_uuid, is_custom) VALUES 
('60d53a40-cda9-4cb2-a207-23f8236ee9a7', 'Затраченное время', 'c0c4036c-3dd2-4264-ba2e-ec7180a4d35c', false),



('e85ccb15-c1d2-433b-bb45-473a9a36a02c', 'Ответственный', 'd57da84f-ed1b-4596-9fb9-9d4c500af63d', true);
INSERT INTO server.fields (uuid, name, type_uuid, is_custom, available_values) VALUES 
('b6ddb33f-eea9-40c0-b1c2-d9ab983026a1', 'Приоритет', '457da84d-2d1d-3595-6fba-4d4d674af63f', true, 
'[
    {
        "name": "Minor",
        "color": "green",
        "uuid": "6acf918c-c9d1-4ba9-8c5b-15d7547e256f"
    },
    {
        "name": "Normal",
        "color": "yellow",
        "uuid": "d6cb57e0-009e-41c6-9881-869efff966e8"
    },
    {
        "name": "Major",
        "color": "orange",
        "uuid": "a07ca498-e623-4d6b-afe5-ea6b3fe5e5dd"
    },
    {
        "name": "Critical",
        "color": "rose",
        "uuid": "9c9ae9e2-206d-4095-8d29-8329b77d4bd0"
    },
    {
        "name": "Show-stopper",
        "color": "red",
        "uuid": "667dd8eb-c225-4d47-a898-136ca2efbaf9"
    }
]');

--CREATE INDEX "field_values_rows_1b54a2db-3df4-485e-9ebc-77bb51f2d490_idx" ON server.field_values_rows USING btree ("1b54a2db-3df4-485e-9ebc-77bb51f2d490");
--CREATE INDEX "field_values_rows_22cf17d4-b21c-4141-8a54-356af786940f_idx" ON server.field_values_rows USING btree ("22cf17d4-b21c-4141-8a54-356af786940f");

INSERT INTO server.gadget_types (uuid, name, code) VALUES 
('4a20ebc1-2740-4304-b2ea-8527f423dacd', 'Диаграмма Ганта', 'Gantt'),
('a558d34b-0bfb-4494-bb22-40ec15e97f0a', 'Таблица задач', 'IssuesTable'),
('4419f964-e212-4466-811e-056c1241b426', 'Отчет по затраченному времени', 'TimeReport');

INSERT INTO server.issue_actions_types VALUES 
('1ff12964-4f5c-4be9-8fe3-f3d9a7225300', '📝'),
('4d7d3265-806b-492a-b6c1-636e1fa653a9', '🔁'),
('f53d8ecc-c26e-4909-a070-5c33e6f7a196', '💬');

INSERT INTO server.issue_statuses (uuid, name, is_start, is_end) VALUES 
('6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', 'Новая', true, false),
('197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'В работе', false, false),
('0f1dd8a2-159c-44cb-8254-caa8a596693b', 'Отложена', false, false),
('f735a09b-2b0c-4541-bd3d-88ca4c27002b', 'Завершена', false, true),
('e57cebc2-5300-47ff-8f72-5d24c5c0ac47', 'Отклонена', false, true);

INSERT INTO server.relation_types (uuid, name, revert_name) VALUES 
('73b0a22e-4632-453d-903b-09804093ef1b', 'Родительская к', 'Дочерняя к'),
('b44dab29-bd47-4507-91b1-d62ddf34d09f', 'Необходима для', 'Требуется'),
('06e7ced5-d15c-412c-9e64-0858840d542d', 'Связана с', 'Связана с'),
('d279639b-2a7b-44d3-b317-eceea45c5592', 'Дублирует', 'Дублируема');



INSERT INTO server.roles (uuid, name, is_custom) VALUES 
('556972a6-0370-4f00-aca2-73a477e48999', 'Администратор', false),
('3a556a56-eb59-4654-92ac-1921040eeea1', 'Помощник администратора', true),
('fa9d5af3-3567-4a63-9653-3567a636cc6a', 'Менеджер', true),
('0090d50a-d3de-4bb2-822f-c8b5dd4428da', 'Работник', true),
('287ccc96-30ed-4b14-81d2-905140b32eab', 'Гость', true);


INSERT INTO server.permissions (uuid, code, name, targets) VALUES 
('199f5994-7ba3-4619-a4f5-15e6a9185fe5', 'common', 'Общие разрешения', 
'[
    {"allow": "R", "table": "favourites"},

    {"allow": "R", "table": "configs"},
    {"allow": "R", "table": "sprints"},
    {"allow": "R", "table": "projects"},
    {"allow": "R", "table": "users"},
    {"allow": "R", "table": "roles"},
    {"allow": "R", "table": "users_to_roles"},
    {"allow": "R", "table": "permissions"},
    {"allow": "R", "table": "boards"},
    {"allow": "R", "table": "dashboards"},
    {"allow": "R", "table": "dashboard"},
    {"allow": "R", "table": "board"},
    {"allow": "R", "table": "boards_filters"},

    {"allow": "R", "table": "field_types"},
    {"allow": "R", "table": "gadget_types"},
    {"allow": "R", "table": "issue_actions_types"},
    {"allow": "R", "table": "favourites_types"},
    {"allow": "R", "table": "relation_types"},

    {"allow": "R", "table": "transitions"},
    {"allow": "R", "table": "workflows"},
    {"allow": "R", "table": "workflow_nodes"},
    {"allow": "R", "table": "fields"},
    {"allow": "R", "table": "issue_statuses"},
    {"allow": "R", "table": "issue_types"},
    {"allow": "R", "table": "issue_types_to_fields"},
    {"allow": "R", "table": "issue_tags"},

    {"allow": "CRU", "table": "issues"},
    {"allow": "CRU", "table": "issue"},
    {"allow": "R", "table": "issues_count"},
    {"allow": "R", "table": "issue_uuid"},
    {"allow": "R", "table": "old_issue_uuid"},
    {"allow": "R", "table": "formated_relations"},
    {"allow": "R", "table": "watcher"},
    {"allow": "R", "table": "issue_formated_actions"},
    {"allow": "R", "table": "attachments"},
    {"allow": "R", "table": "time_entries"},
    {"allow": "R", "table": "issue_tags_selected"},

    {"allow": "CU", "table": "issues"}

]'),
('f47c6d41-60f9-4871-8d12-c1ee6682f2e0', 'configs_U', 'Управление настройками рабочего пространства', 
'[{"allow": "CRUD", "table": "configs"}]'),
('54b36ed9-e5c6-4c5c-b700-182db3b78662', 'sprints_CUD', 'Управление спринтами', 
'[{"allow": "CUD", "table": "sprints"}]'),
('6aec376f-307b-497d-8509-c834308130f6', 'projects_CU', 'Создание и изменение проектов', 
'[{"allow": "CU", "table": "projects"}]'),
('18996546-0d37-460c-90e0-d3cddef188d3', 'projects_D', 'Удаление проектов', 
'[{"allow": "D", "table": "projects"}]'),
('df343f32-013c-4c59-af2b-e6540a6c51e8', 'users_and_roles_CUD', 'Управление ролями и пользователями', 
'[
    {"allow": "CUD", "table": "users"},
    {"allow": "CUD", "table": "roles"},
    {"allow": "CUD", "table": "users_to_roles"}
]'),
('3cdbc5cd-c6bd-484e-8295-1d70aaa69469', 'boards_own_CUD', 'Создание, изменение и удаление своих досок и дашбордов', 
'[
    {"allow": "CUD", "table": "boards", "self": true},
    {"allow": "CUD", "table": "board", "self": true},
    {"allow": "CUD", "table": "boards_columns", "self": true},
    {"allow": "CUD", "table": "boards_fields", "self": true},
    {"allow": "CUD", "table": "boards_filters", "self": true}, 
    {"allow": "CUD", "table": "dashboards", "self": true}, 
    {"allow": "CUD", "table": "gadgets", "self": true}
]'),
('322149d3-50f3-4e55-99be-ad5c6bfbcb28', 'boards_not_own_UD', 'Изменение и удаление чужих досок и дашбордов', 
'[
    {"allow": "CUD", "table": "boards"},
    {"allow": "CUD", "table": "board"},
    {"allow": "CUD", "table": "boards_columns"},
    {"allow": "CUD", "table": "boards_fields"},
    {"allow": "CUD", "table": "boards_filters"}, 
    {"allow": "CUD", "table": "dashboards"}, 
    {"allow": "CUD", "table": "gadgets"}
]'),
('debb49fd-b2de-44f0-8972-4f6042e5221f', 'workflow_CRU', 'Создание и изменение полей, статусов, воркфлоу, типов задач', 
'[
    {"allow": "CU", "table": "workflows"},
    {"allow": "CUD", "table": "transitions"},
    {"allow": "CUD", "table": "workflow_nodes"},
    {"allow": "CU", "table": "fields"},
    {"allow": "CU", "table": "issue_statuses"},
    {"allow": "CU", "table": "issue_types"},
    {"allow": "CUD", "table": "issue_types_to_fields"}
]'),
('2a8047f3-2c50-4881-a5d3-e1389f45df76', 'workflow_RD', 'Удаление полей, статусов, воркфлоу, типов задач', 
'[
    {"allow": "D", "table": "workflows"},
    {"allow": "D", "table": "fields"},
    {"allow": "D", "table": "issue_statuses"},
    {"allow": "D", "table": "issue_types"} 
]');

INSERT INTO server.roles_to_permissions (roles_uuid, permissions_uuid) VALUES
('3a556a56-eb59-4654-92ac-1921040eeea1', 'f47c6d41-60f9-4871-8d12-c1ee6682f2e0'), 
('3a556a56-eb59-4654-92ac-1921040eeea1', '18996546-0d37-460c-90e0-d3cddef188d3'), 
('3a556a56-eb59-4654-92ac-1921040eeea1', 'df343f32-013c-4c59-af2b-e6540a6c51e8'), 
('3a556a56-eb59-4654-92ac-1921040eeea1', '2a8047f3-2c50-4881-a5d3-e1389f45df76'), 
('3a556a56-eb59-4654-92ac-1921040eeea1', 'df343f32-013c-4c59-af2b-e6540a6c51e8'), 

('fa9d5af3-3567-4a63-9653-3567a636cc6a', '54b36ed9-e5c6-4c5c-b700-182db3b78662'), 
('fa9d5af3-3567-4a63-9653-3567a636cc6a', '6aec376f-307b-497d-8509-c834308130f6'), 
('fa9d5af3-3567-4a63-9653-3567a636cc6a', '322149d3-50f3-4e55-99be-ad5c6bfbcb28'), 
('fa9d5af3-3567-4a63-9653-3567a636cc6a', 'debb49fd-b2de-44f0-8972-4f6042e5221f'), 

('0090d50a-d3de-4bb2-822f-c8b5dd4428da', '3cdbc5cd-c6bd-484e-8295-1d70aaa69469');


INSERT INTO server.users (uuid, name, login, mail, active, password, avatar) VALUES (
    'ba52933b-9c25-4be5-8b8e-02bd26ba8feb',
    'Администратор',
    'root',
    'root@unkaos.org',
    TRUE,
    MD5('rootpass'),
    'data:image/png;base64,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'
);
INSERT INTO server.users_to_roles (users_uuid, roles_uuid) VALUES ('ba52933b-9c25-4be5-8b8e-02bd26ba8feb', '556972a6-0370-4f00-aca2-73a477e48999');

INSERT INTO server.projects(uuid, name, short_name, owner_uuid, description) VALUES
('f8f78225-1970-47d6-a36e-5b0b773eb8a1', 'Основной проект', 'BS', 'ba52933b-9c25-4be5-8b8e-02bd26ba8feb', 'Базовый проект по умолчанию');


INSERT INTO server.projects_permissions(uuid, projects_uuid, roles_uuid, allow) VALUES 
('f7a26dbb-6a4b-4855-bf02-ccd197ad1227', 'f8f78225-1970-47d6-a36e-5b0b773eb8a1', '3a556a56-eb59-4654-92ac-1921040eeea1', 'CRUD'),
('f54974a4-50f1-421f-9032-ada7f908c83a', 'f8f78225-1970-47d6-a36e-5b0b773eb8a1', 'fa9d5af3-3567-4a63-9653-3567a636cc6a', 'CRUD'),
('62f88de1-8f33-44da-9f1a-0bdc8522f253', 'f8f78225-1970-47d6-a36e-5b0b773eb8a1', '0090d50a-d3de-4bb2-822f-c8b5dd4428da', 'CRUD'),
('6dac11c8-31c0-46f0-9942-aeb3911061df', 'f8f78225-1970-47d6-a36e-5b0b773eb8a1', '287ccc96-30ed-4b14-81d2-905140b32eab', 'R');

INSERT INTO server.workflows(uuid, name) VALUES 
('50097b48-a68d-4e77-a930-c2037f213703', 'Простой'),
('9e7dc78e-ee4b-48fa-9577-5a91e3958d0a', 'Полный');

INSERT INTO server.workflow_nodes(uuid, x, y, workflows_uuid, issue_statuses_uuid) VALUES
('35e819ed-0eee-4a3d-b225-a52a73bc7c76', 202, 185, '50097b48-a68d-4e77-a930-c2037f213703', '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83'),
('0fe8717f-eae0-4057-a4f7-8c73a1803f62', 363, 185, '50097b48-a68d-4e77-a930-c2037f213703', '197ae224-6990-4ba8-873d-c2aa7a63a7c5'),
('c4c3030d-1470-468e-a66b-99a8257d6359', 522, 186, '50097b48-a68d-4e77-a930-c2037f213703', 'f735a09b-2b0c-4541-bd3d-88ca4c27002b'),
('7e90f4c0-4b5c-4839-9fa5-25773c5e5972', 215, 248, '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a', '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83'),
('7ad0eb9b-03c5-4a38-ba23-6303562edadc', 389, 250, '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a', '197ae224-6990-4ba8-873d-c2aa7a63a7c5'),
('c5f2c2b9-0977-4ac6-bde2-d8d031c8522b', 297, 374, '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a', '0f1dd8a2-159c-44cb-8254-caa8a596693b'),
('17465530-7430-450d-aa13-c374eea7b623', 551, 253, '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a', 'f735a09b-2b0c-4541-bd3d-88ca4c27002b'),
('cf1587ec-ab88-4eb8-a5d7-94fd90cb96dc', 305, 126, '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a', 'e57cebc2-5300-47ff-8f72-5d24c5c0ac47');

INSERT INTO server.transitions(uuid, status_from_uuid, status_to_uuid, name, workflows_uuid) VALUES
('9d97c30b-d86e-40c1-9411-213f4709a752', '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'Взять в работу', '50097b48-a68d-4e77-a930-c2037f213703'),
('56b1b4ed-b30a-4b58-92f3-ea264949a8dd', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'f735a09b-2b0c-4541-bd3d-88ca4c27002b', 'Завершить', '50097b48-a68d-4e77-a930-c2037f213703'),
('a757bfc1-fa1b-4029-8cfc-fae7f5b740d2', '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'В работу', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('5dd50672-ea17-47c7-86a6-82bbbbab4904', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'f735a09b-2b0c-4541-bd3d-88ca4c27002b', 'Завершить', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('4b776166-1a7b-4e6a-ab2e-99e2f7277b9c', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'e57cebc2-5300-47ff-8f72-5d24c5c0ac47', 'Отклонить', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('5091a1cb-3157-4972-a3f8-416915e0dfa8', '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', 'e57cebc2-5300-47ff-8f72-5d24c5c0ac47', 'Отклонить', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('6c48b135-2331-4f4f-84fa-be2b5d1f7d8a', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', '0f1dd8a2-159c-44cb-8254-caa8a596693b', 'Отложить', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('044718ce-da73-4eef-a90a-9b40425bbc6c', '0f1dd8a2-159c-44cb-8254-caa8a596693b', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'В работу', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('84fd0574-3203-4ac6-8202-feb3cb64ad91', 'e57cebc2-5300-47ff-8f72-5d24c5c0ac47', '197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'В работу', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('587dcb8f-1643-4ddb-89af-e4e678d47093', 'e57cebc2-5300-47ff-8f72-5d24c5c0ac47', '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', 'Вернуть в новые', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a'),
('2acf3d91-3224-4e0a-86fe-15673db2d623', '6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', '0f1dd8a2-159c-44cb-8254-caa8a596693b', 'Отложить', '9e7dc78e-ee4b-48fa-9577-5a91e3958d0a');

INSERT INTO server.issue_types(uuid, name, workflow_uuid) VALUES 
('e26201a2-1fde-440b-b189-c97a3413359f','Задача', '50097b48-a68d-4e77-a930-c2037f213703');

INSERT INTO server.issue_types_to_fields(issue_types_uuid, fields_uuid) VALUES
('e26201a2-1fde-440b-b189-c97a3413359f', 'b6ddb33f-eea9-40c0-b1c2-d9ab983026a1');



--INSERT INTO server.users (uuid, name, login, mail, password, is_active) VALUES ('dbe1a000-40de-428c-bc0a-4fd590a466a5', 'my_name', 'my_login', 'my_mail', md5('my_password'), true);

--INSERT INTO server.users_to_roles (users_uuid, roles_uuid) VALUES ('dbe1a000-40de-428c-bc0a-4fd590a466a5', '556972a6-0370-4f00-aca2-73a477e48999');




DO $$
DECLARE
    randomPass TEXT;
BEGIN
    SELECT md5(random()::text) INTO randomPass;
    EXECUTE format('CREATE USER server WITH ENCRYPTED PASSWORD %L', randomPass);
    INSERT INTO admin.workspaces (name, pass) VALUES ('server', randomPass);
END $$;

GRANT INSERT, SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA server TO server;
GRANT USAGE ON SCHEMA server to server;
ALTER ROLE server SET search_path = server;
ALTER TABLE server.field_values_rows OWNER TO server;
GRANT CREATE ON SCHEMA server TO server;