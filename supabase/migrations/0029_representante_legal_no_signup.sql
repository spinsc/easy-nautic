-- Captura o nome do representante legal (PJ) já no cadastro, quando informado.
create or replace function public.handle_new_prestador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.prestadores (id, tipo_pessoa, nome, cpf_cnpj, telefone, email, representante_legal)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'tipo_pessoa', 'PF'),
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.raw_user_meta_data->>'cpf_cnpj',
    new.raw_user_meta_data->>'telefone',
    new.email,
    new.raw_user_meta_data->>'representante_legal'
  );
  return new;
end;
$$;
