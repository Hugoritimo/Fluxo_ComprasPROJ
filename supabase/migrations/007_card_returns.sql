-- ============================================================
-- PROJETA COMPRAS
-- MIGRATION 007
-- DEVOLUÇÃO DO CARTÃO + PRESTAÇÃO DE CONTAS
-- ============================================================

-- ============================================================
-- BUCKET PRIVADO
-- ============================================================

insert into storage.buckets (
  id,
  name,
  public
)
values (
  'card-documents',
  'card-documents',
  false
)
on conflict (id)
do update set
  public = false;

-- ============================================================
-- POLICIES STORAGE
--
-- Estrutura do caminho:
--
-- user_id/request_id/categoria/arquivo.ext
--
-- Exemplo:
-- 11111111.../22222222.../invoice/arquivo.pdf
-- ============================================================

drop policy if exists
"Requester can upload card documents"
on storage.objects;

create policy
"Requester can upload card documents"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'card-documents'

  and
  (storage.foldername(name))[1]
    = auth.uid()::text

  and
  (storage.foldername(name))[3]
    in (
      'invoice',
      'payment_receipt'
    )

  and exists (
    select 1
    from public.card_requests cr
    where
      cr.id::text =
        (storage.foldername(name))[2]

      and cr.requester_id =
        auth.uid()

      and cr.deleted_at is null

      and cr.status in (
        'card_delivered',
        'in_use',
        'awaiting_return'
      )
  )
);

-- SELECT também é necessário para que o usuário
-- consiga acessar os objetos que acabou de enviar.

drop policy if exists
"Authorized users can read card documents"
on storage.objects;

create policy
"Authorized users can read card documents"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'card-documents'

  and (
    (
      (storage.foldername(name))[1]
        = auth.uid()::text

      and exists (
        select 1
        from public.card_requests cr
        where
          cr.id::text =
            (storage.foldername(name))[2]

          and cr.requester_id =
            auth.uid()

          and cr.deleted_at is null
      )
    )

    or public.has_role('finance')
    or public.has_role('manager')
    or public.has_role('admin')
    or public.has_role('superadmin')
  )
);

-- Permite limpar arquivo recém-enviado caso
-- a finalização da devolução apresente erro.

drop policy if exists
"Requester can delete own card documents"
on storage.objects;

create policy
"Requester can delete own card documents"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'card-documents'

  and
  (storage.foldername(name))[1]
    = auth.uid()::text
);

-- ============================================================
-- RLS - ATTACHMENTS
-- ============================================================

alter table public.attachments
enable row level security;

drop policy if exists
"Authorized users can view card attachments"
on public.attachments;

create policy
"Authorized users can view card attachments"
on public.attachments
for select
to authenticated
using (
  deleted_at is null

  and card_request_id is not null

  and (
    exists (
      select 1
      from public.card_requests cr
      where
        cr.id =
          attachments.card_request_id

        and cr.requester_id =
          auth.uid()

        and cr.deleted_at is null
    )

    or public.has_role('finance')
    or public.has_role('manager')
    or public.has_role('admin')
    or public.has_role('superadmin')
  )
);

-- ============================================================
-- RLS - CARD ACCOUNTABILITY
-- ============================================================

alter table public.card_accountability
enable row level security;

drop policy if exists
"Authorized users can view card accountability"
on public.card_accountability;

create policy
"Authorized users can view card accountability"
on public.card_accountability
for select
to authenticated
using (
  exists (
    select 1
    from public.card_requests cr
    where
      cr.id =
        card_accountability.card_request_id

      and cr.deleted_at is null

      and (
        cr.requester_id =
          auth.uid()

        or public.has_role('finance')
        or public.has_role('manager')
        or public.has_role('admin')
        or public.has_role('superadmin')
      )
  )
);

-- ============================================================
-- RPC - REGISTRAR DEVOLUÇÃO
-- ============================================================

