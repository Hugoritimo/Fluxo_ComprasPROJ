-- ============================================================
-- PROJETA COMPRAS
-- Migration 002
-- Fluxo completo de Pedido de Compra
-- ============================================================

-- ============================================================
-- CONTADORES DE NUMERAÇÃO
-- ============================================================

create table if not exists public.request_counters (
  id uuid primary key default gen_random_uuid(),

  request_type text not null,
  request_year integer not null,
  last_number integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique(request_type, request_year)
);

-- ============================================================
-- FUNÇÃO DE NUMERAÇÃO
-- PC-2026-0001
-- ============================================================

create or replace function public.next_purchase_request_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_year integer;
  next_number integer;
begin

  current_year := extract(year from current_date)::integer;

  insert into public.request_counters (
    request_type,
    request_year,
    last_number
  )
  values (
    'purchase',
    current_year,
    1
  )
  on conflict (request_type, request_year)
  do update
  set
    last_number = public.request_counters.last_number + 1,
    updated_at = now()
  returning last_number into next_number;

  return
    'PC-' ||
    current_year::text ||
    '-' ||
    lpad(next_number::text, 4, '0');

end;
$$;

-- ============================================================
-- TRIGGER PARA GERAR NÚMERO DO PEDIDO
-- ============================================================

create or replace function public.set_purchase_request_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if new.request_number is null
     or trim(new.request_number) = '' then

    new.request_number :=
      public.next_purchase_request_number();

  end if;

  return new;

end;
$$;

drop trigger if exists
purchase_request_number_trigger
on public.purchase_requests;

create trigger purchase_request_number_trigger
before insert on public.purchase_requests
for each row
execute function public.set_purchase_request_number();

-- ============================================================
-- CALCULA TOTAL DO ITEM AUTOMATICAMENTE
-- ============================================================

create or replace function public.calculate_purchase_item_total()
returns trigger
language plpgsql
set search_path = ''
as $$
begin

  new.estimated_total :=
    round(
      coalesce(new.quantity, 0) *
      coalesce(new.estimated_unit_price, 0),
      2
    );

  if new.approved_unit_price is not null then

    new.approved_total :=
      round(
        coalesce(new.quantity, 0) *
        new.approved_unit_price,
        2
      );

  end if;

  return new;

end;
$$;

drop trigger if exists
purchase_item_total_trigger
on public.purchase_request_items;

create trigger purchase_item_total_trigger
before insert or update
on public.purchase_request_items
for each row
execute function public.calculate_purchase_item_total();

-- ============================================================
-- ATUALIZA TOTAL DO PEDIDO
-- ============================================================

create or replace function public.refresh_purchase_request_total(
  target_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  update public.purchase_requests
  set estimated_total = coalesce(
    (
      select sum(i.estimated_total)
      from public.purchase_request_items i
      where i.purchase_request_id = target_request_id
    ),
    0
  )
  where id = target_request_id;

end;
$$;

create or replace function public.refresh_purchase_total_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if tg_op = 'DELETE' then

    perform public.refresh_purchase_request_total(
      old.purchase_request_id
    );

    return old;

  else

    perform public.refresh_purchase_request_total(
      new.purchase_request_id
    );

    if tg_op = 'UPDATE'
       and old.purchase_request_id is distinct from new.purchase_request_id then

      perform public.refresh_purchase_request_total(
        old.purchase_request_id
      );

    end if;

    return new;

  end if;

end;
$$;

drop trigger if exists
purchase_item_refresh_total_trigger
on public.purchase_request_items;

create trigger purchase_item_refresh_total_trigger
after insert or update or delete
on public.purchase_request_items
for each row
execute function public.refresh_purchase_total_trigger();

-- ============================================================
-- HISTÓRICO AUTOMÁTICO
-- ============================================================

create or replace function public.register_purchase_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if tg_op = 'INSERT' then

    insert into public.purchase_request_status_history (
      purchase_request_id,
      previous_status,
      new_status,
      changed_by,
      notes
    )
    values (
      new.id,
      null,
      new.status,
      auth.uid(),
      'Solicitação criada.'
    );

    return new;

  end if;

  if old.status is distinct from new.status then

    insert into public.purchase_request_status_history (
      purchase_request_id,
      previous_status,
      new_status,
      changed_by,
      notes
    )
    values (
      new.id,
      old.status,
      new.status,
      auth.uid(),
      null
    );

  end if;

  return new;

end;
$$;

drop trigger if exists
purchase_status_history_trigger
on public.purchase_requests;

create trigger purchase_status_history_trigger
after insert or update of status
on public.purchase_requests
for each row
execute function public.register_purchase_status_history();

-- ============================================================
-- FUNÇÃO PARA VALIDAR PERFIS
-- ============================================================

create or replace function public.current_user_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$

  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
  );

$$;

