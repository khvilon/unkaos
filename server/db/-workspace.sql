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

INSERT INTO server.configs(uuid, service, name, value) VALUES ('074a8ea8-95f4-49e6-9a60-4c84a7380100', 'email', 'service', '');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('eee93825-be47-4c6c-a69a-028b6b26243c', 'email', 'user', '');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('14d4d184-7f58-4064-9461-795aa13210de', 'email', 'pass', '');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('84d6511e-c78e-436b-9051-5cec4379ac19', 'email', 'from', 'Unkaos');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('d4606eb0-62ac-474e-ab26-b840c145e1fa', 'discord', 'token', '');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('dc06c54f-319f-478d-99fa-9066ffd584ca', 'telegram', 'token', '');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('d91958eb-b3b9-465f-a680-62a830b8a358', 'slack', 'token', '');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('a8224636-7603-48dd-a2c4-1e38eaf9599c', 'openai', 'key', '');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('7a75fc39-5319-48d7-8fb3-85e2cf53edb9', 'autoupdate', 'allow', 'true');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('c6f6e1fb-8433-41b9-9b79-8eea42945152', 'autoupdate', 'from', '23');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('bfb2df42-317d-4323-8109-cc7b1f30ddb0', 'autoupdate', 'to', '5');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('cb15b3a7-503c-4026-a2bc-bd104cb6dedf', 'workspace_use', 'sprints', 'false');
INSERT INTO server.configs(uuid, service, name, value) VALUES ('85dfea7a-fc6f-440f-b414-fe63cd652318', 'workspace_use', 'time_tracking', 'false');

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
CREATE INDEX ON public.issue_tags_selected USING btree (issue_uuid);
CREATE INDEX ON public.issue_tags_selected USING btree (issue_tags_uuid);

CREATE TRIGGER server_delete_col_field_values_rows AFTER UPDATE ON server.fields FOR EACH ROW WHEN (((old.deleted_at IS NULL) AND (new.deleted_at IS NOT NULL))) EXECUTE FUNCTION server.delete_col_field_values_rows();
CREATE TRIGGER server_insert_into_field_values_rows AFTER INSERT ON server.issues FOR EACH ROW EXECUTE FUNCTION server.insert_into_field_values_rows();
CREATE TRIGGER server_inserted AFTER INSERT ON server.fields FOR EACH ROW EXECUTE FUNCTION server.add_col_field_values_rows();
CREATE TRIGGER server_update_field_values_rows AFTER INSERT OR UPDATE ON server.field_values FOR EACH ROW EXECUTE FUNCTION server.update_field_values_rows();


INSERT INTO server.favourites_types (uuid, name) VALUES ('ac367512-c614-4f2a-b7d3-816018f71ad8', 'Сохраненный запрос');
INSERT INTO server.favourites_types (uuid, name) VALUES ('46d00448-4d13-471e-b996-070c0650c113', 'Дашборд');
INSERT INTO server.favourites_types (uuid, name) VALUES ('1b6832db-7d94-4423-80f2-10ed989af9f8', 'Доска');

INSERT INTO server.field_types (uuid, name, code) VALUES ('ba3c701d-ccdf-4af6-8ec1-d72fbb4fdc75', 'Время', 'Time');
INSERT INTO server.field_types (uuid, name, code) VALUES ('c001b93c-3676-4e1d-b52a-4e2008c62c45', 'Дата и время', 'Timestamp');
INSERT INTO server.field_types (uuid, name, code) VALUES ('a842d209-0111-4b8a-8ba6-cba191c1f4a1', 'Булево', 'Boolean');
INSERT INTO server.field_types (uuid, name, code) VALUES ('93d432ce-d64e-4b1d-a358-87fd5de9e3e4', 'Дата', 'Date');
INSERT INTO server.field_types (uuid, name, code) VALUES ('507278cc-a98e-4725-a248-7289dbbd4be1', 'Длительность', 'Duration');
INSERT INTO server.field_types (uuid, name, code) VALUES ('891b02c9-a559-44da-8840-6e93bf2d8d22', 'Строка', 'String');
INSERT INTO server.field_types (uuid, name, code) VALUES ('9d8ddcc7-a4e8-4ea8-b3d0-e7c9686abc6f', 'Текст', 'Text');
INSERT INTO server.field_types (uuid, name, code) VALUES ('c0c4036c-3dd2-4264-ba2e-ec7180a4d35c', 'Числовое', 'Numeric');
INSERT INTO server.field_types (uuid, name, code) VALUES ('d57da84f-ed1b-4596-9fb9-9d4c500af63d', 'Пользователь', 'User');
INSERT INTO server.field_types (uuid, name, code) VALUES ('457da84d-2d1d-3595-6fba-4d4d674af63f', 'Значение из списка', 'Select');

