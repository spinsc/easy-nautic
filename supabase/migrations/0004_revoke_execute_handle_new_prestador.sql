-- A função do trigger não deve ser chamável via RPC pública (/rest/v1/rpc/handle_new_prestador).
-- Revogar de public cobre também anon/authenticated, que herdam do role PUBLIC por padrão.
revoke execute on function public.handle_new_prestador() from public;