-- ============================================================
-- FUNÇÃO PARA CRIAR PEDIDO + ITENS EM TRANSAÇÃO ÚNICA
-- ============================================================

create or replace function public.create_purchase_request(
  p_title text,
  p_justification text,
  p_priority public.request_priority,
  p_required_date date,
  p_company_id uuid,
  p_department_id uuid,
  p_project_id uuid,
  p_cost_center_id uuid,
  p_items jsonb,
  p_submit boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_request_id uuid;
  item jsonb;
  item_description text;
  item_quantity numeric;
  item_unit text;
  item_unit_price numeric;
begin

  -- ----------------------------------------------------------
  -- AUTENTICAÇÃO
  -- ----------------------------------------------------------

  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not public.current_user_is_active() then
    raise exception 'Usuário inativo.';
  end if;

  -- ----------------------------------------------------------
  -- VALIDAÇÕES PRINCIPAIS
  -- ----------------------------------------------------------

  if trim(coalesce(p_title, '')) = '' then
    raise exception 'Informe o título da solicitação.';
  end if;

  if trim(coalesce(p_justification, '')) = '' then
    raise exception 'Informe a justificativa.';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then

    raise exception
      'Adicione pelo menos um item ao pedido.';

  end if;

  -- ----------------------------------------------------------
  -- CRIA PEDIDO
  -- ----------------------------------------------------------

  insert into public.purchase_requests (
    requester_id,
    company_id,
    department_id,
    project_id,
    cost_center_id,

    title,
    justification,
    priority,
    required_date,

    status,
    submitted_at
  )
  values (
    auth.uid(),
    p_company_id,
    p_department_id,
    p_project_id,
    p_cost_center_id,

    trim(p_title),
    trim(p_justification),
    coalesce(p_priority, 'normal'),
    p_required_date,

    case
      when p_submit then
        'submitted'::public.purchase_status
      else
        'draft'::public.purchase_status
    end,

    case
      when p_submit then now()
      else null
    end
  )
  returning id into new_request_id;

  -- ----------------------------------------------------------
  -- CRIA ITENS
  -- ----------------------------------------------------------

  for item in
    select *
    from jsonb_array_elements(p_items)
  loop

    item_description :=
      trim(coalesce(item ->> 'description', ''));

    item_quantity :=
      coalesce(
        nullif(item ->> 'quantity', '')::numeric,
        0
      );

    item_unit :=
      nullif(
        trim(coalesce(item ->> 'unit', '')),
        ''
      );

    item_unit_price :=
      coalesce(
        nullif(
          item ->> 'estimated_unit_price',
          ''
        )::numeric,
        0
      );

    if item_description = '' then
      raise exception
        'Todos os itens precisam possuir descrição.';
    end if;

    if item_quantity <= 0 then
      raise exception
        'A quantidade dos itens deve ser maior que zero.';
    end if;

    if item_unit_price < 0 then
      raise exception
        'O valor unitário não pode ser negativo.';
    end if;

    insert into public.purchase_request_items (
      purchase_request_id,
      description,
      quantity,
      unit,
      estimated_unit_price,
      notes
    )
    values (
      new_request_id,
      item_description,
      item_quantity,
      item_unit,
      item_unit_price,
      nullif(
        trim(coalesce(item ->> 'notes', '')),
        ''
      )
    );

  end loop;

  return new_request_id;

end;
$$;

-- ============================================================
-- FUNÇÃO PARA ATUALIZAÇÃO OPERACIONAL DO PEDIDO
-- Apenas Compras / Admin
-- ============================================================

create or replace function public.update_purchase_workflow(
  p_request_id uuid,
  p_status public.purchase_status,
  p_sienge_request_number text default null,
  p_sienge_order_number text default null,
  p_supplier_id uuid default null,
  p_order_date date default null,
  p_expected_delivery_date date default null,
  p_internal_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin

  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not (
    public.has_role('buyer')
    or public.has_role('admin')
    or public.has_role('superadmin')
  ) then

    raise exception
      'Você não possui permissão para atualizar este pedido.';

  end if;

  update public.purchase_requests
  set
    status = p_status,

    sienge_request_number =
      nullif(trim(p_sienge_request_number), ''),

    sienge_order_number =
      nullif(trim(p_sienge_order_number), ''),

    sienge_registered_at =
      case
        when
          nullif(trim(p_sienge_request_number), '') is not null
          and sienge_registered_at is null
        then now()
        else sienge_registered_at
      end,

    supplier_id = p_supplier_id,

    order_date = p_order_date,

    expected_delivery_date =
      p_expected_delivery_date,

    internal_notes =
      nullif(trim(p_internal_notes), ''),

    approved_at =
      case
        when p_status = 'approved'
             and approved_at is null
        then now()
        else approved_at
      end,

    completed_at =
      case
        when p_status = 'completed'
        then now()
        else completed_at
      end,

    cancelled_at =
      case
        when p_status = 'cancelled'
        then now()
        else cancelled_at
      end

  where id = p_request_id
    and deleted_at is null;

  if not found then
    raise exception 'Pedido não encontrado.';
  end if;

end;
$$;

-- ============================================================
-- RLS
-- TABELAS DE CADASTRO
-- ============================================================

alter table public.companies
enable row level security;

alter table public.departments
enable row level security;

alter table public.cost_centers
enable row level security;

alter table public.projects
enable row level security;

alter table public.suppliers
enable row level security;

alter table public.request_counters
enable row level security;

-- ============================================================
-- POLICIES - COMPANIES
-- ============================================================

drop policy if exists
"Authenticated users can view companies"
on public.companies;

create policy
"Authenticated users can view companies"
on public.companies
for select
to authenticated
using (
  active = true
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- POLICIES - DEPARTMENTS
-- ============================================================

drop policy if exists
"Authenticated users can view departments"
on public.departments;

create policy
"Authenticated users can view departments"
on public.departments
for select
to authenticated
using (
  active = true
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- POLICIES - COST CENTERS
-- ============================================================

drop policy if exists
"Authenticated users can view cost centers"
on public.cost_centers;

create policy
"Authenticated users can view cost centers"
on public.cost_centers
for select
to authenticated
using (
  active = true
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- POLICIES - PROJECTS
-- ============================================================

drop policy if exists
"Authenticated users can view projects"
on public.projects;

create policy
"Authenticated users can view projects"
on public.projects
for select
to authenticated
using (
  active = true
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- POLICIES - SUPPLIERS
-- ============================================================

drop policy if exists
"Authenticated users can view suppliers"
on public.suppliers;

create policy
"Authenticated users can view suppliers"
on public.suppliers
for select
to authenticated
using (
  active = true
  or public.has_role('buyer')
  or public.has_role('finance')
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- PURCHASE REQUEST ITEMS
-- ============================================================

drop policy if exists
"Users can view permitted purchase items"
on public.purchase_request_items;

create policy
"Users can view permitted purchase items"
on public.purchase_request_items
for select
to authenticated
using (
  exists (
    select 1
    from public.purchase_requests pr
    where pr.id = purchase_request_id
      and (
        pr.requester_id = auth.uid()
        or public.has_role('buyer')
        or public.has_role('manager')
        or public.has_role('admin')
        or public.has_role('superadmin')
      )
  )
);

drop policy if exists
"Requester can insert own purchase items"
on public.purchase_request_items;

create policy
"Requester can insert own purchase items"
on public.purchase_request_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.purchase_requests pr
    where pr.id = purchase_request_id
      and pr.requester_id = auth.uid()
      and pr.status = 'draft'
  )
);

drop policy if exists
"Authorized users can update purchase items"
on public.purchase_request_items;

create policy
"Authorized users can update purchase items"
on public.purchase_request_items
for update
to authenticated
using (
  exists (
    select 1
    from public.purchase_requests pr
    where pr.id = purchase_request_id
      and (
        (
          pr.requester_id = auth.uid()
          and pr.status = 'draft'
        )
        or public.has_role('buyer')
        or public.has_role('admin')
        or public.has_role('superadmin')
      )
  )
);

-- ============================================================
-- PURCHASE STATUS HISTORY
-- ============================================================

drop policy if exists
"Users can view permitted purchase history"
on public.purchase_request_status_history;

create policy
"Users can view permitted purchase history"
on public.purchase_request_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.purchase_requests pr
    where pr.id = purchase_request_id
      and (
        pr.requester_id = auth.uid()
        or public.has_role('buyer')
        or public.has_role('manager')
        or public.has_role('admin')
        or public.has_role('superadmin')
      )
  )
);

-- ============================================================
-- USER ROLES
-- O usuário precisa conseguir ler as próprias funções
-- ============================================================

drop policy if exists
"Users can view own roles"
on public.user_roles;

create policy
"Users can view own roles"
on public.user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- ============================================================
-- GRANTS DAS RPCs
-- ============================================================

revoke all
on function public.create_purchase_request(
  text,
  text,
  public.request_priority,
  date,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  boolean
)
from public;

grant execute
on function public.create_purchase_request(
  text,
  text,
  public.request_priority,
  date,
  uuid,
  uuid,
  uuid,
  uuid,
  jsonb,
  boolean
)
to authenticated;

revoke all
on function public.update_purchase_workflow(
  uuid,
  public.purchase_status,
  text,
  text,
  uuid,
  date,
  date,
  text
)
from public;

grant execute
on function public.update_purchase_workflow(
  uuid,
  public.purchase_status,
  text,
  text,
  uuid,
  date,
  date,
  text
)
to authenticated;

-- ============================================================
-- FINAL
-- ============================================================