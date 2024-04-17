-----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS admin;

CREATE TABLE admin.logs_incoming (
    method text NOT NULL,
    url text NOT NULL,
    headers jsonb NOT NULL,
    body jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    uuid uuid NOT NULL
);
ALTER TABLE ONLY admin.logs_incoming
    ADD CONSTRAINT logs_incoming_pkey PRIMARY KEY (uuid);

CREATE TABLE admin.workspaces (
    name text NOT NULL,
    pass text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY admin.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (name);

CREATE TABLE IF NOT EXISTS admin.workspace_requests
(
    uuid uuid NOT NULL,
    workspace text COLLATE pg_catalog."default" NOT NULL,
    email text COLLATE pg_catalog."default" NOT NULL,
    pass text COLLATE pg_catalog."default" NOT NULL,
    status smallint NOT NULL DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    deleted_at timestamp without time zone,
    CONSTRAINT workspace_requests_pkey PRIMARY KEY (uuid)
);

CREATE PUBLICATION ossa_publication WITH (publish = 'insert, update, delete');
CREATE PUBLICATION hermes_publication WITH (publish = 'insert, update, delete');
CREATE PUBLICATION cerberus_publication WITH (publish = 'insert, update, delete');

----------------------------------------------------------







