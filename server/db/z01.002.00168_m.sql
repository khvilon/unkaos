DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'athena_publication') THEN
        EXECUTE 'CREATE PUBLICATION athena_publication FOR ALL TABLES WITH (publish = ''insert, update, delete'')';
        EXECUTE 'ALTER PUBLICATION athena_publication ADD TABLE ONLY server.configs';
    END IF;
END
$$ LANGUAGE plpgsql;
