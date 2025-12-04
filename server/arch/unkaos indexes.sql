
CREATE TABLE IF NOT EXISTS public.favourites_types
(
    uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT favourites_types_pkey PRIMARY KEY (uuid)
)

CREATE TABLE IF NOT EXISTS public.favourites
(
    uuid uuid NOT NULL,
    type_uuid uuid NOT NULL,
    owner_uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    link text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    deleted_at timestamp with time zone,
    CONSTRAINT favourites_pkey PRIMARY KEY (uuid),
    CONSTRAINT fk_favourites_to_owner FOREIGN KEY (owner_uuid)
        REFERENCES public.users (uuid) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID,
    CONSTRAINT fk_favourites_to_type FOREIGN KEY (type_uuid)
        REFERENCES public.favourites_types (uuid) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT VALID
)


CREATE INDEX idx_issues_uuid ON oboz.issues(uuid);
CREATE INDEX idx_issues_type_uuid ON oboz.issues(type_uuid);
CREATE INDEX idx_issues_num ON oboz.issues(num);
CREATE INDEX idx_issues_project_uuid ON oboz.issues(project_uuid);
CREATE INDEX idx_issues_status_uuid ON oboz.issues(status_uuid);
CREATE INDEX idx_issues_sprint_uuid ON oboz.issues(sprint_uuid);
CREATE INDEX idx_issues_created_at ON oboz.issues(created_at);
CREATE INDEX idx_issues_updated ON oboz.issues(updated_at);
CREATE INDEX idx_issues_not_deleted ON oboz.issues ( (deleted_at IS NULL) );


CREATE INDEX idx_field_values_uuid ON oboz.field_values(uuid);
CREATE INDEX idx_field_values_field_uuid ON oboz.field_values(field_uuid);
CREATE INDEX idx_field_values_issue_uuid ON oboz.field_values(issue_uuid);

--todo!!!
CREATE INDEX idx_field_values_value ON oboz.field_values(value);


CREATE INDEX idx_issue_actions_uuid ON oboz.issue_actions(uuid);
CREATE INDEX idx_issue_actions_author_uuid ON oboz.issue_actions(author_uuid);
CREATE INDEX idx_issue_actions_issue_uuid ON oboz.issue_actions(issue_uuid);
CREATE INDEX idx_issue_actions_type_uuid ON oboz.issue_actions(type_uuid);

CREATE INDEX idx_relations_uuid ON oboz.relations(uuid);
CREATE INDEX idx_relations_issue0_uuid ON oboz.relations(issue0_uuid);
CREATE INDEX idx_relations_issue1_uuid ON oboz.relations(issue1_uuid);
CREATE INDEX idx_relations_type_uuid ON oboz.relations(type_uuid);


CREATE INDEX idx_attachments_issue_uuid ON oboz.attachments(issue_uuid);

CREATE INDEX idx_users_uuid ON oboz.users(uuid);


INSERT INTO 
oboz.field_values_rows
SELECT issue_uuid AS uuid,
    MAX(CASE WHEN field_uuid = 'b6ddb33f-eea9-40c0-b1c2-d9ab983026a1' THEN value END) AS "b6ddb33f-eea9-40c0-b1c2-d9ab983026a1",
    MAX(CASE WHEN field_uuid = '733f669a-9584-4469-a41b-544e25b8d91a' THEN value END) AS "733f669a-9584-4469-a41b-544e25b8d91a",
    MAX(CASE WHEN field_uuid = 'ccc05be8-67e8-426e-82ab-b52a393a5c23' THEN value END) AS "ccc05be8-67e8-426e-82ab-b52a393a5c23",
    MAX(CASE WHEN field_uuid = 'b71398c5-6f63-45e5-9819-6df3112a4770' THEN value END) AS "b71398c5-6f63-45e5-9819-6df3112a4770",
    MAX(CASE WHEN field_uuid = '22cf17d4-b21c-4141-8a54-356af786940f' THEN value END) AS "22cf17d4-b21c-4141-8a54-356af786940f",
    MAX(CASE WHEN field_uuid = 'a985bb07-cd07-4b4e-b9b6-f41c8015e5fe' THEN value END) AS "a985bb07-cd07-4b4e-b9b6-f41c8015e5fe",
    MAX(CASE WHEN field_uuid = '62b89984-aa91-4501-8fbe-74e02c8f74cb' THEN value END) AS "62b89984-aa91-4501-8fbe-74e02c8f74cb",
    MAX(CASE WHEN field_uuid = 'f01a053e-41ba-49a2-95ea-6ec804fbed02' THEN value END) AS "f01a053e-41ba-49a2-95ea-6ec804fbed02",
    MAX(CASE WHEN field_uuid = '4a095ff5-c1c4-4349-9038-e3c35a2328b9' THEN value END) AS "4a095ff5-c1c4-4349-9038-e3c35a2328b9",
    MAX(CASE WHEN field_uuid = 'c96966ea-a591-47a9-992c-0a2f6443bc80' THEN value END) AS "c96966ea-a591-47a9-992c-0a2f6443bc80",
        MAX(CASE WHEN field_uuid = '863bd194-e1b3-4c64-90ab-b4e30393a9fb' THEN value END) AS "863bd194-e1b3-4c64-90ab-b4e30393a9fb",
    MAX(CASE WHEN field_uuid = '3a46dffc-11c8-4d56-8254-64bcf786ecd2' THEN value END) AS "3a46dffc-11c8-4d56-8254-64bcf786ecd2",
    MAX(CASE WHEN field_uuid = '1b54a2db-3df4-485e-9ebc-77bb51f2d490' THEN value END) AS "1b54a2db-3df4-485e-9ebc-77bb51f2d490",
    MAX(CASE WHEN field_uuid = 'f950027e-a1b7-4922-8958-ef0394bc2674' THEN value END) AS "f950027e-a1b7-4922-8958-ef0394bc2674",
    MAX(CASE WHEN field_uuid = 'a09bf4d5-3962-4c80-ac3c-4efe82d561db' THEN value END) AS "a09bf4d5-3962-4c80-ac3c-4efe82d561db",
    MAX(CASE WHEN field_uuid = '60d53a40-cda9-4cb2-a207-23f8236ee9a7' THEN value END) AS "60d53a40-cda9-4cb2-a207-23f8236ee9a7",
    MAX(CASE WHEN field_uuid = 'e85ccb15-c1d2-433b-bb45-473a9a36a02c' THEN value END) AS "e85ccb15-c1d2-433b-bb45-473a9a36a02c",
    MAX(CASE WHEN field_uuid = '849644a4-cf93-4506-96d8-1027967ae253' THEN value END) AS "849644a4-cf93-4506-96d8-1027967ae253",
    MAX(CASE WHEN field_uuid = 'c7eccf13-8f02-4990-89ae-fc6ab83de0cb' THEN value END) AS "c7eccf13-8f02-4990-89ae-fc6ab83de0cb"
FROM oboz.field_values
GROUP BY issue_uuid




