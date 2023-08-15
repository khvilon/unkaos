CREATE SCHEMA IF NOT EXIST public;

CREATE TYPE test.msg_status AS ENUM (
    'NEW',
    'PROCESSED',
    'ERROR'
);

CREATE TABLE test.attachments (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    name text NOT NULL,
    extention text,
    type text,
    data text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    daleted_at timestamp with time zone
);
ALTER TABLE ONLY test.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (uuid);

CREATE TABLE test.boards (
    uuid uuid NOT NULL,
    name text NOT NULL,
    query text,
    estimate_uuid uuid,
    swimlanes_field_uuid uuid,
    swimlanes_by_root boolean DEFAULT true NOT NULL,
    no_swimlanes boolean DEFAULT false NOT NULL,
    use_sprint_filter boolean DEFAULT true NOT NULL,
    config text,
    author_uuid uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (uuid);

CREATE TABLE test.boards_columns (
    uuid uuid NOT NULL,
    boards_uuid uuid NOT NULL,
    status_uuid uuid NOT NULL,
    num smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.boards_columns
    ADD CONSTRAINT boards_columns_pkey PRIMARY KEY (uuid);

CREATE TABLE test.boards_fields (
    uuid uuid NOT NULL,
    boards_uuid uuid NOT NULL,
    fields_uuid uuid NOT NULL,
    num smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.boards_fields
    ADD CONSTRAINT boards_fields_pkey PRIMARY KEY (uuid);


CREATE TABLE test.boards_filters (
    uuid uuid NOT NULL,
    board_uuid uuid NOT NULL,
    name text NOT NULL,
    query text NOT NULL,
    is_private boolean DEFAULT true NOT NULL,
    author_uuid uuid NOT NULL,
    converted_query text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.boards_filters
    ADD CONSTRAINT boards_filters_pkey PRIMARY KEY (uuid);

CREATE TABLE test.configs (
    uuid uuid NOT NULL,
    name text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.configs
    ADD CONSTRAINT configs_pkey PRIMARY KEY (uuid);

CREATE TABLE test.dashboards (
    uuid uuid NOT NULL,
    name text NOT NULL,
    author_uuid uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.dashboards
    ADD CONSTRAINT dashboards_pkey PRIMARY KEY (uuid);

CREATE TABLE test.favourites (
    uuid uuid NOT NULL,
    type_uuid uuid NOT NULL,
    author_uuid uuid NOT NULL,
    name text NOT NULL,
    link text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.favourites
    ADD CONSTRAINT favourites_pkey PRIMARY KEY (uuid);

CREATE TABLE test.favourites_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.favourites_types
    ADD CONSTRAINT favourites_types_pkey PRIMARY KEY (uuid);


CREATE TABLE test.field_values (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    field_uuid uuid NOT NULL,
    value text,
    created_at timestamp without time zone DEFAULT now() NOT NULL, --nnot present in test. Shouold it be?
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.field_values
    ADD CONSTRAINT field_values_pkey PRIMARY KEY (uuid);
--ALTER TABLE ONLY test.field_values
--    ADD CONSTRAINT field_values_pkey PRIMARY KEY (issue_uuid, field_uuid);

CREATE TABLE test.field_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    code text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.field_types
    ADD CONSTRAINT field_types_pkey PRIMARY KEY (uuid);


--todo - write default custom fields
CREATE TABLE test.field_values_rows (
    uuid uuid NOT NULL,
    "b6ddb33f-eea9-40c0-b1c2-d9ab983026a1" text,
    "a985bb07-cd07-4b4e-b9b6-f41c8015e5fe" text,
    "b71398c5-6f63-45e5-9819-6df3112a4770" text,
    "ccc05be8-67e8-426e-82ab-b52a393a5c23" text,
    "22cf17d4-b21c-4141-8a54-356af786940f" text,
    "f01a053e-41ba-49a2-95ea-6ec804fbed02" text,
    "62b89984-aa91-4501-8fbe-74e02c8f74cb" text,
    "4a095ff5-c1c4-4349-9038-e3c35a2328b9" text,
    "733f669a-9584-4469-a41b-544e25b8d91a" text,
    "c96966ea-a591-47a9-992c-0a2f6443bc80" text,
    "863bd194-e1b3-4c64-90ab-b4e30393a9fb" text,
    "3a46dffc-11c8-4d56-8254-64bcf786ecd2" text,
    "1b54a2db-3df4-485e-9ebc-77bb51f2d490" text,
    "f950027e-a1b7-4922-8958-ef0394bc2674" text,
    "a09bf4d5-3962-4c80-ac3c-4efe82d561db" text,
    "e85ccb15-c1d2-433b-bb45-473a9a36a02c" text,
    "849644a4-cf93-4506-96d8-1027967ae253" text,
    "60d53a40-cda9-4cb2-a207-23f8236ee9a7" text,
    "c7eccf13-8f02-4990-89ae-fc6ab83de0cb" text
);
ALTER TABLE ONLY test.field_values_rows
    ADD CONSTRAINT field_values_rows_pkey PRIMARY KEY (uuid);


CREATE TABLE test.fields (
    uuid uuid NOT NULL,
    name text NOT NULL,
    type_uuid uuid NOT NULL,
    is_custom boolean DEFAULT true NOT NULL,
    min_value numeric,
    max_value numeric,
    presision smallint,
    available_values text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.fields
    ADD CONSTRAINT fields_pkey PRIMARY KEY (uuid);


CREATE TABLE test.gadget_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.gadget_types
    ADD CONSTRAINT gadget_types_pkey PRIMARY KEY (uuid);


CREATE TABLE test.gadgets (
    uuid uuid NOT NULL,
    dashboard_uuid uuid NOT NULL,
    config text,
    x0 integer NOT NULL,
    y0 integer NOT NULL,
    width integer NOT NULL,
    height integer NOT NULL,
    type_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone,
    name text
);
ALTER TABLE ONLY test.gadgets
    ADD CONSTRAINT gadgets_pkey PRIMARY KEY (uuid);

---?
CREATE TABLE test.gpt_logs (
    uuid uuid NOT NULL,
    user_uuid uuid,
    prompt text NOT NULL,
    gpt_answer text,
    athena_answer text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY test.gpt_logs
    ADD CONSTRAINT gpt_logs_pkey PRIMARY KEY (uuid);


CREATE TABLE test.issue_actions (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    author_uuid uuid NOT NULL,
    value text,
    type_uuid uuid DEFAULT 'f53d8ecc-c26e-4909-a070-5c33e6f7a196'::uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.issue_actions
    ADD CONSTRAINT issue_actions_pkey PRIMARY KEY (uuid);

CREATE TABLE test.issue_actions_types (
    uuid uuid NOT NULL,
    name text NOT NULL
);
ALTER TABLE ONLY test.issue_actions_types
    ADD CONSTRAINT issue_actions_types_pkey PRIMARY KEY (uuid);

CREATE TABLE test.issue_statuses (
    uuid uuid NOT NULL,
    name text NOT NULL,
    is_start boolean,
    is_end boolean,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.issue_statuses
    ADD CONSTRAINT issue_statuses_pkey PRIMARY KEY (uuid);

CREATE TABLE test.issue_tags (
    uuid uuid NOT NULL,
    name text NOT NULL,
    color text,
    author_uuid uuid,
    is_personal boolean DEFAULT false NOT NULL,
    text_color text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.issue_tags
    ADD CONSTRAINT issue_tags_pkey PRIMARY KEY (uuid);

CREATE TABLE test.issue_tags_selected (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    issue_tags_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone  
);
ALTER TABLE ONLY test.issue_tags_selected
    ADD CONSTRAINT issue_tags_selected_pkey PRIMARY KEY (uuid);


CREATE TABLE test.issue_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    workflow_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone  
);
ALTER TABLE ONLY test.issue_types
    ADD CONSTRAINT issue_types_pkey PRIMARY KEY (uuid);


CREATE TABLE test.issue_types_to_fields (
    issue_types_uuid uuid NOT NULL,
    fields_uuid uuid NOT NULL
);
ALTER TABLE ONLY test.issue_types_to_fields
    ADD CONSTRAINT issue_types_to_fields_pkey PRIMARY KEY (issue_types_uuid, fields_uuid);

CREATE TABLE test.issues (
    uuid uuid NOT NULL,
    type_uuid uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    num bigint,
    project_uuid uuid,
    status_uuid uuid,
    sprint_uuid uuid,
    author_uuid uuid,
    tags uuid[],
    spent_time numeric DEFAULT 0 NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    parent_uuid uuid
);
ALTER TABLE ONLY test.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (uuid);

CREATE TABLE test.logs_done (
    uuid uuid NOT NULL,
    user_uuid uuid,
    table_name text,
    method text,
    target_uuid uuid,
    parameters text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY test.logs_done
    ADD CONSTRAINT logs_done_pkey PRIMARY KEY (uuid);

--all msg not in test?
CREATE TABLE test.msg_in (
    uuid uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    "from" text NOT NULL,
    pipe_uuid uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    status test.msg_status DEFAULT 'NEW'::test.msg_status NOT NULL,
    message_id text,
    message_uid text,
    senders text,
    cc text,
    bcc text,
    reply_to text,
    "to" text,
    message_date timestamp with time zone,
    error_message text
);
ALTER TABLE ONLY test.msg_in
    ADD CONSTRAINT msg_in_pkey PRIMARY KEY (uuid);
ALTER TABLE ONLY test.msg_in
    ADD CONSTRAINT msg_in_pipe_uuid_message_uid_key UNIQUE (pipe_uuid, message_uid);

CREATE TABLE test.msg_in_parts (
    uuid uuid NOT NULL,
    msg_in_uuid uuid NOT NULL,
    content text,
    type text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    encoding text,
    disposition text,
    part_id text,
    part_num text,
    filename text
);
ALTER TABLE ONLY test.msg_in_parts
    ADD CONSTRAINT msg_in_parts_pk PRIMARY KEY (uuid);


CREATE TABLE test.msg_out (
    uuid uuid NOT NULL,
    transport text,
    recipient text NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    status smallint DEFAULT 0 NOT NULL,
    status_details text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.msg_out
    ADD CONSTRAINT msg_out_pkey PRIMARY KEY (uuid);

CREATE TABLE test.msg_pipes (
    uuid uuid NOT NULL,
    host text,
    login text NOT NULL,
    password text NOT NULL,
    service text,
    name text NOT NULL,
    port text,
    is_active boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY test.msg_pipes
    ADD CONSTRAINT msg_pipes_pkey PRIMARY KEY (uuid);

CREATE TABLE test.old_issues_num (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    project_uuid uuid NOT NULL,
    num integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.old_issues_num
    ADD CONSTRAINT old_issues_num_pkey PRIMARY KEY (uuid);

CREATE TABLE test.permition_targets (
    uuid uuid NOT NULL,
    name text NOT NULL,
    table_name text
);
ALTER TABLE ONLY test.permition_targets
    ADD CONSTRAINT permition_targets_pkey PRIMARY KEY (uuid);

CREATE TABLE test.permitions (
    uuid uuid NOT NULL,
    role_uuid uuid NOT NULL,
    target_uuid uuid NOT NULL,
    permits boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.permitions
    ADD CONSTRAINT permitions_pkey PRIMARY KEY (uuid);



CREATE TABLE test.permitions_for_issues (
    uuid uuid NOT NULL,
    project_uuid uuid,
    permits boolean DEFAULT true NOT NULL,
    issue_uuid uuid,
    role_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.permitions_for_issues
    ADD CONSTRAINT permitions_for_issues_pkey PRIMARY KEY (uuid);

CREATE TABLE test.projects (
    uuid uuid NOT NULL,
    name text NOT NULL,
    short_name text NOT NULL,
    owner_uuid uuid NOT NULL,
    description text,
    avatar text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (uuid);
ALTER TABLE ONLY test.projects
    ADD CONSTRAINT projects_uuid_key UNIQUE (short_name);

CREATE TABLE test.relation_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    revert_name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.relation_types
    ADD CONSTRAINT relation_types_pkey PRIMARY KEY (uuid);

CREATE TABLE test.relations (
    uuid uuid NOT NULL,
    issue0_uuid uuid NOT NULL,
    issue1_uuid uuid NOT NULL,
    type_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.relations
    ADD CONSTRAINT relations_pkey PRIMARY KEY (uuid);

CREATE TABLE test.roles (
    uuid uuid NOT NULL,
    name text NOT NULL,
    is_custom boolean DEFAULT true NOT NULL,
    permissions jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone  
);
ALTER TABLE ONLY test.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (uuid);

CREATE TABLE test.sprints (
    uuid uuid NOT NULL,
    name text NOT NULL,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone DEFAULT now() NOT NULL,
    color text,
    archived_at timestamp without time zone,
    resolved_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.sprints
    ADD CONSTRAINT sprints_pkey PRIMARY KEY (uuid);

CREATE TABLE test.time_entries (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    work_date date NOT NULL,
    duration numeric NOT NULL,
    comment text,
    author_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (uuid);

CREATE TABLE test.transitions (
    uuid uuid NOT NULL,
    status_from_uuid uuid NOT NULL,
    status_to_uuid uuid NOT NULL,
    name text NOT NULL,
    workflows_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.transitions
    ADD CONSTRAINT transitions_pkey PRIMARY KEY (uuid);

CREATE TABLE test.user_sessions (
    uuid uuid NOT NULL,
    user_uuid uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (uuid);

CREATE TABLE test.users (
    uuid uuid NOT NULL,
    name text NOT NULL,
    login text NOT NULL,
    mail text NOT NULL,
    active boolean DEFAULT true NOT NULL,
    password text DEFAULT 'mypass'::text NOT NULL,
    avatar text,
    token text,
    token_created_at timestamp with time zone,
    telegram text DEFAULT ''::text NOT NULL,
    discord text DEFAULT ''::text NOT NULL,
    telegram_id text DEFAULT ''::text NOT NULL,
    discord_id text DEFAULT ''::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uuid);


CREATE TABLE test.users_to_roles (
    users_uuid uuid NOT NULL,
    roles_uuid uuid NOT NULL
);
ALTER TABLE ONLY test.users_to_roles
    ADD CONSTRAINT users_to_roles_pkey PRIMARY KEY (users_uuid, roles_uuid);


CREATE TABLE test.watchers (
    user_uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL
);
ALTER TABLE ONLY test.watchers
    ADD CONSTRAINT watchers_pkey PRIMARY KEY (user_uuid, issue_uuid);

CREATE TABLE test.workflow_nodes (
    uuid uuid NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    workflows_uuid uuid NOT NULL,
    issue_statuses_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.workflow_nodes
    ADD CONSTRAINT workflow_nodes_pkey PRIMARY KEY (uuid);

CREATE TABLE test.workflows (
    uuid uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY test.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (uuid);


ALTER TABLE ONLY test.attachments
    ADD CONSTRAINT fk_attachments_to_issues FOREIGN KEY (issue_uuid) REFERENCES test.issues(uuid) NOT VALID;

ALTER TABLE ONLY test.boards_columns
    ADD CONSTRAINT fk_boards_columns_to_statuses FOREIGN KEY (status_uuid) REFERENCES test.issue_statuses(uuid) NOT VALID;

ALTER TABLE ONLY test.boards_fields
    ADD CONSTRAINT fk_boards_fields_to_fields FOREIGN KEY (fields_uuid) REFERENCES test.fields(uuid);

ALTER TABLE ONLY test.boards_filters
    ADD CONSTRAINT fk_boards_filters_to_author FOREIGN KEY (author_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.boards_filters
    ADD CONSTRAINT fk_boards_filters_to_boards FOREIGN KEY (board_uuid) REFERENCES test.boards(uuid) NOT VALID;

ALTER TABLE ONLY test.boards
    ADD CONSTRAINT fk_boards_to_author FOREIGN KEY (author_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.boards_columns
    ADD CONSTRAINT fk_boards_to_columns FOREIGN KEY (boards_uuid) REFERENCES test.boards(uuid) NOT VALID;

ALTER TABLE ONLY test.dashboards
    ADD CONSTRAINT fk_dashboards_to_author FOREIGN KEY (author_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.boards
    ADD CONSTRAINT fk_boards_to_estimate FOREIGN KEY (estimate_uuid) REFERENCES test.fields(uuid) NOT VALID;

ALTER TABLE ONLY test.boards_fields
    ADD CONSTRAINT fk_boards_to_fields FOREIGN KEY (boards_uuid) REFERENCES test.boards(uuid);

ALTER TABLE ONLY test.favourites
    ADD CONSTRAINT fk_favourites_to_owner FOREIGN KEY (author_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.favourites
    ADD CONSTRAINT fk_favourites_to_type FOREIGN KEY (type_uuid) REFERENCES test.favourites_types(uuid) NOT VALID;

ALTER TABLE ONLY test.field_values
    ADD CONSTRAINT fk_field_values_to_fields FOREIGN KEY (field_uuid) REFERENCES test.fields(uuid) NOT VALID;

ALTER TABLE ONLY test.field_values
    ADD CONSTRAINT fk_field_values_to_issues FOREIGN KEY (issue_uuid) REFERENCES test.issues(uuid) NOT VALID;

ALTER TABLE ONLY test.issue_types_to_fields
    ADD CONSTRAINT fk_fields_to_issue_types FOREIGN KEY (fields_uuid) REFERENCES test.fields(uuid) NOT VALID;

ALTER TABLE ONLY test.fields
    ADD CONSTRAINT fk_fields_to_type FOREIGN KEY (type_uuid) REFERENCES test.field_types(uuid) NOT VALID;

ALTER TABLE ONLY test.gadgets
    ADD CONSTRAINT fk_gadgets_to_dashboards FOREIGN KEY (dashboard_uuid) REFERENCES test.dashboards(uuid) NOT VALID;

ALTER TABLE ONLY test.gadgets
    ADD CONSTRAINT fk_gadgets_to_type FOREIGN KEY (type_uuid) REFERENCES test.gadget_types(uuid) NOT VALID;

ALTER TABLE ONLY test.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_issue_actions_types FOREIGN KEY (type_uuid) REFERENCES test.issue_actions_types(uuid) NOT VALID;

ALTER TABLE ONLY test.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_issues FOREIGN KEY (issue_uuid) REFERENCES test.issues(uuid) NOT VALID;

ALTER TABLE ONLY test.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_users FOREIGN KEY (author_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.issue_tags
    ADD CONSTRAINT fk_issue_tags_to_author FOREIGN KEY (author_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.issue_types_to_fields
    ADD CONSTRAINT fk_issue_types_to_fields FOREIGN KEY (issue_types_uuid) REFERENCES test.issue_types(uuid) NOT VALID;

ALTER TABLE ONLY test.issue_types
    ADD CONSTRAINT fk_issue_types_to_workflows FOREIGN KEY (workflow_uuid) REFERENCES test.workflows(uuid) NOT VALID;

ALTER TABLE ONLY test.issues
    ADD CONSTRAINT fk_issues_to_project FOREIGN KEY (project_uuid) REFERENCES test.projects(uuid) NOT VALID;

ALTER TABLE ONLY test.issues
    ADD CONSTRAINT fk_issues_to_sprint FOREIGN KEY (sprint_uuid) REFERENCES test.sprints(uuid) NOT VALID;

ALTER TABLE ONLY test.issues
    ADD CONSTRAINT fk_issues_to_type FOREIGN KEY (type_uuid) REFERENCES test.issue_types(uuid) NOT VALID;

ALTER TABLE ONLY test.logs_done
    ADD CONSTRAINT fk_logs_done_to_users FOREIGN KEY (user_uuid) REFERENCES test.users(uuid);

ALTER TABLE ONLY test.old_issues_num
    ADD CONSTRAINT fk_old_issues_num_to_projects FOREIGN KEY (project_uuid) REFERENCES test.projects(uuid);

ALTER TABLE ONLY test.permitions_for_issues
    ADD CONSTRAINT fk_permitions_for_issues_to_roles FOREIGN KEY (role_uuid) REFERENCES test.roles(uuid) NOT VALID;

ALTER TABLE ONLY test.permitions
    ADD CONSTRAINT fk_permitions_to_permition_targets FOREIGN KEY (target_uuid) REFERENCES test.permition_targets(uuid) NOT VALID;

ALTER TABLE ONLY test.permitions
    ADD CONSTRAINT fk_permitions_to_roles FOREIGN KEY (role_uuid) REFERENCES test.roles(uuid) NOT VALID;

ALTER TABLE ONLY test.projects
    ADD CONSTRAINT fk_projects_to_owner FOREIGN KEY (owner_uuid) REFERENCES test.users(uuid) ON DELETE RESTRICT NOT VALID;

ALTER TABLE ONLY test.relations
    ADD CONSTRAINT fk_relation_issue0_to_issues FOREIGN KEY (issue0_uuid) REFERENCES test.issues(uuid) NOT VALID;

ALTER TABLE ONLY test.relations
    ADD CONSTRAINT fk_relation_issue1_to_issues FOREIGN KEY (issue1_uuid) REFERENCES test.issues(uuid) NOT VALID;

ALTER TABLE ONLY test.relations
    ADD CONSTRAINT fk_relations_to_relation_types FOREIGN KEY (type_uuid) REFERENCES test.relation_types(uuid) NOT VALID;

ALTER TABLE ONLY test.boards
    ADD CONSTRAINT fk_swimlanes_field FOREIGN KEY (swimlanes_field_uuid) REFERENCES test.fields(uuid) NOT VALID;

ALTER TABLE ONLY test.users_to_roles
    ADD CONSTRAINT fk_users_to_roles_to_roles FOREIGN KEY (roles_uuid) REFERENCES test.roles(uuid) NOT VALID;

ALTER TABLE ONLY test.users_to_roles
    ADD CONSTRAINT fk_users_to_roles_to_users FOREIGN KEY (users_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.watchers
    ADD CONSTRAINT fk_watchers_to_issues FOREIGN KEY (issue_uuid) REFERENCES test.issues(uuid);

ALTER TABLE ONLY test.watchers
    ADD CONSTRAINT fk_watchers_to_users FOREIGN KEY (user_uuid) REFERENCES test.users(uuid);

ALTER TABLE ONLY test.workflow_nodes
    ADD CONSTRAINT fk_workflow_nodes_to_statuses FOREIGN KEY (issue_statuses_uuid) REFERENCES test.issue_statuses(uuid) NOT VALID;

ALTER TABLE ONLY test.transitions
    ADD CONSTRAINT fk_workflows_to_transitions FOREIGN KEY (workflows_uuid) REFERENCES test.workflows(uuid) NOT VALID;

ALTER TABLE ONLY test.workflow_nodes
    ADD CONSTRAINT fk_workflows_to_workflow_nodes FOREIGN KEY (workflows_uuid) REFERENCES test.workflows(uuid) NOT VALID;

ALTER TABLE ONLY test.time_entries
    ADD CONSTRAINT time_entries_to_author FOREIGN KEY (author_uuid) REFERENCES test.users(uuid) NOT VALID;

ALTER TABLE ONLY test.user_sessions
    ADD CONSTRAINT user_sessions_to_user FOREIGN KEY (user_uuid) REFERENCES test.users(uuid) NOT VALID;





