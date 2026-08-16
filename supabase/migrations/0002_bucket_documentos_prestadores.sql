insert into storage.buckets (id, name, public) values ('documentos-prestadores', 'documentos-prestadores', false);

create policy prestador_upload_proprios_documentos on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documentos-prestadores' and (storage.foldername(name))[1] = auth.uid()::text);

create policy prestador_le_proprios_documentos on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos-prestadores' and (storage.foldername(name))[1] = auth.uid()::text);
