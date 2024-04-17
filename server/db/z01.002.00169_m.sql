DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'athena_publication') THEN
        EXECUTE 'CREATE PUBLICATION athena_publication FOR TABLE server.configs WITH (publish = ''insert, update, delete'')';
    END IF;
END
$$ LANGUAGE plpgsql;
