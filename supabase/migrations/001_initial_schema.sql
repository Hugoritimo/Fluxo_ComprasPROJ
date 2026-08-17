-- ============================================================
-- PROJETA COMPRAS
-- Migration 001 - Initial Production Schema
-- ============================================================

create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type public.user_role as enum (
  'requester',
  'buyer',
  'finance',
  'approver',
  'manager',
  'admin',
  'superadmin'
);

create type public.request_priority as enum (
  'low',
  'normal',
  'high',
  'urgent'
);

create type public.purchase_status as enum (
  'draft',
  'submitted',
  'under_review',
  'awaiting_information',
  'quotation',
  'awaiting_approval',
  'approved',
  'rejected',
  'sienge_registered',
  'order_issued',
  'awaiting_delivery',
  'partially_received',
  'received',
  'completed',
  'cancelled'
);

create type public.card_request_status as enum (
  'draft',
  'submitted',
  'under_review',
  'awaiting_information',
  'awaiting_approval',
  'approved',
  'rejected',
  'card_reserved',
  'card_delivered',
  'in_use',
  'awaiting_return',
  'returned',
  'accountability_review',
  'completed',
  'cancelled'
);

create type public.card_status as enum (
  'available',
  'reserved',
  'in_use',
  'blocked',
  'inactive'
);

create type public.approval_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);

create type public.attachment_category as enum (
  'quotation',
  'invoice',
  'receipt',
  'payment_receipt',
  'sienge_document',
  'purchase_order',
  'accountability',
  'other'
);

-- ============================================================
-- COMMON FUNCTION
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- COMPANIES
-- ============================================================

