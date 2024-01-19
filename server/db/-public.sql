CREATE SCHEMA IF NOT EXISTS public;

CREATE TYPE public.msg_status AS ENUM (
    'NEW',
    'PROCESSED',
    'ERROR'
);

CREATE TABLE public.attachments (
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
ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (uuid);

CREATE TABLE public.boards (
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
ALTER TABLE ONLY public.boards
    ADD CONSTRAINT boards_pkey PRIMARY KEY (uuid);

CREATE TABLE public.boards_columns (
    uuid uuid NOT NULL,
    boards_uuid uuid NOT NULL,
    status_uuid uuid NOT NULL,
    num smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.boards_columns
    ADD CONSTRAINT boards_columns_pkey PRIMARY KEY (uuid);

CREATE TABLE public.boards_fields (
    uuid uuid NOT NULL,
    boards_uuid uuid NOT NULL,
    fields_uuid uuid NOT NULL,
    num smallint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.boards_fields
    ADD CONSTRAINT boards_fields_pkey PRIMARY KEY (uuid);


CREATE TABLE public.boards_filters (
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
ALTER TABLE ONLY public.boards_filters
    ADD CONSTRAINT boards_filters_pkey PRIMARY KEY (uuid);

CREATE TABLE public.configs (
    uuid uuid NOT NULL,
    service text NOT NULL,
    name text NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.configs
    ADD CONSTRAINT configs_pkey PRIMARY KEY (uuid);    

CREATE TABLE public.dashboards (
    uuid uuid NOT NULL,
    name text NOT NULL,
    author_uuid uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_pkey PRIMARY KEY (uuid);

CREATE TABLE public.favourites (
    uuid uuid NOT NULL,
    type_uuid uuid NOT NULL,
    author_uuid uuid NOT NULL,
    name text NOT NULL,
    link text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT favourites_pkey PRIMARY KEY (uuid);

CREATE TABLE public.favourites_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
ALTER TABLE ONLY public.favourites_types
    ADD CONSTRAINT favourites_types_pkey PRIMARY KEY (uuid);


CREATE TABLE public.field_values (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    field_uuid uuid NOT NULL,
    value text,
    created_at timestamp without time zone DEFAULT now() NOT NULL, --nnot present in public. Shouold it be?
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT field_values_pkey PRIMARY KEY (uuid);
--ALTER TABLE ONLY public.field_values
--    ADD CONSTRAINT field_values_pkey PRIMARY KEY (issue_uuid, field_uuid);

CREATE TABLE public.field_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    code text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.field_types
    ADD CONSTRAINT field_types_pkey PRIMARY KEY (uuid);


--todo - write default custom fields
CREATE TABLE public.field_values_rows (
    uuid uuid NOT NULL
);
ALTER TABLE ONLY public.field_values_rows
    ADD CONSTRAINT field_values_rows_pkey PRIMARY KEY (uuid);


CREATE TABLE public.fields (
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
ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fields_pkey PRIMARY KEY (uuid);


CREATE TABLE public.gadget_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.gadget_types
    ADD CONSTRAINT gadget_types_pkey PRIMARY KEY (uuid);


CREATE TABLE public.gadgets (
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
ALTER TABLE ONLY public.gadgets
    ADD CONSTRAINT gadgets_pkey PRIMARY KEY (uuid);

---?
CREATE TABLE public.gpt_logs (
    uuid uuid NOT NULL,
    user_uuid uuid,
    prompt text NOT NULL,
    gpt_answer text,
    athena_answer text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.gpt_logs
    ADD CONSTRAINT gpt_logs_pkey PRIMARY KEY (uuid);


CREATE TABLE public.issue_actions (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    author_uuid uuid NOT NULL,
    value text,
    type_uuid uuid DEFAULT 'f53d8ecc-c26e-4909-a070-5c33e6f7a196'::uuid NOT NULL,
    archived_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.issue_actions
    ADD CONSTRAINT issue_actions_pkey PRIMARY KEY (uuid);

CREATE TABLE public.issue_actions_types (
    uuid uuid NOT NULL,
    name text NOT NULL
);
ALTER TABLE ONLY public.issue_actions_types
    ADD CONSTRAINT issue_actions_types_pkey PRIMARY KEY (uuid);

CREATE TABLE public.issue_statuses (
    uuid uuid NOT NULL,
    name text NOT NULL,
    is_start boolean,
    is_end boolean,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.issue_statuses
    ADD CONSTRAINT issue_statuses_pkey PRIMARY KEY (uuid);

CREATE TABLE public.issue_tags (
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
ALTER TABLE ONLY public.issue_tags
    ADD CONSTRAINT issue_tags_pkey PRIMARY KEY (uuid);

CREATE TABLE public.issue_tags_selected (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    issue_tags_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone  
);
ALTER TABLE ONLY public.issue_tags_selected
    ADD CONSTRAINT issue_tags_selected_pkey PRIMARY KEY (uuid);


CREATE TABLE public.issue_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    workflow_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone  
);
ALTER TABLE ONLY public.issue_types
    ADD CONSTRAINT issue_types_pkey PRIMARY KEY (uuid);


CREATE TABLE public.issue_types_to_fields (
    issue_types_uuid uuid NOT NULL,
    fields_uuid uuid NOT NULL
);
ALTER TABLE ONLY public.issue_types_to_fields
    ADD CONSTRAINT issue_types_to_fields_pkey PRIMARY KEY (issue_types_uuid, fields_uuid);

CREATE TABLE public.issues (
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
ALTER TABLE ONLY public.issues
    ADD CONSTRAINT issues_pkey PRIMARY KEY (uuid);

CREATE TABLE public.logs_done (
    uuid uuid NOT NULL,
    user_uuid uuid,
    table_name text,
    method text,
    target_uuid uuid,
    parameters text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
ALTER TABLE ONLY public.logs_done
    ADD CONSTRAINT logs_done_pkey PRIMARY KEY (uuid);

--all msg not in test?
CREATE TABLE public.msg_in (
    uuid uuid NOT NULL,
    title text DEFAULT ''::text NOT NULL,
    body text NOT NULL,
    "from" text NOT NULL,
    pipe_uuid uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    status public.msg_status DEFAULT 'NEW'::public.msg_status NOT NULL,
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
ALTER TABLE ONLY public.msg_in
    ADD CONSTRAINT msg_in_pkey PRIMARY KEY (uuid);
ALTER TABLE ONLY public.msg_in
    ADD CONSTRAINT msg_in_pipe_uuid_message_uid_key UNIQUE (pipe_uuid, message_uid);

CREATE TABLE public.msg_in_parts (
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
ALTER TABLE ONLY public.msg_in_parts
    ADD CONSTRAINT msg_in_parts_pk PRIMARY KEY (uuid);


CREATE TABLE public.msg_out (
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
ALTER TABLE ONLY public.msg_out
    ADD CONSTRAINT msg_out_pkey PRIMARY KEY (uuid);

CREATE TABLE public.msg_pipes (
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
ALTER TABLE ONLY public.msg_pipes
    ADD CONSTRAINT msg_pipes_pkey PRIMARY KEY (uuid);

CREATE TABLE public.old_issues_num (
    uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    project_uuid uuid NOT NULL,
    num integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.old_issues_num
    ADD CONSTRAINT old_issues_num_pkey PRIMARY KEY (uuid);


CREATE TABLE public.projects (
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
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (uuid);
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_uuid_key UNIQUE (short_name);

CREATE TABLE public.relation_types (
    uuid uuid NOT NULL,
    name text NOT NULL,
    revert_name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.relation_types
    ADD CONSTRAINT relation_types_pkey PRIMARY KEY (uuid);

CREATE TABLE public.relations (
    uuid uuid NOT NULL,
    issue0_uuid uuid NOT NULL,
    issue1_uuid uuid NOT NULL,
    type_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.relations
    ADD CONSTRAINT relations_pkey PRIMARY KEY (uuid);

CREATE TABLE public.roles (
    uuid uuid NOT NULL,
    name text NOT NULL,
    is_custom boolean DEFAULT true NOT NULL,
    permissions jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone  
);
ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (uuid);

CREATE TABLE public.sprints (
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
ALTER TABLE ONLY public.sprints
    ADD CONSTRAINT sprints_pkey PRIMARY KEY (uuid);

CREATE TABLE public.time_entries (
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
ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_pkey PRIMARY KEY (uuid);

CREATE TABLE public.transitions (
    uuid uuid NOT NULL,
    status_from_uuid uuid NOT NULL,
    status_to_uuid uuid NOT NULL,
    name text NOT NULL,
    workflows_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.transitions
    ADD CONSTRAINT transitions_pkey PRIMARY KEY (uuid);

CREATE TABLE public.user_sessions (
    uuid uuid NOT NULL,
    user_uuid uuid NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (uuid);

CREATE TABLE public.users (
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
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (uuid);


CREATE TABLE public.users_to_roles (
    users_uuid uuid NOT NULL,
    roles_uuid uuid NOT NULL
);
ALTER TABLE ONLY public.users_to_roles
    ADD CONSTRAINT users_to_roles_pkey PRIMARY KEY (users_uuid, roles_uuid);


CREATE TABLE public.watchers (
    user_uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL
);
ALTER TABLE ONLY public.watchers
    ADD CONSTRAINT watchers_pkey PRIMARY KEY (user_uuid, issue_uuid);

CREATE TABLE public.workflow_nodes (
    uuid uuid NOT NULL,
    x integer NOT NULL,
    y integer NOT NULL,
    workflows_uuid uuid NOT NULL,
    issue_statuses_uuid uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.workflow_nodes
    ADD CONSTRAINT workflow_nodes_pkey PRIMARY KEY (uuid);

CREATE TABLE public.workflows (
    uuid uuid NOT NULL,
    name text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    deleted_at timestamp without time zone
);
ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (uuid);


ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT fk_attachments_to_issues FOREIGN KEY (issue_uuid) REFERENCES public.issues(uuid) NOT VALID;

ALTER TABLE ONLY public.boards_columns
    ADD CONSTRAINT fk_boards_columns_to_statuses FOREIGN KEY (status_uuid) REFERENCES public.issue_statuses(uuid) NOT VALID;

ALTER TABLE ONLY public.boards_fields
    ADD CONSTRAINT fk_boards_fields_to_fields FOREIGN KEY (fields_uuid) REFERENCES public.fields(uuid);

ALTER TABLE ONLY public.boards_filters
    ADD CONSTRAINT fk_boards_filters_to_author FOREIGN KEY (author_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.boards_filters
    ADD CONSTRAINT fk_boards_filters_to_boards FOREIGN KEY (board_uuid) REFERENCES public.boards(uuid) NOT VALID;

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT fk_boards_to_author FOREIGN KEY (author_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.boards_columns
    ADD CONSTRAINT fk_boards_to_columns FOREIGN KEY (boards_uuid) REFERENCES public.boards(uuid) NOT VALID;

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT fk_dashboards_to_author FOREIGN KEY (author_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT fk_boards_to_estimate FOREIGN KEY (estimate_uuid) REFERENCES public.fields(uuid) NOT VALID;

ALTER TABLE ONLY public.boards_fields
    ADD CONSTRAINT fk_boards_to_fields FOREIGN KEY (boards_uuid) REFERENCES public.boards(uuid);

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT fk_favourites_to_owner FOREIGN KEY (author_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.favourites
    ADD CONSTRAINT fk_favourites_to_type FOREIGN KEY (type_uuid) REFERENCES public.favourites_types(uuid) NOT VALID;

ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT fk_field_values_to_fields FOREIGN KEY (field_uuid) REFERENCES public.fields(uuid) NOT VALID;

ALTER TABLE ONLY public.field_values
    ADD CONSTRAINT fk_field_values_to_issues FOREIGN KEY (issue_uuid) REFERENCES public.issues(uuid) NOT VALID;

ALTER TABLE ONLY public.issue_types_to_fields
    ADD CONSTRAINT fk_fields_to_issue_types FOREIGN KEY (fields_uuid) REFERENCES public.fields(uuid) NOT VALID;

ALTER TABLE ONLY public.fields
    ADD CONSTRAINT fk_fields_to_type FOREIGN KEY (type_uuid) REFERENCES public.field_types(uuid) NOT VALID;

ALTER TABLE ONLY public.gadgets
    ADD CONSTRAINT fk_gadgets_to_dashboards FOREIGN KEY (dashboard_uuid) REFERENCES public.dashboards(uuid) NOT VALID;

ALTER TABLE ONLY public.gadgets
    ADD CONSTRAINT fk_gadgets_to_type FOREIGN KEY (type_uuid) REFERENCES public.gadget_types(uuid) NOT VALID;

ALTER TABLE ONLY public.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_issue_actions_types FOREIGN KEY (type_uuid) REFERENCES public.issue_actions_types(uuid) NOT VALID;

ALTER TABLE ONLY public.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_issues FOREIGN KEY (issue_uuid) REFERENCES public.issues(uuid) NOT VALID;

ALTER TABLE ONLY public.issue_actions
    ADD CONSTRAINT fk_issue_actions_to_users FOREIGN KEY (author_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.issue_tags
    ADD CONSTRAINT fk_issue_tags_to_author FOREIGN KEY (author_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.issue_types_to_fields
    ADD CONSTRAINT fk_issue_types_to_fields FOREIGN KEY (issue_types_uuid) REFERENCES public.issue_types(uuid) NOT VALID;

ALTER TABLE ONLY public.issue_types
    ADD CONSTRAINT fk_issue_types_to_workflows FOREIGN KEY (workflow_uuid) REFERENCES public.workflows(uuid) NOT VALID;

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT fk_issues_to_project FOREIGN KEY (project_uuid) REFERENCES public.projects(uuid) NOT VALID;

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT fk_issues_to_sprint FOREIGN KEY (sprint_uuid) REFERENCES public.sprints(uuid) NOT VALID;

ALTER TABLE ONLY public.issues
    ADD CONSTRAINT fk_issues_to_type FOREIGN KEY (type_uuid) REFERENCES public.issue_types(uuid) NOT VALID;

ALTER TABLE ONLY public.logs_done
    ADD CONSTRAINT fk_logs_done_to_users FOREIGN KEY (user_uuid) REFERENCES public.users(uuid);

ALTER TABLE ONLY public.old_issues_num
    ADD CONSTRAINT fk_old_issues_num_to_projects FOREIGN KEY (project_uuid) REFERENCES public.projects(uuid);

ALTER TABLE ONLY public.permitions_for_issues
    ADD CONSTRAINT fk_permitions_for_issues_to_roles FOREIGN KEY (role_uuid) REFERENCES public.roles(uuid) NOT VALID;

ALTER TABLE ONLY public.permitions
    ADD CONSTRAINT fk_permitions_to_permition_targets FOREIGN KEY (target_uuid) REFERENCES public.permition_targets(uuid) NOT VALID;

ALTER TABLE ONLY public.permitions
    ADD CONSTRAINT fk_permitions_to_roles FOREIGN KEY (role_uuid) REFERENCES public.roles(uuid) NOT VALID;

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT fk_projects_to_owner FOREIGN KEY (owner_uuid) REFERENCES public.users(uuid) ON DELETE RESTRICT NOT VALID;

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT fk_relation_issue0_to_issues FOREIGN KEY (issue0_uuid) REFERENCES public.issues(uuid) NOT VALID;

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT fk_relation_issue1_to_issues FOREIGN KEY (issue1_uuid) REFERENCES public.issues(uuid) NOT VALID;

ALTER TABLE ONLY public.relations
    ADD CONSTRAINT fk_relations_to_relation_types FOREIGN KEY (type_uuid) REFERENCES public.relation_types(uuid) NOT VALID;

ALTER TABLE ONLY public.boards
    ADD CONSTRAINT fk_swimlanes_field FOREIGN KEY (swimlanes_field_uuid) REFERENCES public.fields(uuid) NOT VALID;

ALTER TABLE ONLY public.users_to_roles
    ADD CONSTRAINT fk_users_to_roles_to_roles FOREIGN KEY (roles_uuid) REFERENCES public.roles(uuid) NOT VALID;

ALTER TABLE ONLY public.users_to_roles
    ADD CONSTRAINT fk_users_to_roles_to_users FOREIGN KEY (users_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.watchers
    ADD CONSTRAINT fk_watchers_to_issues FOREIGN KEY (issue_uuid) REFERENCES public.issues(uuid);

ALTER TABLE ONLY public.watchers
    ADD CONSTRAINT fk_watchers_to_users FOREIGN KEY (user_uuid) REFERENCES public.users(uuid);

ALTER TABLE ONLY public.workflow_nodes
    ADD CONSTRAINT fk_workflow_nodes_to_statuses FOREIGN KEY (issue_statuses_uuid) REFERENCES public.issue_statuses(uuid) NOT VALID;

ALTER TABLE ONLY public.transitions
    ADD CONSTRAINT fk_workflows_to_transitions FOREIGN KEY (workflows_uuid) REFERENCES public.workflows(uuid) NOT VALID;

ALTER TABLE ONLY public.workflow_nodes
    ADD CONSTRAINT fk_workflows_to_workflow_nodes FOREIGN KEY (workflows_uuid) REFERENCES public.workflows(uuid) NOT VALID;

ALTER TABLE ONLY public.time_entries
    ADD CONSTRAINT time_entries_to_author FOREIGN KEY (author_uuid) REFERENCES public.users(uuid) NOT VALID;

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_to_user FOREIGN KEY (user_uuid) REFERENCES public.users(uuid) NOT VALID;





