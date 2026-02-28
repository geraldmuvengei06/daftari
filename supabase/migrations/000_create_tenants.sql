-- Tenants table (must run before other migrations that reference it)
create table if not exists tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  owner_phone text not null default '',
  business_name text not null default 'My Business',
  created_at timestamptz not null default now()
);

create unique index idx_tenants_user_id on tenants(user_id);
