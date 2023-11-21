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
    status smallint NOT NULL DEFAULT 0,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    deleted_at timestamp without time zone,
    CONSTRAINT workspace_requests_pkey PRIMARY KEY (uuid)
);

CREATE TABLE IF NOT EXISTS admin.config
(
	uuid uuid,
    service text COLLATE pg_catalog."default",
    name text COLLATE pg_catalog."default" NOT NULL,
    value text COLLATE pg_catalog."default",
    CONSTRAINT config_pkey PRIMARY KEY (uuid)
);

INSERT INTO admin.config(uuid, service, name, value) VALUES ('074a8ea8-95f4-49e6-9a60-4c84a7380100', 'email', 'service', '');
INSERT INTO admin.config(uuid, service, name, value) VALUES ('eee93825-be47-4c6c-a69a-028b6b26243c', 'email', 'user', '');
INSERT INTO admin.config(uuid, service, name, value) VALUES ('14d4d184-7f58-4064-9461-795aa13210de', 'email', 'pass', '');
INSERT INTO admin.config(uuid, service, name, value) VALUES ('84d6511e-c78e-436b-9051-5cec4379ac19', 'email', 'from', 'Unkaos');
INSERT INTO admin.config(uuid, service, name, value) VALUES ('d4606eb0-62ac-474e-ab26-b840c145e1fa', 'discord', 'token', '');
INSERT INTO admin.config(uuid, service, name, value) VALUES ('dc06c54f-319f-478d-99fa-9066ffd584ca', 'telegram', 'token', '');
INSERT INTO admin.config(uuid, service, name, value) VALUES ('d91958eb-b3b9-465f-a680-62a830b8a358', 'slack', 'token', '');
INSERT INTO admin.config(uuid, service, name, value) VALUES ('a8224636-7603-48dd-a2c4-1e38eaf9599c', 'openai', 'key', '');

CREATE PUBLICATION ossa_publication WITH (publish = 'insert, update, delete');
CREATE PUBLICATION test_publication WITH (publish = 'insert, update, delete');
CREATE PUBLICATION cerberus_publication WITH (publish = 'insert, update, delete');

----------------------------------------------------------







