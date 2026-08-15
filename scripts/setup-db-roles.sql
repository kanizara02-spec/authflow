-- =============================================================================
-- AuthFlow Least-Privilege PostgreSQL Role Setup
-- =============================================================================
-- Usage: Execute as a database superuser (e.g., 'postgres') before deploying.
--
-- Architecture:
-- 1. `authflow_owner`: DDL owner role used during CI/CD for Prisma migrations.
-- 2. `authflow_app`: Unprivileged DML runtime role used by the running API server.
-- =============================================================================

-- 1. Create owner and application roles if they do not exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authflow_owner') THEN
      CREATE ROLE authflow_owner WITH LOGIN PASSWORD 'ChangeInProductionOwnerPass!';
   END IF;

   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authflow_app') THEN
      CREATE ROLE authflow_app WITH LOGIN PASSWORD 'ChangeInProductionAppPass!';
   END IF;
END
$$;

-- 2. Grant connection rights to target database
GRANT CONNECT ON DATABASE authflow TO authflow_app;
GRANT CONNECT ON DATABASE authflow TO authflow_owner;

-- 3. Grant schema usage and DML permissions to runtime app role
\connect authflow;

GRANT USAGE ON SCHEMA public TO authflow_app;

-- Grant data manipulation rights (SELECT, INSERT, UPDATE, DELETE) only — NO DDL (DROP/ALTER/CREATE TABLE)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authflow_app;

-- Ensure future tables created by migrations automatically grant DML to authflow_app
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authflow_app;
