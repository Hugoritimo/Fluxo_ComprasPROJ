-- ============================================================
-- PROJETA COMPRAS
-- Migration 004
-- Fluxo definitivo de Solicitação de Cartão de Crédito
-- ============================================================

-- ============================================================
-- GARANTE CONTADOR
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
-- NOVOS CAMPOS DA SOLICITAÇÃO DE CARTÃO
-- ============================================================

alter table public.card_requests
add column if not exists request_date date;

alter table public.card_requests
add column if not exists requester_email_snapshot text;

alter table public.card_requests
add column if not exists sienge_request_number text;

alter table public.card_requests
add column if not exists cost_center_or_site text;

alter table public.card_requests
add column if not exists suppliers_text text;

alter table public.card_requests
add column if not exists payment_type text;

alter table public.card_requests
add column if not exists purchase_reason text;

alter table public.card_requests
add column if not exists purchase_reason_other text;

alter table public.card_requests
add column if not exists finance_notes text;

-- O campo required_date fazia parte do desenho anterior.
-- No novo fluxo ele deixa de ser obrigatório.

alter table public.card_requests
alter column required_date drop not null;

-- ============================================================
-- VALORES PADRÃO
-- ============================================================

alter table public.card_requests
alter column request_date
set default current_date;

alter table public.card_requests
alter column payment_type
set default 'credit_card';

-- ============================================================
-- CONSTRAINTS
-- ============================================================

alter table public.card_requests
drop constraint if exists card_requests_payment_type_check;

alter table public.card_requests
add constraint card_requests_payment_type_check
check (
  payment_type is null
  or payment_type = 'credit_card'
);

alter table public.card_requests
drop constraint if exists card_requests_purchase_reason_check;

alter table public.card_requests
add constraint card_requests_purchase_reason_check
check (
  purchase_reason is null
  or purchase_reason in (
    'emergency',
    'supplier_not_registered',
    'other'
  )
);

-- ============================================================
-- GERAÇÃO DO NÚMERO CC-2026-0001
-- ============================================================

create or replace function public.next_card_request_number()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_year integer;
  next_number integer;
begin

  current_year :=
    extract(year from current_date)::integer;

  insert into public.request_counters (
    request_type,
    request_year,
    last_number
  )
  values (
    'credit_card',
    current_year,
    1
  )
  on conflict (request_type, request_year)
  do update
  set
    last_number =
      public.request_counters.last_number + 1,
    updated_at = now()
  returning last_number
  into next_number;

  return
    'CC-' ||
    current_year::text ||
    '-' ||
    lpad(next_number::text, 4, '0');

end;
$$;

create or replace function public.set_card_request_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if new.request_number is null
     or trim(new.request_number) = '' then

    new.request_number :=
      public.next_card_request_number();

  end if;

  return new;

end;
$$;

drop trigger if exists card_request_number_trigger
on public.card_requests;

create trigger card_request_number_trigger
before insert
on public.card_requests
for each row
execute function public.set_card_request_number();

-- ============================================================
-- HISTÓRICO AUTOMÁTICO
-- ============================================================

