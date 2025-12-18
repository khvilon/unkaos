-- P1.1 GitLab integration (MVP): store webhook events + links to issues
--
-- NOTE: These migrations are applied twice:
-- - to `public` schema as-is
-- - to `server` schema via auto-generated *_server copy (see docker-compose init script)

CREATE TABLE IF NOT EXISTS public.gitlab_events (
    uuid uuid NOT NULL,
    event_key text NOT NULL,
    event_type text NOT NULL,
    delivery_id text,
    project_id bigint,
    ref text,
    payload jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'gitlab_events_pkey'
          AND conrelid = 'public.gitlab_events'::regclass
    ) THEN
        ALTER TABLE ONLY public.gitlab_events
            ADD CONSTRAINT gitlab_events_pkey PRIMARY KEY (uuid);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS gitlab_events_event_key_uq
    ON public.gitlab_events (event_key);

CREATE INDEX IF NOT EXISTS gitlab_events_project_id_idx
    ON public.gitlab_events (project_id);


CREATE TABLE IF NOT EXISTS public.gitlab_events_to_issues (
    event_uuid uuid NOT NULL,
    issue_uuid uuid NOT NULL,
    issue_key text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'gitlab_events_to_issues_pkey'
          AND conrelid = 'public.gitlab_events_to_issues'::regclass
    ) THEN
        ALTER TABLE ONLY public.gitlab_events_to_issues
            ADD CONSTRAINT gitlab_events_to_issues_pkey PRIMARY KEY (event_uuid, issue_uuid);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS gitlab_events_to_issues_issue_uuid_idx
    ON public.gitlab_events_to_issues (issue_uuid);