INSERT INTO server.fields (uuid, name, type_uuid, is_custom) VALUES ('c96966ea-a591-47a9-992c-0a2f6443bc80', 'Название', '891b02c9-a559-44da-8840-6e93bf2d8d22', false);
INSERT INTO server.fields (uuid, name, type_uuid, is_custom) VALUES ('4a095ff5-c1c4-4349-9038-e3c35a2328b9', 'Описание', '9d8ddcc7-a4e8-4ea8-b3d0-e7c9686abc6f', false);
INSERT INTO server.fields (uuid, name, type_uuid, is_custom) VALUES ('60d53a40-cda9-4cb2-a207-23f8236ee9a7', 'Spent time', 'c0c4036c-3dd2-4264-ba2e-ec7180a4d35c', true);
INSERT INTO server.fields (uuid, name, type_uuid, is_custom) VALUES ('e85ccb15-c1d2-433b-bb45-473a9a36a02c', 'Assignee', 'd57da84f-ed1b-4596-9fb9-9d4c500af63d', true);
INSERT INTO server.fields (uuid, name, type_uuid, is_custom, available_values) VALUES ('b6ddb33f-eea9-40c0-b1c2-d9ab983026a1', 'Priority', '457da84d-2d1d-3595-6fba-4d4d674af63f', true, 'Show-stopper,Critical,Major,Normal,Minor');
INSERT INTO server.fields (uuid, name, type_uuid, is_custom) VALUES ('733f669a-9584-4469-a41b-544e25b8d91a', 'Автор', 'd57da84f-ed1b-4596-9fb9-9d4c500af63d', false);

--CREATE INDEX "field_values_rows_1b54a2db-3df4-485e-9ebc-77bb51f2d490_idx" ON server.field_values_rows USING btree ("1b54a2db-3df4-485e-9ebc-77bb51f2d490");
--CREATE INDEX "field_values_rows_22cf17d4-b21c-4141-8a54-356af786940f_idx" ON server.field_values_rows USING btree ("22cf17d4-b21c-4141-8a54-356af786940f");

INSERT INTO server.gadget_types (uuid, name, code) VALUES ('4a20ebc1-2740-4304-b2ea-8527f423dacd', 'Диаграмма Ганта', 'Gantt');
INSERT INTO server.gadget_types (uuid, name, code) VALUES ('a558d34b-0bfb-4494-bb22-40ec15e97f0a', 'Таблица задач', 'IssuesTable');
INSERT INTO server.gadget_types (uuid, name, code) VALUES ('4419f964-e212-4466-811e-056c1241b426', 'Отчет по затраченному времени', 'TimeReport');

INSERT INTO server.issue_actions_types VALUES ('1ff12964-4f5c-4be9-8fe3-f3d9a7225300', '📝');
INSERT INTO server.issue_actions_types VALUES ('4d7d3265-806b-492a-b6c1-636e1fa653a9', '🔁');
INSERT INTO server.issue_actions_types VALUES ('f53d8ecc-c26e-4909-a070-5c33e6f7a196', '💬');

INSERT INTO server.issue_statuses (uuid, name, is_start, is_end) VALUES ('6b0e63d5-3dcf-4c91-9f80-3c5e525c6b83', 'Новая', true, false);
INSERT INTO server.issue_statuses (uuid, name, is_start, is_end) VALUES ('197ae224-6990-4ba8-873d-c2aa7a63a7c5', 'В работе', false, false);
INSERT INTO server.issue_statuses (uuid, name, is_start, is_end) VALUES ('0f1dd8a2-159c-44cb-8254-caa8a596693b', 'Отложена', false, false);
INSERT INTO server.issue_statuses (uuid, name, is_start, is_end) VALUES ('f735a09b-2b0c-4541-bd3d-88ca4c27002b', 'Завершена', false, true);
INSERT INTO server.issue_statuses (uuid, name, is_start, is_end) VALUES ('e57cebc2-5300-47ff-8f72-5d24c5c0ac47', 'Отклонена', false, true);

