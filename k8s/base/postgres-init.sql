-- Create user and database
CREATE USER unkaos WITH PASSWORD 'postgres';
ALTER USER unkaos CREATEDB;
CREATE DATABASE unkaos OWNER unkaos;

-- Connect to the new database
\c unkaos

-- Create schema
CREATE SCHEMA server;
ALTER SCHEMA server OWNER TO unkaos;

-- Set default permissions
ALTER DEFAULT PRIVILEGES FOR USER unkaos IN SCHEMA server
    GRANT ALL ON TABLES TO unkaos;

-- Set search path
ALTER DATABASE unkaos SET search_path TO server;
