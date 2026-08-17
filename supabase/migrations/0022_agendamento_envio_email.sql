-- Chama a edge function enviar-notificacoes a cada 2 minutos pra processar as
-- notificações de e-mail pendentes geradas pelo cruzamento (Fase B).

create extension if not exists pg_net;

create or replace function invocar_envio_notificacoes()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://eycpizzilxbjihxqarrk.supabase.co/functions/v1/enviar-notificacoes',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3BpenppbHhiamloeHFhcnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODY3MTksImV4cCI6MjEwMjQ2MjcxOX0.pZBiGD-QUZ8KQ6jwl-XHAjvQ-7Ko95GfifC4zQqCMt0',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function invocar_envio_notificacoes() from public, anon, authenticated;

select cron.schedule('enviar-notificacoes-email', '*/2 * * * *', $$select invocar_envio_notificacoes();$$);