INSERT INTO server.relation_types (uuid, name, revert_name) VALUES ('73b0a22e-4632-453d-903b-09804093ef1b', 'Родительская к', 'Дочерняя к');
INSERT INTO server.relation_types (uuid, name, revert_name) VALUES ('b44dab29-bd47-4507-91b1-d62ddf34d09f', 'Необходима для', 'Требуется');
INSERT INTO server.relation_types (uuid, name, revert_name) VALUES ('06e7ced5-d15c-412c-9e64-0858840d542d', 'Связана с', 'Связана с');
INSERT INTO server.relation_types (uuid, name, revert_name) VALUES ('d279639b-2a7b-44d3-b317-eceea45c5592', 'Дублирует', 'Дублируема');

INSERT INTO server.roles (uuid, name, is_custom) VALUES ('556972a6-0370-4f00-aca2-73a477e48999', 'Администратор', false);

--INSERT INTO server.users (uuid, name, login, mail, password, is_active) VALUES ('dbe1a000-40de-428c-bc0a-4fd590a466a5', 'my_name', 'my_login', 'my_mail', md5('my_password'), true);

--INSERT INTO server.users_to_roles (users_uuid, roles_uuid) VALUES ('dbe1a000-40de-428c-bc0a-4fd590a466a5', '556972a6-0370-4f00-aca2-73a477e48999');


ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.user_sessions;
ALTER PUBLICATION cerberus_publication ADD TABLE ONLY server.users;

ALTER PUBLICATION hermes_publication ADD TABLE ONLY server.watchers;
ALTER PUBLICATION hermes_publication ADD TABLE ONLY server.msg_out;
ALTER PUBLICATION hermes_publication ADD TABLE ONLY server.users;

ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.attachments;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.field_values;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.fields;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.issue_actions;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.issue_tags_selected;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.issues;
ALTER PUBLICATION ossa_publication ADD TABLE ONLY server.relations;

