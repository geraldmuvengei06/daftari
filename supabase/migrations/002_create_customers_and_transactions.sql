-- Customers table
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

-- Transactions table
create type transaction_status as enum ('paid', 'pending', 'failed');

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  mpesa_code text,
  amount numeric not null,
  status transaction_status not null default 'paid',
  raw_text text,
  created_at timestamptz not null default now(),
  type text not null default 'credit' check (type in ('credit', 'debit')),
  transaction_date timestamptz not null default now()
);

create index idx_customers_tenant_id on customers(tenant_id);
create index idx_transactions_tenant_id on transactions(tenant_id);
create index idx_transactions_customer_id on transactions(customer_id);