create or replace function
public.submit_card_return(
  p_request_id uuid,

  p_actual_amount numeric,
  p_purchase_date date,
  p_supplier_name text,
  p_return_notes text,

  p_invoice_file_name text,
  p_invoice_storage_path text,
  p_invoice_mime_type text,
  p_invoice_file_size bigint,

  p_receipt_file_name text,
  p_receipt_storage_path text,
  p_receipt_mime_type text,
  p_receipt_file_size bigint
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_request
    public.card_requests%rowtype;

  v_expected_prefix text;

begin

  -- ==========================================================
  -- AUTENTICAÇÃO
  -- ==========================================================

  if auth.uid() is null then
    raise exception
      'Usuário não autenticado.';
  end if;

  -- ==========================================================
  -- BUSCA E BLOQUEIA SOLICITAÇÃO
  -- ==========================================================

  select *
  into v_request
  from public.card_requests
  where
    id = p_request_id
    and deleted_at is null
  for update;

  if not found then
    raise exception
      'Solicitação não encontrada.';
  end if;

  -- ==========================================================
  -- SOMENTE O SOLICITANTE
  -- ==========================================================

  if v_request.requester_id
     <> auth.uid() then

    raise exception
      'Você não possui permissão para registrar esta devolução.';

  end if;

  -- ==========================================================
  -- STATUS PERMITIDOS
  -- ==========================================================

  if v_request.status not in (
    'card_delivered',
    'in_use',
    'awaiting_return'
  ) then

    raise exception
      'Esta solicitação não está disponível para devolução.';

  end if;

  -- ==========================================================
  -- VALOR
  -- ==========================================================

  if p_actual_amount is null
     or p_actual_amount <= 0 then

    raise exception
      'Informe o valor efetivamente utilizado.';

  end if;

  -- ==========================================================
  -- DATA DA COMPRA
  -- ==========================================================

  if p_purchase_date is null then
    raise exception
      'Informe a data da compra.';
  end if;

  if p_purchase_date >
     current_date then

    raise exception
      'A data da compra não pode ser futura.';

  end if;

  -- ==========================================================
  -- FORNECEDOR
  -- ==========================================================

  if nullif(
    trim(
      coalesce(
        p_supplier_name,
        ''
      )
    ),
    ''
  ) is null then

    raise exception
      'Informe o fornecedor da compra.';

  end if;

  -- ==========================================================
  -- DOCUMENTOS OBRIGATÓRIOS
  -- ==========================================================

  if nullif(
    trim(
      coalesce(
        p_invoice_storage_path,
        ''
      )
    ),
    ''
  ) is null then

    raise exception
      'A Nota Fiscal ou Cupom Fiscal é obrigatória.';

  end if;

  if nullif(
    trim(
      coalesce(
        p_receipt_storage_path,
        ''
      )
    ),
    ''
  ) is null then

    raise exception
      'O comprovante da transação do cartão é obrigatório.';

  end if;

  -- ==========================================================
  -- TAMANHO MÁXIMO - 8 MB POR ARQUIVO
  -- ==========================================================

  if p_invoice_file_size >
     8388608 then

    raise exception
      'A Nota Fiscal excede o limite de 8 MB.';

  end if;

  if p_receipt_file_size >
     8388608 then

    raise exception
      'O comprovante excede o limite de 8 MB.';

  end if;

  -- ==========================================================
  -- TIPOS DE ARQUIVOS
  -- ==========================================================

  if p_invoice_mime_type not in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ) then

    raise exception
      'Formato da Nota Fiscal não permitido.';

  end if;

  if p_receipt_mime_type not in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ) then

    raise exception
      'Formato do comprovante não permitido.';

  end if;

  -- ==========================================================
  -- CONFERE CAMINHOS DOS ARQUIVOS
  -- ==========================================================

  v_expected_prefix :=
    auth.uid()::text
    || '/'
    || p_request_id::text
    || '/';

  if p_invoice_storage_path
     not like
       v_expected_prefix
       || 'invoice/%' then

    raise exception
      'Caminho da Nota Fiscal inválido.';

  end if;

  if p_receipt_storage_path
     not like
       v_expected_prefix
       || 'payment_receipt/%' then

    raise exception
      'Caminho do comprovante inválido.';

  end if;

  -- ==========================================================
  -- CONFERE SE OS ARQUIVOS EXISTEM DE VERDADE NO STORAGE
  -- ==========================================================

  if not exists (
    select 1
    from storage.objects o
    where
      o.bucket_id =
        'card-documents'

      and o.name =
        p_invoice_storage_path
  ) then

    raise exception
      'Arquivo da Nota Fiscal não encontrado no armazenamento.';

  end if;

  if not exists (
    select 1
    from storage.objects o
    where
      o.bucket_id =
        'card-documents'

      and o.name =
        p_receipt_storage_path
  ) then

    raise exception
      'Arquivo do comprovante não encontrado no armazenamento.';

  end if;

  -- ==========================================================
  -- PRESTAÇÃO DE CONTAS
  -- ==========================================================

  insert into
    public.card_accountability (
      card_request_id,
      actual_amount,
      purchase_date,
      supplier_name,
      returned_by,
      return_notes,
      approved,
      reviewed_by,
      reviewed_at,
      review_notes,
      created_at,
      updated_at
    )
  values (
    p_request_id,
    p_actual_amount,
    p_purchase_date,

    trim(
      p_supplier_name
    ),

    auth.uid(),

    nullif(
      trim(
        coalesce(
          p_return_notes,
          ''
        )
      ),
      ''
    ),

    false,
    null,
    null,
    null,

    now(),
    now()
  )

  on conflict (
    card_request_id
  )
  do update set

    actual_amount =
      excluded.actual_amount,

    purchase_date =
      excluded.purchase_date,

    supplier_name =
      excluded.supplier_name,

    returned_by =
      auth.uid(),

    return_notes =
      excluded.return_notes,

    approved =
      false,

    reviewed_by =
      null,

    reviewed_at =
      null,

    review_notes =
      null,

    updated_at =
      now();

  -- ==========================================================
  -- ARQUIVOS ANTERIORES
  --
  -- Mantemos o histórico via soft delete.
  -- ==========================================================

  update public.attachments
  set

    deleted_at =
      now(),

    deleted_by =
      auth.uid()

  where
    card_request_id =
      p_request_id

    and deleted_at is null

    and category in (
      'invoice',
      'payment_receipt'
    );

  -- ==========================================================
  -- NOTA FISCAL
  -- ==========================================================

  insert into
    public.attachments (
      uploaded_by,
      card_request_id,
      category,
      file_name,
      storage_path,
      mime_type,
      file_size,
      created_at
    )
  values (
    auth.uid(),
    p_request_id,
    'invoice',
    p_invoice_file_name,
    p_invoice_storage_path,
    p_invoice_mime_type,
    p_invoice_file_size,
    now()
  );

  -- ==========================================================
  -- COMPROVANTE DA TRANSAÇÃO
  -- ==========================================================

  insert into
    public.attachments (
      uploaded_by,
      card_request_id,
      category,
      file_name,
      storage_path,
      mime_type,
      file_size,
      created_at
    )
  values (
    auth.uid(),
    p_request_id,
    'payment_receipt',
    p_receipt_file_name,
    p_receipt_storage_path,
    p_receipt_mime_type,
    p_receipt_file_size,
    now()
  );

  -- ==========================================================
  -- ATUALIZA SOLICITAÇÃO
  -- ==========================================================

  update public.card_requests
  set

    status =
      'returned',

    returned_at =
      now(),

    updated_at =
      now()

  where id =
    p_request_id;

  -- ==========================================================
  -- LIBERA O CARTÃO
  -- ==========================================================

  if v_request.assigned_card_id
     is not null then

    update public.credit_cards
    set

      status =
        'available',

      updated_at =
        now()

    where id =
      v_request.assigned_card_id;

  end if;

