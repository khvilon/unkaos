CREATE SCHEMA IF NOT EXISTS test;
CREATE FUNCTION test.add_col_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE 'ALTER TABLE test.field_values_rows ADD COLUMN "' ||  NEW.uuid ||  '" text';
	EXECUTE 'CREATE INDEX ON test.field_values_rows ("' || NEW.uuid || '")';
    RETURN NEW;
END;
$$;

CREATE FUNCTION test.delete_col_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE 'ALTER TABLE test.field_values_rows DROP COLUMN "' || OLD.uuid ||  '" CASCADE';
    RETURN OLD;
END;
$$;

CREATE FUNCTION test.insert_into_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO test.field_values_rows (uuid)
  VALUES (NEW.uuid);
  RETURN NEW;
END;
$$;

CREATE FUNCTION test.update_field_values_rows() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    EXECUTE format('UPDATE test.field_values_rows SET "%s" = %L WHERE uuid = %L', NEW.field_uuid, NEW.value, NEW.issue_uuid);
    RETURN NULL;
END;
$$;


CREATE INDEX "field_values_rows_1b54a2db-3df4-485e-9ebc-77bb51f2d490_idx" ON test.field_values_rows USING btree ("1b54a2db-3df4-485e-9ebc-77bb51f2d490");
CREATE INDEX "field_values_rows_22cf17d4-b21c-4141-8a54-356af786940f_idx" ON test.field_values_rows USING btree ("22cf17d4-b21c-4141-8a54-356af786940f");

CREATE INDEX field_values_rows_uuid_idx ON test.field_values_rows USING btree (uuid);
CREATE INDEX idx_attachments_issue_uuid ON test.attachments USING btree (issue_uuid);
CREATE INDEX idx_field_values_field_uuid ON test.field_values USING btree (field_uuid);
CREATE INDEX idx_field_values_issue_uuid ON test.field_values USING btree (issue_uuid);
CREATE INDEX idx_field_values_uuid ON test.field_values USING btree (uuid);
CREATE INDEX idx_field_values_value ON test.field_values USING hash (value);
CREATE INDEX idx_issue_actions_author_uuid ON test.issue_actions USING btree (author_uuid);
CREATE INDEX idx_issue_actions_issue_uuid ON test.issue_actions USING btree (issue_uuid);
CREATE INDEX idx_issue_actions_type_uuid ON test.issue_actions USING btree (type_uuid);
CREATE INDEX idx_issue_actions_uuid ON test.issue_actions USING btree (uuid);
CREATE INDEX idx_issue_tags_name ON test.issue_tags USING btree (name);
CREATE INDEX idx_issue_tags_selected_deleted_at ON test.issue_tags_selected USING btree (deleted_at);
CREATE INDEX idx_issue_tags_selected_issue_uuid ON test.issue_tags_selected USING btree (issue_uuid);
CREATE INDEX idx_issue_tags_selected_tag_uuid ON test.issue_tags_selected USING btree (issue_tags_uuid);
CREATE INDEX idx_issue_tags_uuid ON test.issue_tags USING btree (uuid);
CREATE INDEX idx_issues_created_at ON test.issues USING btree (created_at);
CREATE INDEX idx_issues_not_deleted ON test.issues USING btree (((deleted_at IS NULL)));
CREATE INDEX idx_issues_num ON test.issues USING btree (num);
CREATE INDEX idx_issues_project_uuid ON test.issues USING btree (project_uuid);
CREATE INDEX idx_issues_sprint_uuid ON test.issues USING btree (sprint_uuid);
CREATE INDEX idx_issues_status_uuid ON test.issues USING btree (status_uuid);
CREATE INDEX idx_issues_type_uuid ON test.issues USING btree (type_uuid);
CREATE INDEX idx_issues_updated ON test.issues USING btree (updated_at);
CREATE INDEX idx_issues_uuid ON test.issues USING btree (uuid);
CREATE INDEX idx_relations_issue0_uuid ON test.relations USING btree (issue0_uuid);
CREATE INDEX idx_relations_issue1_uuid ON test.relations USING btree (issue1_uuid);
CREATE INDEX idx_relations_type_uuid ON test.relations USING btree (type_uuid);
CREATE INDEX idx_relations_uuid ON test.relations USING btree (uuid);
CREATE INDEX idx_users_uuid ON test.users USING btree (uuid);
CREATE INDEX idx_issue_tags_selected_issue_uuid ON public.issue_tags_selected USING btree (issue_uuid);
CREATE INDEX idx_issue_tags_selected_tag_uuid ON public.issue_tags_selected USING btree (issue_tags_uuid);

