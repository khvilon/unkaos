-- This script was generated by a beta version of the ERD tool in pgAdmin 4.
-- Please log an issue at https://redmine.postgresql.org/projects/pgadmin4/issues/new if you find any bugs, including reproduction steps.
BEGIN;

CREATE TABLE IF NOT EXISTS public.sprints
(
    uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    start_date timestamp with time zone NOT NULL DEFAULT now(),
    end_date timestamp with time zone NOT NULL DEFAULT now(),
    color text COLLATE pg_catalog."default",
    archived_at timestamp with time zone,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT "Sprints_pkey" PRIMARY KEY (uuid)
)

ALTER TABLE IF EXISTS public.sprints
    OWNER to khvilon3;

ALTER TABLE public.boards 
ADD COLUMN swimlanes_field_uuid uuid,
ADD COLUMN swimlanes_by_root boolean NOT NULL DEFAULT true,
ADD COLUMN no_swimlanes boolean NOT NULL DEFAULT false,
ADD COLUMN use_sprint_filter boolean NOT NULL DEFAULT true;


CREATE TABLE IF NOT EXISTS oboz.field_types
(
    uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT field_types_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.field_values
(
    issue_uuid uuid,
    field_uuid uuid,
    value text COLLATE pg_catalog."default"
);

CREATE TABLE IF NOT EXISTS oboz.fields
(
    uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default",
    type_uuid uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    is_custom boolean DEFAULT true,
    CONSTRAINT fields_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.issue_statuses
(
    uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    is_start boolean,
    is_good_end boolean,
    is_bad_end boolean,
    CONSTRAINT issue_statuses_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.issue_types
(
    uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    workflow_uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT issue_types_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.issue_types_to_fields
(
    issues_types_uuid uuid NOT NULL,
    fields_uuid uuid NOT NULL,
    CONSTRAINT issue_types_to_fields_pkey PRIMARY KEY (issues_types_uuid, fields_uuid)
);

CREATE TABLE IF NOT EXISTS oboz.issues
(
    uuid uuid NOT NULL,
    type_uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    num bigint,
    project_uuid uuid,
    CONSTRAINT issues_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.projects
(
    uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    short_name text COLLATE pg_catalog."default" NOT NULL,
    owner_uuid uuid NOT NULL,
    description text COLLATE pg_catalog."default",
    avatar text COLLATE pg_catalog."default",
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT projects_pkey PRIMARY KEY (uuid, short_name)
);

CREATE TABLE IF NOT EXISTS oboz.transitions
(
    uuid uuid NOT NULL,
    status_from_uuid uuid NOT NULL,
    status_to_uuid uuid NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    workflows_uuid uuid NOT NULL,
    CONSTRAINT transitions_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.users
(
    name text COLLATE pg_catalog."default" NOT NULL,
    login text COLLATE pg_catalog."default" NOT NULL,
    mail text COLLATE pg_catalog."default" NOT NULL,
    active boolean NOT NULL DEFAULT true,
    password text COLLATE pg_catalog."default" NOT NULL,
    avatar text COLLATE pg_catalog."default",
    uuid uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT users_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.workflow_nodes
(
    uuid uuid NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    workflows_uuid uuid NOT NULL,
    issue_statuses_uuid uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT workflows_nodes_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.workflows
(
    name text COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    deleted_at timestamp with time zone,
    uuid uuid NOT NULL,
    CONSTRAINT workflows_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.issue_actions
(
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    author_uuid uuid NOT NULL,
    at timestamp with time zone NOT NULL DEFAULT NOW(),
    value text,
    type uuid,
    PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS oboz.issue_actions_types
(
    uuid uuid NOT NULL,
    name text NOT NULL,
    PRIMARY KEY (uuid)
);

ALTER TABLE IF EXISTS oboz.field_values
    ADD CONSTRAINT fk_field_values_to_fields FOREIGN KEY (field_uuid)
    REFERENCES oboz.fields (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.field_values
    ADD CONSTRAINT fk_field_values_to_issues FOREIGN KEY (issue_uuid)
    REFERENCES oboz.issues (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.fields
    ADD CONSTRAINT fk_fields_to_type FOREIGN KEY (type_uuid)
    REFERENCES oboz.field_types (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issue_types
    ADD CONSTRAINT fk_issue_types_to_workflows FOREIGN KEY (workflow_uuid)
    REFERENCES oboz.workflows (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issue_types_to_fields
    ADD CONSTRAINT fk_fields_to_issue_types FOREIGN KEY (fields_uuid)
    REFERENCES oboz.fields (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issue_types_to_fields
    ADD CONSTRAINT fk_issue_types_to_fields FOREIGN KEY (issues_types_uuid)
    REFERENCES oboz.issue_types (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issues
    ADD CONSTRAINT fk_issues_to_project FOREIGN KEY (project_uuid)
    REFERENCES oboz.projects (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issues
    ADD CONSTRAINT fk_issues_to_type FOREIGN KEY (type_uuid)
    REFERENCES oboz.issue_types (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.projects
    ADD CONSTRAINT fk_projects_to_owner FOREIGN KEY (owner_uuid)
    REFERENCES oboz.users (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE RESTRICT
    NOT VALID;


ALTER TABLE IF EXISTS oboz.transitions
    ADD CONSTRAINT fk_workflows_to_transitions FOREIGN KEY (workflows_uuid)
    REFERENCES oboz.workflows (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.transitions
    ADD CONSTRAINT fk_transition_start_to_issue_statuses FOREIGN KEY (status_from_uuid)
    REFERENCES oboz.issue_statuses (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.transitions
    ADD CONSTRAINT fk_transition_end_to_issue_statuses FOREIGN KEY (status_to_uuid)
    REFERENCES oboz.issue_statuses (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.workflow_nodes
    ADD CONSTRAINT fk_workflow_nodes_to_statuses FOREIGN KEY (issue_statuses_uuid)
    REFERENCES oboz.issue_statuses (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.workflow_nodes
    ADD CONSTRAINT fk_workflows_to_workflow_nodes FOREIGN KEY (workflows_uuid)
    REFERENCES oboz.workflows (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_issue_actions_types FOREIGN KEY (type)
    REFERENCES oboz.issue_actions_types (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_users FOREIGN KEY (author_uuid)
    REFERENCES oboz.users (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;


ALTER TABLE IF EXISTS oboz.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_issues FOREIGN KEY (issue_uuid)
    REFERENCES oboz.issues (uuid) MATCH SIMPLE
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;

END;