create table public.companies (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  legal_name text,
  tax_id text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- DEPARTMENTS
-- ============================================================

create table public.departments (
  id uuid primary key default gen_random_uuid(),

  company_id uuid references public.companies(id),
  name text not null,
  code text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- COST CENTERS
-- ============================================================

create table public.cost_centers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid references public.companies(id),

  code text,
  name text not null,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROJECTS
-- ============================================================

create table public.projects (
  id uuid primary key default gen_random_uuid(),

  company_id uuid references public.companies(id),
  cost_center_id uuid references public.cost_centers(id),

  code text,
  name text not null,
  description text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PROFILES
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,

  full_name text not null,
  email text not null,

  company_id uuid references public.companies(id),
  department_id uuid references public.departments(id),

  job_title text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- USER ROLES
-- Usuário pode possuir mais de um perfil/permissão
-- ============================================================

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.user_role not null,

  created_at timestamptz not null default now(),

  unique(user_id, role)
);

-- ============================================================
-- SUPPLIERS
-- ============================================================

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),

  company_id uuid references public.companies(id),

  name text not null,
  legal_name text,
  tax_id text,

  contact_name text,
  email text,
  phone text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PURCHASE REQUESTS
-- ============================================================

create table public.purchase_requests (
  id uuid primary key default gen_random_uuid(),

  request_number text unique,

  requester_id uuid not null references public.profiles(id),

  company_id uuid references public.companies(id),
  department_id uuid references public.departments(id),
  project_id uuid references public.projects(id),
  cost_center_id uuid references public.cost_centers(id),

  title text not null,
  justification text not null,

  priority public.request_priority not null default 'normal',

  estimated_total numeric(14,2) not null default 0,
  approved_total numeric(14,2),

  required_date date,

  status public.purchase_status not null default 'draft',

  assigned_buyer_id uuid references public.profiles(id),

  sienge_request_number text,
  sienge_order_number text,
  sienge_registered_at timestamptz,

  supplier_id uuid references public.suppliers(id),

  order_date date,
  expected_delivery_date date,

  internal_notes text,

  submitted_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);

create index purchase_requests_requester_idx
on public.purchase_requests(requester_id);

create index purchase_requests_status_idx
on public.purchase_requests(status);

create index purchase_requests_department_idx
on public.purchase_requests(department_id);

create index purchase_requests_project_idx
on public.purchase_requests(project_id);

-- ============================================================
-- PURCHASE REQUEST ITEMS
-- ============================================================

create table public.purchase_request_items (
  id uuid primary key default gen_random_uuid(),

  purchase_request_id uuid not null
    references public.purchase_requests(id)
    on delete cascade,

  description text not null,

  quantity numeric(14,3) not null default 1,
  unit text,

  estimated_unit_price numeric(14,2) not null default 0,
  estimated_total numeric(14,2) not null default 0,

  approved_unit_price numeric(14,2),
  approved_total numeric(14,2),

  supplier_id uuid references public.suppliers(id),

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- PURCHASE STATUS HISTORY
-- ============================================================

create table public.purchase_request_status_history (
  id uuid primary key default gen_random_uuid(),

  purchase_request_id uuid not null
    references public.purchase_requests(id)
    on delete cascade,

  previous_status public.purchase_status,
  new_status public.purchase_status not null,

  changed_by uuid references public.profiles(id),

  notes text,

  created_at timestamptz not null default now()
);

-- ============================================================
-- CREDIT CARDS
-- ============================================================

create table public.credit_cards (
  id uuid primary key default gen_random_uuid(),

  company_id uuid references public.companies(id),

  name text not null,
  bank_name text,

  last_four_digits varchar(4) not null,

  credit_limit numeric(14,2),

  status public.card_status not null default 'available',

  notes text,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CARD REQUESTS
-- ============================================================

create table public.card_requests (
  id uuid primary key default gen_random_uuid(),

  request_number text unique,

  requester_id uuid not null references public.profiles(id),

  company_id uuid references public.companies(id),
  department_id uuid references public.departments(id),
  project_id uuid references public.projects(id),
  cost_center_id uuid references public.cost_centers(id),

  purchase_request_id uuid references public.purchase_requests(id),

  supplier_id uuid references public.suppliers(id),

  purpose text not null,
  justification text,

  estimated_amount numeric(14,2) not null,
  approved_amount numeric(14,2),

  required_date date not null,
  expected_return_date date,

  status public.card_request_status not null default 'draft',

  assigned_card_id uuid references public.credit_cards(id),

  delivered_by uuid references public.profiles(id),
  delivered_to uuid references public.profiles(id),

  delivered_at timestamptz,

  returned_at timestamptz,

  submitted_at timestamptz,
  approved_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id)
);

create index card_requests_requester_idx
on public.card_requests(requester_id);

create index card_requests_status_idx
on public.card_requests(status);

create index card_requests_card_idx
on public.card_requests(assigned_card_id);

-- ============================================================
-- CARD USAGE / RETURN / ACCOUNTABILITY
-- ============================================================

create table public.card_accountability (
  id uuid primary key default gen_random_uuid(),

  card_request_id uuid not null unique
    references public.card_requests(id)
    on delete cascade,

  actual_amount numeric(14,2) not null,

  purchase_date date,

  supplier_name text,

  returned_by uuid references public.profiles(id),

  return_notes text,

  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,

  review_notes text,

  approved boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- CARD STATUS HISTORY
-- ============================================================

create table public.card_request_status_history (
  id uuid primary key default gen_random_uuid(),

  card_request_id uuid not null
    references public.card_requests(id)
    on delete cascade,

  previous_status public.card_request_status,
  new_status public.card_request_status not null,

  changed_by uuid references public.profiles(id),

  notes text,

  created_at timestamptz not null default now()
);

-- ============================================================
-- APPROVAL RULES
-- ============================================================

create table public.approval_rules (
  id uuid primary key default gen_random_uuid(),

  company_id uuid references public.companies(id),
  department_id uuid references public.departments(id),

  request_type text not null
    check (request_type in ('purchase', 'card')),

  name text not null,

  minimum_amount numeric(14,2) not null default 0,
  maximum_amount numeric(14,2),

  approval_level integer not null default 1,

  active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- APPROVAL RULE APPROVERS
-- ============================================================

create table public.approval_rule_approvers (
  id uuid primary key default gen_random_uuid(),

  approval_rule_id uuid not null
    references public.approval_rules(id)
    on delete cascade,

  approver_id uuid not null references public.profiles(id),

  created_at timestamptz not null default now(),

  unique(approval_rule_id, approver_id)
);

-- ============================================================
-- APPROVALS
-- ============================================================

create table public.approvals (
  id uuid primary key default gen_random_uuid(),

  request_type text not null
    check (request_type in ('purchase', 'card')),

  purchase_request_id uuid references public.purchase_requests(id),
  card_request_id uuid references public.card_requests(id),

  approver_id uuid not null references public.profiles(id),

  approval_level integer not null default 1,

  status public.approval_status not null default 'pending',

  comments text,

  decided_at timestamptz,

  created_at timestamptz not null default now(),

  check (
    (
      request_type = 'purchase'
      and purchase_request_id is not null
      and card_request_id is null
    )
    or
    (
      request_type = 'card'
      and card_request_id is not null
      and purchase_request_id is null
    )
  )
);

-- ============================================================
-- ATTACHMENTS
-- ============================================================

create table public.attachments (
  id uuid primary key default gen_random_uuid(),

  uploaded_by uuid not null references public.profiles(id),

  purchase_request_id uuid references public.purchase_requests(id),
  card_request_id uuid references public.card_requests(id),

  category public.attachment_category not null default 'other',

  file_name text not null,
  storage_path text not null,
  mime_type text,
  file_size bigint,

  created_at timestamptz not null default now(),

  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),

  check (
    purchase_request_id is not null
    or card_request_id is not null
  )
);

-- ============================================================
-- COMMENTS
-- ============================================================

create table public.comments (
  id uuid primary key default gen_random_uuid(),

  author_id uuid not null references public.profiles(id),

  purchase_request_id uuid references public.purchase_requests(id),
  card_request_id uuid references public.card_requests(id),

  content text not null,

  internal_only boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),

  check (
    purchase_request_id is not null
    or card_request_id is not null
  )
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references public.profiles(id),

  title text not null,
  message text not null,

  type text,

  link text,

  read_at timestamptz,

  created_at timestamptz not null default now()
);

create index notifications_user_idx
on public.notifications(user_id);

-- ============================================================
-- AUDIT LOG
-- ============================================================

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  user_id uuid references public.profiles(id),

  action text not null,

  entity_type text not null,
  entity_id uuid,

  old_data jsonb,
  new_data jsonb,

  ip_address inet,
  user_agent text,

  created_at timestamptz not null default now()
);

create index audit_logs_entity_idx
on public.audit_logs(entity_type, entity_id);

create index audit_logs_user_idx
on public.audit_logs(user_id);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================

create table public.system_settings (
  id uuid primary key default gen_random_uuid(),

  key text not null unique,
  value jsonb,

  description text,

  updated_by uuid references public.profiles(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

create trigger companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger departments_updated_at
before update on public.departments
for each row execute function public.set_updated_at();

create trigger cost_centers_updated_at
before update on public.cost_centers
for each row execute function public.set_updated_at();

create trigger projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger suppliers_updated_at
before update on public.suppliers
for each row execute function public.set_updated_at();

create trigger purchase_requests_updated_at
before update on public.purchase_requests
for each row execute function public.set_updated_at();

create trigger purchase_request_items_updated_at
before update on public.purchase_request_items
for each row execute function public.set_updated_at();

create trigger credit_cards_updated_at
before update on public.credit_cards
for each row execute function public.set_updated_at();

create trigger card_requests_updated_at
before update on public.card_requests
for each row execute function public.set_updated_at();

create trigger card_accountability_updated_at
before update on public.card_accountability
for each row execute function public.set_updated_at();

create trigger approval_rules_updated_at
before update on public.approval_rules
for each row execute function public.set_updated_at();

create trigger comments_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

create trigger system_settings_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

-- ============================================================
-- AUTO CREATE PROFILE AFTER AUTH USER
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  insert into public.profiles (
    id,
    full_name,
    email
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email
  );

  insert into public.user_roles (
    user_id,
    role
  )
  values (
    new.id,
    'requester'
  );

  return new;

end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROLE HELPER
-- ============================================================

create or replace function public.has_role(required_role public.user_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = required_role
  );

$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.purchase_requests enable row level security;
alter table public.purchase_request_items enable row level security;
alter table public.purchase_request_status_history enable row level security;
alter table public.card_requests enable row level security;
alter table public.card_accountability enable row level security;
alter table public.card_request_status_history enable row level security;
alter table public.approvals enable row level security;
alter table public.attachments enable row level security;
alter table public.comments enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================
-- PROFILE POLICIES
-- ============================================================

create policy "Users can view own profile"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- PURCHASE REQUEST POLICIES
-- ============================================================

create policy "Requester can view own purchase requests"
on public.purchase_requests
for select
to authenticated
using (
  requester_id = auth.uid()

  or public.has_role('buyer')
  or public.has_role('manager')
  or public.has_role('admin')
  or public.has_role('superadmin')
);

create policy "Requester can create purchase request"
on public.purchase_requests
for insert
to authenticated
with check (
  requester_id = auth.uid()
);

create policy "Authorized users can update purchase requests"
on public.purchase_requests
for update
to authenticated
using (
  requester_id = auth.uid()
  or public.has_role('buyer')
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- CARD REQUEST POLICIES
-- ============================================================

create policy "Requester can view own card requests"
on public.card_requests
for select
to authenticated
using (
  requester_id = auth.uid()

  or public.has_role('finance')
  or public.has_role('manager')
  or public.has_role('admin')
  or public.has_role('superadmin')
);

create policy "Requester can create card request"
on public.card_requests
for insert
to authenticated
with check (
  requester_id = auth.uid()
);

create policy "Authorized users can update card requests"
on public.card_requests
for update
to authenticated
using (
  requester_id = auth.uid()
  or public.has_role('finance')
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- APPROVAL POLICIES
-- ============================================================

create policy "Approver can view assigned approvals"
on public.approvals
for select
to authenticated
using (
  approver_id = auth.uid()
  or public.has_role('admin')
  or public.has_role('superadmin')
);

create policy "Approver can update assigned approvals"
on public.approvals
for update
to authenticated
using (
  approver_id = auth.uid()
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- NOTIFICATION POLICIES
-- ============================================================

create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (
  user_id = auth.uid()
);

create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (
  user_id = auth.uid()
);

-- ============================================================
-- AUDIT POLICY
-- ============================================================

create policy "Admins can view audit logs"
on public.audit_logs
for select
to authenticated
using (
  public.has_role('admin')
  or public.has_role('superadmin')
);