CREATE TRIGGER delete_col_field_values_rows AFTER UPDATE ON test.fields FOR EACH ROW WHEN (((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL))) EXECUTE FUNCTION test.delete_col_field_values_rows();
CREATE TRIGGER insert_into_field_values_rows AFTER INSERT ON test.issues FOR EACH ROW EXECUTE FUNCTION test.insert_into_field_values_rows();
CREATE TRIGGER inserted AFTER INSERT ON test.fields FOR EACH ROW EXECUTE FUNCTION test.add_col_field_values_rows();
CREATE TRIGGER update_field_values_rows AFTER INSERT OR UPDATE ON test.field_values FOR EACH ROW EXECUTE FUNCTION test.update_field_values_rows();


INSERT INTO test.favourites_types (uuid, name) VALUES ('ac367512-c614-4f2a-b7d3-816018f71ad8', 'Сохраненный запрос');
INSERT INTO test.favourites_types (uuid, name) VALUES ('46d00448-4d13-471e-b996-070c0650c113', 'Дашборд');
INSERT INTO test.favourites_types (uuid, name) VALUES ('1b6832db-7d94-4423-80f2-10ed989af9f8', 'Доска');

INSERT INTO test.field_types (uuid, name, code) VALUES ('ba3c701d-ccdf-4af6-8ec1-d72fbb4fdc75', 'Время', 'Time');
INSERT INTO test.field_types (uuid, name, code) VALUES ('c001b93c-3676-4e1d-b52a-4e2008c62c45', 'Дата и время', 'Timestamp');
INSERT INTO test.field_types (uuid, name, code) VALUES ('a842d209-0111-4b8a-8ba6-cba191c1f4a1', 'Булево', 'Boolean');
INSERT INTO test.field_types (uuid, name, code) VALUES ('93d432ce-d64e-4b1d-a358-87fd5de9e3e4', 'Дата', 'Date');
INSERT INTO test.field_types (uuid, name, code) VALUES ('507278cc-a98e-4725-a248-7289dbbd4be1', 'Длительность', 'Duration');
INSERT INTO test.field_types (uuid, name, code) VALUES ('891b02c9-a559-44da-8840-6e93bf2d8d22', 'Строка', 'String');
INSERT INTO test.field_types (uuid, name, code) VALUES ('9d8ddcc7-a4e8-4ea8-b3d0-e7c9686abc6f', 'Текст', 'Text');
INSERT INTO test.field_types (uuid, name, code) VALUES ('c0c4036c-3dd2-4264-ba2e-ec7180a4d35c', 'Числовое', 'Numeric');
INSERT INTO test.field_types (uuid, name, code) VALUES ('d57da84f-ed1b-4596-9fb9-9d4c500af63d', 'Пользователь', 'User');
INSERT INTO test.field_types (uuid, name, code) VALUES ('457da84d-2d1d-3595-6fba-4d4d674af63f', 'Значение из списка', 'Select');

INSERT INTO test.fields (uuid, name, type_uuid, is_custom) VALUES ('c96966ea-a591-47a9-992c-0a2f6443bc80', 'Название', '891b02c9-a559-44da-8840-6e93bf2d8d22', false);
INSERT INTO test.fields (uuid, name, type_uuid, is_custom) VALUES ('4a095ff5-c1c4-4349-9038-e3c35a2328b9', 'Описание', '9d8ddcc7-a4e8-4ea8-b3d0-e7c9686abc6f', false);
INSERT INTO test.fields (uuid, name, type_uuid, is_custom) VALUES ('60d53a40-cda9-4cb2-a207-23f8236ee9a7', 'Spent time', 'c0c4036c-3dd2-4264-ba2e-ec7180a4d35c', true);
INSERT INTO test.fields (uuid, name, type_uuid, is_custom) VALUES ('e85ccb15-c1d2-433b-bb45-473a9a36a02c', 'Assignee', 'd57da84f-ed1b-4596-9fb9-9d4c500af63d', true);
INSERT INTO test.fields (uuid, name, type_uuid, is_custom, available_values) VALUES ('b6ddb33f-eea9-40c0-b1c2-d9ab983026a1', 'Priority', '457da84d-2d1d-3595-6fba-4d4d674af63f', true, 'Show-stopper,Critical,Major,Normal,Minor');
INSERT INTO test.fields (uuid, name, type_uuid, is_custom) VALUES ('733f669a-9584-4469-a41b-544e25b8d91a', 'Автор', 'd57da84f-ed1b-4596-9fb9-9d4c500af63d', false);