INSERT INTO server.users (uuid, name, login, mail, active, password, avatar) VALUES (
    'ba52933b-9c25-4be5-8b8e-02bd26ba8feb',
    'Администратор',
    'root',
    'root@unkaos.org',
    TRUE,
    MD5('rootpass'),
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA5gAAAOYBAMAAABC5kGOAAAAD1BMVEUAAADm5ub///+jo6NTU1MaN7sXAAAb50lEQVR42uyda3ajOBBGZZsF2CQLsIAF0HYWQJPZ/5omfiU26FFCwsLpy585X5+oXKOLCqn0UtXl0bvLg3xhqagJYCKBiQQmEpjARAITCUwkMJHABCYSmEhgIoGJPMG8/kt5/SfkC0tgAhMJTCQwkcAEJhKYSGAigYkEJjCRwEQCEwlM5Bkmk4FMTiOBiQQmEpjARAITCUwkMJHABCYSmEhgIoGJBCa7wJBMTiOBiQQmMKkYYCKBiQQmEpjARAITCUwkMJHABCZyyTCZDGRyGglMJDCRwAQmEphIYCKBiQQmMJHARAITCUwkMNkF9gxZnt1LZPn0n2ROVt8Pk9MyWb0dj8cySbV9vRTHO2Oxr5j+sQVMidQf6vwUxwSWj93F2H9/4t8L/XE19lkCUyavKM84Ywno7s5YLIG3O2OfwBTI++q/VFqE5frBljpEOfnxYKsoNTA9csBSqU2E5feBLfU3wsl2YKs4aGA65YjlmeZEy/XIljpMbk7tyNaVJjAtshqznN6cDCy/acY38nOkBaZdGl7/6c1Jm16MK4AUjfwUNDQwbbJsjFV2AxBoeavsAIKd7MzGeg1Mi9SWKrsCCLJc1hZbl3Ye6KTlxVBFBUyztLWlE4DwiG17Mc4AAp20vhhqpYFplNpaZRNiY2M3Fh4bW7uxEpgm6WiY16YZkg7v7LaKUJi1w7GVBqZBOhpmeL+xcRnrAz+/rctYuSCYy5mUc9a/KsMsO+t/E+ak8y07B20mp4eyc9bZOsiyu/6/3owQJ/dOWwUwx7J2138RZHnrNrYKctL9ll172sC8l576P814yC13vjcjwEnPW3YanQBzID31f4qzYsu++v9OEEqc3HtsFcAcSm/9FwGWffWv1gFOdt43A5gD6a3/kF5L67O1SdaX+omzwPyW3vpXvdiyv/5VKXayUcI3A5jf0l//8i6ov/5PeYM0HeOfNwOYWpAxC+6C7pU0NMZ3jH8+msC8SUH9q1JquRW8GVKYgpCt1sC8l6UgmMkTZwJbSgpTELKvzRyYN5idpAEILUsak3g8IQkZBTAfYCol/875LEsa060H5HVyK27mwNTi/o88pS1pTNfvXGz6/76ZLwDmMuYzRTBvL57Hsuj7+zXQETkpChmnvDGT099SFBmVzHLZSmxthE6KHOuBeSf38gbghymKjIXMSVnIWAPzTm5TwlRPh7kC5p1s5dEsEUwlc1IW/zfAnAmmBuYrwFyLLMsi47U35XNyD8xg2T0f5iEhzAKYrwBzC8xfA7MEJi0TmHwz6c3Sm/3FMDUwf0/SYPfvJg0WMZ8pm+iQ7uqQwZStj5TF7PNiSyanr3KbEmb3dJgrYN5J2aepTAizkMGUfYDXLBu5k01AY0qwOD5gGbrsYw7MudYAbcWR8betAXohmNLVeUkXdG2BOctSS+m62aRLLffi+A/MkEXQhxyLoGtx/AdmyPYE8V6TlNsTtDj+A/MmBaFRvgusFXdm0+wCY+PQoxREM/n+zKRb+rbSkA3MgBxcL7acdLOtwNgOmKEjfbnlpNvgq2T5h38Hpjc0hpyR1qXKP4hmdFa0zIGs/VFWbjnp0TFNqlHO/DCXMZ9Z+UeaZYBl/6FOAU5qby87c9UtbXLavw7u1P0UW/YmlHSAk77J1hUwR7L2xzI5TO+bEeKkzzNgjqQ7zgYeHux9M0KcdDfNW5QF5r1svONCuWX3m/HVlw1y0vlq9CUwx1J7h3IBMBvPGTRhTrqaZgnMwA9d8FUYunMFxlAn61Sf338GpqNphl9SU74n6hhfZOsYMQHTGBvfPcPyEMv2pnm+jCrQSet79lcDM+wykl6HW7Z/NXs9wckmVcT+Z2DaOrT9FMu2N6Oodulg9hqYVdiVixs9xXKdqC91lm2K0e+/BdPWnCZduWi8v/T0kdul+mZyGapbmvstK52qOW2qSU7uzSw1MN1toLNPPwZbbm0sQ00ZnTro3cJgLmU+8ybLurMms4Mt6wHNTTnNq9rIcmlVt1sczK9I+2HbZhtseTg++ep8TvHKtKjrs9TAFBCo3i44P9vB1ES45e3o2zsJ5k+w2Fxd+1Mtoq4WD/Oy9vh4fOh2HKa9F+1oKDHFq+Y+RHx59ufyF8AMkfvBdH44zPE69ilebQfxXi+wrhYPsxkcQRBsqh5nDKZ4NThWYZF1tXiYdWwtNuPEYOQ7dQDmRKkHB3oEm9qOsw8T3GgHB84AMza+naoxeJTTjbMP4W5oFRvtgTmEuZ4A07DGMtyNPTCTyO5xFVyoqdq+LjLAVDdcigfMSbJ95BBqqrEf8iU3VY+O4gJm7ADvPF4PTPNu7cvP5ab2o+LAnCT303ZO32B29iXLclPdKEcMzHiY8isXv//nrOcfyt2ox1F6uTCXNp/5IJvx2ZEBpuoEC/0G2d1+uXW1xMnpB1kbW5XUVONYHCZ1QxteBWBOknrSebM3uU2wnroxLEYC5jSpjHE2Yq1H4AqU4RzaDpjTZWc6iltqynU0iNCN2vQmADMJzPWT180OR6rAjJFb4yhRVnbvOk5LCLOL21kITAdM4WUk5rIPa3BlbtQRZYHpa12r6SF6SqjcGk/8AeY02RizcVOGNZOGF+ZBKjCnydo4hTUl4TAli1MDc1aY8utg9s4DRUVutGl2kAHTNlaUlrUfKiHfhxc3RgWmF2Yvhdk5D0GUuNFYjo8GZqrtVxtpWffxpBI32lSb0Z4Gc9HzmdoQLA/ha24NjVvgRm2+v43J6YQw1zp0a4NpS5nfDUMGaQXMKLk3ffIkZVv3BYkCmJ1lYyEw08EU7hfp3EcX+t2oFTATy8Y0tBCUdZ74WwrcMKV2e2BGydrMwlu2iT0hvLSfLAvMiVKraQuZnae0rwVuNPa3CJiTHVS2EYKzbBt5EYMxgVQBM0oaEzmCsrFXpGiVYgE1MP0w/R0Rz40H5ZSOFzCjYbb2OOso20TeROX6WWBOlls15Ywnzy01a9/v1q47L4A5tWVubQk5Z9nWdxWV+3fN66eBGSsb+/UTjrLeS+I8MDs1cUgEzGCYvjOe/NdHuX+3Vq8Jc+HzmZZ69awW8N7F1k9ZpXBYel0tHmY1YbWA/wbr2+fPciC1JTYDcxaY53Vydpj++zOdMBtgziQ7a5y1w/TfbOuCaYmyBTCjZRt+nabgNvKD43e1bTwDzFi5ta5+tZaVXCDu+N297TsLzFi5D75pz9//Ua4bTG1f3DUw54LpuAPT3/9x3i1cK2DOJZvw6/GUEveAxr9rbdc9MKNlbV2YbitbS2AerDA7awlgxkodfKP7XgKzt/1ubZ8EBWa0dC1/NZX13d7+0AMaj1Fbe2AGZrTsHCsmjTA7CUzb8QjaUQCY88G0jBW1UvIekHyMCswUsvXF2UHZWgbzYB7WuH5t8TCXPkfnSgGUxrJ7Gcy18Xe166ZqJqejpR3mWhvKSvI/P2f6DH/Xnglc7YAZL+31WxhhdjKYhRGmvXAPzFlhXuf+H8sK+z/XID34XdcWXWAmkI4KXhlaVy2FeQgL0QdgppBhoXIvhbkOC9ElMBNI17qBflRWlv/57gE9/q5rIlQDMwXMzhNnH2F2UpjFuOzW/dfAjIfZenoxD2XF/Z/Ashtgzg6zH5Zt5DCDygIzjdwG1LE0ZXCL0eK3ZrUDZgq598RK6QfW9xnUvr4vMONl42lewkGpb+jobtQ9MJPI2j0v6br+3Ts4uStbdb4UAzDjpbuD+vf+WKCghnmK0T9ly3f18jCXP5/p2W1ZCJa/2+co78p23rlsJqcTyE5EpBTPS4/3aZa+96AA5lNgqs9rR7bSoSxVcV0/WVbvCphPkb7g+Xn5u7pT4TT/XH7iwxuQgZlGehMBxefxePxPTXr+O74dP/wJBmAmknuV/VkDM5Fs8sPsgZlI1vlhHoAJTGB67+R6/lMBE5jAHMkuN8sCmMlkmxvmBpjABGblvWH26c/qNWC+wHxmwMLm2RJAC66c15qcDlpyN1MCCJjJZPaswQGYyaQG5u+BmT1rUAIzncycNTDu6gUmMIGZOWuwAWZCmTlrsAJmQpk5a7DaATOdzJw16IEJTGCaZOYU0AGYCWXmFFAJzJQyL0z9IjBfYj4zaEP0XItGmJxOBTNr1mADTGAC0wwzawpoBcykMmsKaA3MpDJr1qAHZlKZNWtwACYwgWmWWVNAJTCTyjInzAqYaWFmTAEVwEwMM2PWYANMYALTJjOmgFbATCwzpoDWL9ObfZH5zJxrDQ6Lr5wXm5wG5m+CmTFrUAIztcyYMwBmapkta1AAE5jAtMttvmEmMIEJTKvMljVYAzO5zLZwpAdmcpkta3AAZnKZLWtQAhOYwHTIfItGgJlcZsoaFC8E81XmM7OtNdjoF6icF5ucBuavgpkpBbTaATO9zJQCWgNzBpkpBdQDcwaZKQV0ACYwgemUmRJAwJxBZto7pIE5B8wsKaACmLPAzJI12ABzFphZsgYrYM4i88DcAXMOmSVr0AMTmOwCc8ssaw3KF6mcF5ucBuZvgpll4UgFzHlkhqxBAcyZZIaswQaYwASmTzb/Pf3pgTmXrPI8wEQCEwlMJDCBiQQmEpjIX7gLDPmrJqeRwAQmEphIYCKBiQQmMJHARAITCUxgUhPARAITOSNMJgOZnEYCEwlMJDCBiQQmEphIYCKBCUwkMJHARP47MMvdTueQwEwtq1Kfn2fLl4H5GlN2ZfX2ketit88/FZPTCWX1lonk9WSnEpjp5LvK/PwFZiqZneWVJjDj5QJYXmgCM1ougqVSPTDjZa0W8hyAGS27pcAsgBkrt2oxz0oDM0rWakHPAZhRsl0SzI0GZoRcVMO8NU1gTpPtsmBemiYwJ0mt1AKbJjCnyHK7NJjnDu1yYS56jq5bGsxl31mzaJj/t3d32Y3iWhiGZcMACF0DQIYBuKkzAJrV8x/TiY3tuNJJEBikvbdeXfV3U53lZyGEtn5aJ671YK6MlTzMA5gr4yAPswRzXRTYy177WTBXxEYi5hHMVfEsEbMAc1V0IhuYa2IrE7MHc0XsZGKOYK6IlUzMA5gr4lkmZgHmijjIxCzBXB69E9rAXB5bqZg9u8AWR7mYFKcXx04q5gjm4thIxTyCCWbOmJVUzMMJzIVR2irLP+omYIIJJphgggkmmGCCCSbfmcm/M5k0YAYITDBN7AKTWzWhOE1xmmUjAlsN5vLIGiBW57E6j3WzrJvdNQr9NjmCyV6TvDGFDmdrMNfEQeb4B8w1UeRU+wHMVbGT+coEc030Ml+ZYHIOUO6YAr80j6IxxdYzZW4E66X+VrKL05ckrp8tPZhrMcWNZ8c3MNdGaUOg6WoTMNdFYfMG080mYK6Lwj416zcwX4iVvAcTzNVR0FuzrN/AfCkKGtDe11iCuTqKWT1ScEvfy9EPUjpZMF+PQib1em623SK2QizB3CK2MizB3CSmfm+W9UkFpuR65lP8KyFn+fv2h0j/rbRgvnP+/t+/X7XtzL785//9/ffHvD+Y28Wv2narEcpv/x8ezChxy5n40b/p/jWUY9a/tl1GAGZKzE3HRT2YKeO20/CFBzNd3PrkpxrMdHHrqaEDmMni9keygZksbr9CaAQz1RzC9guESjBTYe4wX9uDmSbusTyoADNN3GV1kGpMFfXML+M+Jevr2liFv4ae4vRXcaetC9fFsWBGjnvtXBjBjB43rZf8OUELZnTM3daR9GDGjvttW3h/NMGMGve8KaMG084lxiOYca+w2XPfZunBjBn33VE9ghkz7rtrU+4FURYx9z4gqAczXtx7J9ERzGhx9xv8SjCjxf0PlBl1YiqsZ0Y4ha3wFKcjYUbY3leDGSfG2Eg9nd8E5t4xygXG0wFOYO4d45ynN4IZIzZRMK9DIDB3jrFO0+vB3D/GOkzvMgQCc98YZfhz/zoBc98Y7zjhEcydY8SDvgsP5s6YEQ936sHcN8Y8Ru/gwdwzxhv+PJ/yBOYuMe5tCqM2TF0lu7gnthee4vSOcYiK6Wow94uxTxE+ejB3i1VkzBLM3eLJxW49mHvF+BfWTEMgMHe4TvMcHXMaAoFp49biEcxdYpLLNK/9LJjbYw4JMGXfGK4XM81VNZcFB2BufiJFlQSzBHOHmOrG4h7Mk6LjRcwcPqIGM8VHprbDR9TUM9PdCz9SnN46NskwCzC3jkMyTFeDuW1MeR/qEcxtY5UQswRz25iwl71XNcHcKHYpLW/bqMHcKFZJMUswt4wubevB3C52iTGVnCSjAjPdVN69ncDcKvrUltPqETC3iF1yzKmfBfP1mL6Xva3SA/P1mL6XVXIskIZ6ZicAs6A4vU0U0MtOd4uD+XKU0MtOG2/BfDk2IjALMLeIgwjMSz8L5qtRRi977WfBfDU2QjALMF+PZyGY7/0smC9GKb3spZ8F88XYiMEswHw1iullHwfJgLk2yull73UwME86juQKWm8A5tooqJeVf2CXcExJveyjn5WLKbtG14nCLChOvxBl9bLOgflKlGV5O4AWzFWxE4Z5AHN9rIRhlmCuj4MwzOlmcTDXxFaa5dTPgrkmNuIwSzDXRnG97LRID8wV0cuzdEcw18VOIGYB5rp4FojpwFwXJVpeJoHAXB5bkZgHMNfERiRmKRlTbD0zzSneAZNAFKeXRy/T0h3BXB47oZiFB3NplLD3/ZtJIDAXYw5SMUcwl8ZWquWtQg3mgtiIxSzBXBjlvjJvFWowF2DKtXzcKw5mYGwFYx7AXBYbwZglmIui5Ffm46UJZiCmZMv7SxPMsNiKxizAXBIb0Zglu8AWRNmvzPuZ7RSnwzAH2ZgjmOFR9itT7MHQMjE74ZglmMEx0fXSS2qaYAZjDtIxRzBDo5duOd0OBmZIbMVjlmCGxkY85vWlCWZAlD5lcJ82ADMEc5CPOYIZGOVbXqcNwAyIrQLMEsyw2CnAdGAGRQ3jn+sIiF1gAXHQgDlSnA6KGiwvS/TAnI9eBWYBZkhUMf65nFQB5nxsdGDWYAbESgfmCGZAHHRgHsEMiDos34ezYM5GrwSzAHM+tkowHZjzsQPTDmajBbMHczZWWjBHMGfjWQvmEczZOKjB9OwCm4m1GsyC4vT8X6SllWDORQ+mHUw1cwbOgWkIswZzJnZggpliCgjMmdjowRzBBDMfzApMM5i1IswjmHaeTDB5MnkywQQzM0xp9UxFnyYHitN2MI9ggpkPpqK52RFMMPPBbMG0g6ln2ch9FTSYP/xFeorTYJpZNyvwOWBF++rVeR5MMxuHCjDtbOljr8l8VPNtwi6wgKhsMAvmT1HLCIi7wAJipWX8w/aE+dhqeWWCOR+V7NCswQzBrHT0smCGxFZHLwtmSFRxrncNZlhUMAl0uQwMzJCooHLC9VHBUfxb8x8PZmiU/tYsuQx1QfSyO9reg7kgtuI7WTDD4y/Blqc3MJfFv34LbX+f3sBcEWU2LxZTXj2TaOkuMCKYRDDBJIJJBJMIJphEMIlgEsEkggkmEUxiAkzpNTqileI0EUww+WHAJIJJBJMIJphEMIlgEsEkggkmEUxiNEyKgRSniWASwSSCCaaUeP9Pcc2DuTjKPW0EzKVR7olrxQlMMMEEE0wwRWGKPdeyBBNMMME0genAXIwptkYnF5PitB1MB+bS6MG0gyn4kPYazIVR8K1DPZh2MEcwF8YGTDuYgi/RPIC5MAq+QOrgwVwWBd8fVYC5MEq+1g3MZVH0XWBgLouiL7ftwVwUG8mYI5iLoujbUI9SMWXWM+tBMuaB4vSS6CVb3svTYIZF0eMf58BcEivZmD2YC+JZNuYRzAVRtuVtBARmUGyFY5ZghsdGOKarwQyOg3TMEczQ6KVbTpuHwAyJnXjMEszQeBaPef3SBDMkyre8fmmCGRA7BZglmGGxUoB5+ThhF9h89BosLzVNitPzsVOBWXow52N9VoHpejDno45e9rIUGsy5WFdKMEsw5zEHJZi3CjWYP8ROi+XjcCcwv4tahj8fK4HA/Da2eixvi0fA/C6eKkWYJZg/R6epjWD+FBtVmAWYP0Wnq/Vgfh8bZZgFmN9H5xQ+muwC+yrWv9RhXo43oDj9VfSD0/dogvllVDPF/unRBPOL6J3G1oP51dHPlUrMwoP536jzwXx/NMH8T9RULvlqhhbMp9g6rW0E81M8ndVilmB+ip1z2h9NMO9xUIw5bb0F8x41P5hOzBEHMjC90916MD9ipRyzAPMRW6e9jewCu0Xdo5/bGIji9LRTqNNveTmEH0yvd1L2c/UETK93UvabKdqsMVtno/0Dprcw+nmeB8oZ8/TLiuX9sO+cn0xnp/W5Y1aGMMvMMVtnqY15Y55NYV7HQNlidrYsrxPu2WIOxjAvY6BcMStrlpcxUKaYrbPXxkx3gRmZlP3c0WZZnK47i5aP04HywrQ3+nmeB8oLs/5l0zLlmuhkmN5ZbWN+mJVZzHRrolNh2n0wE66JToVp+MFMtyY6EWZr2TLZmuhEmGfTmKnuI0qDafvBTHaFTRpM4w/m9fMkF8zOuuXl0cwF0/yDeXk0M8FsXQYtk11gei67eH3mwHpxuu5cFi0PzCEPzGMOmK1zOT2apjFzGMo+l8JMY2bzYCbYrRAds8oGM/5uhdiYPh/L6dG0jNlkhHl9NC1jDjlhFrYxO5dV601jnvPCLCxjti6zVhvGrHLDPBrGzM3y/evE7C6wLjtMN1otTtvcwzf/dWIS07sMm9EnU+n9UNuUNc1hDjliljYxW5dl6y1i5tnLPvpZY5hDnpilRcxMe9l7P2sLs8oV82gQc8gVs7SH6Z3Lup81hdnki3k0h3nOF7M0h+kybrWxXWBdzpijreJ0rtM/tzqYt4U55IzpbGG2WVu63hRmlzdmpAsZ42DmuGDk00vTEGber8zLxbd2MDN/Zca6KjUOZpc75sHbwaxyxyzsYGb/ynz/0jSD6bO3fNypoB+zBXM0g9mAebCCmfuUwaOmaWIXGOOf61y7jeI0lNe5dhOYjH/cVKC2gNlBeS2cmMCsoJxWG1jAZDD7MQJSjwnkVAWzgMlk3tNwVjsmg9mn4ax2TAaz03DWBCaD2afhrHZMBrPT7KwJTGZmn75NtGPC+PRtohyTL5PnbxPlu8D4Mrl/mxgoTvNlcmtHA5gNjGDa+9A0gMln5v1DE0wwJWEyZ3BvBjBBfMwaqMdkzgBMk1NA6jGZAPpjCkg3JhNAYFqdAtKNyQTQox3ABFPOLrAKxMfkrFdenGYFEJg2J2fBBFMOJvPsYJps6jEhBBNMMMEEM1JTv6Idwo9WK8ekNv3UeuWY1KbBBBPM3DF3rmeC+YypvDgNJphgSsT0v2mPVqvfnkB7buqP9Sa+mbqljwgmEUww+WHAJIJJBJMIJphEdZh7rwEixotggkkEkwgmEUwwiWASwSSCSQQTTCKYRDCJYBKvmBQDKU4TwSSCSQQTTCKYRDCJYBLBBJMIJhFMIphEMNkFRqQ4TQSTCCaY/DBgEsEkgkkEE0wimEQwiWASwQSTKBmTYiDFaSKYRDCJYIJJBJMIJhFMIphgEsEkgkkEkwgmu8CIFKeJYBLBBJMfRnX8P2OJh1BljP6CAAAAAElFTkSuQmCC'
);
INSERT INTO server.users_to_roles (users_uuid, roles_uuid) VALUES ('ba52933b-9c25-4be5-8b8e-02bd26ba8feb', '556972a6-0370-4f00-aca2-73a477e48999');

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