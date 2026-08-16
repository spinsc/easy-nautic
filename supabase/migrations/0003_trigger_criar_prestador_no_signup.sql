create or replace function public.handle_new_prestador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.prestadores (id, tipo_pessoa, nome, cpf_cnpj, telefone, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'tipo_pessoa', 'PF'),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.raw_user_meta_data->>'cpf_cnpj',
    new.raw_user_meta_data->>'telefone',
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_prestador();