INSERT INTO test.gadget_types (uuid, name, code) VALUES ('4a20ebc1-2740-4304-b2ea-8527f423dacd', 'Диаграмма Ганта', 'Gantt');
INSERT INTO test.gadget_types (uuid, name, code) VALUES ('a558d34b-0bfb-4494-bb22-40ec15e97f0a', 'Таблица задач', 'IssuesTable');
INSERT INTO test.gadget_types (uuid, name, code) VALUES ('4419f964-e212-4466-811e-056c1241b426', 'Отчет по затраченному времени', 'TimeReport');

INSERT INTO test.issue_actions_types VALUES ('1ff12964-4f5c-4be9-8fe3-f3d9a7225300', '📝');
INSERT INTO test.issue_actions_types VALUES ('4d7d3265-806b-492a-b6c1-636e1fa653a9', '🔁');
INSERT INTO test.issue_actions_types VALUES ('f53d8ecc-c26e-4909-a070-5c33e6f7a196', '💬');

INSERT INTO test.issue_statuses (uuid, name, is_start, is_end) VALUES ('6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', 'Новая', true, false);
INSERT INTO test.issue_statuses (uuid, name, is_start, is_end) VALUES ('197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'В работе', false, false);
INSERT INTO test.issue_statuses (uuid, name, is_start, is_end) VALUES ('0f1dd8a2-159c-44cb-8254-caa8a596693b', 'Отложена', false, false);
INSERT INTO test.issue_statuses (uuid, name, is_start, is_end) VALUES ('f735a09b-2b0c-4541-bd3d-88ca4c27002b', 'Завершена', false, true);
INSERT INTO test.issue_statuses (uuid, name, is_start, is_end) VALUES ('e57cebc2-5300-47ff-8f72-5d24c5c0ac47', 'Отклонена', false, true);

INSERT INTO test.relation_types (uuid, name, revert_name) VALUES ('73b0a22e-4632-453d-903b-09804093ef1b', 'Родительская к', 'Дочерняя к');
INSERT INTO test.relation_types (uuid, name, revert_name) VALUES ('b44dab29-bd47-4507-91b1-d62ddf34d09f', 'Необходима для', 'Требуется');
INSERT INTO test.relation_types (uuid, name, revert_name) VALUES ('06e7ced5-d15c-412c-9e64-0858840d542d', 'Связана с', 'Связана с');
INSERT INTO test.relation_types (uuid, name, revert_name) VALUES ('d279639b-2a7b-44d3-b317-eceea45c5592', 'Дублирует', 'Дублируема');

INSERT INTO test.roles (uuid, name, is_custom) VALUES ('556972a6-0370-4f00-aca2-73a477e48999', 'Администратор', false);

INSERT INTO test.users (uuid, name, login, mail, password, is_active) VALUES ('dbe1a000-40de-428c-bc0a-4fd590a466a5', 'my_name', 'my_login', 'my_mail', md5('my_password'), true);

INSERT INTO test.users_to_roles (users_uuid, roles_uuid) VALUES ('dbe1a000-40de-428c-bc0a-4fd590a466a5', '556972a6-0370-4f00-aca2-73a477e48999');

CREATE PUBLICATION cerberus_publication WITH (publish = 'insert, update, delete');
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY test.user_sessions;
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY test.users;


CREATE PUBLICATION test_publication WITH (publish = 'insert, update, delete');
ALTER PUBLICATION test_publication ADD TABLE ONLY test.logs_done;
ALTER PUBLICATION test_publication ADD TABLE ONLY test.msg_out;
ALTER PUBLICATION test_publication ADD TABLE ONLY test.users;


CREATE PUBLICATION ossa_publication WITH (publish = 'insert, update, delete');
ALTER PUBLICATION ossa_publication ADD TABLE ONLY test.attachments;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY test.field_values;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY test.fields;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY test.issue_actions;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY test.issue_tags_selected;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY test.issues;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY test.relations;


