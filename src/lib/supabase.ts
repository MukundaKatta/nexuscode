import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
);

export async function initializeDatabase() {
  const { error } = await supabaseAdmin.rpc("create_tables_if_not_exists");
  if (error) {
    console.warn("Database initialization via RPC failed, tables may already exist:", error.message);
  }
}

export const DB_SCHEMA = `
-- Enable pgvector extension
create extension if not exists vector;

-- File embeddings table
create table if not exists file_embeddings (
  id uuid default gen_random_uuid() primary key,
  project_id text not null,
  file_path text not null,
  chunk_content text not null,
  chunk_index integer not null default 0,
  embedding vector(1536),
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(project_id, file_path, chunk_index)
);

-- Index for vector similarity search
create index if not exists file_embeddings_embedding_idx
  on file_embeddings using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for project lookups
create index if not exists file_embeddings_project_idx
  on file_embeddings (project_id);

-- Index for file path lookups
create index if not exists file_embeddings_path_idx
  on file_embeddings (project_id, file_path);

-- Chat history table
create table if not exists chat_history (
  id uuid default gen_random_uuid() primary key,
  project_id text not null,
  session_id text not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  context jsonb default '[]'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create index if not exists chat_history_session_idx
  on chat_history (project_id, session_id);

-- Semantic search function
create or replace function match_file_embeddings(
  query_embedding vector(1536),
  match_project_id text,
  match_threshold float default 0.7,
  match_count int default 10
)
returns table (
  id uuid,
  file_path text,
  chunk_content text,
  chunk_index integer,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    fe.id,
    fe.file_path,
    fe.chunk_content,
    fe.chunk_index,
    fe.metadata,
    1 - (fe.embedding <=> query_embedding) as similarity
  from file_embeddings fe
  where fe.project_id = match_project_id
    and 1 - (fe.embedding <=> query_embedding) > match_threshold
  order by fe.embedding <=> query_embedding
  limit match_count;
$$;
`;
