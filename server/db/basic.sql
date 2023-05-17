-----------------------------------------------------------
CREATE SCHEMA admin;

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

----------------------------------------------------------