end;
$$;

-- ============================================================
-- RPC - CONFERÊNCIA FINANCEIRA
-- Já deixaremos preparada para a próxima tela.
-- ============================================================

create or replace function
public.review_card_return(
  p_request_id uuid,
  p_decision text,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare

  v_request
    public.card_requests%rowtype;

begin

  if auth.uid() is null then
    raise exception
      'Usuário não autenticado.';
  end if;

  if not (
    public.has_role('finance')
    or public.has_role('admin')
    or public.has_role('superadmin')
  ) then

    raise exception
      'Você não possui permissão para conferir esta devolução.';

  end if;

  if p_decision not in (
    'approve',
    'correction'
  ) then

    raise exception
      'Decisão inválida.';
  end if;

  select *
  into v_request
  from public.card_requests
  where
    id = p_request_id
    and deleted_at is null
  for update;

  if not found then
    raise exception
      'Solicitação não encontrada.';
  end if;

  if v_request.status not in (
    'returned',
    'accountability_review'
  ) then

    raise exception
      'Esta solicitação não está aguardando conferência.';

  end if;

  if not exists (
    select 1
    from public.card_accountability ca
    where
      ca.card_request_id =
        p_request_id
  ) then

    raise exception
      'Prestação de contas não encontrada.';
  end if;

  if not exists (
    select 1
    from public.attachments a
    where
      a.card_request_id =
        p_request_id

      and a.category =
        'invoice'

      and a.deleted_at
        is null
  ) then

    raise exception
      'Nota Fiscal não encontrada.';
  end if;

  if not exists (
    select 1
    from public.attachments a
    where
      a.card_request_id =
        p_request_id

      and a.category =
        'payment_receipt'

      and a.deleted_at
        is null
  ) then

    raise exception
      'Comprovante da transação não encontrado.';
  end if;

  -- ==========================================================
  -- REGISTRA "EM CONFERÊNCIA"
  -- ==========================================================

  if v_request.status =
     'returned' then

    update public.card_requests
    set

      status =
        'accountability_review',

      updated_at =
        now()

    where id =
      p_request_id;

  end if;

  -- ==========================================================
  -- APROVADO
  -- ==========================================================

  if p_decision =
     'approve' then

    update public.card_accountability
    set

      reviewed_by =
        auth.uid(),

      reviewed_at =
        now(),

      review_notes =
        nullif(
          trim(
            coalesce(
              p_review_notes,
              ''
            )
          ),
          ''
        ),

      approved =
        true,

      updated_at =
        now()

    where card_request_id =
      p_request_id;

    update public.card_requests
    set

      status =
        'completed',

      completed_at =
        now(),

      updated_at =
        now()

    where id =
      p_request_id;

    return;

  end if;

  -- ==========================================================
  -- CORREÇÃO SOLICITADA
  -- ==========================================================

  if nullif(
    trim(
      coalesce(
        p_review_notes,
        ''
      )
    ),
    ''
  ) is null then

    raise exception
      'Informe o motivo da correção solicitada.';

  end if;

  update public.card_accountability
  set

    reviewed_by =
      auth.uid(),

    reviewed_at =
      now(),

    review_notes =
      trim(
        p_review_notes
      ),

    approved =
      false,

    updated_at =
      now()

  where card_request_id =
    p_request_id;

  update public.card_requests
  set

    status =
      'awaiting_return',

    updated_at =
      now()

  where id =
    p_request_id;

end;
$$;

-- ============================================================
-- PERMISSÕES
-- ============================================================

revoke all
on function public.submit_card_return(
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  text,
  text,
  bigint
)
from public;

grant execute
on function public.submit_card_return(
  uuid,
  numeric,
  date,
  text,
  text,
  text,
  text,
  text,
  bigint,
  text,
  text,
  text,
  bigint
)
to authenticated;


revoke all
on function public.review_card_return(
  uuid,
  text,
  text
)
from public;

grant execute
on function public.review_card_return(
  uuid,
  text,
  text
)
to authenticated;