create or replace function public.register_card_request_status_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin

  if tg_op = 'INSERT' then

    insert into public.card_request_status_history (
      card_request_id,
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
      'Solicitação de cartão criada.'
    );

    return new;

  end if;

  if old.status is distinct from new.status then

    insert into public.card_request_status_history (
      card_request_id,
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

drop trigger if exists card_request_status_history_trigger
on public.card_requests;

create trigger card_request_status_history_trigger
after insert or update of status
on public.card_requests
for each row
execute function public.register_card_request_status_history();

-- ============================================================
-- FUNÇÃO DE CRIAÇÃO DA SOLICITAÇÃO
-- ============================================================

create or replace function public.create_credit_card_request(
  p_sienge_request_number text,
  p_cost_center_or_site text,
  p_suppliers_text text,
  p_estimated_amount numeric,
  p_purchase_reason text,
  p_purchase_reason_other text,
  p_purpose text,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_request_id uuid;
  requester_email text;
begin

  -- ----------------------------------------------------------
  -- AUTENTICAÇÃO
  -- ----------------------------------------------------------

  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.active = true
  ) then
    raise exception 'Usuário inativo.';
  end if;

  -- ----------------------------------------------------------
  -- VALIDAÇÕES
  -- ----------------------------------------------------------

  if trim(coalesce(p_sienge_request_number, '')) = '' then
    raise exception
      'Informe o número do pedido no Sienge.';
  end if;

  if trim(coalesce(p_cost_center_or_site, '')) = '' then
    raise exception
      'Informe o centro de custo ou obra.';
  end if;

  if trim(coalesce(p_suppliers_text, '')) = '' then
    raise exception
      'Informe o fornecedor da compra.';
  end if;

  if coalesce(p_estimated_amount, 0) <= 0 then
    raise exception
      'Informe um valor previsto maior que zero.';
  end if;

  if p_purchase_reason not in (
    'emergency',
    'supplier_not_registered',
    'other'
  ) then
    raise exception
      'Informe o motivo da compra por cartão.';
  end if;

  if p_purchase_reason = 'other'
     and trim(
       coalesce(p_purchase_reason_other, '')
     ) = '' then

    raise exception
      'Informe qual é o outro motivo da compra.';

  end if;

  if trim(coalesce(p_purpose, '')) = '' then
    raise exception
      'Informe a finalidade da compra.';
  end if;

  select p.email
  into requester_email
  from public.profiles p
  where p.id = auth.uid();

  -- ----------------------------------------------------------
  -- CRIA SOLICITAÇÃO
  -- ----------------------------------------------------------

  insert into public.card_requests (
    requester_id,

    company_id,
    department_id,

    request_date,
    requester_email_snapshot,

    sienge_request_number,

    cost_center_or_site,
    suppliers_text,

    estimated_amount,

    payment_type,

    purchase_reason,
    purchase_reason_other,

    purpose,
    justification,

    status,
    submitted_at
  )
  select
    p.id,

    p.company_id,
    p.department_id,

    current_date,
    requester_email,

    trim(p_sienge_request_number),

    trim(p_cost_center_or_site),
    trim(p_suppliers_text),

    p_estimated_amount,

    'credit_card',

    p_purchase_reason,

    nullif(
      trim(
        coalesce(
          p_purchase_reason_other,
          ''
        )
      ),
      ''
    ),

    trim(p_purpose),

    nullif(
      trim(coalesce(p_notes, '')),
      ''
    ),

    'submitted'::public.card_request_status,

    now()

  from public.profiles p
  where p.id = auth.uid()

  returning id
  into new_request_id;

  return new_request_id;

end;
$$;

-- ============================================================
-- FUNÇÃO OPERACIONAL FINANCEIRO
-- ============================================================

create or replace function public.update_credit_card_request_workflow(
  p_request_id uuid,
  p_status public.card_request_status,
  p_approved_amount numeric default null,
  p_assigned_card_id uuid default null,
  p_finance_notes text default null
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
    public.has_role('finance')
    or public.has_role('admin')
    or public.has_role('superadmin')
  ) then

    raise exception
      'Você não possui permissão para atualizar esta solicitação.';

  end if;

  update public.card_requests
  set
    status = p_status,

    approved_amount =
      p_approved_amount,

    assigned_card_id =
      p_assigned_card_id,

    finance_notes =
      nullif(
        trim(
          coalesce(
            p_finance_notes,
            ''
          )
        ),
        ''
      ),

    approved_at =
      case
        when p_status = 'approved'
             and approved_at is null
        then now()
        else approved_at
      end,

    delivered_by =
      case
        when p_status = 'card_delivered'
        then auth.uid()
        else delivered_by
      end,

    delivered_to =
      case
        when p_status = 'card_delivered'
        then requester_id
        else delivered_to
      end,

    delivered_at =
      case
        when p_status = 'card_delivered'
             and delivered_at is null
        then now()
        else delivered_at
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
    raise exception
      'Solicitação não encontrada.';
  end if;

end;
$$;

-- ============================================================
-- RLS
-- ============================================================

alter table public.card_requests
enable row level security;

alter table public.card_request_status_history
enable row level security;

-- Remove criação direta.
-- Nova solicitação deve passar pela função segura.

drop policy if exists
"Requester can create card request"
on public.card_requests;

-- Remove UPDATE direto do solicitante.

drop policy if exists
"Authorized users can update card requests"
on public.card_requests;

-- Operação direta apenas Financeiro/Admin.

drop policy if exists
"Operational users can update card requests"
on public.card_requests;

create policy
"Operational users can update card requests"
on public.card_requests
for update
to authenticated
using (
  public.has_role('finance')
  or public.has_role('admin')
  or public.has_role('superadmin')
)
with check (
  public.has_role('finance')
  or public.has_role('admin')
  or public.has_role('superadmin')
);

-- Histórico visível de acordo com a solicitação.

drop policy if exists
"Users can view permitted card history"
on public.card_request_status_history;

create policy
"Users can view permitted card history"
on public.card_request_status_history
for select
to authenticated
using (
  exists (
    select 1
    from public.card_requests cr
    where cr.id = card_request_id
      and (
        cr.requester_id = auth.uid()
        or public.has_role('finance')
        or public.has_role('manager')
        or public.has_role('admin')
        or public.has_role('superadmin')
      )
  )
);

-- ============================================================
-- RPC PERMISSIONS
-- ============================================================

revoke all
on function public.create_credit_card_request(
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text
)
from public;

grant execute
on function public.create_credit_card_request(
  text,
  text,
  text,
  numeric,
  text,
  text,
  text,
  text
)
to authenticated;

revoke all
on function public.update_credit_card_request_workflow(
  uuid,
  public.card_request_status,
  numeric,
  uuid,
  text
)
from public;

grant execute
on function public.update_credit_card_request_workflow(
  uuid,
  public.card_request_status,
  numeric,
  uuid,
  text
)
to authenticated;