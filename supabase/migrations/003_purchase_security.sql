-- ============================================================
-- PROJETA COMPRAS
-- Migration 003
-- Segurança do fluxo de Pedido de Compra
-- ============================================================

-- Impede criação direta de purchase_requests pelo usuário.
-- A criação deverá passar obrigatoriamente pela RPC
-- create_purchase_request().

drop policy if exists
"Requester can create purchase request"
on public.purchase_requests;

-- Remove a policy anterior que permitia ao solicitante
-- alterar diretamente o próprio pedido, inclusive status.

drop policy if exists
"Authorized users can update purchase requests"
on public.purchase_requests;

-- Somente equipe operacional pode realizar UPDATE direto.
-- O solicitante utilizará funções específicas quando
-- precisarmos editar rascunhos posteriormente.

create policy
"Operational users can update purchase requests"
on public.purchase_requests
for update
to authenticated
using (
  public.has_role('buyer')
  or public.has_role('admin')
  or public.has_role('superadmin')
)
with check (
  public.has_role('buyer')
  or public.has_role('admin')
  or public.has_role('superadmin')
);