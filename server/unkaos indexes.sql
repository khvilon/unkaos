
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


