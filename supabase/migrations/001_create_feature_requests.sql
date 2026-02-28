create table if not exists feature_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  title text not null,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'in_review', 'planned', 'completed', 'declined')),
  created_at timestamptz not null default now()
);

create index idx_feature_requests_tenant_id on feature_requests(tenant_id);

alter table feature_requests enable row level security;

create policy "Tenants can view their own feature requests"
  on feature_requests for select
  using (tenant_id = auth.uid());

create policy "Tenants can insert their own feature requests"
  on feature_requests for insert
  with check (tenant_id = auth.uid());
