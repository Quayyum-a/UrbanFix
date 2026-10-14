-- Minimal stand-in for the parts of Supabase that urbanfix.sql relies on,
-- so the real schema can be tested on a plain Postgres server.
-- Mirrors Supabase: roles anon/authenticated/service_role, auth.uid() from the
-- request JWT claims, and storage.objects with RLS (the Storage API inserts
-- rows as the signed-in user, so the same policies apply).

CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

CREATE SCHEMA auth;
CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  encrypted_password text,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Supabase installs pgcrypto in the "extensions" schema.
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;

CREATE SCHEMA storage;
CREATE TABLE storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  public boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text NOT NULL,
  owner uuid DEFAULT auth.uid(),
  owner_id text DEFAULT auth.uid()::text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (bucket_id, name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO anon, authenticated;
GRANT SELECT ON storage.buckets TO anon, authenticated;

-- Supabase creates the public schema with broad default grants; reproduce that so
-- the test proves urbanfix.sql removes them.
GRANT ALL ON SCHEMA public TO anon, authenticated;
