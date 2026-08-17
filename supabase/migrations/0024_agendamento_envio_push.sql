-- Chama a edge function enviar-push a cada 2 minutos, mesmo padrão do envio de e-mail.

create or replace function invocar_envio_push()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://eycpizzilxbjihxqarrk.supabase.co/functions/v1/enviar-push',
    headers := jsonb_build_object(
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5Y3BpenppbHhiamloeHFhcnJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODY3MTksImV4cCI6MjEwMjQ2MjcxOX0.pZBiGD-QUZ8KQ6jwl-XHAjvQ-7Ko95GfifC4zQqCMt0',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function invocar_envio_push() from public, anon, authenticated;

select cron.schedule('enviar-notificacoes-push', '*/2 * * * *', $$select invocar_envio_push();$$);
