-- Job status enum
do $$ begin
  create type job_status as enum ('open', 'closed');
exception when duplicate_object then null;
end $$;

-- Jobs table
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  description text not null,
  total_quote numeric not null,
  status job_status not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists idx_jobs_tenant_id on jobs(tenant_id);
create index if not exists idx_jobs_customer_id on jobs(customer_id);
create index if not exists idx_jobs_status on jobs(status);

-- Add job_id to transactions (nullable — existing payments have no job)
alter table transactions add column if not exists job_id uuid references jobs(id) on delete set null;
create index if not exists idx_transactions_job_id on transactions(job_id);
